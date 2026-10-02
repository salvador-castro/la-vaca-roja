import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createAdminClient } from "@/utils/supabase/api";

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

/* Clave secreta de la sección Webhooks de la app en el panel de MP */
const webhookSecret = process.env.MP_WEBHOOK_SECRET;

/*
 * Verifica el header x-signature ("ts=...,v1=...") según la doc de MP:
 * HMAC-SHA256 con la clave secreta sobre "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 */
function isValidSignature(req: NextRequest, dataId: string, secret: string) {
  const signature = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!signature) return false;

  const parts: Record<string, string> = {};
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=").map((s) => s.trim());
    if (key && value) parts[key] = value;
  }
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  // MP firma el id en minúsculas cuando es alfanumérico
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;

  let manifest = `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!webhookSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // 500 para que MP reintente cuando la configuración esté completa
    console.error("Webhook MP: falta MP_WEBHOOK_SECRET o SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));

  const type = body.type ?? req.nextUrl.searchParams.get("type");
  // MP firma el data.id que viaja en la query string
  const paymentId =
    req.nextUrl.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);

  if (type !== "payment" || !paymentId) {
    return NextResponse.json({ received: true });
  }

  if (!isValidSignature(req, paymentId, webhookSecret)) {
    console.warn("Webhook MP: firma inválida para el pago", paymentId);
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    // El estado y el monto se consultan a MP, nunca se toman del body
    const payment = new Payment(mp);
    const paymentData = await payment.get({ id: paymentId });
    const orderId = paymentData.external_reference;
    if (!orderId) return NextResponse.json({ received: true });

    const supabaseAdmin = createAdminClient();
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status, total")
      .eq("id", orderId)
      .single();

    if (!order) {
      console.warn("Webhook MP: pedido no encontrado", orderId);
      return NextResponse.json({ received: true });
    }

    let newStatus: string | null = null;

    if (paymentData.status === "approved") {
      const paid = Number(paymentData.transaction_amount ?? 0);
      if (paid + 0.01 < Number(order.total)) {
        console.error(`Webhook MP: pedido ${order.id} pagó $${paid} de $${order.total}, no se confirma`);
      } else if (["pending", "cancelled"].includes(order.status)) {
        // "cancelled" también: un pago rechazado puede reintentarse y aprobarse después
        newStatus = "confirmed";
      }
    } else if (["rejected", "cancelled"].includes(paymentData.status ?? "")) {
      // No pisar pedidos que ya avanzaron (confirmados, en preparación, etc.)
      if (order.status === "pending") newStatus = "cancelled";
    }

    if (newStatus) {
      await supabaseAdmin
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", order.id);
    }
  } catch (err) {
    console.error("Webhook MP error:", err);
    // 500 para que MP reintente si falló la consulta o la base
    return NextResponse.json({ error: "Error procesando el webhook" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
