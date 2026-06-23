import { createClient } from "@supabase/supabase-js";
import HomeClient from "./HomeClient";
import { CssbuyOrder } from "@/lib/types";

async function getOrders(): Promise<CssbuyOrder[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
    const { data } = await supabase
      .from("cssbuy_warehouse")
      .select("*")
      .order("fecha_pedido", { ascending: false });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const orders = await getOrders();
  return <HomeClient initialOrders={orders} initialLastSync={new Date().toISOString()} />;
}
