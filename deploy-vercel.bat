@echo off
echo ==========================================
echo   CSSBuy Calculator - Deploy a Vercel
echo ==========================================
echo.

:: Paso 1: Sincronizar pedidos
echo [1/4] Ejecutando scraper Python...
python C:\Users\facup\cssbuy_sync.py
if errorlevel 1 (
    echo ERROR: El scraper fallo. Corregi la cookie si es necesario.
    pause
    exit /b 1
)

:: Paso 2: Copiar datos al frontend
echo [2/4] Copiando datos al frontend...
copy /Y "D:\Documentos\dev\emprendimiento\cssbuy_orders.json" "frontend\public\data\orders.json"
if errorlevel 1 (
    echo ERROR: No se pudo copiar los datos.
    pause
    exit /b 1
)

:: Paso 3: Build
echo [3/4] Haciendo build del frontend...
cd frontend
npm run build
if errorlevel 1 (
    echo ERROR: El build fallo.
    cd ..
    pause
    exit /b 1
)
cd ..

:: Paso 4: Deploy a Vercel
echo [4/4] Deployando a Vercel...
echo Si no tenes Vercel CLI instalado, ejecuta: npm i -g vercel
vercel --prod

echo.
echo ==========================================
echo Deploy completado!
echo.
echo Para actualizar pedidos en el futuro:
echo   1. Corre este script de nuevo (deploy-vercel.bat)
echo   2. O actualiza manualmente data/orders.json
echo ==========================================
pause
