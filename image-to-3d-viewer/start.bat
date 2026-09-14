@echo off
title Image to 3D Mesh Viewer
color 0A

echo.
echo  ===========================================
echo   Image to 3D Mesh Viewer - Starting up...
echo  ===========================================
echo.

:: Go to the directory where this script lives
cd /d "%~dp0"

:: Check Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python is not installed or not on PATH.
    echo  Download Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Install dependencies if needed
echo  [1/2] Installing Python dependencies...
pip install -r backend\requirements.txt --quiet

echo  [2/2] Starting Flask server...
echo.
echo  ----------------------------------------
echo   App running at: http://localhost:5000
echo   Press Ctrl+C to stop the server.
echo  ----------------------------------------
echo.

:: Open browser automatically after 2 seconds
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5000"

:: Start Flask
python backend\app.py

pause
