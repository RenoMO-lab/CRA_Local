IF COL_LENGTH('dbo.m365_mail_settings', 'templates_json') IS NULL
BEGIN
  ALTER TABLE dbo.m365_mail_settings
  ADD templates_json NVARCHAR(MAX) NULL;
END;
