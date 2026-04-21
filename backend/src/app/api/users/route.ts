import { NextRequest } from "next/server";
import {
  corsResponse, corsError, handleOptions,
  createApiClient, requireAdmin,
} from "@/utils/supabase/api";

export async function OPTIONS() { return handleOptions(); }

/* GET /api/users — solo admin */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const supabase = createApiClient(req);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return corsError(error.message, 500);
  return corsResponse(data);
}

/* PATCH /api/users — cambiar rol, solo admin */
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id, role } = await req.json();
  if (!["admin", "cliente"].includes(role)) {
    return corsError("Rol inválido", 400);
  }

  const supabase = createApiClient(req);
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select()
    .single();

  if (error) return corsError(error.message, 500);
  return corsResponse(data);
}
