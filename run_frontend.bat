@echo off
title ArchLens Frontend (Next.js)
echo ===================================================
echo Starting ArchLens Next.js Frontend on Port 3000...
echo ===================================================
cd /d "%~dp0frontend"
npm run dev -- --port 3000
pause
