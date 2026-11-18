@echo off
title TradePilot AI - Detener Plataforma
echo ===================================================
echo           TRADEPILOT AI - APAGADO SEGURO
echo ===================================================
echo.

echo [1/2] Deteniendo procesos en puerto 8000 (Backend FastAPI)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a 2>nul
)

echo [2/2] Deteniendo procesos en puerto 5173 (Frontend Vite)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /f /pid %%a 2>nul
)

echo.
echo ===================================================
echo TradePilot AI ha sido apagado exitosamente.
echo Puertos 8000 y 5173 liberados.
echo ===================================================
timeout /t 3 /nobreak > nul
