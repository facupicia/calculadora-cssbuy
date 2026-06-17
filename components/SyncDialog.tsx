"use client";

import { useState } from "react";
import { X, AlertCircle, Cookie } from "lucide-react";

interface SyncDialogProps {
  open: boolean;
  onClose: () => void;
  onSync: (cookie: string) => Promise<void>;
  syncing: boolean;
}

export default function SyncDialog({ open, onClose, onSync, syncing }: SyncDialogProps) {
  const [cookie, setCookie] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSync(cookie.trim());
      setCookie("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Cookie className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Sincronizar pedidos CSSBuy</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              La cookie expira cada cierto tiempo. Pegá aquí el valor completo de la cookie de sesión de CSSBuy. No se
              guarda en el servidor, solo se usa para esta sincronización.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Cookie de sesión
            </label>
            <textarea
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              placeholder="pega aquí tu cookie..."
              rows={4}
              required
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs"
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={syncing || !cookie.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {syncing ? "Sincronizando..." : "Sincronizar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
