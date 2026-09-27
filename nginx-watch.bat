@echo off
setlocal enabledelayedexpansion
title nginx watcher
cd /d "%~dp0"

set "NPROC=nginx.exe"
set "CONF=conf\nginx.conf"

goto :start

rem --- helper: read config modified time (high resolution ticks via PowerShell) ---
:getsig
for /f "delims=" %%A in ('powershell -NoProfile -Command "(Get-Item '%CONF%').LastWriteTime.Ticks" 2^>nul') do set "SIG=%%A"
exit /b

rem --- force stop any running nginx ---
:stopnginx
taskkill /F /IM %NPROC% >nul 2>&1
exit /b

rem --- check whether nginx is currently running ---
:isrunning
tasklist /FI "IMAGENAME eq %NPROC%" 2>nul | find /I "%NPROC%" >nul
exit /b

rem ==== startup: grab initial signature, then force restart once ====
:start
call :getsig
call :stopnginx
start "" /d "%~dp0" %NPROC%
echo [%date% %time%] nginx started. Watching %CONF%

rem ==== main watch loop (runs forever) ====
:watch
ping -n 6 127.0.0.1 >nul

rem --- detect config change (compare ticks) ---
for /f "delims=" %%A in ('powershell -NoProfile -Command "(Get-Item '%CONF%').LastWriteTime.Ticks" 2^>nul') do set "NEWSIG=%%A"
if not "%NEWSIG%"=="%SIG%" (
    set "SIG=%NEWSIG%"
    echo [%date% %time%] %CONF% changed - restarting nginx
    call :stopnginx
    start "" /d "%~dp0" %NPROC%
)

rem --- safety: restart if nginx crashed / was killed externally ---
call :isrunning
if errorlevel 1 (
    echo [%date% %time%] %NPROC% not running - restarting
    call :stopnginx
    start "" /d "%~dp0" %NPROC%
)

goto :watch