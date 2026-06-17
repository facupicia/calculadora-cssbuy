# CSSBuy Calculator — Next.js Edition

Calculadora profesional para importadores que compran en China vía CSSBuy y venden en Argentina.

## Stack

- **Framework:** Next.js 14 App Router
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Recharts
- **Backend:** API Routes de Next.js
- **Scraper:** TypeScript (serverless) con cookie manual
- **Deploy:** Vercel

## Features

- Dashboard con métricas y gráficos
- Calculadora completa de costos (producto + envío China + freight + aduana + ganancias)
- Integración con pedidos CSSBuy (estado "Ordered")
- Importación 1-click de productos
- Historial de cotizaciones persistente en `localStorage`
- Exportación a CSV
- Dark mode nativo
- Actualización de dólar vía API (dolarapi.com)
- Sync de pedidos pegando la cookie de sesión de CSSBuy

## Inicio rápido

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

## Deploy a Vercel

1. Crear un proyecto en [vercel.com](https://vercel.com).
2. Conectar el repositorio.
3. Vercel detecta automáticamente Next.js.
4. Deploy.

## Sincronizar pedidos

1. Copiá la cookie de sesión de CSSBuy desde tu navegador.
2. En la app, hacé clic en **Sync**.
3. Pegá la cookie en el diálogo y confirmá.

> **Importante:** la cookie no se guarda en el servidor. Se usa solo para la sincronización y se descarta después.

## Configurar el scraper

El scraper está en `app/api/orders/sync/route.ts`. Para que funcione con CSSBuy real:

1. Reemplazá la URL de ejemplo por el endpoint real de CSSBuy.
2. Ajustá el parseo de la respuesta.
3. Eliminá el fallback de ejemplo.

```ts
const res = await fetch("https://www.cssbuy.com/api/order/list?status=Ordered", {
  headers: {
    Cookie: cookie,
    "User-Agent": "Mozilla/5.0 ...",
    Accept: "application/json",
  },
});
```

## Datos estáticos

Los pedidos iniciales se leen desde `public/data/orders.json`. Podés actualizar este archivo manualmente antes de hacer deploy.

## Notas

- Plan Vercel Hobby: timeout máximo de 10 segundos para el sync. Si CSSBuy tarda más, el sync puede fallar.
- Los pedidos sincronizados se guardan en el `localStorage` del navegador.
