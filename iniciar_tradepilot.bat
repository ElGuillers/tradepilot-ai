@echo off
title TradePilot AI - Iniciando Plataforma
echo ===================================================
echo           TRADEPILOT AI - INICIADOR RAPIDO
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/2] Iniciando Backend FastAPI (http://127.0.0.1:8000)...
start "TradePilot AI - Backend" cmd /k "cd backend && .\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak > nul

echo [2/2] Iniciando Frontend Vite (http://localhost:5173)...
start "TradePilot AI - Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak > nul

echo Abriendo navegador en http://localhost:5173...
start http://localhost:5173

echo.
echo ===================================================
echo TradePilot AI esta en ejecucion:
echo - Frontend: http://localhost:5173
echo - Backend:  http://127.0.0.1:8000/api/health
echo ===================================================
pause
