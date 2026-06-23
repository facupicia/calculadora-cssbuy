#!/usr/bin/env node
/**
 * Scraper local de CSSBuy.
 *
 * Corre en tu PC, por lo que el request sale con tu IP real.
 * Esto evita el problema de IP binding que tiene Vercel.
 *
 * Uso recomendado: crear un archivo .env.local en la raíz con:
 *   CSSBUY_COOKIE=lang=en; laravel_session=...
 *   CSSBUY_CSRF=ctr4GvKRVCLqqMAOs8QXMU0b5LAcwTCPeGYbCd15
 * Después solo corrés:
 *   node scripts/scrape-cssbuy.mjs
 *
 * También podés usar argumentos:
 *   node scripts/scrape-cssbuy.mjs --cookie "..." --csrf "..."
 *
 * O variables de entorno:
 *   CSSBUY_COOKIE="..." CSSBUY_CSRF="..." node scripts/scrape-cssbuy.mjs
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const CSSBUY_API = "https://www.cssbuy.com/web/order";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const PAGE_SIZE = 50;
const MAX_ORDERS = 500;

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { cookie: "", csrf: "" };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cookie" && args[i + 1]) {
      result.cookie = args[i + 1];
      i++;
    } else if (args[i] === "--csrf" && args[i + 1]) {
      result.csrf = args[i + 1];
      i++;
    }
  }
  return result;
}

async function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let content = await readFile(envPath, "utf-8");
    // Remove UTF-8 BOM if present
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1);
    }
    const env = {};
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      // Allow optional "export " prefix
      const cleanKey = key.replace(/^export\s+/, "");
      let value = line.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, "\n");
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1).replace(/\\'/g, "'").replace(/\\n/g, "\n");
      }
      env[cleanKey] = value;
    }
    return env;
  } catch {
    return {};
  }
}

async function getInputs() {
  const args = parseArgs();
  const envFile = await loadEnvFile();
  const cookie = args.cookie || process.env.CSSBUY_COOKIE || envFile.CSSBUY_COOKIE || "";
  const csrf = args.csrf || process.env.CSSBUY_CSRF || envFile.CSSBUY_CSRF || "";
  return { cookie, csrf };
}

function pick(o, ...keys) {
  for (const k of keys) {
    const val = o?.[k];
    if (val != null && val !== "") {
      if (typeof val === "string" || typeof val === "number") return val;
      return String(val);
    }
  }
  return undefined;
}

function toNum(...values) {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (!isNaN(n)) return n;
  }
  return 0;
}

function toNumInt(...values) {
  const n = toNum(...values);
  return Math.max(1, Math.round(n));
}

function parseTimestamp(ts, ts2, ts3, ts4, ts5, str) {
  const num = toNum(ts, ts2, ts3, ts4, ts5);
  if (num > 0) return num;
  if (typeof str === "string") {
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) return Math.floor(parsed / 1000);
  }
  return Math.floor(Date.now() / 1000);
}

function mapOrder(raw) {
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

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.orders)) return data.orders;
    if (Array.isArray(data.data)) return data.data;
    if (data.data && typeof data.data === "object") {
      if (Array.isArray(data.data.list)) return data.data.list;
      if (Array.isArray(data.data.orders)) return data.data.orders;
      if (Array.isArray(data.data.data)) return data.data.data;
    }
  }
  return null;
}

async function fetchPage(page, cookie, csrfToken) {
  const params = new URLSearchParams();
  params.set("orderState", "all");
  params.set("starttime", "");
  params.set("endtime", "");
  params.set("pageSize", String(PAGE_SIZE));
  params.set("pageNum", String(page));
  params.set("query", "");
  params.set("inchina", "");
  // Laravel also accepts the token in the body as _token
  if (csrfToken) {
    params.set("_token", csrfToken);
  }

  const headers = {
    Cookie: cookie,
    "User-Agent": USER_AGENT,
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "es-ES,es;q=0.9,zh-CN;q=0.8,zh;q=0.7,en;q=0.6",
    Referer: "https://www.cssbuy.com/web/order?type=all",
    Origin: "https://www.cssbuy.com",
    "X-Requested-With": "XMLHttpRequest",
    "sec-ch-ua": '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "Windows",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
    Priority: "u=1, i",
  };

  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
    // Laravel can also read the token from this header (Axios convention)
    headers["X-XSRF-TOKEN"] = csrfToken;
  }

  const body = params.toString();

  if (process.env.DEBUG) {
    console.log("\n--- DEBUG REQUEST ---");
    console.log("URL:", CSSBUY_API);
    console.log("Headers:", JSON.stringify(headers, null, 2));
    console.log("Body:", body);
    console.log("--- END DEBUG ---\n");
  }

  const res = await fetch(CSSBUY_API, {
    method: "POST",
    redirect: "manual",
    headers,
    body,
  });

  if (res.status === 302 || res.status === 301) {
    throw new Error("CSSBuy redirigió a login. La cookie expiró o no es válida.");
  }

  if (res.status === 401 || res.status === 403) {
    const hint = process.env.DEBUG
      ? ""
      : " Corré el script con DEBUG=1 para ver exactamente qué se envía.";
    throw new Error(
      `CSSBuy rechazó la cookie (401/403). Probablemente la sesión esté atada a tu IP, falte alguna cookie o el CSRF token haya cambiado.${hint}`
    );
  }

  if (res.status === 419) {
    throw new Error("CSSBuy pide el token CSRF (419). Verificá el valor de --csrf.");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `CSSBuy respondió con error ${res.status}${body ? `: ${body.substring(0, 200)}` : ""}`
    );
  }

  const rawText = await res.text();
  try {
    return JSON.parse(rawText);
  } catch {
    const preview = rawText.substring(0, 300).replace(/\s+/g, " ").trim();
    throw new Error(`CSSBuy no devolvió JSON. Vista previa: ${preview || "(respuesta vacía)"}`);
  }
}

async function scrapeOrders(cookie, csrfToken) {
  const allOrders = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchPage(page, cookie, csrfToken);
    const list = extractList(data);

    if (!Array.isArray(list)) {
      const preview = JSON.stringify(data).substring(0, 300);
      throw new Error(`Formato de respuesta inesperado. Respuesta: ${preview}`);
    }

    for (const item of list) {
      allOrders.push(mapOrder(item));
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

  return allOrders;
}

async function getPublicIp() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.ip === "string" ? data.ip : null;
  } catch {
    return null;
  }
}

function extractLoginIp(cookie) {
  const match = cookie.match(/loginip=([^;]+)/);
  return match ? match[1].trim() : null;
}

async function main() {
  const { cookie, csrf } = await getInputs();

  if (!cookie) {
    console.error("Falta la cookie.");
    console.error("");
    console.error("Opciones para pasar la cookie y el CSRF token:");
    console.error("  1) Archivo .env.local:");
    console.error("       CSSBUY_COOKIE=lang=en; laravel_session=...");
    console.error("       CSSBUY_CSRF=ctr4GvKRVCLqqMAOs8QXMU0b5LAcwTCPeGYbCd15");
    console.error("     Después solo corrés: node scripts/scrape-cssbuy.mjs");
    console.error("");
    console.error("  2) Argumentos:");
    console.error("       node scripts/scrape-cssbuy.mjs --cookie '...' --csrf '...'");
    console.error("");
    console.error("  3) Variables de entorno:");
    console.error("       CSSBUY_COOKIE='...' CSSBUY_CSRF='...' node scripts/scrape-cssbuy.mjs");
    process.exit(1);
  }

  const cookieNames = cookie
    .split(";")
    .map((p) => p.trim().split("=")[0])
    .filter(Boolean)
    .join(", ");
  const publicIp = await getPublicIp();
  const loginIp = extractLoginIp(cookie);

  console.log("Scraping CSSBuy desde tu PC...");
  console.log(`Cookies enviadas: ${cookieNames}`);
  console.log(`CSRF token: ${csrf ? "sí" : "no"}`);
  if (publicIp) {
    console.log(`IP pública de este equipo: ${publicIp}`);
  }
  if (loginIp) {
    console.log(`IP guardada en loginip:   ${loginIp}`);
    if (publicIp && publicIp !== loginIp) {
      console.warn("⚠️  Las IPs no coinciden. CSSBuy probablemente rechazará la sesión.");
      console.warn("   Si estás usando VPN o proxy, apagalo o usá el script de consola.");
    }
  }
  if (process.env.DEBUG) {
    console.log("Modo DEBUG activado.");
  }

  const orders = await scrapeOrders(cookie, csrf);
  console.log(`✅ ${orders.length} pedidos obtenidos.`);

  const outDir = path.join(process.cwd(), "public", "data");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, "orders.json");

  const payload = {
    orders,
    lastSync: new Date().toISOString(),
  };

  await writeFile(outFile, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`💾 Guardado en ${outFile}`);
  console.log("Ahora podés correr 'npm run dev' y los pedidos aparecerán en la app.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
