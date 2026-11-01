# Windows scripts (PowerShell)

Run from this folder (`scripts/windows`), in PowerShell or the VS Code terminal. Make sure MySQL is running (XAMPP) first.

| Script | What it does |
| --- | --- |
| `start-site.ps1` | Frees the port (force-stops whatever uses it; asks for administrator approval only if needed), sets it in .env, installs the libraries the first time, then builds and starts the site |
| `stop-port.ps1` | Only frees a port |
| `find-port-owner.ps1` | Shows which program uses a port, its command and what started it |

    powershell -ExecutionPolicy Bypass -File .\start-site.ps1                 # port 3001
    powershell -ExecutionPolicy Bypass -File .\start-site.ps1 -Port 3000
    powershell -ExecutionPolicy Bypass -File .\start-site.ps1 -Fresh          # empty the local database: sample users again
    powershell -ExecutionPolicy Bypass -File .\stop-port.ps1 -Port 3000
    powershell -ExecutionPolicy Bypass -File .\find-port-owner.ps1 -Port 3000

Then open http://localhost:3001/admin/login and sign in as admin@example.com / adminpass123
(all sample users: `SAMPLE-LOGINS.md` in the repository root).
