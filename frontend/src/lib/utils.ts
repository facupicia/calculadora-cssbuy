import { Product, FxRates, ShipmentCosts, AduanaConfig, CalculationResult, ProductCalc } from '../types';

export const fmtUSD = (n: number) => isFinite(n) ? `USD ${n.toFixed(2)}` : '—';
export const fmtARS = (n: number) => isFinite(n) ? `$${Math.round(n).toLocaleString('es-AR')}` : '—';
export const fmtPct = (n: number) => isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—';
export const fmtNumber = (n: number) => isFinite(n) ? n.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '—';

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function calcularTodo(
  productos: Product[],
  fx: FxRates,
  envio: ShipmentCosts,
  aduana: AduanaConfig
): CalculationResult {
  const productosValidos = productos.filter(p => p.nombre || p.precioCNY > 0 || p.cantidad > 0);

  let productosUSDTotal = 0;
  let pesoTotalG = 0;

  const productosCalc = productosValidos.map(p => {
    const cantidad = p.cantidad || 1;
    const precioUnitUSD = (p.precioCNY || 0) / fx.cny;
    const envioLocalUnitUSD = (p.envioLocalCNY || 0) / fx.cny;
    const envioChinaUnitUSD = (p.envioChinaCNY || 0) / fx.cny;
    const costoProductoUnitUSD = precioUnitUSD + envioLocalUnitUSD + envioChinaUnitUSD;
    const costoUSD = costoProductoUnitUSD * cantidad;
    const pesoGTotal = (p.pesoG || 0) * cantidad;
    productosUSDTotal += costoUSD;
    pesoTotalG += pesoGTotal;
    return { ...p, cantidad, precioUnitUSD, envioLocalUnitUSD, envioChinaUnitUSD, costoProductoUnitUSD, costoUSD, pesoGTotal };
  });

  const freightUSD = envio.freightCNY / fx.cny;
  const serviceUSD = envio.serviceCNY / fx.cny;
  const subTotalUSD = productosUSDTotal + freightUSD + serviceUSD;
  const recargaFee = subTotalUSD * envio.recargaPct + envio.recargaFijo;
  const costoEnvioTotalUSD = freightUSD + serviceUSD + recargaFee + envio.platformFee;
  const costoPaqueteUSD = subTotalUSD + recargaFee + envio.platformFee;

  const dolarVenta = fx.oficial || fx.blue || 1;
  const costoPaqueteARS = costoPaqueteUSD * dolarVenta;

  const franquiciaDisponible = aduana.enviosAnio < 5;
  const fobRealUSD = costoPaqueteUSD;
  const fobDeclaradoUSD = aduana.valorDeclaradoUSD != null && aduana.valorDeclaradoUSD > 0
    ? aduana.valorDeclaradoUSD
    : fobRealUSD;
  const fobUSD = fobDeclaradoUSD;
  const ahorroSubdeclaracionUSD = Math.max(0, fobRealUSD - fobDeclaradoUSD);

  let impuestosUSD = 0;
  let detalleImpuestos = { arancel: 0, iva: 0, iibb: 0, tasaEst: 0, franquicia: false, ahorro: 0 };

  if (aduana.dentroFranquicia && franquiciaDisponible && fobUSD <= 50) {
    detalleImpuestos = { arancel: 0, iva: 0, iibb: 0, tasaEst: 0, franquicia: true, ahorro: ahorroSubdeclaracionUSD };
    impuestosUSD = 0;
  } else {
    const excedente = Math.max(0, fobUSD - 50);
    const arancel = excedente * 0.50;
    const baseIVA = fobUSD + arancel;
    const iva = baseIVA * aduana.ivaPct;
    const iibb = baseIVA * aduana.iibbPct;
    const tasaEst = fobUSD * 0.03;
    impuestosUSD = arancel + iva + iibb + tasaEst;
    detalleImpuestos = { arancel, iva, iibb, tasaEst, franquicia: false, ahorro: ahorroSubdeclaracionUSD };
  }

  const impuestosARS = impuestosUSD * dolarVenta;
  const costoTotalARS = costoPaqueteARS + impuestosARS;
  const costoTotalUSD = costoPaqueteUSD + impuestosUSD;

  const productosConDesglose: ProductCalc[] = productosCalc.map(p => {
    const proporcion = productosUSDTotal > 0 ? p.costoUSD / productosUSDTotal : 0;
    const envioProrrateadoUSD = costoEnvioTotalUSD * proporcion;
    const impuestosProrrateadoUSD = impuestosUSD * proporcion;
    const costoTotalUSD = p.costoUSD + envioProrrateadoUSD + impuestosProrrateadoUSD;
    const costoUnitUSD = costoTotalUSD / p.cantidad;
    const precioSugeridoUSD = costoUnitUSD * envio.markup;
    const ventaUSD = p.precioVentaUSD > 0 ? p.precioVentaUSD : precioSugeridoUSD;
    const gananciaUnitUSD = ventaUSD - costoUnitUSD;
    const gananciaTotalUSD = gananciaUnitUSD * p.cantidad;
    const costoUnitARS = costoUnitUSD * dolarVenta;
    const ventaUnitARS = ventaUSD * dolarVenta;
    const gananciaUnitARS = gananciaUnitUSD * dolarVenta;
    const gananciaTotalARS = gananciaTotalUSD * dolarVenta;
    return {
      ...p,
      envioProrrateadoUSD,
      impuestosProrrateadoUSD,
      costoTotalUSD,
      costoUnitUSD,
      precioSugeridoUSD,
      ventaUSD,
      gananciaUnitUSD,
      gananciaTotalUSD,
      costoUnitARS,
      ventaUnitARS,
      gananciaUnitARS,
      gananciaTotalARS,
    };
  });

  const ingresoTotalUSD = productosConDesglose.reduce((s, p) => s + (p.ventaUSD * p.cantidad), 0);
  const ingresoTotalARS = productosConDesglose.reduce((s, p) => s + (p.ventaUnitARS * p.cantidad), 0);
  const gananciaTotalUSD = productosConDesglose.reduce((s, p) => s + p.gananciaTotalUSD, 0);
  const gananciaTotalARS = productosConDesglose.reduce((s, p) => s + p.gananciaTotalARS, 0);
  const margenTotalPct = costoTotalUSD > 0 ? gananciaTotalUSD / costoTotalUSD : 0;

  const alerts: { type: string; msg: string }[] = [];
  if (pesoTotalG > 5999) {
    alerts.push({ type: 'warning', msg: `Peso total ${pesoTotalG}g supera el máximo de 5999g. Partí el envío en dos paquetes.` });
  }
  if (fx.cny === 0) alerts.push({ type: 'danger', msg: 'Falta el tipo de cambio CNY/USD.' });
  if (fx.oficial === 0 && fx.blue === 0) alerts.push({ type: 'warning', msg: 'Cargá el dólar oficial o blue para calcular.' });
  if (productosUSDTotal === 0) alerts.push({ type: 'info', msg: 'Agregá al menos un producto para ver resultados.' });
  if (aduana.dentroFranquicia && aduana.enviosAnio >= 5) {
    alerts.push({ type: 'danger', msg: `Ya hiciste ${aduana.enviosAnio} envíos este año. La franquicia de $50 no aplica.` });
  }
  if (aduana.dentroFranquicia && fobUSD > 50) {
    alerts.push({ type: 'warning', msg: `FOB declarado USD ${fobUSD.toFixed(2)} supera los $50. La franquicia no aplicaría.` });
  }
  if (ahorroSubdeclaracionUSD > 1) {
    const pct = fobRealUSD > 0 ? (ahorroSubdeclaracionUSD / fobRealUSD * 100).toFixed(0) : '0';
    alerts.push({ type: 'warning', msg: `Estás declarando ${pct}% menos que el costo real. Ahorrás ${fmtUSD(ahorroSubdeclaracionUSD)} en impuestos pero es tu riesgo si Aduana abre el paquete.` });
  }

  return {
    productosCalc: productosConDesglose,
    productosUSDTotal,
    pesoTotalG,
    freightUSD,
    serviceUSD,
    recargaFee,
    costoEnvioTotalUSD,
    costoPaqueteUSD,
    costoPaqueteARS,
    fobRealUSD,
    fobDeclaradoUSD,
    ahorroSubdeclaracionUSD,
    fobUSD,
    impuestosUSD,
    impuestosARS,
    costoTotalARS,
    costoTotalUSD,
    ingresoTotalUSD,
    ingresoTotalARS,
    gananciaTotalUSD,
    gananciaTotalARS,
    margenTotalPct,
    detalleImpuestos,
    alerts,
  };
}
