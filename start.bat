@echo off
REM OCEANUM - Welthandels-Simulation: lokaler Start fuer Windows
title OCEANUM
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [Fehler] Node.js wurde nicht gefunden.
  echo Bitte einmalig installieren: https://nodejs.org  (LTS-Version^)
  echo.
  pause
  exit /b 1
)

REM --- Frueher gestartete Instanzen beenden (Port 8080 freigeben) ---
echo  Beende eventuell laufende OCEANUM-Instanzen ...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>nul
)
REM Zusaetzlich evtl. offene OCEANUM-Serverfenster schliessen
taskkill /F /FI "WINDOWTITLE eq OCEANUM-Server*" >nul 2>nul

echo.
echo  OCEANUM startet auf  http://localhost:8080
echo  Browser oeffnet sich automatisch. Zum Beenden dieses Fenster schliessen.
echo.

REM Browser nach kurzer Verzoegerung oeffnen, dann Server im Vordergrund starten
start "" /b cmd /c "timeout /t 1 >nul & start "" http://localhost:8080"
node server.js

pause
