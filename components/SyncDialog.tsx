"use client";

import { useState } from "react";
import { X, AlertCircle, Copy, Check, Terminal, Cookie, Globe } from "lucide-react";
import { CSSBUY_SCRAPER_SCRIPT } from "@/lib/cssbuyScraperScript";

interface SyncDialogProps {
  open: boolean;
  onClose: () => void;
  onSyncCookie: (cookie: string, csrfToken: string, mode: "server" | "browser") => Promise<unknown>;
  onImportJson: (json: string) => Promise<number>;
  syncing: boolean;
}

export default function SyncDialog({
  open,
  onClose,
  onSyncCookie,
  onImportJson,
  syncing,
}: SyncDialogProps) {
  const [mode, setMode] = useState<"server" | "browser" | "script">("server");
  const [cookie, setCookie] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
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
      // ignore
    }
  };

  const handleCookieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSyncCookie(cookie.trim(), csrfToken.trim(), mode as "server" | "browser");
      setCookie("");
      setCsrfToken("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleJsonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onImportJson(json.trim());
      setJson("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handlePaste = async (field: "cookie" | "csrf" | "json") => {
    try {
      const text = await navigator.clipboard.readText();
      if (field === "cookie") setCookie(text);
      else if (field === "csrf") setCsrfToken(text);
      else setJson(text);
    } catch {
      setError("No se pudo leer el portapapeles. Pegá manualmente con Ctrl+V.");
    }
  };

  const isCookieMode = mode === "server" || mode === "browser";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold">Sincronizar pedidos CSSBuy</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="flex bg-secondary/50 rounded-lg p-1 gap-1">
            <button
              type="button"
              onClick={() => setMode("server")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "server"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cookie className="w-4 h-4" />
              Por servidor
            </button>
            <button
              type="button"
              onClick={() => setMode("browser")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "browser"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="w-4 h-4" />
              Desde navegador
            </button>
            <button
              type="button"
              onClick={() => setMode("script")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "script"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Terminal className="w-4 h-4" />
              Script consola
            </button>
          </div>
        </div>

        {isCookieMode ? (
          <form onSubmit={handleCookieSubmit} className="p-4 space-y-4">
            <div
              className={`p-3 border rounded-lg text-xs flex items-start gap-2 ${
                mode === "browser"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
              }`}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                {mode === "browser"
                  ? "El request sale directamente desde tu Chrome, con tu IP real. Es el método más fiable si CSSBuy valida IP. Si falla por CORS, usá 'Por servidor'."
                  : "El request sale desde el servidor de Vercel. Si CSSBuy valida la IP, puede fallar; probá 'Desde navegador' como alternativa."}
              </p>
            </div>

            <div className="relative">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Cookie de sesión
              </label>
              <textarea
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="pega aquí tu cookie..."
                rows={5}
                required
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
              />
              <button
                type="button"
                onClick={() => handlePaste("cookie")}
                className="absolute top-7 right-2 flex items-center gap-1.5 px-2 py-1 bg-background/80 hover:bg-background border border-border rounded text-xs transition-colors"
              >
                <Copy className="w-3 h-3" />
                Pegar
              </button>
            </div>

            <div className="relative">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                X-CSRF-Token
                <span className="ml-2 normal-case text-[10px] text-muted-foreground">
                  (obligatorio en Laravel)
                </span>
              </label>
              <input
                type="text"
                value={csrfToken}
                onChange={(e) => setCsrfToken(e.target.value)}
                placeholder="ctr4GvKRVCLqqMAOs8QXMU0b5LAcwTCPeGYbCd15"
                required
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
              />
              <button
                type="button"
                onClick={() => handlePaste("csrf")}
                className="absolute top-7 right-2 flex items-center gap-1.5 px-2 py-1 bg-background/80 hover:bg-background border border-border rounded text-xs transition-colors"
              >
                <Copy className="w-3 h-3" />
                Pegar
              </button>
            </div>

            <div className="p-3 bg-secondary/30 border border-border rounded-lg text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Cómo obtener el X-CSRF-Token:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>En cssbuy.com, abrí DevTools con F12.</li>
                <li>Andá a la pestaña Network y recargá la lista de pedidos.</li>
                <li>Hacé clic en el request a <code className="bg-secondary px-1 rounded">web/order</code>.</li>
                <li>En Request Headers, buscá <code className="bg-secondary px-1 rounded">x-csrf-token</code> y copiá el valor.</li>
              </ol>
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
                disabled={syncing || !cookie.trim() || !csrfToken.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJsonSubmit} className="p-4 space-y-5">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Útil si CSSBuy rechaza la cookie por validación de IP o CORS. El script corre en tu navegador con tu IP real.
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
                Iniciá sesión, después abrí DevTools con{" "}
                <kbd className="px-1.5 py-0.5 bg-secondary rounded font-mono">F12</kbd>{" "}
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
                  onClick={() => handlePaste("json")}
                  className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-background/80 hover:bg-background border border-border rounded text-xs transition-colors"
                >
                  <Copy className="w-3 h-3" />
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
        )}
      </div>
    </div>
  );
}
