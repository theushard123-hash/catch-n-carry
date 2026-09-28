import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_products",
  title: "Listar produtos",
  description: "Lista os produtos ativos do catálogo da Trapiche com preços de atacado e varejo.",
  inputSchema: { search: z.string().trim().max(80).optional().describe("Filtro por nome ou código.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }, ctx) => {
    let q = supabaseForUser(ctx)
      .from("products")
      .select("id, sku, name, description, unit, min_qty, price_atacado, price_varejo, variable_weight, active")
      .eq("active", true)
      .order("sort_order");
    if (search) q = q.or(`name.ilike.%${search.replace(/[%,()]/g, "")}%,sku.ilike.%${search.replace(/[%,()]/g, "")}%`);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const products = (data ?? []).map((p) => ({
      id: p.id, sku: p.sku, name: p.name, description: p.description ?? "", unit: p.unit,
      min_qty: Number(p.min_qty), price_atacado: Number(p.price_atacado), price_varejo: Number(p.price_varejo),
      variable_weight: p.variable_weight === true,
    }));
    return { content: [{ type: "text", text: JSON.stringify(products) }], structuredContent: { products } };
  },
});
