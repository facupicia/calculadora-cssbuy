// PEGÁ ESTO EN LA CONSOLA DE DEVTOOLS (F12) MIENTRAS ESTÁS EN CSSBUY YA LOGUEADO
// Va a scrapear todos tus pedidos y descargar un JSON.

(async () => {
  const PAGE_SIZE = 50;
  const MAX_ORDERS = 500;
  const allOrders = [];

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

  // Get CSRF token
  let csrf = "";
  try { csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || ""; } catch {}
  if (!csrf) {
    const m = document.documentElement.innerHTML.match(/csrf[_-]?token["'\s:=]+["']?([a-zA-Z0-9]+)/i);
    if (m) csrf = m[1];
  }
  console.log("🔑 CSRF:", csrf);

  let pageNum = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams();
    params.set("orderState", "all");
    params.set("starttime", "");
    params.set("endtime", "");
    params.set("pageSize", String(PAGE_SIZE));
    params.set("pageNum", String(pageNum));
    params.set("query", "");
    params.set("inchina", "");
    if (csrf) params.set("_token", csrf);

    const res = await fetch("https://www.cssbuy.com/web/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-Token": csrf,
        "X-XSRF-TOKEN": csrf,
        Accept: "application/json, text/javascript, */*; q=0.01",
      },
      body: params.toString(),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      console.error("Respuesta no JSON:", text.substring(0, 500));
      break;
    }

    const list = extractList(data);
    if (!Array.isArray(list)) {
      console.error("Formato inesperado:", JSON.stringify(data).substring(0, 500));
      break;
    }

    for (const item of list) allOrders.push(mapOrder(item));
    console.log(`📄 Página ${pageNum}: ${list.length} pedidos (total: ${allOrders.length})`);

    if (list.length < PAGE_SIZE || allOrders.length >= MAX_ORDERS) {
      hasMore = false;
    } else {
      pageNum++;
    }
  }

  console.log(`\n✅ ${allOrders.length} pedidos totales`);

  // Descargar como JSON
  const blob = new Blob([JSON.stringify({ orders: allOrders, lastSync: new Date().toISOString() }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "orders.json";
  a.click();
  URL.revokeObjectURL(url);
  console.log("💾 Descargado orders.json");

  // También mostrar las primeras órdenes en tabla
  console.table(allOrders.slice(0, 10).map(o => ({
    oid: o.oid,
    producto: o.producto?.substring(0, 50),
    estado: o.estado,
    precio: o.precio_unitario_cny,
    cant: o.cantidad
  })));
})();
