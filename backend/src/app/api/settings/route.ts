import { NextRequest } from "next/server";
import {
  corsResponse, corsError, handleOptions,
  createApiClient, getAuthUser,
} from "@/utils/supabase/api";

export async function OPTIONS() { return handleOptions(); }

/* GET /api/settings — público, devuelve todas las settings como objeto */
export async function GET(req: NextRequest) {
  const supabase = createApiClient(req);
  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) return corsError(error.message, 500);

  const settings: Record<string, string> = {};
  (data ?? []).forEach((s) => { settings[s.key] = s.value; });
  return corsResponse(settings);
}

/* PATCH /api/settings — solo admin, actualiza una setting */
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return corsError("No autorizado", 401);

  const supabase = createApiClient(req);
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return corsError("Acceso denegado", 403);

  const body = await req.json();
  const { key, value } = body as { key: string; value: string };
  if (!key || value === undefined) return corsError("key y value son requeridos", 400);

  const { error } = await supabase
    .from("settings")
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() });

  if (error) return corsError(error.message, 500);
  return corsResponse({ key, value });
}
