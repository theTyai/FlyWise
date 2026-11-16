@echo off
rem FlyWise AI - start every service. Double-click this file, or run: npm run dev
rem Press Ctrl+C in this window to stop everything.
title FlyWise AI
cd /d "%~dp0"

if not exist node_modules (
  echo The project is not set up yet. Running setup first...
  echo.
  call setup.bat
)

echo.
echo   Traveller app   http://localhost:5173
echo   Desk (admin)    http://localhost:5174
echo.
echo   Wait until the lines "user-api", "admin-api", "user-web" and "admin-web" appear, then open the links above.
echo.
call npm run dev
pause
