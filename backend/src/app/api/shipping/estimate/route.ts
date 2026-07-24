import { NextRequest } from "next/server";
import {
  corsResponse, corsError, handleOptions,
  createApiClient, getAuthUser,
} from "@/utils/supabase/api";
import { resolveZoneFromAddress } from "@/utils/shipping";

export async function OPTIONS() { return handleOptions(); }

/* GET /api/shipping/estimate — resuelve la zona de envío a partir de la dirección guardada en el perfil */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return corsError("No autorizado", 401);

  const supabase = createApiClient(req);
  const { data: profile } = await supabase
    .from("profiles").select("address").eq("id", user.id).single();

  if (!profile?.address?.trim()) return corsError("No tenés una dirección guardada", 400);

  const result = await resolveZoneFromAddress(profile.address);
  if ("error" in result) return corsError(result.error, 400);

  return corsResponse(result);
}
