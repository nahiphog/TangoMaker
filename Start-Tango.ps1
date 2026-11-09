$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path 'node_modules')) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
Write-Host 'Tango generator: http://localhost:5173/tango'
& npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
