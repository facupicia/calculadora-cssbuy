import { ExternalLink, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { CssbuyOrder, Product } from '../types';

interface CssbuyOrdersProps {
  orders: CssbuyOrder[];
  loading: boolean;
  error: string | null;
  onImport: (product: Product) => void;
}

export default function CssbuyOrders({ orders, loading, error, onImport }: CssbuyOrdersProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive gap-2">
        <AlertCircle className="w-5 h-5" />
        <p>{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Package className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Sin pedidos Ordered</p>
        <p className="text-sm">Hacé sync para traer los pedidos de CSSBuy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pedidos en estado "Ordered"</h2>
        <span className="text-sm text-muted-foreground">{orders.length} pedidos</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map(order => (
          <div key={order.oid} className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                {order.imagen ? (
                  <img
                    src={order.imagen}
                    alt={order.producto}
                    className="w-20 h-20 object-cover rounded-lg bg-muted"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm line-clamp-2 leading-tight" title={order.producto}>
                  {order.producto}
                </h3>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                      {order.estado}
                    </span>
                    <span>¥{order.precio_unitario_cny.toFixed(2)}</span>
                    <span>×{order.cantidad}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {(order.envio_local_cny > 0 || order.envio_china_cny > 0) && (
                      <span className="text-emerald-400">
                        + envío China: ¥{(order.envio_local_cny + order.envio_china_cny).toFixed(2)}
                      </span>
                    )}
                    <span className="text-foreground font-medium">
                      = ¥{(order.precio_unitario_cny + order.envio_local_cny + order.envio_china_cny).toFixed(2)}
                    </span>
                  </div>
                  {order.variante && (
                    <p className="text-xs text-muted-foreground truncate">{order.variante}</p>
                  )}
                  {order.tracking && (
                    <p className="text-xs text-muted-foreground font-mono">{order.tracking}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              {order.url && (
                <a
                  href={order.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver producto
                </a>
              )}
              <button
                onClick={() =>
                  onImport({
                    id: uid(),
                    nombre: order.producto || `CSSBuy #${order.oid}`,
                    precioCNY: order.precio_unitario_cny || 0,
                    envioLocalCNY: order.envio_local_cny || 0,
                    envioChinaCNY: order.envio_china_cny || 0,
                    pesoG: 0,
                    cantidad: order.cantidad || 1,
                    precioVentaUSD: 0,
                    link: order.url || '',
                    imgURL: order.imagen || '',
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors ml-auto"
              >
                <ShoppingCart className="w-3 h-3" />
                Importar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
