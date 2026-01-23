export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

const jsonResponse = (data: JsonValue, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

const readJson = async (request: Request) => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return null;
  }
  return request.json();
};

const normalizeRequestData = (data: Record<string, any>, nowIso: string) => {
  const history = Array.isArray(data.history) ? data.history : [];
  const attachments = Array.isArray(data.attachments) ? data.attachments : [];

  return {
    ...data,
    history,
    attachments,
    createdAt: data.createdAt ?? nowIso,
    updatedAt: data.updatedAt ?? nowIso,
  };
};

const generateRequestId = async (db: D1Database) => {
  const year = new Date().getFullYear().toString().slice(-2);
  const counterName = `request_${year}`;

  await db
    .prepare("INSERT INTO counters (name, value) VALUES (?, 0) ON CONFLICT(name) DO NOTHING")
    .bind(counterName)
    .run();

  const result = await db
    .prepare("UPDATE counters SET value = value + 1 WHERE name = ? RETURNING value")
    .bind(counterName)
    .first<{ value: number }>();

  if (!result?.value) {
    throw new Error("Failed to generate request id");
  }

  return `CRA${year}${String(result.value).padStart(4, "0")}`;
};

const getRequestById = async (db: D1Database, id: string) => {
  const row = await db.prepare("SELECT data FROM requests WHERE id = ?").bind(id).first<{ data: string }>();
  return row?.data ? (JSON.parse(row.data) as Record<string, any>) : null;
};

const getClientKey = (request: Request) => {
  const ip = request.headers.get("cf-connecting-ip");
  return ip ? `ip:${ip}` : "ip:unknown";
};

const checkRateLimit = async (db: D1Database, request: Request) => {
  const windowMs = 60_000;
  const limit = 60;
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${getClientKey(request)}:${windowStart}`;

  const row = await db
    .prepare("SELECT count FROM rate_limits WHERE key = ?")
    .bind(key)
    .first<{ count: number }>();

  if (!row) {
    await db.prepare("INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)")
      .bind(key, new Date(windowStart).toISOString())
      .run();
    return null;
  }

  if (row.count >= limit) {
    return windowStart + windowMs;
  }

  await db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();
  return null;
};

const ADMIN_LIST_CATEGORIES = new Set([
  "applicationVehicles",
  "countries",
  "brakeTypes",
  "brakeSizes",
  "suspensions",
  "repeatabilityTypes",
  "expectedDeliveryOptions",
  "workingConditions",
  "usageTypes",
  "environments",
  "axleLocations",
  "articulationTypes",
  "configurationTypes",
]);

const fetchAdminLists = async (db: D1Database) => {
  const { results } = await db
    .prepare("SELECT id, category, value FROM admin_list_items ORDER BY category, sort_order, value")
    .all<{ id: string; category: string; value: string }>();

  const lists: Record<string, { id: string; value: string }[]> = {};
  for (const category of ADMIN_LIST_CATEGORIES) {
    lists[category] = [];
  }

  for (const row of results) {
    if (!lists[row.category]) {
      lists[row.category] = [];
    }
    lists[row.category].push({ id: row.id, value: row.value });
  }

  return lists;
};

const parseJsonArray = (value: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      if (!env.ASSETS) {
        console.error("ASSETS binding is not configured.");
        return new Response("Assets binding is not configured.", { status: 500 });
      }
      return env.ASSETS.fetch(request);
    }

    const retryAt = await checkRateLimit(env.DB, request);
    if (retryAt) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": Math.ceil((retryAt - Date.now()) / 1000).toString(),
        },
      });
    }

    if (url.pathname.startsWith("/api/admin/lists")) {
      const path = url.pathname.replace("/api/admin/lists", "").replace(/^\/+/, "");
      const segments = path ? path.split("/") : [];

      if (segments.length === 0) {
        if (request.method === "GET") {
          const lists = await fetchAdminLists(env.DB);
          return jsonResponse(lists);
        }
        return new Response("Method not allowed", { status: 405 });
      }

      const category = segments[0];
      if (!ADMIN_LIST_CATEGORIES.has(category)) {
        return jsonResponse({ error: "Unknown list category" }, 404);
      }

      if (segments.length === 1) {
        if (request.method === "POST") {
          const body = (await readJson(request)) as Record<string, any> | null;
          const value = String(body?.value ?? "").trim();
          if (!value) {
            return jsonResponse({ error: "Missing value" }, 400);
          }

          const id = crypto.randomUUID();
          const sortRow = await env.DB
            .prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM admin_list_items WHERE category = ?")
            .bind(category)
            .first<{ next: number }>();
          const sortOrder = sortRow?.next ?? 1;

          await env.DB
            .prepare("INSERT INTO admin_list_items (id, category, value, sort_order) VALUES (?, ?, ?, ?)")
            .bind(id, category, value, sortOrder)
            .run();

          return jsonResponse({ id, value }, 201);
        }

        if (request.method === "GET") {
          const lists = await fetchAdminLists(env.DB);
          return jsonResponse(lists[category] ?? []);
        }

        return new Response("Method not allowed", { status: 405 });
      }

      const itemId = segments[1];
      if (request.method === "PUT") {
        const body = (await readJson(request)) as Record<string, any> | null;
        const value = String(body?.value ?? "").trim();
        if (!value) {
          return jsonResponse({ error: "Missing value" }, 400);
        }

        await env.DB
          .prepare("UPDATE admin_list_items SET value = ? WHERE id = ? AND category = ?")
          .bind(value, itemId, category)
          .run();

        return jsonResponse({ id: itemId, value });
      }

      if (request.method === "DELETE") {
        await env.DB
          .prepare("DELETE FROM admin_list_items WHERE id = ? AND category = ?")
          .bind(itemId, category)
          .run();
        return new Response(null, { status: 204 });
      }

      return new Response("Method not allowed", { status: 405 });
    }

    if (url.pathname.startsWith("/api/feedback")) {
      if (request.method === "POST") {
        const body = (await readJson(request)) as Record<string, any> | null;
        if (!body) {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        const type = String(body.type ?? "").trim();
        const title = String(body.title ?? "").trim();
        const description = String(body.description ?? "").trim();
        const steps = String(body.steps ?? "").trim();
        const severity = String(body.severity ?? "").trim();
        const pagePath = String(body.pagePath ?? "").trim();
        const userName = String(body.userName ?? "").trim();
        const userEmail = String(body.userEmail ?? "").trim();
        const userRole = String(body.userRole ?? "").trim();

        if (!type || !title || !description) {
          return jsonResponse({ error: "Missing required fields" }, 400);
        }

        const id = crypto.randomUUID();
        const nowIso = new Date().toISOString();

        await env.DB.prepare(
          "INSERT INTO feedback (id, type, title, description, steps, severity, page_path, user_name, user_email, user_role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
          .bind(id, type, title, description, steps, severity, pagePath, userName, userEmail, userRole, nowIso)
          .run();

        return jsonResponse(
          {
            id,
            type,
            title,
            description,
            steps,
            severity,
            pagePath,
            userName,
            userEmail,
            userRole,
            createdAt: nowIso,
          },
          201
        );
      }

      if (request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT id, type, title, description, steps, severity, page_path, user_name, user_email, user_role, created_at FROM feedback ORDER BY created_at DESC"
        ).all<{
          id: string;
          type: string;
          title: string;
          description: string;
          steps: string | null;
          severity: string | null;
          page_path: string | null;
          user_name: string | null;
          user_email: string | null;
          user_role: string | null;
          created_at: string;
        }>();

        const data = results.map((row) => ({
          id: row.id,
          type: row.type,
          title: row.title,
          description: row.description,
          steps: row.steps ?? "",
          severity: row.severity ?? "",
          pagePath: row.page_path ?? "",
          userName: row.user_name ?? "",
          userEmail: row.user_email ?? "",
          userRole: row.user_role ?? "",
          createdAt: row.created_at,
        }));

        return jsonResponse(data);
      }

      return new Response("Method not allowed", { status: 405 });
    }

    if (url.pathname.startsWith("/api/price-list")) {
      const path = url.pathname.replace("/api/price-list", "").replace(/^\/+/, "");
      const segments = path ? path.split("/") : [];

      if (segments.length === 0) {
        if (request.method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT id, configuration_type, articulation_type, brake_type, brake_size, studs_pcd_standards, created_at, updated_at FROM reference_products ORDER BY updated_at DESC"
          ).all<{
            id: string;
            configuration_type: string | null;
            articulation_type: string | null;
            brake_type: string | null;
            brake_size: string | null;
            studs_pcd_standards: string | null;
            created_at: string;
            updated_at: string;
          }>();

          const data = results.map((row) => ({
            id: row.id,
            configurationType: row.configuration_type ?? "",
            articulationType: row.articulation_type ?? "",
            brakeType: row.brake_type ?? "",
            brakeSize: row.brake_size ?? "",
            studsPcdStandards: parseJsonArray(row.studs_pcd_standards),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));

          return jsonResponse(data);
        }

        if (request.method === "POST") {
          const body = (await readJson(request)) as Record<string, any> | null;
          if (!body) {
            return jsonResponse({ error: "Invalid JSON body" }, 400);
          }

          const nowIso = new Date().toISOString();
          const id = crypto.randomUUID();
          const studs = Array.isArray(body.studsPcdStandards) ? body.studsPcdStandards : [];

          await env.DB.prepare(
            "INSERT INTO reference_products (id, configuration_type, articulation_type, brake_type, brake_size, studs_pcd_standards, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          )
            .bind(
              id,
              body.configurationType ?? "",
              body.articulationType ?? "",
              body.brakeType ?? "",
              body.brakeSize ?? "",
              JSON.stringify(studs),
              nowIso,
              nowIso
            )
            .run();

          return jsonResponse(
            {
              id,
              configurationType: body.configurationType ?? "",
              articulationType: body.articulationType ?? "",
              brakeType: body.brakeType ?? "",
              brakeSize: body.brakeSize ?? "",
              studsPcdStandards: studs,
              createdAt: nowIso,
              updatedAt: nowIso,
            },
            201
          );
        }

        return new Response("Method not allowed", { status: 405 });
      }

      const itemId = segments[0];

      if (request.method === "PUT") {
        const body = (await readJson(request)) as Record<string, any> | null;
        if (!body) {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        const nowIso = new Date().toISOString();
        const studs = Array.isArray(body.studsPcdStandards) ? body.studsPcdStandards : [];

        await env.DB.prepare(
          "UPDATE reference_products SET configuration_type = ?, articulation_type = ?, brake_type = ?, brake_size = ?, studs_pcd_standards = ?, updated_at = ? WHERE id = ?"
        )
          .bind(
            body.configurationType ?? "",
            body.articulationType ?? "",
            body.brakeType ?? "",
            body.brakeSize ?? "",
            JSON.stringify(studs),
            nowIso,
            itemId
          )
          .run();

        return jsonResponse({
          id: itemId,
          configurationType: body.configurationType ?? "",
          articulationType: body.articulationType ?? "",
          brakeType: body.brakeType ?? "",
          brakeSize: body.brakeSize ?? "",
          studsPcdStandards: studs,
          updatedAt: nowIso,
        });
      }

      if (request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM reference_products WHERE id = ?").bind(itemId).run();
        return new Response(null, { status: 204 });
      }

      return new Response("Method not allowed", { status: 405 });
    }

    const path = url.pathname.replace("/api/requests", "").replace(/^\/+/, "");
    const segments = path ? path.split("/") : [];

    if (segments.length === 0) {
      if (request.method === "GET") {
        const { results } = await env.DB.prepare("SELECT data FROM requests ORDER BY updated_at DESC").all<{
          data: string;
        }>();
        const data = results.map((row) => JSON.parse(row.data));
        return jsonResponse(data);
      }

      if (request.method === "POST") {
        const body = (await readJson(request)) as Record<string, any> | null;
        if (!body) {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        const nowIso = new Date().toISOString();
        const id = await generateRequestId(env.DB);
        const status = body.status ?? "draft";

        const initialHistory = [
          {
            id: `h-${Date.now()}`,
            status,
            timestamp: nowIso,
            userId: body.createdBy ?? "",
            userName: body.createdByName ?? "",
          },
        ];

        const requestData = normalizeRequestData(
          {
            ...body,
            id,
            status,
            createdAt: nowIso,
            updatedAt: nowIso,
            history: body.history?.length ? body.history : initialHistory,
          },
          nowIso
        );

        await env.DB.prepare(
          "INSERT INTO requests (id, data, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
          .bind(id, JSON.stringify(requestData), status, nowIso, nowIso)
          .run();

        return jsonResponse(requestData, 201);
      }

      return new Response("Method not allowed", { status: 405 });
    }

    const requestId = segments[0];
    const subRoute = segments[1];

    if (subRoute === "status") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      const body = (await readJson(request)) as Record<string, any> | null;
      if (!body?.status) {
        return jsonResponse({ error: "Missing status" }, 400);
      }

      const existing = await getRequestById(env.DB, requestId);
      if (!existing) {
        return jsonResponse({ error: "Request not found" }, 404);
      }

      const nowIso = new Date().toISOString();
      const historyEntry = {
        id: `h-${Date.now()}`,
        status: body.status,
        timestamp: nowIso,
        userId: body.userId ?? "",
        userName: body.userName ?? "",
        comment: body.comment,
      };

      const updated = normalizeRequestData(
        {
          ...existing,
          status: body.status,
          updatedAt: nowIso,
          history: [...(existing.history ?? []), historyEntry],
        },
        nowIso
      );

      await env.DB.prepare("UPDATE requests SET data = ?, status = ?, updated_at = ? WHERE id = ?")
        .bind(JSON.stringify(updated), updated.status, nowIso, requestId)
        .run();

      return jsonResponse(updated);
    }

    if (request.method === "GET") {
      const existing = await getRequestById(env.DB, requestId);
      if (!existing) {
        return jsonResponse({ error: "Request not found" }, 404);
      }
      return jsonResponse(existing);
    }

    if (request.method === "PUT") {
      const body = (await readJson(request)) as Record<string, any> | null;
      if (!body) {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const existing = await getRequestById(env.DB, requestId);
      if (!existing) {
        return jsonResponse({ error: "Request not found" }, 404);
      }

      const nowIso = new Date().toISOString();
      const updated = normalizeRequestData(
        {
          ...existing,
          ...body,
          updatedAt: nowIso,
        },
        nowIso
      );

      await env.DB.prepare("UPDATE requests SET data = ?, status = ?, updated_at = ? WHERE id = ?")
        .bind(JSON.stringify(updated), updated.status ?? existing.status, nowIso, requestId)
        .run();

      return jsonResponse(updated);
    }

    if (request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM requests WHERE id = ?").bind(requestId).run();
      return new Response(null, { status: 204 });
    }

    return new Response("Method not allowed", { status: 405 });
  },
};
