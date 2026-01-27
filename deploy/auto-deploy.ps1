param(
  [string]$AppPath = "C:\apps\CRA_Local",
  [string]$Branch = "main",
  [string]$LogDir = "C:\apps\CRA_Local\deploy\logs",
  [string]$DeployScript = "C:\apps\CRA_Local\deploy\deploy.ps1",
  [string]$SshKeyPath = "C:\Users\Administrator\.ssh\github_actions",
  [string]$KnownHostsPath = "C:\ProgramData\ssh\known_hosts"
)

$ErrorActionPreference = "Stop"

function Write-Log {
  param(
    [string]$Message,
    [string]$Level = "INFO"
  )
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$ts] [$Level] $Message"
  Add-Content -Path $script:LogFile -Value $line -Encoding ASCII
}

if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
}
$script:LogFile = Join-Path $LogDir "auto-deploy.log"
$lockPath = Join-Path $LogDir "auto-deploy.lock"

try {
  try {
    $lockStream = [System.IO.File]::Open(
      $lockPath,
      [System.IO.FileMode]::OpenOrCreate,
      [System.IO.FileAccess]::ReadWrite,
      [System.IO.FileShare]::None
    )
  } catch {
    Write-Log "Another run is in progress; skipping." "WARN"
    return
  }

  Write-Log "Starting auto-deploy check."

  if (-not (Test-Path $AppPath)) {
    if ($PSScriptRoot) {
      $fallbackPath = Split-Path $PSScriptRoot -Parent
      if (Test-Path $fallbackPath) {
        Write-Log "AppPath not found: $AppPath. Falling back to $fallbackPath" "WARN"
        $AppPath = $fallbackPath
        $LogDir = Join-Path $AppPath "deploy\logs"
        if (-not (Test-Path $LogDir)) {
          New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
        }
        $script:LogFile = Join-Path $LogDir "auto-deploy.log"
        $lockPath = Join-Path $LogDir "auto-deploy.lock"
      }
    }
  }

  if (-not (Test-Path $AppPath)) {
    Write-Log "AppPath not found: $AppPath" "ERROR"
    return
  }
  if (-not (Test-Path (Join-Path $AppPath ".git"))) {
    Write-Log "No git repo found at $AppPath" "ERROR"
    return
  }
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Log "git not found in PATH." "ERROR"
    return
  }

  if (-not (Test-Path $SshKeyPath)) {
    Write-Log "SSH key not found: $SshKeyPath" "ERROR"
    return
  }
  $khDir = Split-Path $KnownHostsPath
  if (-not (Test-Path $khDir)) {
    New-Item -ItemType Directory -Force -Path $khDir | Out-Null
  }
  Get-ChildItem -Path $AppPath -Filter "C*known_hosts" -File -ErrorAction SilentlyContinue | Remove-Item -Force
  $sshKey = $SshKeyPath -replace '\\', '/'
  $knownHosts = $KnownHostsPath -replace '\\', '/'
  $env:GIT_SSH_COMMAND = "ssh -i `"$sshKey`" -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=`"$knownHosts`""

  Set-Location $AppPath

  $status = git status --porcelain
  if ($status) {
    Write-Log ("Working tree dirty; skipping deploy. Status: {0}" -f ($status -join "; ")) "WARN"
    return
  }

  $fetchOutput = git fetch --prune origin 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Log ("git fetch failed: {0}" -f ($fetchOutput -join " ")) "ERROR"
    return
  }

  $remoteUrl = git remote get-url origin 2>$null
  if ($remoteUrl) {
    Write-Log "Origin: $remoteUrl"
  }

  $local = git rev-parse "refs/heads/$Branch" 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $local) {
    Write-Log "Local branch '$Branch' not found." "ERROR"
    return
  }
  $remote = git rev-parse "refs/remotes/origin/$Branch" 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $remote) {
    Write-Log "Remote branch 'origin/$Branch' not found." "ERROR"
    return
  }

  Write-Log "Local $Branch: $local"
  Write-Log "Remote origin/$Branch: $remote"

  if ($local -eq $remote) {
    Write-Log "No changes on origin/$Branch."
    return
  }

  if (-not (Test-Path $DeployScript)) {
    Write-Log "Deploy script not found: $DeployScript" "ERROR"
    return
  }

  Write-Log "Changes detected ($local -> $remote). Running deploy."
  & $DeployScript -AppPath $AppPath
  Write-Log "Deploy finished successfully."
} catch {
  Write-Log "Deploy failed: $($_.Exception.Message)" "ERROR"
  throw
} finally {
  if ($lockStream) {
    $lockStream.Close()
    $lockStream.Dispose()
  }
}
