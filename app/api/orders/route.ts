import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { CssbuyOrder } from "@/lib/types";

interface OrdersData {
  orders: CssbuyOrder[];
  lastSync: string | null;
}

const DATA_FILE = path.join(process.cwd(), "public", "data", "orders.json");

async function readOrdersFile(): Promise<OrdersData> {
  try {
    const content = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(content) as OrdersData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { orders: [], lastSync: null };
    }
    throw error;
  }
}

export async function GET() {
  const data = await readOrdersFile();
  return NextResponse.json(data);
}
