import { NextRequest, NextResponse } from "next/server";
import { CssbuyOrder } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 10; // Vercel Hobby max timeout

const CSSBUY_API = "https://www.cssbuy.com/api/order/list";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PAGE_SIZE = 50;
const MAX_ORDERS = 500;

interface CssbuyApiItem {
  oid?: string | number;
  id?: string | number;
  orderId?: string | number;
  productName?: string;
  name?: string;
  title?: string;
  productImage?: string;
  image?: string;
  img?: string;
  productUrl?: string;
  url?: string;
  link?: string;
  sellerName?: string;
  seller?: string;
  storeName?: string;
  variant?: string;
  sku?: string;
  specification?: string;
  unitPrice?: number | string;
  price?: number | string;
  localShipping?: number | string;
  domesticShipping?: number | string;
  chinaShipping?: number | string;
  internationalShipping?: number | string;
  quantity?: number | string;
  qty?: number | string;
  status?: string;
  state?: string;
  tracking?: string;
  trackingNumber?: string;
  trackNo?: string;
  orderTime?: number | string;
  createTime?: number | string;
  createdAt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { cookie } = (await req.json()) as { cookie?: string };

    if (!cookie || !cookie.trim()) {
      return NextResponse.json({ error: "Falta la cookie de sesión" }, { status: 400 });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const orders = await scrapeCssbuyOrders(cookie.trim(), clientIp);

    const lastSync = new Date().toISOString();

    return NextResponse.json({ orders, lastSync });
  } catch (error) {
    console.error("Error en /api/orders/sync:", error);
    return NextResponse.json(
      {
        error: "Error al sincronizar pedidos",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

async function scrapeCssbuyOrders(cookie: string, clientIp: string): Promise<CssbuyOrder[]> {
  const allOrders: CssbuyOrder[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${CSSBUY_API}?status=Ordered&page=${page}&limit=${PAGE_SIZE}`;

    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        headers: {
          Cookie: cookie,
          "User-Agent": USER_AGENT,
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
          Referer: "https://www.cssbuy.com/",
          "X-Forwarded-For": clientIp,
          "X-Real-IP": clientIp,
          "X-Requested-With": "XMLHttpRequest",
        },
      });
    } catch (err) {
      throw new Error(
        `No se pudo conectar a CSSBuy: ${err instanceof Error ? err.message : "Error de red"}`
      );
    }

    if (res.status === 302 || res.status === 301) {
      throw new Error(
        "CSSBuy redirigió a login. La cookie expiró o no es válida."
      );
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "CSSBuy rechazó la cookie (401/403). La sesión puede estar atada a tu IP — el servidor de Vercel tiene una IP distinta a la tuya. Probá copiar una cookie fresca."
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`CSSBuy respondió con error ${res.status}${body ? `: ${body.substring(0, 200)}` : ""}`);
    }

    let data: unknown;
    let rawText = "";
    try {
      rawText = await res.text();
      data = JSON.parse(rawText);
    } catch {
      const preview = rawText.substring(0, 300).replace(/\s+/g, " ").trim();
      throw new Error(
        `CSSBuy no devolvió JSON (${res.status}). Vista previa: ${preview || "(respuesta vacía)"}`
      );
    }

    const rawList = extractList(data);
    if (!Array.isArray(rawList)) {
      const preview = JSON.stringify(data).substring(0, 300);
      throw new Error(
        `Formato de respuesta inesperado. Esperaba un array. Respuesta: ${preview}`
      );
    }

    for (const item of rawList) {
      allOrders.push(mapOrder(item as CssbuyApiItem));
    }

    const total = extractTotal(data);
    if (total !== null && allOrders.length >= total) {
      hasMore = false;
    } else if (rawList.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
    }

    if (allOrders.length >= MAX_ORDERS) {
      hasMore = false;
    }
  }

  if (allOrders.length === 0) {
    throw new Error(
      "No se encontraron pedidos en estado 'Ordered'. ¿Está vacía la lista?"
    );
  }

  console.log(`Scraper: ${allOrders.length} pedidos sincronizados.`);
  return allOrders;
}

function extractList(data: unknown): unknown {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.list)) return d.list;
    if (Array.isArray(d.orders)) return d.orders;
    if (d.data && typeof d.data === "object") {
      const inner = d.data as Record<string, unknown>;
      if (Array.isArray(inner.list)) return inner.list;
      if (Array.isArray(inner.orders)) return inner.orders;
    }
  }
  return null;
}

function extractTotal(data: unknown): number | null {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.total === "number") return d.total;
    if (d.data && typeof d.data === "object") {
      const inner = d.data as Record<string, unknown>;
      if (typeof inner.total === "number") return inner.total;
      if (inner.pageInfo && typeof inner.pageInfo === "object") {
        const pi = inner.pageInfo as Record<string, unknown>;
        if (typeof pi.total === "number") return pi.total;
      }
    }
  }
  return null;
}

function mapOrder(raw: CssbuyApiItem): CssbuyOrder {
  const precio = toNum(raw.unitPrice, raw.price, 0);
  const envioLocal = toNum(raw.localShipping, raw.domesticShipping, 0);
  const envioChina = toNum(raw.chinaShipping, raw.internationalShipping, 0);

  return {
    oid: String(raw.oid ?? raw.id ?? raw.orderId ?? ""),
    producto: raw.productName ?? raw.name ?? raw.title ?? "",
    imagen: raw.productImage ?? raw.image ?? raw.img ?? "",
    url: raw.productUrl ?? raw.url ?? raw.link ?? "",
    vendedor: raw.sellerName ?? raw.seller ?? raw.storeName ?? "",
    variante: raw.variant ?? raw.sku ?? raw.specification ?? "",
    precio_unitario_cny: precio,
    envio_local_cny: envioLocal,
    envio_china_cny: envioChina,
    cantidad: toNumInt(raw.quantity, raw.qty, 1),
    estado: raw.status ?? raw.state ?? "Ordered",
    tracking: raw.tracking ?? raw.trackingNumber ?? raw.trackNo ?? "",
    fecha_pedido: parseTimestamp(raw.orderTime, raw.createTime, raw.createdAt),
  };
}

function toNum(...values: (number | string | undefined)[]): number {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (!isNaN(n)) return n;
  }
  return 0;
}

function toNumInt(...values: (number | string | undefined)[]): number {
  const n = toNum(...values);
  return Math.max(1, Math.round(n));
}

function parseTimestamp(
  ts?: number | string,
  ts2?: number | string,
  str?: string
): number {
  const num = toNum(ts, ts2);
  if (num > 0) return num;
  if (typeof str === "string") {
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) return Math.floor(parsed / 1000);
  }
  return Math.floor(Date.now() / 1000);
}
