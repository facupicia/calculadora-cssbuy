"use client";

import { useState, useRef } from "react";
import { X, AlertCircle, Copy, Check, Upload, FileJson } from "lucide-react";

const CONSOLE_SCRIPT = `// 1. Andá a https://www.cssbuy.com/web/order?type=all y logueate
// 2. Abrí DevTools (F12) → Console
// 3. Pegá este script entero y dale Enter
// 4. Se descarga automáticamente orders.json
// 5. Volvé acá y subí el archivo descargado

(async()=>{
const P=50,M=500,A=[],pk=(o,...k)=>{for(const x of k){const v=o?.[x];if(v!=null&&v!=="")return typeof v==="string"?v:String(v)}},tn=(...vs)=>{for(const v of vs){if(v===undefined||v===null)continue;const n=typeof v==="string"?parseFloat(v):v;if(!isNaN(n))return n}return 0},ti=(...vs)=>Math.max(1,Math.round(tn(...vs))),pt=(ts,ts2,ts3,ts4,ts5,s)=>{const n=tn(ts,ts2,ts3,ts4,ts5);if(n>0)return n;if(typeof s==="string"){const p=Date.parse(s);if(!isNaN(p))return Math.floor(p/1e3)}return Math.floor(Date.now()/1e3)},mo=r=>({oid:String(pk(r,"orderId","orderno","id","oid","orderNo","ordernumber")??""),producto:String(pk(r,"goodsname","productName","name","title","product")??""),imagen:String(pk(r,"goodsimg","productImage","image","img","pic")??""),url:String(pk(r,"goodsurl","productUrl","url","link","itemurl")??""),vendedor:String(pk(r,"seller","storename","storeName","sellerName","shopname")??""),variante:String([pk(r,"goodscolor","color"),pk(r,"goodssize","size","goodsskuname")].filter(Boolean).join("; ")||(pk(r,"sku","variant","specification","goodsskuname")??"")),precio_unitario_cny:tn(pk(r,"goodsprice","goodsprice_def","unitprice","unitPrice","price")),envio_local_cny:tn(pk(r,"sendprice","sendprice_def","localShipping","domesticShipping","freight")),envio_china_cny:tn(pk(r,"chinashipping","chinaShipping","internationalShipping","interShipping")),cantidad:ti(pk(r,"quantity","qty","num","goodsnum")),estado:String(pk(r,"orderstate","status","state")??""),tracking:String(pk(r,"trackno","tracking","trackingNumber","expressno","expressNo")??""),fecha_pedido:pt(r.addtime,r.createtime,r.ordertime,r.orderTime,r.createTime,r.createdAt)}),el=d=>{if(Array.isArray(d))return d;if(d&&typeof d==="object"){if(Array.isArray(d.list))return d.list;if(Array.isArray(d.orders))return d.orders;if(Array.isArray(d.data))return d.data;if(d.data&&typeof d.data==="object"){if(Array.isArray(d.data.list))return d.data.list;if(Array.isArray(d.data.orders))return d.data.orders;if(Array.isArray(d.data.data))return d.data.data}}return null};let csrf="";try{csrf=document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")||""}catch{}if(!csrf){const m=document.documentElement.innerHTML.match(/csrf[_-]?token["'\\s:=]+["']?([a-zA-Z0-9]+)/i);if(m)csrf=m[1]}let pn=1,hm=true;while(hm){const p=new URLSearchParams();p.set("orderState","all");p.set("starttime","");p.set("endtime","");p.set("pageSize",String(P));p.set("pageNum",String(pn));p.set("query","");p.set("inchina","");if(csrf)p.set("_token",csrf);const r=await fetch("https://www.cssbuy.com/web/order",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8","X-Requested-With":"XMLHttpRequest","X-CSRF-Token":csrf,"X-XSRF-TOKEN":csrf,Accept:"application/json, text/javascript, */*; q=0.01"},body:p.toString()}),t=await r.text();let d;try{d=JSON.parse(t)}catch{console.error("No JSON:",t.substring(0,500));break}const l=el(d);if(!Array.isArray(l)){console.error("Formato:",JSON.stringify(d).substring(0,500));break}for(const it of l)A.push(mo(it));console.log(\`Pág \${pn}: \${l.length} (total \${A.length})\`);hm=l.length>=P&&A.length<M;if(hm)pn++}console.log(\`\\n✅ \${A.length} pedidos totales\`);const b=new Blob([JSON.stringify({orders:A,lastSync:new Date().toISOString()},null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="orders.json";a.click();URL.revokeObjectURL(u);console.log("💾 orders.json descargado!");console.table(A.slice(0,10).map(o=>({oid:o.oid,producto:o.producto?.substring(0,50),estado:o.estado,precio:o.precio_unitario_cny,cant:o.cantidad})))})();`;

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

  const handleJsonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      const count = await onImportJson(json.trim());
      setSuccess(true);
      setJson("");
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
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
              Opción 2 · Script de consola (para scrapeo inicial)
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="mb-2"><strong>Instrucciones:</strong></p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Abrí <a href="https://www.cssbuy.com/web/order?type=all" target="_blank" rel="noreferrer" className="underline">cssbuy.com</a> y logueate</li>
                  <li>Abrí DevTools con <kbd className="px-1 py-0.5 bg-secondary/50 rounded">F12</kbd></li>
                  <li>Andá a la pestaña <strong>Console</strong></li>
                  <li>Copiá el script de abajo, pegalo y dale Enter</li>
                  <li>Se descarga orders.json automáticamente</li>
                  <li>Volvé acá y subilo arrastrándolo</li>
                </ol>
              </div>
            </div>

            <div className="relative">
              <pre className="bg-secondary/30 border border-border rounded-lg p-3 text-[10px] font-mono overflow-x-auto max-h-32 overflow-y-auto whitespace-pre leading-relaxed">
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
