@echo off
setlocal
title DeFi Backend
cd /d "%~dp0"

echo [%date% %time%] Starting DeFi backend from %CD%
echo.

:loop
npm start
echo.
echo [%date% %time%] Backend stopped (exit code: %errorlevel%). Restarting in 3 seconds... (Ctrl+C to exit)
timeout /t 3 /nobreak >nul
goto loop