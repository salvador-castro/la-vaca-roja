import { NextRequest } from "next/server";
import {
  corsHeaders, corsResponse, corsError,
  handleOptions, createApiClient, requireAdmin,
} from "@/utils/supabase/api";

export async function OPTIONS() { return handleOptions(); }

/* GET /api/products — público, lista todos los productos activos */
export async function GET(req: NextRequest) {
  const supabase = createApiClient(req);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const includeInactive = searchParams.get("all") === "true";

  let query = supabase
    .from("products")
    .select("*, product_variants(*)")
    .order("created_at", { ascending: false });

  if (!includeInactive) query = query.eq("active", true);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return corsError(error.message, 500);
  return corsResponse(data);
}

/* POST /api/products — solo admin */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = await req.json();
  const { variants, ...productData } = body;

  const supabase = createApiClient(req);

  const { data: product, error } = await supabase
    .from("products")
    .insert(productData)
    .select()
    .single();

  if (error) return corsError(error.message, 500);

  if (variants?.length) {
    const variantRows = variants.map((v: Record<string, unknown>) => ({
      ...v, product_id: product.id,
    }));
    await supabase.from("product_variants").insert(variantRows);
  }

  return corsResponse(product, 201);
}
