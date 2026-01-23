CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps TEXT,
  severity TEXT,
  page_path TEXT,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT,
  created_at TEXT NOT NULL
);
