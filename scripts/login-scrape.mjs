#!/usr/bin/env node
/**
 * Login + Scrape de CSSBuy con Playwright.
 * 
 * Abre Chromium headful, navega a CSSBuy, deja login manual (captcha),
 * extrae cookie+csrf, scrapea pedidos, y guarda en public/data/orders.json.
 * 
 * Al final imprime CSSBUY_COOKIE y CSSBUY_CSRF para uso futuro.
 * 
 * Uso: node scripts/login-scrape.mjs --user=cufassj --pass=patineta24
 */

import { chromium } from "playwright";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const CSSBUY_LOGIN = "https://www.cssbuy.com/login";

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { user: "", pass: "" };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--user" && args[i + 1]) { result.user = args[i + 1]; i++; }
    else if (args[i] === "--pass" && args[i + 1]) { result.pass = args[i + 1]; i++; }
  }
  return result;
}

async function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let content = await readFile(envPath, "utf-8");
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    const env = {};
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
        value = value.slice(1, -1);
      env[key] = value;
    }
    return env;
  } catch { return {}; }
}

// ---- Order mapping (same as scrape-cssbuy.mjs) ----
function pick(o, ...keys) {
  for (const k of keys) {
    const val = o?.[k];
    if (val != null && val !== "") return typeof val === "string" ? val : String(val);
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
function toNumInt(...values) { const n = toNum(...values); return Math.max(1, Math.round(n)); }
function parseTimestamp(ts, ts2, ts3, ts4, ts5, str) {
  const num = toNum(ts, ts2, ts3, ts4, ts5);
  if (num > 0) return num;
  if (typeof str === "string") { const p = Date.parse(str); if (!isNaN(p)) return Math.floor(p/1000); }
  return Math.floor(Date.now()/1000);
}
function mapOrder(raw) {
  const color = pick(raw,"goodscolor","color");
  const size = pick(raw,"goodssize","size","goodsskuname");
  const variante = [color,size].filter(Boolean).join("; ") || (pick(raw,"sku","variant","specification","goodsskuname") ?? "");
  return {
    oid: String(pick(raw,"orderId","orderno","id","oid","orderNo","ordernumber") ?? ""),
    producto: String(pick(raw,"goodsname","productName","name","title","product") ?? ""),
    imagen: String(pick(raw,"goodsimg","productImage","image","img","pic") ?? ""),
    url: String(pick(raw,"goodsurl","productUrl","url","link","itemurl") ?? ""),
    vendedor: String(pick(raw,"seller","storename","storeName","sellerName","shopname") ?? ""),
    variante: String(variante),
    precio_unitario_cny: toNum(pick(raw,"goodsprice","goodsprice_def","unitprice","unitPrice","price")),
    envio_local_cny: toNum(pick(raw,"sendprice","sendprice_def","localShipping","domesticShipping","freight")),
    envio_china_cny: toNum(pick(raw,"chinashipping","chinaShipping","internationalShipping","interShipping")),
    cantidad: toNumInt(pick(raw,"quantity","qty","num","goodsnum")),
    estado: String(pick(raw,"orderstate","status","state") ?? ""),
    tracking: String(pick(raw,"trackno","tracking","trackingNumber","expressno","expressNo") ?? ""),
    fecha_pedido: parseTimestamp(raw.addtime,raw.createtime,raw.ordertime,raw.orderTime,raw.createTime,raw.createdAt),
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

async function main() {
  const args = parseArgs();
  const envFile = await loadEnvFile();
  const user = args.user || process.env.CSSBUY_USER || envFile.CSSBUY_USER || "";
  const pass = args.pass || process.env.CSSBUY_PASS || envFile.CSSBUY_PASS || "";

  if (!user || !pass) {
    console.error("Faltan credenciales. node scripts/login-scrape.mjs --user=TU_USER --pass=TU_PASS");
    process.exit(1);
  }

  console.log("🚀 Lanzando Chromium...");
  const browser = await chromium.launch({ headless: false, args: ["--no-sandbox","--disable-setuid-sandbox"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale:"es-ES",
  });
  const page = await context.newPage();

  try {
    console.log("📄 Navegando a login...");
    await page.goto(CSSBUY_LOGIN, { waitUntil:"networkidle", timeout:30000 });

    // Fill creds
    await page.waitForSelector('input[name="loginname"], input[name="email"], input[type="text"]', { timeout:10000 }).catch(()=>{});
    await page.waitForSelector('input[name="loginpwd"], input[name="password"], input[type="password"]', { timeout:5000 }).catch(()=>{});
    const userInput = await page.$('input[name="loginname"]') || await page.$('input[name="email"]') || await page.$('input[type="text"]');
    if (userInput) { await userInput.click({ clickCount:3 }); await userInput.fill(user); }
    const passInput = await page.$('input[name="loginpwd"]') || await page.$('input[name="password"]') || await page.$('input[type="password"]');
    if (passInput) { await passInput.click({ clickCount:3 }); await passInput.fill(pass); }

    console.log("\n⏳ CAPTCHA: resolvelo y hacé clic en LOGIN. Esperando hasta estar en /web/order...\n");

    // Wait for login success (redirect to orders)
    await page.waitForURL("**/web/order*", { timeout:300_000 });
    console.log("✅ Login OK. Extrayendo cookie+csrf...");

    // Extract cookie
    const cookies = await context.cookies("https://www.cssbuy.com");
    const cookie = cookies.map(c=>`${c.name}=${c.value}`).join("; ");

    // Extract CSRF from meta tag
    let csrf = "";
    try { csrf = await page.$eval('meta[name="csrf-token"]', el=>el.getAttribute("content")); } catch {}
    if (!csrf) {
      const csrfC = cookies.find(c=>c.name.includes("csrf")||c.name==="XSRF-TOKEN");
      if (csrfC) csrf = decodeURIComponent(csrfC.value);
    }
    if (!csrf) {
      const html = await page.content();
      const m = html.match(/csrf[_-]?token["'\s:=]+["']?([a-zA-Z0-9]+)/i);
      if (m) csrf = m[1];
    }

    console.log(`🍪 Cookie: ${cookie.substring(0,100)}...`);
    console.log(`🔑 CSRF: ${csrf.substring(0,40)}...`);

    // Scrape via evaluate (browser-authenticated)
    console.log("\n📦 Scrapeando pedidos...");
    const allOrders = [];
    const PAGE_SIZE=50, MAX_ORDERS=500;
    let pageNum=1, hasMore=true;

    while (hasMore) {
      const result = await page.evaluate(async ({csrf,pageNum,pageSize}) => {
        const p = new URLSearchParams();
        p.set("orderState","all"); p.set("starttime",""); p.set("endtime","");
        p.set("pageSize",String(pageSize)); p.set("pageNum",String(pageNum));
        p.set("query",""); p.set("inchina","");
        if (csrf) p.set("_token",csrf);
        const res = await fetch("https://www.cssbuy.com/web/order", {
          method:"POST",
          headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8","X-Requested-With":"XMLHttpRequest","X-CSRF-Token":csrf,"X-XSRF-TOKEN":csrf,Accept:"application/json, text/javascript, */*; q=0.01"},
          body:p.toString(),
        });
        const text = await res.text();
        try { return {status:res.status,data:JSON.parse(text)}; }
        catch { return {status:res.status,error:text.substring(0,500)}; }
      }, {csrf, pageNum, pageSize:PAGE_SIZE});

      if (result.status!==200) throw new Error(`API ${result.status}: ${result.error||JSON.stringify(result.data).substring(0,200)}`);

      const list = extractList(result.data);
      if (!Array.isArray(list)) throw new Error(`Formato raro: ${JSON.stringify(result.data).substring(0,300)}`);

      for (const item of list) allOrders.push(mapOrder(item));
      console.log(`   Pág ${pageNum}: ${list.length} items (total ${allOrders.length})`);

      hasMore = list.length>=PAGE_SIZE && allOrders.length<MAX_ORDERS;
      if (hasMore) pageNum++;
    }

    console.log(`\n✅ ${allOrders.length} pedidos.`);

    // Save
    const outDir = path.join(process.cwd(),"public","data");
    await mkdir(outDir,{recursive:true});
    await writeFile(path.join(outDir,"orders.json"), JSON.stringify({orders:allOrders,lastSync:new Date().toISOString()},null,2),"utf-8");
    console.log(`💾 public/data/orders.json`);

    console.log("\n📋 Para uso futuro:");
    console.log(`CSSBUY_COOKIE='${cookie}'`);
    console.log(`CSSBUY_CSRF='${csrf}'`);
    console.log("\n🎉 Listo!");
  } catch(err) {
    console.error("❌", err.message);
    console.log("Navegador queda abierto para debug.");
    await new Promise(()=>{});
  } finally {
    await browser.close().catch(()=>{});
  }
}
main();
