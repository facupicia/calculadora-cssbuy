import { Package, DollarSign, TrendingUp, Percent, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CssbuyOrder } from '../types';
import { fmtUSD } from '../lib/utils';

interface DashboardProps {
  orders: CssbuyOrder[];
}

export default function Dashboard({ orders }: DashboardProps) {
  const totalPedidos = orders.length;
  const totalCostoCNY = orders.reduce((s, o) => s + (o.precio_unitario_cny * o.cantidad), 0);
  const avgPrecio = totalPedidos > 0 ? totalCostoCNY / totalPedidos : 0;

  const chartData = orders.map(o => ({
    name: o.producto.slice(0, 20) + (o.producto.length > 20 ? '...' : ''),
    costo: o.precio_unitario_cny * o.cantidad,
    unitario: o.precio_unitario_cny,
  })).slice(0, 8);

  const kpiCards = [
    {
      label: 'Pedidos Ordered',
      value: totalPedidos.toString(),
      sub: 'Activos',
      icon: Package,
      color: 'text-blue-400',
    },
    {
      label: 'Costo Total (CNY)',
      value: `¥${totalCostoCNY.toFixed(0)}`,
      sub: fmtUSD(totalCostoCNY / 7.2),
      icon: DollarSign,
      color: 'text-emerald-400',
    },
    {
      label: 'Precio Promedio',
      value: `¥${avgPrecio.toFixed(2)}`,
      sub: 'Por producto',
      icon: TrendingUp,
      color: 'text-violet-400',
    },
    {
      label: 'Margen Estimado',
      value: '100%',
      sub: 'Markup 2x',
      icon: Percent,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="text-2xl font-bold tracking-tight">{card.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {orders.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Costo por Pedido (CNY)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(240 10% 6%)', border: '1px solid hsl(240 6% 14%)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fafafa' }}
                  />
                  <Bar dataKey="costo" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={`hsl(${235 + i * 10} 70% ${50 + i * 3}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Resumen de Pedidos</h3>
            <div className="space-y-3">
              {orders.slice(0, 5).map(o => (
                <div key={o.oid} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    {o.imagen ? (
                      <img src={o.imagen} alt="" className="w-8 h-8 rounded object-cover bg-muted" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted" />
                    )}
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{o.producto}</p>
                      <p className="text-xs text-muted-foreground">{o.variante}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">¥{(o.precio_unitario_cny * o.cantidad).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay pedidos para mostrar. Hacé sync para traer datos.</p>
        </div>
      )}
    </div>
  );
}
