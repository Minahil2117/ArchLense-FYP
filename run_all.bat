@echo off
title ArchLens Launcher
echo ===================================================
echo Launching ArchLens Backend & Frontend...
echo ===================================================
start "ArchLens Backend" cmd /c "call "%~dp0run_backend.bat""
timeout /t 3 /nobreak >nul
start "ArchLens Frontend" cmd /c "call "%~dp0run_frontend.bat""
echo Services launched!
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:3000
pause
