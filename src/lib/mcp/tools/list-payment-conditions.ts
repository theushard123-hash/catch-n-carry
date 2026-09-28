import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_payment_conditions",
  title: "Listar condições de pagamento",
  description: "Lista as condições de pagamento ativas (PIX, cartão, boleto etc.).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("payment_conditions")
      .select("id, name, description, customer_type")
      .eq("active", true)
      .order("sort_order");
    if (error) throw new ToolError(error.message);
    const conditions = (data ?? []).map((c) => ({
      id: c.id, name: c.name, description: c.description ?? "", customer_type: c.customer_type ?? "ambos",
    }));
    return { content: [{ type: "text", text: JSON.stringify(conditions) }], structuredContent: { conditions } };
  },
});
