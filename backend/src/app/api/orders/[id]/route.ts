import { NextRequest } from "next/server";
import {
  corsResponse, corsError, handleOptions,
  createApiClient, getAuthUser,
} from "@/utils/supabase/api";

export async function OPTIONS() { return handleOptions(); }

/* GET /api/orders/:id */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return corsError("No autorizado", 401);

  const supabase = createApiClient(req);
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const isAdmin = profile?.role === "admin";

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .single();

  if (error || !data) return corsError("Pedido no encontrado", 404);

  if (!isAdmin && data.user_id !== user.id) {
    return corsError("Acceso denegado", 403);
  }

  return corsResponse(data);
}

/**
 * PATCH /api/orders/:id
 * Admin: puede cambiar status
 * Cliente: solo puede cancelar si está pending
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return corsError("No autorizado", 401);

  const supabase = createApiClient(req);
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const isAdmin = profile?.role === "admin";

  const { data: order } = await supabase
    .from("orders").select("*").eq("id", id).single();

  if (!order) return corsError("Pedido no encontrado", 404);

  const isOwner = order.user_id === user.id;
  if (!isAdmin && !isOwner) return corsError("Acceso denegado", 403);

  const body = await req.json();
  const { status } = body;

  if (!isAdmin && status !== "cancelled") {
    return corsError("Solo podés cancelar pedidos pendientes", 403);
  }
  if (!isAdmin && order.status !== "pending") {
    return corsError("Solo podés cancelar pedidos pendientes", 400);
  }

  const validStatuses = ["pending", "confirmed", "preparing", "shipping", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) {
    return corsError("Estado inválido", 400);
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return corsError(error.message, 500);
  return corsResponse(data);
}
