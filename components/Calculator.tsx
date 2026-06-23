"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  Trash2,
  Save,
  Download,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  Info,
  ShoppingBag,
  Plane,
  Shield,
  DollarSign,
} from "lucide-react";
import { Product, FxRates, ShipmentCosts, AduanaConfig, CalculationResult } from "@/lib/types";
import { calcularTodo, fmtUSD, fmtARS, fmtPct, uid } from "@/lib/utils";
import { CssbuyOrder } from "@/lib/types";

interface CalculatorProps {
  orders: CssbuyOrder[];
}

export default function Calculator({ orders }: CalculatorProps) {
  const [fx, setFx] = useState<FxRates>({ blue: 0, oficial: 0, mep: 0, cny: 7.2 });
  const [envio, setEnvio] = useState<ShipmentCosts>({
    freightCNY: 0,
    serviceCNY: 0,
    recargaPct: 0.03,
    recargaFijo: 0.3,
    platformFee: 0.35,
    markup: 2.0,
  });
  const [lineaEnvio, setLineaEnvio] = useState<string>("custom");
  const [tarifaPorGramo, setTarifaPorGramo] = useState<number>(0);
  const [aduana, setAduana] = useState<AduanaConfig>({
    dentroFranquicia: false,
    enviosAnio: 0,
    ivaPct: 0.21,
    iibbPct: 0.03,
    valorDeclaradoUSD: null,
  });
  const [productos, setProductos] = useState<Product[]>([]);
  const [nombreEnvio, setNombreEnvio] = useState("");
  const [cotizaciones, setCotizaciones] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("cssbuy-cotizaciones") || "[]");
    } catch {
      return [];
    }
  });

  const resultados = useMemo(() => calcularTodo(productos, fx, envio, aduana), [productos, fx, envio, aduana]);

  const pesoTotalG = productos.reduce((s, p) => s + (p.pesoG || 0) * (p.cantidad || 1), 0);
  const freightCalculado = Math.round(pesoTotalG * tarifaPorGramo);

  if (lineaEnvio !== "custom" && pesoTotalG > 0 && freightCalculado !== envio.freightCNY) {
    setEnvio((prev) => ({ ...prev, freightCNY: freightCalculado }));
  }

  const addProducto = useCallback(() => {
    setProductos((prev) => [
      ...prev,
      {
        id: uid(),
        nombre: "",
        precioCNY: 0,
        envioLocalCNY: 0,
        envioChinaCNY: 0,
        pesoG: 0,
        cantidad: 1,
        precioVentaUSD: 0,
        link: "",
        imgURL: "",
      },
    ]);
  }, []);

  const removeProducto = useCallback((id: string) => {
    setProductos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateProducto = useCallback((id: string, field: keyof Product, value: any) => {
    setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }, []);

  const importFromOrder = useCallback(
    (order: CssbuyOrder) => {
      const exists = productos.find((p) => p.link === order.url);
      if (exists) return;
      setProductos((prev) => [
        ...prev,
        {
          id: uid(),
          nombre: order.producto || `CSSBuy #${order.oid}`,
          precioCNY: order.precio_unitario_cny || 0,
          envioLocalCNY: order.envio_local_cny || 0,
          envioChinaCNY: order.envio_china_cny || 0,
          pesoG: 0,
          cantidad: order.cantidad || 1,
          precioVentaUSD: 0,
          link: order.url || "",
          imgURL: order.imagen || "",
        },
      ]);
    },
    [productos]
  );

  const guardarCotizacion = useCallback(() => {
    if (resultados.productosUSDTotal === 0) {
      alert("Agregá al menos un producto");
      return;
    }
    const cot = {
      id: uid(),
      fecha: new Date().toISOString(),
      nombre: nombreEnvio.trim() || `Cotización ${new Date().toLocaleDateString("es-AR")}`,
      fx,
      envio,
      aduana,
      productos,
      resultados,
    };
    const updated = [cot, ...cotizaciones].slice(0, 50);
    setCotizaciones(updated);
    localStorage.setItem("cssbuy-cotizaciones", JSON.stringify(updated));
    alert(`"${cot.nombre}" guardada.`);
  }, [fx, envio, aduana, productos, resultados, nombreEnvio, cotizaciones]);

  const exportarCSV = useCallback(() => {
    if (resultados.productosCalc.length === 0) {
      alert("Nada para exportar");
      return;
    }
    const nombre = nombreEnvio.trim() || "cotizacion";
    const header = [
      "Producto",
      "Cantidad",
      "Precio unit CNY",
      "Peso unit g",
      "Link",
      "Costo unit USD",
      "Venta USD",
      "Ganancia c/u USD",
      "Ganancia total USD",
    ];
    const rows = resultados.productosCalc.map((p) => [
      p.nombre,
      p.cantidad,
      p.precioCNY,
      p.pesoG,
      p.link || "",
      p.costoUnitUSD.toFixed(2),
      p.ventaUSD.toFixed(2),
      p.gananciaUnitUSD.toFixed(2),
      p.gananciaTotalUSD.toFixed(2),
    ]);
    const totales = [
      "TOTAL",
      "",
      "",
      resultados.pesoTotalG,
      "",
      "",
      resultados.costoTotalUSD.toFixed(2),
      resultados.ingresoTotalUSD.toFixed(2),
      "",
      resultados.gananciaTotalUSD.toFixed(2),
    ];
    const csv = [header, ...rows, totales]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre.replace(/[^a-z0-9]/gi, "-").toLowerCase() + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [resultados, nombreEnvio]);

  const limpiar = useCallback(() => {
    if (!confirm("¿Limpiar todo?")) return;
    setNombreEnvio("");
    setProductos([]);
    setEnvio({ freightCNY: 0, serviceCNY: 0, recargaPct: 0.03, recargaFijo: 0.3, platformFee: 0.35, markup: 2.0 });
    setAduana({ dentroFranquicia: false, enviosAnio: 0, ivaPct: 0.21, iibbPct: 0.03, valorDeclaradoUSD: null });
  }, []);

  const actualizarDolar = async () => {
    try {
      const [oficial, blue, mep] = await Promise.all([
        fetch("https://dolarapi.com/v1/dolares/oficial").then((r) => r.json()),
        fetch("https://dolarapi.com/v1/dolares/blue").then((r) => r.json()),
        fetch("https://dolarapi.com/v1/dolares/bolsa").then((r) => r.json()),
      ]);
      setFx((prev) => ({ ...prev, oficial: oficial.venta, blue: blue.venta, mep: mep.venta }));
    } catch (e) {
      alert("Error actualizando dolar");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left column - Inputs */}
      <div className="xl:col-span-2 space-y-5">
        {/* Nombre del envío */}
        <div className="bg-card border border-border rounded-xl p-5">
          <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Nombre del envío
          </label>
          <input
            type="text"
            value={nombreEnvio}
            onChange={(e) => setNombreEnvio(e.target.value)}
            placeholder="Ej: Lote Marzo Buzos Corteiz"
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Tipo de cambio */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Tipo de cambio</h3>
            </div>
            <button
              onClick={actualizarDolar}
              className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2 py-1 rounded-md transition-colors"
            >
              ↻ Actualizar API
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Dólar blue", value: fx.blue, key: "blue" as const },
              { label: "Dólar oficial", value: fx.oficial, key: "oficial" as const },
              { label: "Dólar MEP", value: fx.mep, key: "mep" as const },
              { label: "CNY por 1 USD", value: fx.cny, key: "cny" as const },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                <input
                  type="number"
                  step={field.key === "cny" ? 0.01 : 1}
                  value={field.value || ""}
                  onChange={(e) => setFx((prev) => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 tabular-nums"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Productos */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Productos</h3>
            </div>
            <div className="flex items-center gap-2">
              {resultados.pesoTotalG > 0 && (
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    resultados.pesoTotalG > 5999 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {resultados.pesoTotalG}g / 5999g
                </span>
              )}
              <button
                onClick={addProducto}
                className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3 h-3" /> Producto
              </button>
            </div>
          </div>

          {/* Import desde orders */}
          {orders.length > 0 && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Importar desde pedidos CSSBuy:</p>
              <div className="flex flex-wrap gap-2">
                {orders.map((o) => (
                  <button
                    key={o.oid}
                    onClick={() => importFromOrder(o)}
                    className="flex items-center gap-1.5 text-xs bg-card border border-border hover:border-primary/50 rounded-lg px-2 py-1 transition-colors"
                    title={o.producto}
                  >
                    {o.imagen && <img src={o.imagen} alt="" className="w-5 h-5 rounded object-cover" />}
                    <span className="max-w-[120px] truncate">{o.producto.slice(0, 20)}</span>
                    <span className="text-muted-foreground">¥{o.precio_unitario_cny}</span>
                    <ArrowRight className="w-3 h-3 text-primary" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                    ¥ c/u
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                    Envío ¥
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                    g c/u
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">
                    Cant.
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">
                    Venta USD
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {p.imgURL && (
                          <img src={p.imgURL} alt="" className="w-8 h-8 rounded object-cover bg-muted flex-shrink-0" />
                        )}
                        <input
                          type="text"
                          value={p.nombre}
                          onChange={(e) => updateProducto(p.id, "nombre", e.target.value)}
                          placeholder="Nombre..."
                          className="w-full bg-transparent border-0 p-0 text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={p.precioCNY || ""}
                        onChange={(e) => updateProducto(p.id, "precioCNY", parseFloat(e.target.value) || 0)}
                        className="w-full text-right bg-secondary/30 border border-border rounded px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="text-right">
                        {p.envioLocalCNY > 0 || p.envioChinaCNY > 0 ? (
                          <span
                            className="text-xs text-emerald-400"
                            title={`Local: ¥${p.envioLocalCNY}, China: ¥${p.envioChinaCNY}`}
                          >
                            +¥{(p.envioLocalCNY + p.envioChinaCNY).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={p.pesoG || ""}
                        onChange={(e) => updateProducto(p.id, "pesoG", parseInt(e.target.value) || 0)}
                        className="w-full text-right bg-secondary/30 border border-border rounded px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={p.cantidad || ""}
                        onChange={(e) => updateProducto(p.id, "cantidad", parseInt(e.target.value) || 0)}
                        className="w-full text-right bg-secondary/30 border border-border rounded px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={p.precioVentaUSD || ""}
                        onChange={(e) => updateProducto(p.id, "precioVentaUSD", parseFloat(e.target.value) || 0)}
                        placeholder="auto"
                        className="w-full text-right bg-secondary/30 border border-border rounded px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => removeProducto(p.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {productos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Sin productos. Agregá uno o importá desde pedidos CSSBuy.
              </div>
            )}
          </div>
        </div>

        {/* Envío CSSBuy */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Plane className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Envío CSSBuy</h3>
            {pesoTotalG > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                Peso total: <span className="text-foreground font-medium">{pesoTotalG}g</span>
              </span>
            )}
          </div>

          {/* Calculador de Freight */}
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs font-medium text-primary mb-2">Calculador de Freight (auto)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Línea de envío</label>
                <select
                  value={lineaEnvio}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLineaEnvio(val);
                    const tarifas: Record<string, number> = {
                      custom: 0,
                      ems: 0.09,
                      dhl: 0.16,
                      fedex: 0.15,
                      ups: 0.14,
                      chinapost: 0.06,
                      eub: 0.08,
                    };
                    setTarifaPorGramo(tarifas[val] || 0);
                  }}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="custom">Manual (sin auto)</option>
                  <option value="ems">EMS (~0.09 ¥/g)</option>
                  <option value="dhl">DHL (~0.16 ¥/g)</option>
                  <option value="fedex">FedEx (~0.15 ¥/g)</option>
                  <option value="ups">UPS (~0.14 ¥/g)</option>
                  <option value="chinapost">China Post (~0.06 ¥/g)</option>
                  <option value="eub">EUB / ePacket (~0.08 ¥/g)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tarifa (¥/g)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={tarifaPorGramo || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setTarifaPorGramo(val);
                    setLineaEnvio("custom");
                  }}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Freight calculado (¥)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={envio.freightCNY || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEnvio((prev) => ({ ...prev, freightCNY: val }));
                      setLineaEnvio("custom");
                    }}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 tabular-nums"
                  />
                  {lineaEnvio !== "custom" && pesoTotalG > 0 && (
                    <span className="text-xs text-emerald-400 whitespace-nowrap">auto</span>
                  )}
                </div>
              </div>
            </div>
            {lineaEnvio !== "custom" && pesoTotalG > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {pesoTotalG}g × {tarifaPorGramo.toFixed(3)} ¥/g ={" "}
                <span className="text-emerald-400 font-medium">¥{freightCalculado}</span>
              </p>
            )}
            {pesoTotalG === 0 && lineaEnvio !== "custom" && (
              <p className="text-xs text-warning mt-2">Cargá el peso de los productos para calcular el freight.</p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Service (¥)", value: envio.serviceCNY, key: "serviceCNY" as const, step: 0.01 },
              {
                label: "Recarga fee (%)",
                value: envio.recargaPct * 100,
                key: "recargaPct" as const,
                step: 0.01,
                transform: (v: number) => v / 100,
              },
              { label: "Recarga fijo (USD)", value: envio.recargaFijo, key: "recargaFijo" as const, step: 0.01 },
              { label: "Platform fee (USD)", value: envio.platformFee, key: "platformFee" as const, step: 0.01 },
              { label: "Markup sugerido (x)", value: envio.markup, key: "markup" as const, step: 0.1 },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                <input
                  type="number"
                  step={field.step}
                  value={field.value || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setEnvio((prev) => ({ ...prev, [field.key]: field.transform ? field.transform(val) : val }));
                  }}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 tabular-nums"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Aduana Argentina */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Aduana Argentina (Régimen Courier)</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
              <input
                type="checkbox"
                id="franquicia"
                checked={aduana.dentroFranquicia}
                onChange={(e) => setAduana((prev) => ({ ...prev, dentroFranquicia: e.target.checked }))}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="franquicia" className="text-sm">
                Dentro de franquicia $50 (1 de tus primeros 5 envíos del año)
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Envíos del año</label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={aduana.enviosAnio || ""}
                  onChange={(e) => setAduana((prev) => ({ ...prev, enviosAnio: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">IVA (%)</label>
                <input
                  type="number"
                  step={0.01}
                  value={(aduana.ivaPct * 100) || ""}
                  onChange={(e) => setAduana((prev) => ({ ...prev, ivaPct: (parseFloat(e.target.value) || 0) / 100 }))}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">IIBB (%)</label>
                <input
                  type="number"
                  step={0.01}
                  value={(aduana.iibbPct * 100) || ""}
                  onChange={(e) => setAduana((prev) => ({ ...prev, iibbPct: (parseFloat(e.target.value) || 0) / 100 }))}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Valor declarado (USD)</label>
                <input
                  type="number"
                  step={0.01}
                  value={aduana.valorDeclaradoUSD || ""}
                  onChange={(e) =>
                    setAduana((prev) => ({ ...prev, valorDeclaradoUSD: parseFloat(e.target.value) || null }))
                  }
                  placeholder="auto"
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={guardarCotizacion}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Save className="w-4 h-4" /> Guardar cotización
          </button>
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button
            onClick={limpiar}
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Limpiar
          </button>
        </div>
      </div>

      {/* Right column - Results */}
      <div className="xl:col-span-1">
        <div className="sticky top-20 space-y-5">
          <ResultsPanel resultados={resultados} platformFee={envio.platformFee} />
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({ resultados, platformFee }: { resultados: CalculationResult; platformFee: number }) {
  const r = resultados;
  const dolarVenta = r.costoPaqueteARS / (r.costoPaqueteUSD || 1);

  if (r.productosCalc.length === 0 || r.productosUSDTotal === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">
        <Info className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p>Cargá productos para ver resultados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Alerts */}
      {r.alerts.length > 0 && (
        <div className="space-y-2">
          {r.alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
                a.type === "danger"
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : a.type === "warning"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-primary/10 text-primary border border-primary/20"
              }`}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{a.msg}</p>
            </div>
          ))}
        </div>
      )}

      {/* Resumen envío */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Resumen del envío</h3>
        <div className="space-y-2 text-sm">
          <Row label="Productos (FOB)" value={fmtUSD(r.productosUSDTotal)} />
          <Row label="Freight + service" value={fmtUSD(r.freightUSD + r.serviceUSD)} />
          <Row
            label={`Recarga fee (${((r.recargaFee / (r.productosUSDTotal + r.freightUSD + r.serviceUSD)) * 100).toFixed(
              0
            )}%)`}
            value={fmtUSD(r.recargaFee)}
          />
          <Row label="Platform fee" value={fmtUSD(platformFee)} />
          <div className="pt-2 border-t border-border">
            <Row label="Costo del paquete" value={fmtUSD(r.costoPaqueteUSD)} bold />
          </div>
        </div>
      </div>

      {/* Aduana */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Aduana Argentina</h3>
        <div className="space-y-2 text-sm">
          <Row label="FOB real" value={fmtUSD(r.fobRealUSD)} />
          <Row label="FOB declarado" value={fmtUSD(r.fobDeclaradoUSD)} />
          {r.ahorroSubdeclaracionUSD > 0.01 && (
            <Row
              label="Ahorro subdeclaración"
              value={fmtUSD(r.ahorroSubdeclaracionUSD)}
              valueClass="text-emerald-400"
            />
          )}
          {r.detalleImpuestos.franquicia ? (
            <div className="p-2 bg-primary/10 rounded-lg text-xs text-primary">Franquicia $50 aplicada. Impuestos = $0</div>
          ) : (
            <>
              <Row label="Arancel 50%" value={fmtUSD(r.detalleImpuestos.arancel)} />
              <Row label="IVA 21%" value={fmtUSD(r.detalleImpuestos.iva)} />
              <Row label="IIBB" value={fmtUSD(r.detalleImpuestos.iibb)} />
              <Row label="Tasa estadística 3%" value={fmtUSD(r.detalleImpuestos.tasaEst)} />
              <div className="pt-2 border-t border-border">
                <Row label="Total impuestos" value={fmtUSD(r.impuestosUSD)} valueClass="text-destructive" bold />
              </div>
            </>
          )}
          <div className="pt-2 border-t border-border">
            <Row label="Costo final puesto" value={fmtUSD(r.costoTotalUSD)} bold />
          </div>
        </div>
      </div>

      {/* Por producto */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Por producto</h3>
        <div className="space-y-3">
          {r.productosCalc.map((p) => (
            <div key={p.id} className="p-3 bg-secondary/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {p.imgURL && <img src={p.imgURL} alt="" className="w-6 h-6 rounded object-cover" />}
                <p className="text-xs font-medium line-clamp-1">{p.nombre || "Sin nombre"}</p>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Producto:</span>
                  <span className="tabular-nums">{fmtUSD(p.precioUnitUSD)}</span>
                </div>
                {(p.envioLocalUnitUSD > 0 || p.envioChinaUnitUSD > 0) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío China:</span>
                    <span className="tabular-nums text-emerald-400">+{fmtUSD(p.envioLocalUnitUSD + p.envioChinaUnitUSD)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Costo c/u:</span>
                  <span className="tabular-nums">{fmtUSD(p.costoUnitUSD)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Venta c/u:</span>
                  <span className="tabular-nums font-medium">{fmtUSD(p.ventaUSD)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ganancia:</span>
                  <span
                    className={`tabular-nums font-medium ${
                      p.gananciaUnitUSD >= 0 ? "text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {fmtUSD(p.gananciaUnitUSD)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI final */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Resumen del drop</h3>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              r.gananciaTotalUSD >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
            }`}
          >
            {r.gananciaTotalUSD >= 0 ? "Rentable" : "A pérdida"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <Kpi label="Ingreso total" usd={r.ingresoTotalUSD} ars={r.ingresoTotalARS} />
          <Kpi label="Costo puesto" usd={r.costoTotalUSD} ars={r.costoTotalARS} />
          <div
            className={`p-3 rounded-lg ${
              r.gananciaTotalUSD >= 0
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-destructive/10 border border-destructive/20"
            }`}
          >
            <p
              className={`text-xs font-medium uppercase tracking-wider mb-1 ${
                r.gananciaTotalUSD >= 0 ? "text-emerald-400" : "text-destructive"
              }`}
            >
              Ganancia neta
            </p>
            <p
              className={`text-xl font-bold tabular-nums ${
                r.gananciaTotalUSD >= 0 ? "text-emerald-400" : "text-destructive"
              }`}
            >
              {fmtUSD(r.gananciaTotalUSD)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {fmtARS(r.gananciaTotalARS)} · {fmtPct(r.margenTotalPct)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Conversión ARS con dólar {dolarVenta.toFixed(2)}</p>
      </div>
    </div>
  );
}

function Row({ label, value, bold, valueClass }: { label: string; value: string; bold?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold text-foreground" : ""} ${valueClass || ""}`}>{value}</span>
    </div>
  );
}

function Kpi({ label, usd, ars }: { label: string; usd: number; ars: number }) {
  return (
    <div className="p-3 bg-secondary/30 rounded-lg">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold tabular-nums">{fmtUSD(usd)}</p>
      <p className="text-xs text-muted-foreground">{fmtARS(ars)}</p>
    </div>
  );
}
