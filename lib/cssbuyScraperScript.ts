export const CSSBUY_SCRAPER_SCRIPT = `// CSSBuy scraper (corre en cssbuy.com desde la consola)
// 1. Logueado en cssbuy.com
// 2. F12 -> Console -> pegá este script -> Enter
// 3. Copia el JSON que aparece en el output

(async () => {
  const PAGE_SIZE = 50;
  const MAX_ORDERS = 500;
  const all = [];
  let page = 1;
  let hasMore = true;

  const num = (v) => {
    if (v == null) return 0;
    const n = typeof v === "string" ? parseFloat(v) : v;
    return isNaN(n) ? 0 : n;
  };
  const intN = (...v) => Math.max(1, Math.round(num(...v)));
  const ts = (...cands) => {
    for (const c of cands) {
      if (typeof c === "number" && c > 0) return c;
      if (typeof c === "string") {
        const p = Date.parse(c);
        if (!isNaN(p)) return Math.floor(p / 1000);
      }
    }
    return Math.floor(Date.now() / 1000);
  };
  const pick = (o, ...keys) => {
    for (const k of keys) if (o?.[k] != null && o[k] !== "") return o[k];
    return undefined;
  };

  const mapItem = (raw) => ({
    oid: String(pick(raw, "oid", "id", "orderId") ?? ""),
    producto: pick(raw, "productName", "name", "title") ?? "",
    imagen: pick(raw, "productImage", "image", "img") ?? "",
    url: pick(raw, "productUrl", "url", "link") ?? "",
    vendedor: pick(raw, "sellerName", "seller", "storeName") ?? "",
    variante: pick(raw, "variant", "sku", "specification") ?? "",
    precio_unitario_cny: num(pick(raw, "unitPrice", "price")),
    envio_local_cny: num(pick(raw, "localShipping", "domesticShipping")),
    envio_china_cny: num(pick(raw, "chinaShipping", "internationalShipping")),
    cantidad: intN(pick(raw, "quantity", "qty")),
    estado: pick(raw, "status", "state") ?? "Ordered",
    tracking: pick(raw, "tracking", "trackingNumber", "trackNo") ?? "",
    fecha_pedido: ts(raw.orderTime, raw.createTime, raw.createdAt),
  });

  const extractList = (data) => {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return null;
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.orders)) return data.orders;
    if (data.data && typeof data.data === "object") {
      if (Array.isArray(data.data.list)) return data.data.list;
      if (Array.isArray(data.data.orders)) return data.data.orders;
    }
    return null;
  };

  while (hasMore) {
    const url = \`https://www.cssbuy.com/api/order/list?status=Ordered&page=\${page}&limit=\${PAGE_SIZE}\`;
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/plain, */*",
      },
    });
    if (!res.ok) {
      console.error("HTTP", res.status, await res.text());
      throw new Error("CSSBuy respondio " + res.status);
    }
    const data = await res.json();
    const list = extractList(data);
    if (!Array.isArray(list)) {
      console.error("Formato inesperado:", data);
      throw new Error("Formato de respuesta inesperado");
    }
    for (const it of list) all.push(mapItem(it));
    if (list.length < PAGE_SIZE || all.length >= MAX_ORDERS) hasMore = false;
    else page++;
  }

  const json = JSON.stringify(all, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    console.log("✅ " + all.length + " pedidos copiados al portapapeles. Pegá ese JSON en la app.");
  } catch {
    console.log("⚠️ No pude copiar al portapapeles. Copiá manualmente el JSON de abajo:");
  }
  console.log(json);
  return all;
})();
`;
