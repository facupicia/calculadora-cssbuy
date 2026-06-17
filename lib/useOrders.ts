"use client";

import { useState, useEffect, useCallback } from "react";
import { CssbuyOrder } from "./types";

interface OrdersResponse {
  orders: CssbuyOrder[];
  lastSync: string | null;
}

const STORAGE_KEY = "cssbuy-orders";
const STORAGE_SYNC_KEY = "cssbuy-last-sync";

export function useOrders() {
  const [orders, setOrders] = useState<CssbuyOrder[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar desde localStorage al montar
  useEffect(() => {
    try {
      const savedOrders = localStorage.getItem(STORAGE_KEY);
      const savedSync = localStorage.getItem(STORAGE_SYNC_KEY);
      if (savedOrders) setOrders(JSON.parse(savedOrders));
      if (savedSync) setLastSync(savedSync);
    } catch {
      // ignore
    }
  }, []);

  // Persistir en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);

  useEffect(() => {
    try {
      if (lastSync) localStorage.setItem(STORAGE_SYNC_KEY, lastSync);
    } catch {
      // ignore
    }
  }, [lastSync]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Error al cargar pedidos");
      const data: OrdersResponse = await res.json();
      setOrders(data.orders);
      setLastSync(data.lastSync);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  const sync = useCallback(
    async (cookie?: string) => {
      setSyncing(true);
      setError(null);
      try {
        const res = await fetch("/api/orders/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookie }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error || "Error al sincronizar");
        setOrders(data.orders);
        setLastSync(data.lastSync);
        return data as OrdersResponse;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        throw err;
      } finally {
        setSyncing(false);
      }
    },
    []
  );

  return { orders, lastSync, loading, syncing, error, fetchOrders, sync };
}
