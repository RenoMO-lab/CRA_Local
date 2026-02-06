IF NOT EXISTS (
  SELECT 1
  FROM dbo.admin_list_items
  WHERE category = 'brakeTypes' AND value = 'As per ROC Standard'
)
BEGIN
  DECLARE @next_brake_types INT = (
    SELECT ISNULL(MAX(sort_order), 0) + 1
    FROM dbo.admin_list_items
    WHERE category = 'brakeTypes'
  );

  INSERT INTO dbo.admin_list_items (id, category, value, sort_order)
  VALUES ('brakeTypes-roc-standard', 'brakeTypes', 'As per ROC Standard', @next_brake_types);
END;

IF NOT EXISTS (
  SELECT 1
  FROM dbo.admin_list_items
  WHERE category = 'mainBodySectionTypes' AND value = 'As per ROC Standard'
)
BEGIN
  DECLARE @next_main_body INT = (
    SELECT ISNULL(MAX(sort_order), 0) + 1
    FROM dbo.admin_list_items
    WHERE category = 'mainBodySectionTypes'
  );

  INSERT INTO dbo.admin_list_items (id, category, value, sort_order)
  VALUES ('mainBodySectionTypes-roc-standard', 'mainBodySectionTypes', 'As per ROC Standard', @next_main_body);
END;

IF NOT EXISTS (
  SELECT 1
  FROM dbo.admin_list_items
  WHERE category = 'clientSealingRequests' AND value = 'As per ROC Standard'
)
BEGIN
  DECLARE @next_client_seal INT = (
    SELECT ISNULL(MAX(sort_order), 0) + 1
    FROM dbo.admin_list_items
    WHERE category = 'clientSealingRequests'
  );

  INSERT INTO dbo.admin_list_items (id, category, value, sort_order)
  VALUES ('clientSealingRequests-roc-standard', 'clientSealingRequests', 'As per ROC Standard', @next_client_seal);
END;

IF NOT EXISTS (
  SELECT 1
  FROM dbo.admin_list_items
  WHERE category = 'cupLogoOptions' AND value = 'As per ROC Standard'
)
BEGIN
  DECLARE @next_cup_logo INT = (
    SELECT ISNULL(MAX(sort_order), 0) + 1
    FROM dbo.admin_list_items
    WHERE category = 'cupLogoOptions'
  );

  INSERT INTO dbo.admin_list_items (id, category, value, sort_order)
  VALUES ('cupLogoOptions-roc-standard', 'cupLogoOptions', 'As per ROC Standard', @next_cup_logo);
END;

IF NOT EXISTS (
  SELECT 1
  FROM dbo.admin_list_items
  WHERE category = 'suspensions' AND value = 'As per ROC Standard'
)
BEGIN
  DECLARE @next_suspensions INT = (
    SELECT ISNULL(MAX(sort_order), 0) + 1
    FROM dbo.admin_list_items
    WHERE category = 'suspensions'
  );

  INSERT INTO dbo.admin_list_items (id, category, value, sort_order)
  VALUES ('suspensions-roc-standard', 'suspensions', 'As per ROC Standard', @next_suspensions);
END;
