import { promises as fs } from "fs";
import path from "path";
import HomeClient from "./HomeClient";
import { CssbuyOrder } from "@/lib/types";

async function getOrders(): Promise<CssbuyOrder[]> {
  try {
    const dataPath = path.join(process.cwd(), "public", "data", "orders.json");
    const content = await fs.readFile(dataPath, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed?.orders) ? parsed.orders : [];
  } catch {
    return [];
  }
}

async function getLastSync(): Promise<string | null> {
  try {
    const dataPath = path.join(process.cwd(), "public", "data", "orders.json");
    const content = await fs.readFile(dataPath, "utf-8");
    const parsed = JSON.parse(content);
    return parsed?.lastSync ?? null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const orders = await getOrders();
  const lastSync = await getLastSync();
  return <HomeClient initialOrders={orders} initialLastSync={lastSync} />;
}
