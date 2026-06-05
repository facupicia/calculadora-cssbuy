import { useState } from 'react';
import { Clock, Trash2, Calculator, Package } from 'lucide-react';
import { Cotizacion } from '../types';
import { fmtUSD, fmtARS } from '../lib/utils';

export default function History() {
  const [cots, setCots] = useState<Cotizacion[]>(() => {
    try { return JSON.parse(localStorage.getItem('cssbuy-cotizaciones') || '[]'); } catch { return []; }
  });

  const eliminar = (id: string) => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    const updated = cots.filter(c => c.id !== id);
    setCots(updated);
    localStorage.setItem('cssbuy-cotizaciones', JSON.stringify(updated));
  };

  if (cots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Clock className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Sin cotizaciones guardadas</p>
        <p className="text-sm">Guardá cotizaciones desde la calculadora.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Historial de cotizaciones</h2>
        <span className="text-sm text-muted-foreground">{cots.length} guardadas</span>
      </div>

      <div className="space-y-3">
        {cots.map(cot => {
          const res = cot.resultados || {};
          const items = (cot.productos || []).length;
          return (
            <div key={cot.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calculator className="w-4 h-4 text-primary" />
                    <h3 className="font-medium">{cot.nombre}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(cot.fecha).toLocaleString('es-AR')}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Package className="w-3 h-3" />
                      {items} productos
                    </span>
                    <span className="text-muted-foreground">{res.pesoTotalG || 0}g</span>
                    <span className="font-medium tabular-nums">{fmtUSD(res.costoTotalUSD || 0)}</span>
                    <span className="text-muted-foreground tabular-nums">{fmtARS(res.costoTotalARS || 0)}</span>
                  </div>
                </div>
                <button
                  onClick={() => eliminar(cot.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
