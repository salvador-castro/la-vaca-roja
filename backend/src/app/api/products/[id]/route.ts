import { NextRequest } from "next/server";
import {
  corsHeaders, corsResponse, corsError,
  handleOptions, createApiClient, requireAdmin,
} from "@/utils/supabase/api";

export async function OPTIONS() { return handleOptions(); }

/* GET /api/products/:id */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createApiClient(req);

  const { data, error } = await supabase
    .from("products")
    .select("*, product_variants(*)")
    .eq("id", id)
    .single();

  if (error || !data) return corsError("Producto no encontrado", 404);
  return corsResponse(data);
}

/* PUT /api/products/:id — solo admin */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();
  const { variants, ...productData } = body;

  const supabase = createApiClient(req);

  const { data, error } = await supabase
    .from("products")
    .update({ ...productData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return corsError(error.message, 500);

  if (variants) {
    await supabase.from("product_variants").delete().eq("product_id", id);
    if (variants.length) {
      await supabase.from("product_variants").insert(
        variants.map((v: Record<string, unknown>) => ({ ...v, product_id: id }))
      );
    }
  }

  return corsResponse(data);
}

/* DELETE /api/products/:id — solo admin */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const supabase = createApiClient(req);

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return corsError(error.message, 500);
  return corsResponse({ success: true });
}
