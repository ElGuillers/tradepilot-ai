# TradePilot AI - Script PowerShell de apagado seguro
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          TRADEPILOT AI - APAGADO SEGURO           " -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Deteniendo Backend FastAPI en puerto 8000..." -ForegroundColor Yellow
$p8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($p8000) {
    foreach ($pidNum in $p8000) {
        Stop-Process -Id $pidNum -Force -ErrorAction SilentlyContinue
        Write-Host "Proceso PID $pidNum cerrado." -ForegroundColor Green
    }
} else {
    Write-Host "No habia procesos en puerto 8000." -ForegroundColor Gray
}

Write-Host "[2/2] Deteniendo Frontend Vite en puerto 5173..." -ForegroundColor Yellow
$p5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($p5173) {
    foreach ($pidNum in $p5173) {
        Stop-Process -Id $pidNum -Force -ErrorAction SilentlyContinue
        Write-Host "Proceso PID $pidNum cerrado." -ForegroundColor Green
    }
} else {
    Write-Host "No habia procesos en puerto 5173." -ForegroundColor Gray
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "TradePilot AI ha sido apagado exitosamente." -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
