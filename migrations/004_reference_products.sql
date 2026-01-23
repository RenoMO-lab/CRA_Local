CREATE TABLE IF NOT EXISTS reference_products (
  id TEXT PRIMARY KEY,
  configuration_type TEXT,
  articulation_type TEXT,
  brake_type TEXT,
  brake_size TEXT,
  studs_pcd_standards TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reference_products_updated_at ON reference_products (updated_at DESC);
