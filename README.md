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
>
> CSSBuy usa Laravel, por lo que también necesitás copiar el header `X-CSRF-Token` del request real en DevTools.

## Configurar el scraper

El scraper está en `app/api/orders/sync/route.ts`. Para que funcione con CSSBuy real:

1. Reemplazá la URL de ejemplo por el endpoint real de CSSBuy.
2. Ajustá el parseo de la respuesta.
3. Eliminá el fallback de ejemplo.

```ts
const res = await fetch("https://www.cssbuy.com/api/order/list?status=Ordered", {
  headers: {
    Cookie: cookie,
    "X-CSRF-Token": csrfToken,
    "User-Agent": "Mozilla/5.0 ...",
    Accept: "application/json",
  },
});
```

### Modos de sincronización

- **Por servidor**: la cookie y el CSRF token se envían a la API Route de Next.js y el request sale desde Vercel. Puede fallar si CSSBuy valida la IP de origen.
- **Desde navegador**: el request sale directamente desde tu Chrome, con tu IP real. Es el método más fiable si hay validación de IP, pero puede ser bloqueado por CORS.
- **Script local**: corre un scraper en tu PC (`scripts/scrape-cssbuy.mjs`). El request sale con tu IP real y guarda los pedidos en `public/data/orders.json`.
- **Script consola**: fallback manual. Corré el script en la consola de cssbuy.com y pegá el JSON.

## Scraper local (recomendado si hay IP binding)

Si CSSBuy rechaza la cookie en Vercel por validación de IP, podés correr el scraper directamente en tu PC.

La forma más cómoda es crear un archivo `.env.local` en la raíz del proyecto:

```env
CSSBUY_COOKIE=lang=en; laravel_session=...
CSSBUY_CSRF=ctr4GvKRVCLqqMAOs8QXMU0b5LAcwTCPeGYbCd15
```

Después solo corrés:

```bash
node scripts/scrape-cssbuy.mjs
```

También podés usar argumentos:

```bash
node scripts/scrape-cssbuy.mjs \
  --cookie "lang=en; laravel_session=..." \
  --csrf "ctr4GvKRVCLqqMAOs8QXMU0b5LAcwTCPeGYbCd15"
```

O variables de entorno:

```bash
CSSBUY_COOKIE="..." CSSBUY_CSRF="..." node scripts/scrape-cssbuy.mjs
```

Esto guarda los pedidos en `public/data/orders.json`. Después corrés `npm run dev` y la app los levanta automáticamente.

## Datos estáticos

Los pedidos iniciales se leen desde `public/data/orders.json`. Podés actualizar este archivo manualmente antes de hacer deploy.

## Notas

- Plan Vercel Hobby: timeout máximo de 10 segundos para el sync. Si CSSBuy tarda más, el sync puede fallar.
- Los pedidos sincronizados se guardan en el `localStorage` del navegador.
