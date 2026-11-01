# Shows which program uses a port, its full command and what started it.   powershell -ExecutionPolicy Bypass -File .\find-port-owner.ps1 -Port 3000
param([int]$Port = 3000)
$c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $c) { Write-Host "Nothing is using port $Port."; exit 0 }
$c | ForEach-Object {
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)"
  $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ParentProcessId)"
  [pscustomobject]@{ PID = $p.ProcessId; Program = $p.Name; Command = $p.CommandLine; StartedBy = "$($parent.Name) ($($parent.ProcessId))" }
} | Format-List
