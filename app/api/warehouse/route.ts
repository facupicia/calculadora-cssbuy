import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orders = Array.isArray(body?.orders) ? body.orders : Array.isArray(body) ? body : [];

    if (orders.length === 0) {
      return Response.json({ error: "No se encontraron pedidos en el JSON" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("cssbuy_warehouse")
      .upsert(orders, { onConflict: "oid" })
      .select("oid");

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      upserted: data?.length || 0,
      lastSync: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
