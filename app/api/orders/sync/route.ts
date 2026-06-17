import { NextRequest, NextResponse } from "next/server";
import { CssbuyOrder } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 10; // Vercel Hobby max timeout

/**
 * Scraper de CSSBuy escrito en TypeScript.
 *
 * TODO: Completar con los endpoints reales de CSSBuy.
 * Actualmente está preparado para recibir una cookie y hacer fetch,
 * pero la URL y el parseo deben ajustarse según la API real.
 *
 * Para completar:
 * 1. Pegá la URL de la API de CSSBuy que devuelve el listado de pedidos.
 * 2. Ajustá el parseo de la respuesta al formato real.
 * 3. Eliminá el fallback de ejemplo.
 */
export async function POST(req: NextRequest) {
  try {
    const { cookie } = (await req.json()) as { cookie?: string };

    if (!cookie || !cookie.trim()) {
      return NextResponse.json({ error: "Falta la cookie de sesión" }, { status: 400 });
    }

    const orders = await scrapeCssbuyOrders(cookie.trim());

    const lastSync = new Date().toISOString();

    return NextResponse.json({ orders, lastSync });
  } catch (error) {
    console.error("Error en /api/orders/sync:", error);
    return NextResponse.json(
      {
        error: "Error al sincronizar pedidos",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

async function scrapeCssbuyOrders(cookie: string): Promise<CssbuyOrder[]> {
  // ==========================================================================
  // REEMPLAZAR ESTA SECCIÓN CON LOS ENDPOINTS REALES DE CSSBUY
  // ==========================================================================
  // Ejemplo de cómo se vería una llamada real:
  //
  // const res = await fetch("https://www.cssbuy.com/api/order/list?status=Ordered", {
  //   headers: {
  //     Cookie: cookie,
  //     "User-Agent": "Mozilla/5.0 ...",
  //     Accept: "application/json",
  //   },
  // });
  //
  // if (!res.ok) throw new Error(`CSSBuy respondió ${res.status}`);
  // const data = await res.json();
  // return data.orders.map((o: any) => ({ ... }));
  // ==========================================================================

  // Fallback: simulación para que la app no se rompa mientras se configura.
  // En producción esto debería ser reemplazado por el scrapeo real.
  console.warn("Scraper de CSSBuy no configurado. Devolviendo datos de ejemplo.");

  return [
    {
      oid: "20262233",
      producto: "[EJEMPLO] Trendy Foreign Trade Brand T-Shirt",
      imagen: "https://cbu01.alicdn.com/img/ibank/O1CN01kXzOpN1aNEpBb1gbr_!!2214795683317-0-cib.jpg",
      url: "https://detail.1688.com/offer/948710599928.html",
      vendedor: "vendedor-ejemplo",
      variante: "Color: apricot; Size: XL",
      precio_unitario_cny: 60,
      envio_local_cny: 5,
      envio_china_cny: 0,
      cantidad: 1,
      estado: "Ordered",
      tracking: "79000000000000",
      fecha_pedido: Math.floor(Date.now() / 1000),
    },
  ];
}
