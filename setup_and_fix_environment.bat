@echo off
setlocal enabledelayedexpansion
title SmartDocs AI - Environment Fixer
echo ====================================================
echo SmartDocs AI - Python Virtual Environment Repair
echo ====================================================
echo.

cd /d "%~dp0"

:: Find working python
set "SYS_PY="
python -c "import sys; print(sys.version)" >nul 2>&1
if %errorlevel% equ 0 set "SYS_PY=python"

if not defined SYS_PY (
    py -3 -c "import sys; print(sys.version)" >nul 2>&1
    if %errorlevel% equ 0 set "SYS_PY=py -3"
)

if not defined SYS_PY (
    for %%P in (
        "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
        "C:\Program Files\Python313\python.exe"
        "C:\Program Files\Python312\python.exe"
        "C:\Program Files\Python311\python.exe"
        "C:\Program Files\Python310\python.exe"
        "C:\Python312\python.exe"
        "%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"
    ) do (
        if exist "%%~P" (
            "%%~P" -c "import sys; print(sys.version)" >nul 2>&1
            if !errorlevel! equ 0 (
                set "SYS_PY=%%~P"
                goto py_found
            )
        )
    )
)

:py_found
if not defined SYS_PY (
    echo [ERROR] Could not find a working Python executable on this system.
    echo Please install Python 3.10+ from python.org and check 'Add Python to PATH'.
    pause
    exit /b 1
)

echo [OK] Found Python: !SYS_PY!
echo.
echo [1/3] Removing old broken virtual environment...
if exist "venv" (
    rmdir /s /q "venv"
)

echo [2/3] Creating fresh virtual environment in 'venv'...
!SYS_PY! -m venv venv
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create virtual environment.
    pause
    exit /b 1
)

echo [3/3] Installing backend dependencies...
venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\pip.exe install -r requirements.txt

echo.
echo ====================================================
echo Virtual environment successfully repaired!
echo Now you can run 'run_project.bat' smoothly.
echo ====================================================
echo.
pause
