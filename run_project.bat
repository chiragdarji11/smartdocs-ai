@echo off
title SmartDocs AI Runner
echo ====================================================
echo Starting SmartDocs AI (Full Stack)
echo ====================================================
echo.

set SCRIPT_DIR=%~dp0

:: Launch Backend in its own window
start "SmartDocs AI - Backend" cmd /k "cd /d ""%SCRIPT_DIR%"" && run_backend.bat"

:: Launch Frontend in its own window
start "SmartDocs AI - Frontend" cmd /k "cd /d ""%SCRIPT_DIR%frontend"" && npm run dev"

echo Backend and Frontend windows have been launched!
echo.
echo - Backend API:  http://127.0.0.1:8001
echo - API Docs:     http://127.0.0.1:8001/docs
echo - Frontend UI:  http://localhost:5173
echo.
echo If any window shows an error, check that terminal window for details.
echo.
pause
