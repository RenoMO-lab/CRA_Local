IF OBJECT_ID(N'dbo.db_monitor_snapshots', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.db_monitor_snapshots (
    id INT IDENTITY(1,1) PRIMARY KEY,
    collected_at DATETIME2(3) NOT NULL,
    sqlserver_start_time DATETIME2(3) NULL,
    database_name NVARCHAR(128) NULL,
    server_name NVARCHAR(128) NULL,
    product_version NVARCHAR(128) NULL,
    edition NVARCHAR(256) NULL,
    size_mb FLOAT NULL,
    user_sessions INT NULL,
    active_requests INT NULL,
    blocked_requests INT NULL,
    waits_json NVARCHAR(MAX) NULL,
    queries_json NVARCHAR(MAX) NULL,
    collector_errors_json NVARCHAR(MAX) NULL
  );

  CREATE INDEX IX_db_monitor_snapshots_collected_at
    ON dbo.db_monitor_snapshots(collected_at DESC);
END;

