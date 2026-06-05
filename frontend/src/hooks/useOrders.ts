import { useState, useEffect, useCallback } from 'react';
import { CssbuyOrder } from '../types';

interface OrdersResponse {
  orders: CssbuyOrder[];
  lastSync: string | null;
}

export function useOrders() {
  const [orders, setOrders] = useState<CssbuyOrder[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBackend, setHasBackend] = useState<boolean | null>(null);

  // Detectar automáticamente si hay backend disponible
  useEffect(() => {
    const detectBackend = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('/api/health', { signal: controller.signal });
        clearTimeout(timeout);
        setHasBackend(res.ok);
      } catch {
        setHasBackend(false);
      }
    };
    detectBackend();
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (hasBackend === false) {
        // Modo Vercel (sin backend): leer JSON estático
        const res = await fetch('/data/orders.json');
        if (!res.ok) throw new Error('No se encontraron datos de pedidos');
        const data: OrdersResponse = await res.json();
        setOrders(data.orders);
        setLastSync(data.lastSync);
      } else {
        // Modo local: usar backend API
        const res = await fetch('/api/orders');
        if (!res.ok) throw new Error('Error al cargar pedidos');
        const data: OrdersResponse = await res.json();
        setOrders(data.orders);
        setLastSync(data.lastSync);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [hasBackend]);

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      if (hasBackend === false) {
        // En Vercel, solo recargar el JSON (no se puede ejecutar Python serverless)
        await fetchOrders();
        alert('En Vercel no se puede ejecutar el scraper. Usá el script Python localmente y actualizá el archivo data/orders.json');
      } else {
        const res = await fetch('/api/orders/sync', { method: 'POST' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.details || 'Error al sincronizar');
        }
        const data: OrdersResponse = await res.json();
        setOrders(data.orders);
        setLastSync(data.lastSync);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSyncing(false);
    }
  }, [hasBackend, fetchOrders]);

  useEffect(() => {
    if (hasBackend !== null) {
      fetchOrders();
    }
  }, [hasBackend, fetchOrders]);

  return { orders, lastSync, loading, syncing, error, hasBackend: hasBackend === true, fetchOrders, sync };
}
