CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL
);
