@echo off
title PulsePoll Development
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js 20 or newer from https://nodejs.org/
  pause
  exit /b 1
)
if not exist "server\node_modules" (
  echo Installing backend dependencies...
  call npm install --prefix server || goto :error
)
if not exist "client\node_modules" (
  echo Installing frontend dependencies...
  call npm install --prefix client || goto :error
)
echo Starting PulsePoll API and web client...
call npm run dev
goto :eof
:error
echo Setup failed. Check the error above and try again.
pause
exit /b 1
