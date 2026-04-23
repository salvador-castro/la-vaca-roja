import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

// Necesita service role key para actualizar órdenes sin RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function mpStatusToOrderStatus(mpStatus: string): string {
  switch (mpStatus) {
    case "approved":
      return "confirmed";
    case "rejected":
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const type = body.type ?? req.nextUrl.searchParams.get("type");
  const paymentId =
    body.data?.id ?? req.nextUrl.searchParams.get("data.id");

  if (type !== "payment" || !paymentId) {
    return NextResponse.json({ received: true });
  }

  try {
    const payment = new Payment(mp);
    const paymentData = await payment.get({ id: String(paymentId) });

    const orderId = paymentData.external_reference;
    const orderStatus = mpStatusToOrderStatus(paymentData.status ?? "");

    if (orderId) {
      await supabaseAdmin
        .from("orders")
        .update({ status: orderStatus })
        .eq("id", orderId);
    }
  } catch (err) {
    console.error("Webhook MP error:", err);
  }

  // Siempre responder 200 para que MP no reintente
  return NextResponse.json({ received: true });
}
