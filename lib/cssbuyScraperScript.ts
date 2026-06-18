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
    oid: String(pick(raw, "orderId", "orderno", "id", "oid", "orderNo", "ordernumber") ?? ""),
    producto: pick(raw, "goodsname", "productName", "name", "title", "product") ?? "",
    imagen: pick(raw, "goodsimg", "productImage", "image", "img", "pic") ?? "",
    url: pick(raw, "goodsurl", "productUrl", "url", "link", "itemurl") ?? "",
    vendedor: pick(raw, "seller", "storename", "storeName", "sellerName", "shopname") ?? "",
    variante: [pick(raw, "goodscolor", "color"), pick(raw, "goodssize", "size", "goodsskuname")]
      .filter(Boolean)
      .join("; ") || (pick(raw, "sku", "variant", "specification", "goodsskuname") ?? ""),
    precio_unitario_cny: num(pick(raw, "goodsprice", "goodsprice_def", "unitprice", "unitPrice", "price")),
    envio_local_cny: num(pick(raw, "sendprice", "sendprice_def", "localShipping", "domesticShipping", "freight")),
    envio_china_cny: num(pick(raw, "chinashipping", "chinaShipping", "internationalShipping", "interShipping")),
    cantidad: intN(pick(raw, "quantity", "qty", "num", "goodsnum")),
    estado: pick(raw, "orderstate", "status", "state") ?? "",
    tracking: pick(raw, "trackno", "tracking", "trackingNumber", "expressno", "expressNo") ?? "",
    fecha_pedido: ts(raw.addtime, raw.createtime, raw.ordertime, raw.orderTime, raw.createTime, raw.createdAt),
  });

  const extractList = (data) => {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return null;
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.orders)) return data.orders;
    if (Array.isArray(data.data)) return data.data;
    if (data.data && typeof data.data === "object") {
      if (Array.isArray(data.data.list)) return data.data.list;
      if (Array.isArray(data.data.orders)) return data.data.orders;
      if (Array.isArray(data.data.data)) return data.data.data;
    }
    return null;
  };

  const tryQueries = ["inchina", ""];
  let usedQuery = tryQueries[0];

  while (hasMore) {
    let lastData = null;
    let list = null;

    for (const query of tryQueries) {
      const params = new URLSearchParams();
      params.set("orderState", "all");
      params.set("starttime", "");
      params.set("endtime", "");
      params.set("pageSize", String(PAGE_SIZE));
      params.set("pageNum", String(page));
      params.set("query", query);

      const res = await fetch("https://www.cssbuy.com/web/order", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json, text/javascript, */*; q=0.01",
        },
        body: params.toString(),
      });

      if (!res.ok) {
        console.error("HTTP", res.status, await res.text());
        throw new Error("CSSBuy respondio " + res.status);
      }

      const data = await res.json();
      lastData = data;
      const extracted = extractList(data);
      if (Array.isArray(extracted) && extracted.length > 0) {
        list = extracted;
        usedQuery = query;
        break;
      }
    }

    if (page === 1) {
      console.log("Respuesta completa pagina 1:", lastData);
      console.log("Query usado:", usedQuery);
      if (Array.isArray(list) && list.length > 0) {
        console.log("Primer item crudo:", list[0]);
      }
    }

    if (!Array.isArray(list)) {
      console.error("Formato inesperado:", lastData);
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
