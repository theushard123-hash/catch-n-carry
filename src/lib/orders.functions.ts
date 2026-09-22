import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createOrderSchema = z.object({
  paymentConditionId: z.string().uuid(),
  notes: z.string().max(2000).optional().default(""),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().positive().max(100000),
      }),
    )
    .min(1)
    .max(200),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Cria um pedido para o usuário logado. Preços são sempre lidos do banco
 * (nunca confiados do cliente) de acordo com o tipo de cliente (atacado/varejo).
 */
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("customer_type, approved, company_name")
      .eq("user_id", userId)
      .single();
    if (pErr || !profile) throw new Error("Perfil não encontrado.");

    const { data: settings } = await supabase
      .from("app_settings_customer")
      .select("require_approval")
      .eq("id", 1)
      .maybeSingle();
    // Somente clientes de atacado passam por análise de aprovação.
    if (settings?.require_approval && profile.customer_type === "atacado" && !profile.approved) {
      throw new Error("Seu cadastro de atacado ainda não foi aprovado. Aguarde a liberação da Trapiche.");
    }


    const { data: cond, error: cErr } = await supabase
      .from("payment_conditions")
      .select("id, name, customer_type, active")
      .eq("id", data.paymentConditionId)
      .single();
    if (cErr || !cond || !cond.active) throw new Error("Condição de pagamento inválida.");
    if (cond.customer_type && cond.customer_type !== profile.customer_type) {
      throw new Error("Condição de pagamento não disponível para seu tipo de cliente.");
    }

    const ids = data.items.map((i) => i.productId);
    const { data: products, error: prErr } = await supabase
      .from("products")
      .select("id, name, sku, unit, price_atacado, price_varejo, min_qty, active")
      .in("id", ids);
    if (prErr) throw new Error("Erro ao carregar produtos.");

    const byId = new Map(products?.map((p) => [p.id, p]) ?? []);
    const lines = data.items.map((i) => {
      const p = byId.get(i.productId);
      if (!p || !p.active) throw new Error("Um dos produtos não está mais disponível.");
      const unitPrice = Number(profile.customer_type === "atacado" ? p.price_atacado : p.price_varejo);
      if (i.qty < Number(p.min_qty)) {
        throw new Error(`Quantidade mínima de ${p.name} é ${p.min_qty} ${p.unit}.`);
      }
      const total = Math.round(unitPrice * i.qty * 100) / 100;
      return {
        product_id: p.id,
        product_name: p.name,
        sku: p.sku,
        unit: p.unit,
        qty: i.qty,
        unit_price: unitPrice,
        total,
      };
    });

    const subtotal = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;
    const minOrder = Number(
      profile.customer_type === "atacado" ? settings?.min_order_atacado ?? 0 : settings?.min_order_varejo ?? 0,
    );
    if (minOrder > 0 && subtotal < minOrder) {
      throw new Error(`Pedido mínimo para ${profile.customer_type} é R$ ${minOrder.toFixed(2)}.`);
    }

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        customer_type: profile.customer_type,
        payment_condition_id: cond.id,
        payment_condition_name: cond.name,
        subtotal,
        total: subtotal,
        notes: data.notes ?? "",
        delivery_date: data.deliveryDate ?? null,
      })
      .select("id, order_number")
      .single();
    if (oErr || !order) throw new Error("Não foi possível criar o pedido.");

    const { error: iErr } = await supabase
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (iErr) {
      await supabase.from("orders").delete().eq("id", order.id);
      throw new Error("Não foi possível salvar os itens do pedido.");
    }

    return { id: order.id, orderNumber: order.order_number, total: subtotal };
  });
