$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js 20 or newer is required. Install it from https://nodejs.org/.'
}

if (-not (Test-Path 'server/node_modules')) {
  Write-Host 'Installing backend dependencies...' -ForegroundColor Cyan
  npm install --prefix server
}
if (-not (Test-Path 'client/node_modules')) {
  Write-Host 'Installing frontend dependencies...' -ForegroundColor Cyan
  npm install --prefix client
}

Write-Host 'Starting PulsePoll API and web client...' -ForegroundColor Green
npm run dev
