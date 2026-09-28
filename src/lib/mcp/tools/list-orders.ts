import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_orders",
  title: "Listar pedidos",
  description: "Lista os pedidos visíveis ao usuário conectado (clientes veem os próprios; administradores veem todos).",
  inputSchema: {
    status: z.enum(["pendente", "aprovado", "faturado", "cancelado"]).optional().describe("Filtrar por situação."),
    limit: z.number().int().min(1).max(100).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    let q = supabaseForUser(ctx)
      .from("orders")
      .select("id, order_number, status, customer_type, payment_condition_name, subtotal, shipping_fee, total, delivery_address, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const orders = (data ?? []).map((o) => ({
      id: o.id, order_number: o.order_number, status: o.status, customer_type: o.customer_type,
      payment: o.payment_condition_name ?? "", subtotal: Number(o.subtotal),
      shipping_fee: o.shipping_fee === null ? null : Number(o.shipping_fee), total: Number(o.total),
      delivery_address: o.delivery_address ?? "", created_at: o.created_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(orders) }], structuredContent: { orders } };
  },
});
