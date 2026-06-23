export interface CssbuyOrder {
  oid: string;
  producto: string;
  imagen: string;
  url: string;
  vendedor: string;
  variante: string;
  precio_unitario_cny: number;
  envio_local_cny: number;
  envio_china_cny: number;
  cantidad: number;
  estado: string;
  tracking: string;
  peso_g: number;
  fecha_pedido: number;
}

export interface Product {
  id: string;
  nombre: string;
  precioCNY: number;
  envioLocalCNY: number;
  envioChinaCNY: number;
  pesoG: number;
  cantidad: number;
  precioVentaUSD: number;
  link: string;
  imgURL: string;
}

export interface FxRates {
  blue: number;
  oficial: number;
  mep: number;
  cny: number;
}

export interface ShipmentCosts {
  freightCNY: number;
  serviceCNY: number;
  recargaPct: number;
  recargaFijo: number;
  platformFee: number;
  markup: number;
}

export interface AduanaConfig {
  dentroFranquicia: boolean;
  enviosAnio: number;
  ivaPct: number;
  iibbPct: number;
  valorDeclaradoUSD: number | null;
}

export interface ProductCalc extends Product {
  precioUnitUSD: number;
  envioLocalUnitUSD: number;
  envioChinaUnitUSD: number;
  costoProductoUnitUSD: number;
  costoUSD: number;
  pesoGTotal: number;
  envioProrrateadoUSD: number;
  impuestosProrrateadoUSD: number;
  costoTotalUSD: number;
  costoUnitUSD: number;
  precioSugeridoUSD: number;
  ventaUSD: number;
  gananciaUnitUSD: number;
  gananciaTotalUSD: number;
  costoUnitARS: number;
  ventaUnitARS: number;
  gananciaUnitARS: number;
  gananciaTotalARS: number;
}

export interface CalculationResult {
  productosCalc: ProductCalc[];
  productosUSDTotal: number;
  pesoTotalG: number;
  freightUSD: number;
  serviceUSD: number;
  recargaFee: number;
  costoEnvioTotalUSD: number;
  costoPaqueteUSD: number;
  costoPaqueteARS: number;
  fobRealUSD: number;
  fobDeclaradoUSD: number;
  ahorroSubdeclaracionUSD: number;
  fobUSD: number;
  impuestosUSD: number;
  impuestosARS: number;
  costoTotalARS: number;
  costoTotalUSD: number;
  ingresoTotalUSD: number;
  ingresoTotalARS: number;
  gananciaTotalUSD: number;
  gananciaTotalARS: number;
  margenTotalPct: number;
  detalleImpuestos: {
    arancel: number;
    iva: number;
    iibb: number;
    tasaEst: number;
    franquicia: boolean;
    ahorro: number;
  };
  alerts: { type: string; msg: string }[];
}

export interface Cotizacion {
  id: string;
  fecha: string;
  nombre: string;
  fx: FxRates;
  envio: ShipmentCosts;
  aduana: AduanaConfig;
  productos: Product[];
  resultados: CalculationResult;
}
