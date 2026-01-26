param(
  [string]$AppPath = "C:\apps\CRA_Local",
  [string]$BackupDir = "C:\db_backups\CRA_Local",
  [int]$RetentionDays = 7,
  [string]$DbName,
  [string]$DbServer,
  [string]$DbUser,
  [string]$DbPassword
)

$ErrorActionPreference = "Stop"

function Parse-EnvFile {
  param([string]$Path)
  $vars = @{}
  if (-not (Test-Path $Path)) {
    return $vars
  }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line) { return }
    if ($line.StartsWith("#")) { return }
    if ($line -match '^(\w+)=(.*)$') {
      $key = $matches[1]
      $value = $matches[2]
      if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
        $value = $value.Substring(1, $value.Length - 2)
      } elseif ($value.StartsWith("'") -and $value.EndsWith("'") -and $value.Length -ge 2) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      $vars[$key] = $value
    }
  }
  return $vars
}

$envPath = Join-Path $AppPath ".env"
$envVars = Parse-EnvFile -Path $envPath

if (-not $DbName) { $DbName = $envVars["DB_NAME"] }
if (-not $DbName) { $DbName = "request_navigator" }

if (-not $DbServer) { $DbServer = $envVars["DB_SERVER"] }
if (-not $DbServer) { $DbServer = "localhost" }

if (-not $DbUser) { $DbUser = $envVars["DB_USER"] }
if (-not $DbPassword) { $DbPassword = $envVars["DB_PASSWORD"] }

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

$logDir = Join-Path $AppPath "deploy\logs"
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
}
$logFile = Join-Path $logDir "db-backup.log"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir ("{0}_{1}.bak" -f $DbName, $timestamp)

$startMsg = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting backup to $backupFile"
Add-Content -Path $logFile -Value $startMsg -Encoding ASCII

if ($DbUser -and $DbPassword) {
  & sqlcmd -S $DbServer -U $DbUser -P $DbPassword -Q "BACKUP DATABASE [$DbName] TO DISK = N'$backupFile' WITH INIT"
} else {
  & sqlcmd -S $DbServer -E -Q "BACKUP DATABASE [$DbName] TO DISK = N'$backupFile' WITH INIT"
}

if ($LASTEXITCODE -ne 0) {
  $errMsg = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backup failed with exit code $LASTEXITCODE"
  Add-Content -Path $logFile -Value $errMsg -Encoding ASCII
  throw $errMsg
}

$doneMsg = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backup completed"
Add-Content -Path $logFile -Value $doneMsg -Encoding ASCII

$cutoff = (Get-Date).AddDays(-1 * $RetentionDays)
Get-ChildItem -Path $BackupDir -Filter ("{0}_*.bak" -f $DbName) -File | Where-Object {
  $_.LastWriteTime -lt $cutoff
} | ForEach-Object {
  Remove-Item -Force $_.FullName
}
