@echo off
echo ======================================
echo   CSSBuy Calculator Pro - Dev Server
echo ======================================
echo.

:: Sync pedidos primero
echo [1/3] Sincronizando pedidos CSSBuy...
python C:\Users\facup\cssbuy_sync.py

:: Iniciar backend
echo [2/3] Iniciando Backend API (http://localhost:3001)...
start "Backend API" cmd /c "cd /d D:\Documentos\dev\emprendimiento\cssbuy-calculator\backend && npm run dev"
timeout /t 3 /nobreak > nul

:: Iniciar frontend
echo [3/3] Iniciando Frontend (http://localhost:5173)...
start "Frontend" cmd /c "cd /d D:\Documentos\dev\emprendimiento\cssbuy-calculator\frontend && npm run dev"

echo.
echo ======================================
echo Todo iniciado! Abri tu navegador en:
echo   http://localhost:5173
echo.
echo Backend API: http://localhost:3001
echo ======================================
pause
