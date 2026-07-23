import { createClient as createServerSupabase } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/* Cualquier subdominio de lavacaroja.com.ar (prod, admin, previews de test-*) + localhost */
function isAllowedOrigin(origin: string) {
  return (
    origin.startsWith("http://localhost") ||
    /^https:\/\/([a-z0-9-]+\.)*lavacaroja\.com\.ar$/.test(origin)
  );
}

/* CORS headers for frontend — reflejan el origin del request si está permitido */
async function corsHeaders() {
  const origin = (await headers()).get("origin") || "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function corsResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: await corsHeaders() });
}

export async function corsError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: await corsHeaders() });
}

export async function handleOptions() {
  return new NextResponse(null, { status: 204, headers: await corsHeaders() });
}

/* Service-role client — bypasses RLS, use only after verifying auth in code */
export function createAdminClient() {
  return createServerSupabase(supabaseUrl, supabaseServiceKey);
}

/* Create a Supabase client authenticated with the request's JWT */
export function createApiClient(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  return createServerSupabase(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: token ? `Bearer ${token}` : "" } },
  });
}

/* Get the authenticated user from the request */
export async function getAuthUser(req: NextRequest) {
  const supabase = createApiClient(req);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/* Get user + profile (includes role) */
export async function getAuthProfile(req: NextRequest) {
  const supabase = createApiClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ? { ...user, profile } : null;
}

/* Require admin role — returns error response or null */
export async function requireAdmin(req: NextRequest) {
  const auth = await getAuthProfile(req);
  if (!auth) return corsError("No autorizado", 401);
  if (auth.profile?.role !== "admin") return corsError("Acceso denegado", 403);
  return null; // null = OK
}
