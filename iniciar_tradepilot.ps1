# TradePilot AI - Script PowerShell de arranque rápido
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          TRADEPILOT AI - INICIADOR RAPIDO         " -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/2] Iniciando Backend FastAPI (http://127.0.0.1:8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; & '.\.venv\Scripts\uvicorn.exe' app.main:app --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 2

Write-Host "[2/2] Iniciando Frontend React/Vite (http://localhost:5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Abriendo http://localhost:5173 en tu navegador..." -ForegroundColor Magenta
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "TradePilot AI esta listo y operando." -ForegroundColor Green
