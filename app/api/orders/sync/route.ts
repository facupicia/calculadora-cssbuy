import { NextRequest, NextResponse } from "next/server";
import { CssbuyOrder } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 10; // Vercel Hobby max timeout

const CSSBUY_API = "https://www.cssbuy.com/web/order";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PAGE_SIZE = 50;
const MAX_ORDERS = 500;

interface CssbuyApiItem {
  orderId?: string | number;
  orderno?: string;
  id?: string | number;
  oid?: string | number;
  orderNo?: string;
  ordernumber?: string;
  goodsname?: string;
  productName?: string;
  name?: string;
  title?: string;
  product?: string;
  goodsimg?: string;
  productImage?: string;
  image?: string;
  img?: string;
  pic?: string;
  goodsurl?: string;
  productUrl?: string;
  url?: string;
  link?: string;
  itemurl?: string;
  seller?: string;
  storename?: string;
  storeName?: string;
  sellerName?: string;
  shopname?: string;
  goodscolor?: string;
  color?: string;
  goodssize?: string;
  size?: string;
  goodsskuname?: string;
  sku?: string;
  variant?: string;
  specification?: string;
  goodsprice?: number | string;
  goodsprice_def?: number | string;
  unitprice?: number | string;
  unitPrice?: number | string;
  price?: number | string;
  sendprice?: number | string;
  sendprice_def?: number | string;
  localShipping?: number | string;
  domesticShipping?: number | string;
  freight?: number | string;
  chinashipping?: number | string;
  chinaShipping?: number | string;
  internationalShipping?: number | string;
  interShipping?: number | string;
  quantity?: number | string;
  qty?: number | string;
  num?: number | string;
  goodsnum?: number | string;
  orderstate?: string;
  status?: string;
  state?: string;
  trackno?: string;
  tracking?: string;
  trackingNumber?: string;
  expressno?: string;
  expressNo?: string;
  addtime?: number | string;
  createtime?: number | string;
  ordertime?: number | string;
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

function filterCookies(raw: string): string {
  const blocked = new Set([
    "loginip",
    "loginip_",
    "order_pay",
    "echat_referrer_timer",
    "echat_referrer",
    "echat_referrer_pre",
    "echat_firsturl",
    "echat_firsttitle",
  ]);
  return raw
    .split(";")
    .map((p) => p.trim())
    .filter((pair) => {
      if (!pair) return false;
      const key = pair.split("=")[0].trim().toLowerCase();
      if (blocked.has(key)) return false;
      if (key.startsWith("echat_") || key.startsWith("echatsoft")) return false;
      if (key.startsWith("www.echatsoft")) return false;
      return true;
    })
    .join("; ");
}

async function scrapeCssbuyOrders(cookie: string, clientIp: string): Promise<CssbuyOrder[]> {
  const filteredCookie = filterCookies(cookie);
  const allOrders: CssbuyOrder[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const tryQueries = ["inchina", ""];
    let lastData: unknown = null;
    let list: unknown[] | null = null;
    let usedQuery = tryQueries[0];

    for (const query of tryQueries) {
      const params = new URLSearchParams();
      params.set("orderState", "all");
      params.set("starttime", "");
      params.set("endtime", "");
      params.set("pageSize", String(PAGE_SIZE));
      params.set("pageNum", String(page));
      params.set("query", query);

      let res: Response;
      try {
        res = await fetch(CSSBUY_API, {
          method: "POST",
          redirect: "manual",
          headers: {
            Cookie: filteredCookie,
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Accept: "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
            Referer: "https://www.cssbuy.com/web/order?type=all",
            Origin: "https://www.cssbuy.com",
            "X-Forwarded-For": clientIp,
            "X-Real-IP": clientIp,
            "X-Requested-With": "XMLHttpRequest",
          },
          body: params.toString(),
        });
      } catch (err) {
        throw new Error(
          `No se pudo conectar a CSSBuy: ${err instanceof Error ? err.message : "Error de red"}`
        );
      }

      if (res.status === 302 || res.status === 301) {
        throw new Error("CSSBuy redirigió a login. La cookie expiró o no es válida.");
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error(
          "CSSBuy rechazó la cookie (401/403). Probablemente la sesión esté atada a tu IP."
        );
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `CSSBuy respondió con error ${res.status}${body ? `: ${body.substring(0, 200)}` : ""}`
        );
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

      lastData = data;
      const extracted = extractList(data);
      if (Array.isArray(extracted) && extracted.length > 0) {
        list = extracted;
        usedQuery = query;
        break;
      }
    }

    if (page === 1) {
      console.log("CSSBuy respuesta pagina 1:", lastData);
      console.log("CSSBuy query usado:", usedQuery);
    }

    if (!Array.isArray(list)) {
      const preview = JSON.stringify(lastData).substring(0, 300);
      throw new Error(`Formato de respuesta inesperado. Respuesta: ${preview}`);
    }

    for (const item of list) {
      allOrders.push(mapOrder(item as CssbuyApiItem));
    }

    if (list.length < PAGE_SIZE || allOrders.length >= MAX_ORDERS) {
      hasMore = false;
    } else {
      page++;
    }
  }

  if (allOrders.length === 0) {
    throw new Error("No se encontraron pedidos. Probá cambiando el filtro de estado en cssbuy.com.");
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
    if (Array.isArray(d.data)) return d.data;
    if (d.data && typeof d.data === "object") {
      const inner = d.data as Record<string, unknown>;
      if (Array.isArray(inner.list)) return inner.list;
      if (Array.isArray(inner.orders)) return inner.orders;
      if (Array.isArray(inner.data)) return inner.data;
    }
  }
  return null;
}

function mapOrder(raw: CssbuyApiItem): CssbuyOrder {
  const color = pick(raw, "goodscolor", "color");
  const size = pick(raw, "goodssize", "size", "goodsskuname");
  const variante =
    [color, size].filter(Boolean).join("; ") ||
    (pick(raw, "sku", "variant", "specification", "goodsskuname") ?? "");

  return {
    oid: String(pick(raw, "orderId", "orderno", "id", "oid", "orderNo", "ordernumber") ?? ""),
    producto: String(pick(raw, "goodsname", "productName", "name", "title", "product") ?? ""),
    imagen: String(pick(raw, "goodsimg", "productImage", "image", "img", "pic") ?? ""),
    url: String(pick(raw, "goodsurl", "productUrl", "url", "link", "itemurl") ?? ""),
    vendedor: String(pick(raw, "seller", "storename", "storeName", "sellerName", "shopname") ?? ""),
    variante: String(variante),
    precio_unitario_cny: toNum(pick(raw, "goodsprice", "goodsprice_def", "unitprice", "unitPrice", "price")),
    envio_local_cny: toNum(pick(raw, "sendprice", "sendprice_def", "localShipping", "domesticShipping", "freight")),
    envio_china_cny: toNum(pick(raw, "chinashipping", "chinaShipping", "internationalShipping", "interShipping")),
    cantidad: toNumInt(pick(raw, "quantity", "qty", "num", "goodsnum")),
    estado: String(pick(raw, "orderstate", "status", "state") ?? ""),
    tracking: String(pick(raw, "trackno", "tracking", "trackingNumber", "expressno", "expressNo") ?? ""),
    fecha_pedido: parseTimestamp(
      raw.addtime,
      raw.createtime,
      raw.ordertime,
      raw.orderTime,
      raw.createTime,
      raw.createdAt
    ),
  };
}

function pick<T>(o: T, ...keys: Array<keyof T | string>): string | number | undefined {
  for (const k of keys) {
    const val = (o as any)?.[k];
    if (val != null && val !== "") {
      if (typeof val === "string" || typeof val === "number") return val;
      return String(val);
    }
  }
  return undefined;
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
  ts3?: number | string,
  ts4?: number | string,
  ts5?: number | string,
  str?: string
): number {
  const num = toNum(ts, ts2, ts3, ts4, ts5);
  if (num > 0) return num;
  if (typeof str === "string") {
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) return Math.floor(parsed / 1000);
  }
  return Math.floor(Date.now() / 1000);
}
