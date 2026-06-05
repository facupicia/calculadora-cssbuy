import { Router, Request, Response } from "express";
import { readOrdersFile, readHistoryFile, runSyncScript } from "../services/cssbuy";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const data = await readOrdersFile();
    res.json(data);
  } catch (error) {
    console.error("Error al leer pedidos:", error);
    res.status(500).json({
      error: "Error al leer el archivo de pedidos",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

router.post("/sync", async (_req: Request, res: Response) => {
  try {
    const stdout = await runSyncScript();
    console.log("Salida del script de sincronización:", stdout);

    const data = await readOrdersFile();
    res.json(data);
  } catch (error) {
    console.error("Error al sincronizar pedidos:", error);
    res.status(500).json({
      error: "Error al sincronizar pedidos",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

router.get("/history", async (_req: Request, res: Response) => {
  try {
    const data = await readHistoryFile();
    res.json(data);
  } catch (error) {
    console.error("Error al leer historial:", error);
    res.status(500).json({
      error: "Error al leer el historial de costos",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

export default router;
