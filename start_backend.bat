@echo off
title Charmeey AI-SaaS Backend
cd /d "%~dp0"

set "PY=%CD%\venv\Scripts\python.exe"

if not exist "%PY%" (
    echo Creating virtual environment...
    python -m venv venv
    "%PY%" -m pip install --upgrade pip
    "%PY%" -m pip install -r requirements.txt
)

echo Using: %PY%
"%PY%" -c "import websockets; print('websockets', websockets.__version__)"

echo Starting backend on http://localhost:8000 ...
:loop
"%PY%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
echo.
echo Backend stopped. Restarting in 3 seconds... (Ctrl+C to exit)
timeout /t 3 /nobreak >nul
goto loop