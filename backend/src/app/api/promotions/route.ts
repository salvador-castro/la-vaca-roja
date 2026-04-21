import { NextRequest } from "next/server";
import {
  corsResponse, corsError, handleOptions,
  createApiClient, requireAdmin,
} from "@/utils/supabase/api";

export async function OPTIONS() { return handleOptions(); }

/* GET /api/promotions — público */
export async function GET(req: NextRequest) {
  const supabase = createApiClient(req);
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("active", true)
    .order("id");

  if (error) return corsError(error.message, 500);
  return corsResponse(data);
}

/* POST /api/promotions — solo admin */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = await req.json();
  const supabase = createApiClient(req);
  const { data, error } = await supabase.from("promotions").insert(body).select().single();
  if (error) return corsError(error.message, 500);
  return corsResponse(data, 201);
}

/* PATCH /api/promotions — bulk update o eliminación pasando ?id= */
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await req.json();
  const supabase = createApiClient(req);
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) return corsError(error.message, 500);
  return corsResponse({ success: true });
}
