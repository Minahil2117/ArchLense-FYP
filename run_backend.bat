@echo off
title ArchLens Backend (FastAPI)
echo ===================================================
echo Starting ArchLens FastAPI Backend on Port 8000...
echo ===================================================
cd /d "%~dp0backend"
call ".venv\Scripts\activate.bat"
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
