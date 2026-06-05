import { execFile } from "child_process";
import { promises as fs } from "fs";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const ORDERS_FILE_PATH = "D:/Documentos/dev/emprendimiento/cssbuy_orders_data.js";
const HISTORY_FILE_PATH = "C:/Users/facup/cssbuy_data/costs_summary.json";
const PYTHON_SCRIPT_PATH = "C:/Users/facup/cssbuy_sync.py";

export interface CssbuyOrder {
  oid: string;
  producto: string;
  imagen: string;
  url: string;
  vendedor: string;
  variante: string;
  precio_unitario_cny: number;
  cantidad: number;
  estado: string;
  tracking: string;
  fecha_pedido: string;
}

export interface OrdersData {
  orders: CssbuyOrder[];
  lastSync: string | null;
}

export interface CostHistoryEntry {
  oid: string;
  producto: string;
  cantidad: number;
  precio_unitario_cny: number;
  costo_envio_cny: number;
  costo_envio_usd: number;
  costo_envio_ars: number;
  costo_total_cny: number;
  costo_total_usd: number;
  costo_total_ars: number;
  fecha_calculo: string;
}

export interface HistoryData {
  orders: CostHistoryEntry[];
  lastSync: string | null;
}

export async function readOrdersFile(): Promise<OrdersData> {
  try {
    const content = await fs.readFile(ORDERS_FILE_PATH, "utf-8");

    const match = content.match(/const CSSBUY_ORDERS\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) {
      throw new Error("No se encontró el array CSSBUY_ORDERS en el archivo");
    }

    const orders: CssbuyOrder[] = JSON.parse(match[1]);

    const lastSyncMatch = content.match(/const CSSBUY_LAST_SYNC\s*=\s*['"](.*?)['"];/);
    const lastSync = lastSyncMatch ? lastSyncMatch[1] : null;

    return { orders, lastSync };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { orders: [], lastSync: null };
    }
    throw error;
  }
}

export async function readHistoryFile(): Promise<HistoryData> {
  try {
    const content = await fs.readFile(HISTORY_FILE_PATH, "utf-8");
    const data = JSON.parse(content) as HistoryData;
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { orders: [], lastSync: null };
    }
    throw error;
  }
}

export async function runSyncScript(): Promise<string> {
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  try {
    const { stdout, stderr } = await execFileAsync(pythonCmd, [PYTHON_SCRIPT_PATH], {
      timeout: 120000,
      windowsHide: true,
    });

    if (stderr) {
      console.warn("Script Python stderr:", stderr);
    }

    return stdout;
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const execError = error as Error & { code?: string | number | null };
      if (execError.code === "ENOENT") {
        throw new Error(`No se encontró el comando '${pythonCmd}'. Asegurate de tener Python instalado.`);
      }
      throw new Error(`El script Python falló con código ${execError.code}: ${execError.message}`);
    }
    throw error;
  }
}
