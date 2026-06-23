"use client";

import { useState, useRef } from "react";
import { X, AlertCircle, Copy, Check, Upload, FileJson } from "lucide-react";

const CONSOLE_SCRIPT = [
  "// CSSBuy Warehouse Scraper — solo productos en almacén",
  "// 1. Andá a https://www.cssbuy.com/web/order y logueate",
  "// 2. F12 → Console → Pegá esto → Enter",
  "// 3. Se descarga orders.json, subilo en esta página",
  "",
  "(async()=>{",
  "const P=50,M=500,A=[];",
  "",
  "function peso(w){",
  "  if(!w)return 0;",
  "  if(typeof w==='number')return w;",
  "  try{const p=JSON.parse(String(w));return Array.isArray(p)?(Number(p[0])||0):(Number(w)||0)}",
  "  catch{return Number(String(w).match(/\\d+/)?.[0])||0}",
  "}",
  "",
  "function map(it){",
  "  return{",
  "    oid:String(it.oid??''),",
  "    producto:String(it.goodsname??''),",
  "    imagen:String(it.goodsimg??it.skuimg??''),",
  "    url:String(it.goodsurl??''),",
  "    vendedor:String(it.goodsseller??''),",
  "    variante:String(it.goodssize??''),",
  "    precio_unitario_cny:Number(it.goodsprice)||0,",
  "    envio_local_cny:Number(it.sendprice)||0,",
  "    envio_china_cny:Number(it.chinashipping)||0,",
  "    cantidad:Math.max(1,Math.round(Number(it.goodsnum)||1)),",
  "    estado:String(it.statename??it.state??''),",
  "    peso_g:peso(it.orderweight),",
  "    tracking:String(it.expressno??''),",
  "    fecha_pedido:Number(it.addtime)||Math.floor(Date.now()/1000)",
  "  }",
  "}",
  "",
  "let csrf='';",
  "try{csrf=document.querySelector('meta[name=\"csrf-token\"]')?.getAttribute('content')||''}catch{}",
  "if(!csrf){const m=document.documentElement.innerHTML.match(/csrf[_-]?token['\"\\s:=]+['\"]?([a-zA-Z0-9]+)/i);if(m)csrf=m[1]}",
  "",
  "let pn=1,hm=true;",
  "while(hm){",
  "  const params=new URLSearchParams();",
  "  params.set('orderState','all');params.set('starttime','');params.set('endtime','');",
  "  params.set('pageSize',String(P));params.set('pageNum',String(pn));",
  "  params.set('query','');params.set('inchina','');",
  "  if(csrf)params.set('_token',csrf);",
  "  const res=await fetch('https://www.cssbuy.com/web/order',{",
  "    method:'POST',",
  "    headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-Requested-With':'XMLHttpRequest','X-CSRF-Token':csrf,'X-XSRF-TOKEN':csrf,Accept:'application/json, text/javascript, */*; q=0.01'},",
  "    body:params.toString()",
  "  });",
  "  const text=await res.text();",
  "  let data;try{data=JSON.parse(text)}catch{console.error('No JSON:',text.substring(0,500));break}",
  "  let list=data?.list??data?.orders??data?.data?.list??data?.data?.orders??data?.data?.data??data;",
  "  if(!Array.isArray(list)){console.error('Formato:',JSON.stringify(data).substring(0,500));break}",
  "  for(const it of list){if(it.state===4||it.statename==='In Warehouse')A.push(map(it))}",
  "  console.log('Pág '+pn+': '+list.length+' raw, '+A.length+' warehouse');",
  "  hm=list.length>=P&&A.length<M;",
  "  if(hm)pn++",
  "}",
  "console.log('\\n✅ '+A.length+' pedidos en almacén');",
  "const blob=new Blob([JSON.stringify({orders:A,lastSync:new Date().toISOString()},null,2)],{type:'application/json'});",
  "const url=URL.createObjectURL(blob);",
  "const a=document.createElement('a');a.href=url;a.download='orders.json';a.click();",
  "URL.revokeObjectURL(url);",
  "console.log('💾 orders.json descargado!');",
  "console.table(A.slice(0,10).map(o=>({oid:o.oid,producto:o.producto?.substring(0,50),estado:o.estado,peso:o.peso_g,precio:o.precio_unitario_cny})))",
  "})();",
].join("\n");

interface SyncDialogProps {
  open: boolean;
  onClose: () => void;
  onImportJson: (json: string) => Promise<number>;
  onImportFile: (file: File) => Promise<number>;
  syncing: boolean;
}

export default function SyncDialog({ open, onClose, onImportJson, onImportFile, syncing }: SyncDialogProps) {
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(CONSOLE_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(false);
    try {
      const count = await onImportFile(file);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name?.endsWith(".json") || file?.type === "application/json") {
      handleFile(file);
    } else {
      setError("Solo se aceptan archivos .json");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold">Actualizar pedidos</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Opción 1: Subir archivo */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Opción 1 · Subí el orders.json
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileJson className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Arrastrá el archivo orders.json acá</p>
              <p className="text-xs text-muted-foreground mt-1">o hacé clic para seleccionarlo</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-card px-3">o descargalo primero con el script</span>
            </div>
          </div>

          {/* Opción 2: Script de consola */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Opción 2 · Script de consola (solo almacén)
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="mb-2"><strong>Instrucciones:</strong></p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Abrí <a href="https://www.cssbuy.com/web/order" target="_blank" rel="noreferrer" className="underline">cssbuy.com/web/order</a> y logueate</li>
                  <li>Abrí DevTools con <kbd className="px-1 py-0.5 bg-secondary/50 rounded">F12</kbd></li>
                  <li>Andá a la pestaña <strong>Console</strong></li>
                  <li>Copiá el script de abajo, pegalo y dale Enter</li>
                  <li>Se descarga orders.json automáticamente</li>
                  <li>Volvé acá y subilo arrastrándolo</li>
                </ol>
              </div>
            </div>

            <div className="relative">
              <pre className="bg-secondary/30 border border-border rounded-lg p-3 text-[10px] font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre leading-relaxed">
                {CONSOLE_SCRIPT}
              </pre>
              <button
                type="button"
                onClick={handleCopyScript}
                className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-background/80 hover:bg-background border border-border rounded text-xs transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
              ✅ Pedidos importados correctamente.
            </div>
          )}

          {syncing && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              Procesando...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
