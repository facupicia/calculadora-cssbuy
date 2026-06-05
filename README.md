# CSSBuy Calculator Pro

Calculadora profesional para importadores que compran en China vía CSSBuy y venden en Argentina.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend:** Node.js + Express + TypeScript (solo para desarrollo local)
- **Scraper:** Python + requests

## Features

- Dashboard con métricas y gráficos
- Calculadora completa de costos (producto + envío China + freight + aduana + ganancias)
- Integración automática con pedidos CSSBuy (estado "Ordered")
- Importación 1-click de productos (incluye envío local de China)
- Historial de cotizaciones persistente
- Exportación a CSV
- Dark mode nativo
- Actualización de dólar vía API (dolarapi.com)
- **Deploy a Vercel** soportado

## Inicio rápido

### Opción 1: Script automático (Windows - Desarrollo Local)

```bash
D:\Documentos\dev\emprendimiento\cssbuy-calculator\start-dev.bat
```

Esto:
1. Ejecuta el scraper Python
2. Inicia el backend (http://localhost:3001)
3. Inicia el frontend (http://localhost:5173)

### Opción 2: Manual (Desarrollo)

**Terminal 1 - Backend:**
```bash
cd D:\Documentos\dev\emprendimiento\cssbuy-calculator\backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd D:\Documentos\dev\emprendimiento\cssbuy-calculator\frontend
npm run dev
```

**Terminal 3 - Sync (cuando quieras actualizar pedidos):**
```bash
python C:\Users\facup\cssbuy_sync.py
```

---

## Deploy a Vercel (Producción)

### Prerrequisitos

1. Instalá Vercel CLI: `npm i -g vercel`
2. Logueate: `vercel login`
3. Tené una cuenta en [vercel.com](https://vercel.com)

### Deploy Automático (Recomendado)

Ejecutá el script de deploy:

```bash
D:\Documentos\dev\emprendimiento\cssbuy-calculator\deploy-vercel.bat
```

Esto hace todo automáticamente:
1. Corre el scraper Python (actualiza pedidos desde CSSBuy)
2. Copia los datos a `frontend/public/data/orders.json`
3. Hace build del frontend
4. Deploya a Vercel en modo producción

### Deploy Manual

Si preferís control total:

```bash
# 1. Sincronizar pedidos
python C:\Users\facup\cssbuy_sync.py

# 2. Copiar datos al frontend
copy cssbuy_orders.json frontend\public\data\orders.json

# 3. Build
cd frontend
npm run build

# 4. Deploy
vercel --prod
```

### ¿Cómo funciona en Vercel?

- **Frontend:** Deployado como app estática (React + Vite)
- **Datos:** El archivo `data/orders.json` se incluye en el build y se sirve estáticamente
- **No hay backend:** La app detecta automáticamente si hay backend local o no. En Vercel lee el JSON directamente.
- **Badge "Vercel Mode":** Aparece en el header indicando que estás usando datos estáticos.

### Actualizar pedidos en Vercel

Como el scraper necesita tu cookie de sesión de CSSBuy (que expira), **no se puede ejecutar automáticamente en Vercel**. El flujo es:

1. Corrés el scraper Python en tu PC local
2. El scraper genera `cssbuy_orders.json`
3. Copiás el JSON a `frontend/public/data/orders.json`
4. Hacés deploy a Vercel (`deploy-vercel.bat` o `vercel --prod`)
5. ¡Listo! Tu app en Vercel ahora tiene los pedidos actualizados.

**Consejo:** Si tenés el proyecto en Git, podés automatizar esto con GitHub Actions para que cada vez que commitees el JSON nuevo, Vercel redeploye automáticamente.

---

## Estructura

```
cssbuy-calculator/
├── backend/                    # API Express (solo desarrollo local)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/orders.ts
│   │   └── services/cssbuy.ts
│   └── package.json
├── frontend/                     # React + Vite
│   ├── public/
│   │   └── data/orders.json      # Datos estáticos para Vercel
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Calculator.tsx
│   │   │   ├── CssbuyOrders.tsx
│   │   │   ├── History.tsx
│   │   │   └── Header.tsx
│   │   ├── hooks/
│   │   │   ├── useOrders.ts     # Detecta backend vs Vercel automáticamente
│   │   │   └── useLocalStorage.ts
│   │   ├── lib/utils.ts
│   │   └── types/index.ts
│   └── package.json
├── start-dev.bat               # Inicio rápido (local)
├── deploy-vercel.bat           # Deploy a Vercel
├── vercel.json                 # Configuración de Vercel
└── package.json
```

---

## API Endpoints (Desarrollo Local)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/orders | Pedidos Ordered de CSSBuy |
| POST | /api/orders/sync | Ejecutar scraper y devolver pedidos |
| GET | /api/orders/history | Historial de costos |

---

## Notas Importantes

### Cookie de Sesión
La cookie de sesión de CSSBuy **expira**. Cuando el scraper diga "please login", actualizá la cookie en:
```
C:\Users\facup\cssbuy_sync.py → HEADERS["Cookie"]
```

### Envío Interno de China
El scraper ahora extrae el envío local de China (`sendprice` / `sendfee`) de la API de CSSBuy. Esto se suma al precio del producto para dar el **costo real exacto**:
```
Costo producto = precio_unitario + envio_local + envio_china
```

### Calculador de Freight
La calculadora incluye un estimador de freight internacional basado en el peso total y tarifas por gramo para diferentes líneas de envío (EMS, DHL, FedEx, etc.). Las tarifas son orientativas.

### Cálculos de Aduana
Usa el régimen courier argentino:
- Franquicia: $50 USD (primeros 5 envíos del año)
- Arancel: 50% sobre el excedente de $50
- IVA: 21%
- IIBB: 3%
- Tasa estadística: 3%

---

## Troubleshooting

### "No se encontraron datos de pedidos" en Vercel
Asegurate de que `frontend/public/data/orders.json` exista antes de hacer el build. Corré el scraper primero.

### "Error al sincronizar" en local
El backend necesita que el archivo `cssbuy_orders_data.js` exista. Corré el scraper Python primero.

### Frontend no carga en Vercel
Verificá que el `vercel.json` esté en la raíz del proyecto y que `outputDirectory` apunte a `frontend/dist`.
