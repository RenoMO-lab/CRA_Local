CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

INSERT OR IGNORE INTO counters (name, value) VALUES ('request', 0);
