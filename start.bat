@echo off
setlocal EnableDelayedExpansion
title GarmentForge — StitchSmart Studio
color 0A

echo.
echo  ============================================================
echo    GarmentForge ^| StitchSmart Studio
echo    Starting backend + frontend...
echo  ============================================================
echo.

:: Capture the root directory (where this .bat lives)
set "ROOT=%~dp0"
:: Remove trailing backslash
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"

:: ── 1. Check Python ──────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found on PATH.
    echo  Download from: https://www.python.org/downloads/
    pause & exit /b 1
)

:: ── 2. Check Node/npm ────────────────────────────────────────
call npm --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found on PATH.
    echo  Download from: https://nodejs.org/
    pause & exit /b 1
)

:: ── 3. Create venv if missing ────────────────────────────────
if not exist "%BACKEND%\venv\Scripts\activate.bat" (
    echo  [1/4] Creating Python virtual environment ^(first time^)...
    python -m venv "%BACKEND%\venv"
) else (
    echo  [1/4] Python venv found.
)

:: ── 4. Install backend deps ───────────────────────────────────
echo  [2/4] Installing backend dependencies...
call "%BACKEND%\venv\Scripts\activate.bat"
pip install -r "%BACKEND%\requirements.txt" --quiet --disable-pip-version-check
call deactivate

:: ── 5. Install frontend deps if missing ──────────────────────
if not exist "%FRONTEND%\node_modules" (
    echo  [3/4] Installing frontend dependencies ^(first time^)...
    cd /d "%FRONTEND%"
    call npm install --silent
    cd /d "%ROOT%"
) else (
    echo  [3/4] Frontend node_modules found.
)

:: ── 6. Write helper scripts to temp so paths with spaces work ─
set "BACK_CMD=%TEMP%\garmentforge_backend.bat"
set "FRONT_CMD=%TEMP%\garmentforge_frontend.bat"

(
    echo @echo off
    echo title StitchSmart Backend ^(FastAPI :8000^)
    echo cd /d "%BACKEND%"
    echo call venv\Scripts\activate
    echo echo.
    echo echo  Backend  : http://localhost:8000
    echo echo  API docs : http://localhost:8000/docs
    echo echo  Press Ctrl+C to stop.
    echo echo.
    echo uvicorn main:app --reload
    echo pause
) > "%BACK_CMD%"

(
    echo @echo off
    echo title StitchSmart Frontend ^(Next.js :3000^)
    echo cd /d "%FRONTEND%"
    echo echo.
    echo echo  Frontend : http://localhost:3000
    echo echo  Press Ctrl+C to stop.
    echo echo.
    echo npm run dev
    echo pause
) > "%FRONT_CMD%"

:: ── 7. Launch both windows ────────────────────────────────────
echo  [4/4] Launching servers...
start "StitchSmart Backend" cmd /c "%BACK_CMD%"

timeout /t 4 /nobreak >nul

start "StitchSmart Frontend" cmd /c "%FRONT_CMD%"

:: ── 8. Open browser ───────────────────────────────────────────
echo  Opening browser in 6 seconds...
timeout /t 6 /nobreak >nul
start http://localhost:3000

echo.
echo  ============================================================
echo    Both servers are now running!
echo.
echo    Backend  ^>  http://localhost:8000
echo    Frontend ^>  http://localhost:3000
echo.
echo    Close the two terminal windows to stop the app.
echo  ============================================================
echo.
pause
