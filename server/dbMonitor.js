import { getPool, sql } from "./db.js";

const ONE_HOUR_MS = 60 * 60 * 1000;
const KEEP_SNAPSHOTS = 168; // 7 days of hourly samples

let monitorState = {
  snapshot: null,
  history: [],
  baseline: null,
  lastError: null,
  lastRefreshedAt: null,
  nextRefreshAt: null,
  refreshing: false,
};

const toIsoOrNull = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
};

const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const runQuery = async (pool, query) => {
  const result = await pool.request().query(query);
  return Array.isArray(result?.recordset) ? result.recordset : [];
};

const parseJsonOrNull = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const isNoiseWait = (waitType) => {
  const w = String(waitType ?? "").toUpperCase();
  if (!w) return true;
  if (w.startsWith("SLEEP")) return true;
  if (w.endsWith("_SLEEP")) return true;
  if (w.startsWith("BROKER_")) return true;
  if (w.startsWith("QDS_")) return true; // Query Store background
  if (w.startsWith("XE_")) return true;
  if (w.includes("DIAGNOSTICS_SLEEP")) return true;
  if (w.includes("SQLTRACE")) return true;
  if (w === "DIRTY_PAGE_POLL") return true;
  if (w === "SOS_WORK_DISPATCHER") return true;
  if (w === "HADR_FILESTREAM_IOMGR_IOCOMPLETION") return true;
  return false;
};

const readSnapshots = async (pool, limit) => {
  const { recordset } = await pool
    .request()
    .input("limit", sql.Int, limit)
    .query(
      `
      SELECT TOP (@limit)
        id,
        collected_at AS collectedAt,
        sqlserver_start_time AS sqlserverStartTime,
        database_name AS databaseName,
        server_name AS serverName,
        product_version AS productVersion,
        edition,
        size_mb AS sizeMb,
        user_sessions AS userSessions,
        active_requests AS activeRequests,
        blocked_requests AS blockedRequests,
        waits_json AS waitsJson,
        queries_json AS queriesJson,
        collector_errors_json AS collectorErrorsJson
      FROM dbo.db_monitor_snapshots
      ORDER BY collected_at DESC
      `
    );

  return (recordset ?? []).map((row) => {
    const database =
      row.databaseName || row.serverName || row.productVersion || row.edition
        ? {
            databaseName: String(row.databaseName ?? ""),
            serverName: String(row.serverName ?? ""),
            productVersion: String(row.productVersion ?? ""),
            edition: String(row.edition ?? ""),
          }
        : null;

    const errors = parseJsonOrNull(row.collectorErrorsJson);
    return {
      id: row.id,
      collectedAt: toIsoOrNull(row.collectedAt),
      sqlserverStartTime: toIsoOrNull(row.sqlserverStartTime),
      database,
      sizeMb: safeNumber(row.sizeMb),
      sessions: {
        userSessions: safeNumber(row.userSessions),
        activeRequests: safeNumber(row.activeRequests),
        blockedRequests: safeNumber(row.blockedRequests),
      },
      waits: Array.isArray(parseJsonOrNull(row.waitsJson)) ? parseJsonOrNull(row.waitsJson) : [],
      topQueries: Array.isArray(parseJsonOrNull(row.queriesJson)) ? parseJsonOrNull(row.queriesJson) : [],
      errors: Array.isArray(errors) ? errors : [],
    };
  });
};

const insertSnapshot = async (pool, snapshot) => {
  const req = pool.request();
  req.input("collectedAt", sql.DateTime2(3), new Date(snapshot.collectedAt));
  req.input(
    "sqlserverStartTime",
    sql.DateTime2(3),
    snapshot.sqlserverStartTime ? new Date(snapshot.sqlserverStartTime) : null
  );
  req.input("databaseName", sql.NVarChar(128), snapshot.database?.databaseName || null);
  req.input("serverName", sql.NVarChar(128), snapshot.database?.serverName || null);
  req.input("productVersion", sql.NVarChar(128), snapshot.database?.productVersion || null);
  req.input("edition", sql.NVarChar(256), snapshot.database?.edition || null);
  req.input("sizeMb", sql.Float, snapshot.sizeMb ?? null);
  req.input("userSessions", sql.Int, snapshot.sessions?.userSessions ?? null);
  req.input("activeRequests", sql.Int, snapshot.sessions?.activeRequests ?? null);
  req.input("blockedRequests", sql.Int, snapshot.sessions?.blockedRequests ?? null);
  req.input("waitsJson", sql.NVarChar(sql.MAX), JSON.stringify(snapshot.waits ?? []));
  req.input("queriesJson", sql.NVarChar(sql.MAX), JSON.stringify(snapshot.topQueries ?? []));
  req.input("collectorErrorsJson", sql.NVarChar(sql.MAX), JSON.stringify(snapshot.errors ?? []));

  await req.query(
    `
    INSERT INTO dbo.db_monitor_snapshots (
      collected_at,
      sqlserver_start_time,
      database_name,
      server_name,
      product_version,
      edition,
      size_mb,
      user_sessions,
      active_requests,
      blocked_requests,
      waits_json,
      queries_json,
      collector_errors_json
    ) VALUES (
      @collectedAt,
      @sqlserverStartTime,
      @databaseName,
      @serverName,
      @productVersion,
      @edition,
      @sizeMb,
      @userSessions,
      @activeRequests,
      @blockedRequests,
      @waitsJson,
      @queriesJson,
      @collectorErrorsJson
    );
    `
  );

  // Retention: keep latest KEEP_SNAPSHOTS rows.
  await pool
    .request()
    .input("keep", sql.Int, KEEP_SNAPSHOTS)
    .query(
      `
      ;WITH keep_rows AS (
        SELECT TOP (@keep) id
        FROM dbo.db_monitor_snapshots
        ORDER BY collected_at DESC
      )
      DELETE FROM dbo.db_monitor_snapshots
      WHERE id NOT IN (SELECT id FROM keep_rows);
      `
    );
};

const collectDbSnapshot = async (pool) => {
  const errors = [];

  const snapshot = {
    collectedAt: new Date().toISOString(),
    sqlserverStartTime: null,
    database: null,
    sizeMb: null,
    sessions: {
      userSessions: null,
      activeRequests: null,
      blockedRequests: null,
    },
    waits: [],
    topQueries: [],
    errors,
  };

  try {
    const rows = await runQuery(
      pool,
      `
      SELECT
        DB_NAME() AS databaseName,
        @@SERVERNAME AS serverName,
        CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(128)) AS productVersion,
        CAST(SERVERPROPERTY('Edition') AS nvarchar(128)) AS edition
      `
    );
    const r = rows[0] ?? null;
    if (r) {
      snapshot.database = {
        databaseName: String(r.databaseName ?? ""),
        serverName: String(r.serverName ?? ""),
        productVersion: String(r.productVersion ?? ""),
        edition: String(r.edition ?? ""),
      };
    }
  } catch (e) {
    errors.push({ section: "database", message: String(e?.message ?? e) });
  }

  try {
    const rows = await runQuery(
      pool,
      `
      SELECT SUM(size) * 8.0 / 1024.0 AS sizeMb
      FROM sys.database_files
      `
    );
    snapshot.sizeMb = safeNumber(rows?.[0]?.sizeMb);
  } catch (e) {
    errors.push({ section: "size", message: String(e?.message ?? e) });
  }

  // Note: these DMVs typically require VIEW SERVER STATE. If not granted, we surface
  // a readable error and keep the rest of the snapshot.
  try {
    const rows = await runQuery(
      pool,
      `
      SELECT COUNT(*) AS userSessions
      FROM sys.dm_exec_sessions
      WHERE is_user_process = 1
      `
    );
    snapshot.sessions.userSessions = safeNumber(rows?.[0]?.userSessions);
  } catch (e) {
    errors.push({ section: "sessions", message: String(e?.message ?? e) });
  }

  try {
    const rows = await runQuery(
      pool,
      `
      SELECT
        SUM(CASE WHEN status IN ('running','runnable','suspended') THEN 1 ELSE 0 END) AS activeRequests,
        SUM(CASE WHEN blocking_session_id > 0 THEN 1 ELSE 0 END) AS blockedRequests
      FROM sys.dm_exec_requests
      `
    );
    snapshot.sessions.activeRequests = safeNumber(rows?.[0]?.activeRequests);
    snapshot.sessions.blockedRequests = safeNumber(rows?.[0]?.blockedRequests);
  } catch (e) {
    errors.push({ section: "requests", message: String(e?.message ?? e) });
  }

  try {
    const rows = await runQuery(
      pool,
      `
      SELECT sqlserver_start_time AS sqlserverStartTime
      FROM sys.dm_os_sys_info
      `
    );
    snapshot.sqlserverStartTime = toIsoOrNull(rows?.[0]?.sqlserverStartTime);
  } catch (e) {
    errors.push({ section: "sqlserver_start_time", message: String(e?.message ?? e) });
  }

  try {
    const rows = await runQuery(
      pool,
      `
      SELECT
        wait_type AS waitType,
        wait_time_ms AS waitMs
      FROM sys.dm_os_wait_stats
      `
    );
    snapshot.waits = rows.map((r) => ({
      waitType: String(r.waitType ?? ""),
      waitMs: safeNumber(r.waitMs),
    }));
  } catch (e) {
    errors.push({ section: "waits", message: String(e?.message ?? e) });
  }

  try {
    const rows = await runQuery(
      pool,
      `
      SELECT TOP (10)
        CONVERT(varchar(34), qs.query_hash, 1) AS queryHash,
        qs.execution_count AS execCount,
        qs.total_elapsed_time / 1000.0 AS totalMs,
        (qs.total_elapsed_time / NULLIF(qs.execution_count, 0)) / 1000.0 AS avgMs,
        qs.total_worker_time / 1000.0 AS cpuMs,
        qs.total_logical_reads AS logicalReads
      FROM sys.dm_exec_query_stats qs
      ORDER BY qs.total_elapsed_time DESC
      `
    );
    snapshot.topQueries = rows.map((r) => ({
      queryHash: String(r.queryHash ?? ""),
      execCount: safeNumber(r.execCount),
      totalMs: safeNumber(r.totalMs),
      avgMs: safeNumber(r.avgMs),
      cpuMs: safeNumber(r.cpuMs),
      logicalReads: safeNumber(r.logicalReads),
    }));
  } catch (e) {
    errors.push({ section: "queries", message: String(e?.message ?? e) });
  }

  return snapshot;
};

const computeHealth = () => {
  const snap = monitorState.snapshot;
  if (monitorState.lastError || !snap) {
    return { status: "red", label: "Error" };
  }
  const ageMs = snap?.collectedAt ? Date.now() - new Date(snap.collectedAt).getTime() : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(ageMs) || ageMs > 2 * ONE_HOUR_MS) {
    return { status: "yellow", label: "Stale" };
  }
  return { status: "green", label: "OK" };
};

const computeWaitDeltas = () => {
  const current = monitorState.snapshot;
  const prev = monitorState.baseline;
  if (!current) return { baselineCollectedAt: null, waits: [], recommended: [] };

  // If we don't have a baseline yet, still return a useful "top waits by total" view.
  if (!prev) {
    const waits = (current.waits ?? [])
      .map((w) => {
        const key = String(w.waitType ?? "");
        const curMs = safeNumber(w.waitMs);
        return {
          waitType: key,
          waitMs: curMs,
          deltaWaitMs: null,
          isNoise: isNoiseWait(key),
        };
      })
      .filter((w) => w.waitType)
      .sort((a, b) => (Number(b.waitMs ?? 0) - Number(a.waitMs ?? 0)))
      .slice(0, 200);

    const recommended = waits
      .filter((w) => !w.isNoise && (w.waitMs ?? 0) > 0)
      .slice()
      .sort((a, b) => (Number(b.waitMs ?? 0) - Number(a.waitMs ?? 0)))
      .slice(0, 10);

    return { baselineCollectedAt: null, waits, recommended };
  }

  if (!current.sqlserverStartTime || !prev.sqlserverStartTime) {
    return { baselineCollectedAt: prev.collectedAt ?? null, waits: [], recommended: [] };
  }
  if (current.sqlserverStartTime !== prev.sqlserverStartTime) {
    // SQL Server restart: deltas are meaningless.
    return { baselineCollectedAt: prev.collectedAt ?? null, waits: [], recommended: [] };
  }

  const currentTs = current.collectedAt ? new Date(current.collectedAt).getTime() : null;
  const prevTs = prev.collectedAt ? new Date(prev.collectedAt).getTime() : null;
  const hours =
    currentTs !== null && prevTs !== null
      ? Math.max(0.001, (currentTs - prevTs) / ONE_HOUR_MS)
      : 1;

  const prevMap = new Map();
  for (const w of prev.waits ?? []) {
    const key = String(w.waitType ?? "");
    const val = safeNumber(w.waitMs);
    if (key) prevMap.set(key, val ?? 0);
  }

  const waitsAll = (current.waits ?? [])
    .map((w) => {
      const key = String(w.waitType ?? "");
      const curMs = safeNumber(w.waitMs);
      const prevMs = prevMap.has(key) ? prevMap.get(key) : null;
      const delta = curMs !== null && prevMs !== null ? (curMs - prevMs) / hours : null;
      return {
        waitType: key,
        waitMs: curMs,
        deltaWaitMs: delta !== null && delta >= 0 ? delta : null,
        isNoise: isNoiseWait(key),
      };
    })
    .filter((w) => w.waitType);

  const waits = waitsAll
    .slice()
    .sort(
      (a, b) =>
        (Number(b.deltaWaitMs ?? 0) - Number(a.deltaWaitMs ?? 0)) ||
        (Number(b.waitMs ?? 0) - Number(a.waitMs ?? 0))
    )
    .slice(0, 200);

  const recommended = waitsAll
    .filter((w) => !w.isNoise && (w.deltaWaitMs ?? 0) > 0)
    .sort((a, b) => (b.deltaWaitMs ?? 0) - (a.deltaWaitMs ?? 0))
    .slice(0, 10);

  return { baselineCollectedAt: prev.collectedAt ?? null, waits, recommended };
};

export const getDbMonitorState = () => {
  const deltas = computeWaitDeltas();
  const historyPoints = (monitorState.history ?? [])
    .slice()
    .reverse()
    .map((s) => ({
      collectedAt: s.collectedAt,
      sizeMb: s.sizeMb,
      userSessions: s.sessions?.userSessions ?? null,
      activeRequests: s.sessions?.activeRequests ?? null,
      blockedRequests: s.sessions?.blockedRequests ?? null,
      partialErrors: Array.isArray(s.errors) ? s.errors.length : 0,
    }));

  return {
    health: computeHealth(),
    snapshot: monitorState.snapshot
      ? {
          id: monitorState.snapshot.id,
          collectedAt: monitorState.snapshot.collectedAt,
          sqlserverStartTime: monitorState.snapshot.sqlserverStartTime ?? null,
          database: monitorState.snapshot.database,
          sizeMb: monitorState.snapshot.sizeMb,
          sessions: monitorState.snapshot.sessions,
          topQueries: monitorState.snapshot.topQueries ?? [],
          errors: monitorState.snapshot.errors ?? [],
          topWaits: deltas.recommended,
          allWaits: deltas.waits,
          baselineCollectedAt: deltas.baselineCollectedAt,
        }
      : null,
    history: {
      keep: KEEP_SNAPSHOTS,
      points: historyPoints,
    },
    refreshing: monitorState.refreshing,
    lastError: monitorState.lastError,
    lastRefreshedAt: monitorState.lastRefreshedAt,
    nextRefreshAt: monitorState.nextRefreshAt,
  };
};

export const refreshDbMonitorSnapshot = async () => {
  if (monitorState.refreshing) {
    return getDbMonitorState();
  }

  monitorState.refreshing = true;
  try {
    const pool = await getPool();
    // Ensure we have history loaded at least once (persisted view).
    if (!Array.isArray(monitorState.history) || monitorState.history.length === 0) {
      try {
        monitorState.history = await readSnapshots(pool, KEEP_SNAPSHOTS);
        monitorState.snapshot = monitorState.history[0] ?? null;
        monitorState.baseline = monitorState.history[1] ?? null;
      } catch {
        // ignore
      }
    }
    const snapshot = await collectDbSnapshot(pool);
    await insertSnapshot(pool, snapshot);

    const history = await readSnapshots(pool, KEEP_SNAPSHOTS);
    monitorState.history = history;
    monitorState.snapshot = history[0] ?? snapshot;
    monitorState.baseline = history[1] ?? null;
    monitorState.lastError = null;
    monitorState.lastRefreshedAt = snapshot.collectedAt;
  } catch (e) {
    monitorState.lastError = String(e?.message ?? e);
  } finally {
    monitorState.refreshing = false;
    monitorState.nextRefreshAt = toIsoOrNull(Date.now() + ONE_HOUR_MS);
  }

  return getDbMonitorState();
};

export const startDbMonitor = () => {
  // Load persisted snapshots (if any), then kick off once at startup, then hourly.
  (async () => {
    try {
      const pool = await getPool();
      monitorState.history = await readSnapshots(pool, KEEP_SNAPSHOTS);
      monitorState.snapshot = monitorState.history[0] ?? null;
      monitorState.baseline = monitorState.history[1] ?? null;
      monitorState.lastRefreshedAt = monitorState.snapshot?.collectedAt ?? null;
    } catch {
      // ignore
    }
    await refreshDbMonitorSnapshot();
  })().catch(() => {});

  const timer = setInterval(() => {
    refreshDbMonitorSnapshot().catch(() => {});
  }, ONE_HOUR_MS);
  // Do not keep the process alive just for this timer.
  timer.unref?.();
};
