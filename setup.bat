@echo off
rem FlyWise AI - one-time setup. Double-click this file, or run it from a terminal.
rem It creates .env, installs the JavaScript and Python packages and checks MongoDB.
title FlyWise AI - setup
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install Node.js 20 or newer from https://nodejs.org , then run this file again.
  echo.
  pause
  exit /b 1
)

node scripts\setup.mjs
echo.
pause
