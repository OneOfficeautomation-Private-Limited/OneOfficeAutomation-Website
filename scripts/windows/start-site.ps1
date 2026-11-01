# Starts the website on this computer: frees the port (force-stops whatever uses it), sets the port in .env,
# then builds and starts the site.
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\start-site.ps1             (port 3001)
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\start-site.ps1 -Port 3000
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\start-site.ps1 -Fresh      (also empties the local database: sample users again)
param([int]$Port = 3001, [switch]$Fresh)

# Find the project folder: this script sits in scripts\windows inside it, or in the package next to it.
$project = @("$PSScriptRoot\..\..", "$PSScriptRoot\..\1-website-code\oneofficeautomation_Website") | Where-Object { Test-Path "$_\package.json" } | Select-Object -First 1
if (-not $project) { Write-Host "Can't find the website folder (package.json)."; exit 1 }
Set-Location (Resolve-Path $project)

# 1. Free the port (asks for administrator approval only if needed)
$pids = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique
foreach ($p in $pids) {
  try { Stop-Process -Id $p -Force -ErrorAction Stop; Write-Host "Stopped process $p on port $Port" }
  catch { Write-Host "Process $p needs administrator rights: click Yes on the Windows prompt"; Start-Process taskkill -ArgumentList "/PID $p /T /F" -Verb RunAs -Wait }
}
Start-Sleep -Seconds 2
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
  Write-Host "Port $Port was taken again straight away: another program restarts automatically. Use another port (-Port 3001), or run find-port-owner.ps1 to see what it is."
  exit 1
}
Write-Host "Port $Port is free."

# 2. Settings: create .env if missing, and set the port
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (Select-String -Path .env -Pattern '^PORT=' -Quiet) { (Get-Content .env) -replace '^PORT=.*', "PORT=$Port" | Set-Content .env } else { Add-Content .env "PORT=$Port" }

# 3. Libraries (first time), optional fresh database, then start
if (-not (Test-Path node_modules)) { npm install }
if ($Fresh) { npm run local:fresh }
npm run local
