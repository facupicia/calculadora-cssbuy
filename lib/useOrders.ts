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

  const importFromJson = useCallback(async (jsonText: string) => {
    setSyncing(true);
    setError(null);
    try {
      const trimmed = jsonText.trim();
      if (!trimmed) throw new Error("Pegá el JSON generado por el script");

      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      if (arr.length === 0) throw new Error("El JSON no contiene pedidos");

      const valid: CssbuyOrder[] = arr
        .filter((o: any) => o && typeof o === "object")
        .map((o: any) => ({
          oid: String(o.oid ?? o.id ?? o.orderId ?? ""),
          producto: String(o.producto ?? o.productName ?? o.name ?? o.title ?? ""),
          imagen: String(o.imagen ?? o.productImage ?? o.image ?? o.img ?? ""),
          url: String(o.url ?? o.productUrl ?? o.link ?? ""),
          vendedor: String(o.vendedor ?? o.sellerName ?? o.seller ?? ""),
          variante: String(o.variante ?? o.variant ?? o.sku ?? ""),
          precio_unitario_cny: Number(o.precio_unitario_cny ?? o.unitPrice ?? o.price ?? 0) || 0,
          envio_local_cny: Number(o.envio_local_cny ?? o.localShipping ?? 0) || 0,
          envio_china_cny: Number(o.envio_china_cny ?? o.chinaShipping ?? 0) || 0,
          cantidad: Math.max(1, Math.round(Number(o.cantidad ?? o.quantity ?? 1) || 1)),
          estado: String(o.estado ?? o.status ?? "Ordered"),
          tracking: String(o.tracking ?? o.trackingNumber ?? ""),
          fecha_pedido: Number(o.fecha_pedido ?? o.orderTime ?? Math.floor(Date.now() / 1000)) || Math.floor(Date.now() / 1000),
        }));

      if (valid.length === 0) throw new Error("No se encontraron pedidos válidos en el JSON");

      const stamp = new Date().toISOString();
      setOrders(valid);
      setLastSync(stamp);
      return valid.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { orders, lastSync, loading, syncing, error, fetchOrders, importFromJson };
}
