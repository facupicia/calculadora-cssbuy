"use client";

import { useState } from "react";
import { X, AlertCircle, Copy, Check, Terminal, Clipboard } from "lucide-react";
import { CSSBUY_SCRAPER_SCRIPT } from "@/lib/cssbuyScraperScript";

interface SyncDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (json: string) => Promise<number>;
  syncing: boolean;
}

export default function SyncDialog({ open, onClose, onImport, syncing }: SyncDialogProps) {
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(CSSBUY_SCRAPER_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onImport(json.trim());
      setJson("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJson(text);
    } catch {
      setError("No se pudo leer el portapapeles. Pegá manualmente con Ctrl+V.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Sincronizar pedidos CSSBuy</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              CSSBuy valida la IP de la sesión, así que el scraper tiene que correr desde tu navegador. Pegá el script en
              la consola de cssbuy.com (logueado) y volvé acá con el JSON.
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paso 1 · Abrí cssbuy.com y la consola
            </div>
            <a
              href="https://www.cssbuy.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Ir a cssbuy.com →
            </a>
            <p className="text-xs text-muted-foreground">
              Iniciá sesión, después abrí DevTools con <kbd className="px-1.5 py-0.5 bg-secondary rounded font-mono">F12</kbd>{" "}
              o <kbd className="px-1.5 py-0.5 bg-secondary rounded font-mono">Ctrl+Shift+I</kbd>, andá a la pestaña{" "}
              <strong>Console</strong>.
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paso 2 · Pegá este script en la consola
            </div>
            <div className="relative">
              <pre className="bg-secondary/50 border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto whitespace-pre">
                {CSSBUY_SCRAPER_SCRIPT}
              </pre>
              <button
                type="button"
                onClick={handleCopyScript}
                className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-background/80 hover:bg-background border border-border rounded text-xs transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copiado" : "Copiar script"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pegalo en la consola con <kbd className="px-1.5 py-0.5 bg-secondary rounded font-mono">Ctrl+V</kbd> y presioná{" "}
              <kbd className="px-1.5 py-0.5 bg-secondary rounded font-mono">Enter</kbd>. El script copia el JSON al
              portapapeles automáticamente.
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paso 3 · Pegá acá el JSON que devolvió el script
            </div>
            <div className="relative">
              <textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                placeholder='[{"oid":"...","producto":"...","precio_unitario_cny":60,...}]'
                rows={6}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
              />
              <button
                type="button"
                onClick={handlePaste}
                className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-background/80 hover:bg-background border border-border rounded text-xs transition-colors"
              >
                <Clipboard className="w-3 h-3" />
                Pegar
              </button>
            </div>
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
              disabled={syncing || !json.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {syncing ? "Importando..." : "Importar pedidos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
