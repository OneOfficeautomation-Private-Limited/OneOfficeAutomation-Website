# Force-stops whatever is using a port.   powershell -ExecutionPolicy Bypass -File .\stop-port.ps1 -Port 3001
param([int]$Port = 3001)
$pids = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique
if (-not $pids) { Write-Host "Nothing is using port $Port."; exit 0 }
foreach ($p in $pids) {
  try { Stop-Process -Id $p -Force -ErrorAction Stop; Write-Host "Stopped process $p on port $Port" }
  catch { Write-Host "Process $p needs administrator rights: click Yes on the Windows prompt"; Start-Process taskkill -ArgumentList "/PID $p /T /F" -Verb RunAs -Wait }
}
