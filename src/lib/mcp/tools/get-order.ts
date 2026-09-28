import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_order",
  title: "Detalhes do pedido",
  description: "Mostra um pedido com seus itens, pelo ID.",
  inputSchema: { id: z.string().uuid().describe("ID do pedido.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data: o, error } = await sb
      .from("orders")
      .select("id, order_number, status, payment_condition_name, subtotal, shipping_fee, total, notes, delivery_address, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!o) throw new ToolError("Pedido não encontrado.");
    const { data: items, error: e2 } = await sb
      .from("order_items")
      .select("sku, product_name, qty, unit, unit_price, total")
      .eq("order_id", id);
    if (e2) throw new ToolError(e2.message);
    const order = {
      id: o.id, order_number: o.order_number, status: o.status, payment: o.payment_condition_name ?? "",
      subtotal: Number(o.subtotal), shipping_fee: o.shipping_fee === null ? null : Number(o.shipping_fee),
      total: Number(o.total), notes: o.notes ?? "", delivery_address: o.delivery_address ?? "", created_at: o.created_at,
      items: (items ?? []).map((i) => ({
        sku: i.sku ?? "", name: i.product_name, qty: Number(i.qty), unit: i.unit ?? "",
        unit_price: Number(i.unit_price), total: Number(i.total),
      })),
    };
    return { content: [{ type: "text", text: JSON.stringify(order) }], structuredContent: { order } };
  },
});
