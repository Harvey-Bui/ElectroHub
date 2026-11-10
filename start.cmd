@echo off
rem ElectroHub one-click start (Windows). Double-click this file.
rem Starts Redis in Docker, then the API and the website in their own windows,
rem then opens the store. Close those two windows (or press Ctrl+C in them) to stop.

cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker was not found. Install and open Docker Desktop, then run this again.
  pause
  exit /b 1
)

echo Starting Redis...
docker compose up -d redis
if errorlevel 1 (
  echo.
  echo Redis did not start. Open Docker Desktop, wait for "Engine running", then run this again.
  pause
  exit /b 1
)

if not exist "server\node_modules" (
  echo Installing server dependencies (first run only)...
  call npm.cmd --prefix server ci
)
if not exist "client\node_modules" (
  echo Installing website dependencies (first run only)...
  call npm.cmd --prefix client ci
)

start "ElectroHub API (port 4000)" cmd /k npm.cmd --prefix server run dev
start "ElectroHub website (port 5173)" cmd /k npm.cmd --prefix client run dev

echo Waiting for the servers to start...
timeout /t 8 /nobreak >nul
start "" http://localhost:5173

echo.
echo Store:  http://localhost:5173
echo Admin:  http://localhost:5173/admin
echo Keep the two server windows open while you use the site.
timeout /t 5 >nul
