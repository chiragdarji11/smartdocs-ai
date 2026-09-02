@echo off
setlocal enabledelayedexpansion
title SmartDocs AI Backend
echo ====================================================
echo Starting SmartDocs AI Backend (FastAPI on Port 8001)
echo ====================================================
echo.

cd /d "%~dp0backend"

set "PY_EXE="

:: 1. Check virtual environment python
if exist "..\venv\Scripts\python.exe" (
    "..\venv\Scripts\python.exe" -c "import sys; print(sys.version)" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PY_EXE=..\venv\Scripts\python.exe"
        goto launch
    ) else (
        echo [!] Existing venv has broken base Python path. Searching for working Python...
    )
)

:: 2. Check system PATH python
python -c "import sys; print(sys.version)" >nul 2>&1
if %errorlevel% equ 0 (
    set "PY_EXE=python"
    goto launch
)

:: 3. Check py launcher
py -3 -c "import sys; print(sys.version)" >nul 2>&1
if %errorlevel% equ 0 (
    set "PY_EXE=py -3"
    goto launch
)

:: 4. Check standard AppData & Program Files Python locations
for %%P in (
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "C:\Program Files\Python313\python.exe"
    "C:\Program Files\Python312\python.exe"
    "C:\Program Files\Python311\python.exe"
    "C:\Program Files\Python310\python.exe"
    "C:\Python313\python.exe"
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
    "C:\Python310\python.exe"
    "%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"
    "%LOCALAPPDATA%\Microsoft\WindowsApps\python3.exe"
) do (
    if exist "%%~P" (
        "%%~P" -c "import sys; print(sys.version)" >nul 2>&1
        if !errorlevel! equ 0 (
            set "PY_EXE=%%~P"
            goto launch
        )
    )
)

echo.
echo ====================================================
echo [ERROR] No working Python installation was found!
echo ====================================================
echo Please install Python 3.10+ or recreate your virtual environment.
echo To recreate:
echo   1. Delete the 'venv' folder
echo   2. Run: python -m venv venv
echo   3. Run: .\venv\Scripts\pip install -r requirements.txt
echo ====================================================
echo.
pause
exit /b 1

:launch
echo [OK] Using Python: !PY_EXE!
echo [INFO] Starting Uvicorn on http://127.0.0.1:8001 ...
echo.

!PY_EXE! -m uvicorn main:app --reload --host 127.0.0.1 --port 8001

if %errorlevel% neq 0 (
    echo.
    echo ====================================================
    echo [ERROR] Backend failed to start.
    echo Check if dependencies are installed or port 8001 is busy.
    echo ====================================================
    echo.
)

pause
