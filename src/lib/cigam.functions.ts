import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId).eq("role", "admin");
  if (!data?.length) throw new Error("Acesso restrito ao administrador.");
}

async function log(ctx: Ctx, entity: string, entityId: string | null, success: boolean, message: string) {
  await ctx.supabase.from("cigam_sync_log").insert({ entity, entity_id: entityId, success, message, created_by: ctx.userId });
}

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export const cigamStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { cigamConfigured, cigamPing } = await import("./cigam.server");
    if (!cigamConfigured()) return { configured: false, connected: false, message: "Credenciais não configuradas." };
    try {
      await cigamPing();
      return { configured: true, connected: true, message: "Conectado ao Cigam." };
    } catch (e) {
      return { configured: true, connected: false, message: e instanceof Error ? e.message : "Falha de conexão." };
    }
  });

export const sendCustomerToCigam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ profileId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { cigamRequest, cigamMessage } = await import("./cigam.server");
    const { data: p, error } = await context.supabase.from("profiles").select("*").eq("id", data.profileId).single();
    if (error || !p) throw new Error("Cliente não encontrado.");

    const isPF = p.customer_type !== "atacado";
    const body = {
      Codigo: p.external_code || undefined,
      NomeCompleto: (p.company_name || p.full_name || "").slice(0, 100),
      Fantasia: (p.company_name || p.full_name || "").slice(0, 60),
      CnpjCpf: digits(p.document),
      PessoaFisica: isPF,
      Inscricao: isPF ? "" : p.state_registration ?? "",
      Endereco: p.address ?? "",
      Bairro: p.neighborhood ?? "",
      Municipio: p.city ?? "",
      Uf: p.state ?? "",
      Cep: digits(p.zip),
      Telefone: digits(p.phone),
      Ativo: true,
    };
    const method = p.external_code ? "PUT" : "POST";
    const r = await cigamRequest<{ Codigo?: string }>(method, "api/genericos/ge/Pessoa/Salvar", { body });
    const code = p.external_code || (r.json?.data as { Codigo?: string } | undefined)?.Codigo || null;
    const msg = r.ok ? `Cliente enviado ao Cigam${code ? ` (código ${code})` : ""}.` : cigamMessage(r.json, `Erro ${r.status} ao enviar cliente.`);

    await context.supabase
      .from("profiles")
      .update({
        cigam_sync_status: r.ok ? "enviado" : "erro",
        cigam_sync_error: r.ok ? null : msg,
        cigam_synced_at: new Date().toISOString(),
        ...(r.ok && code ? { external_code: code } : {}),
      })
      .eq("id", p.id);
    await log(context, "cliente", p.id, r.ok, msg);
    return { ok: r.ok, message: msg, code };
  });

export const sendOrderToCigam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ orderId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { cigamRequest, cigamMessage } = await import("./cigam.server");
    const sb = context.supabase;
    const { data: o } = await sb.from("orders").select("*").eq("id", data.orderId).single();
    if (!o) throw new Error("Pedido não encontrado.");
    const { data: p } = await sb.from("profiles").select("external_code").eq("user_id", o.user_id).single();

    const fail = async (msg: string) => {
      await sb.from("orders").update({ cigam_sync_status: "erro", cigam_sync_error: msg, cigam_synced_at: new Date().toISOString() }).eq("id", o.id);
      await log(context, "pedido", o.id, false, msg);
      return { ok: false, message: msg };
    };
    if (!p?.external_code) return fail("Cliente sem código Cigam. Envie o cadastro do cliente primeiro.");

    const { data: cond } = o.payment_condition_id
      ? await sb.from("payment_conditions").select("external_code").eq("id", o.payment_condition_id).single()
      : { data: null };
    const { data: items } = await sb.from("order_items").select("*").eq("order_id", o.id);
    const missingSku = (items ?? []).filter((i: any) => !i.sku);
    if (missingSku.length) return fail(`Produtos sem código (SKU) Cigam: ${missingSku.map((i: any) => i.product_name).join(", ")}.`);

    const code = o.external_id || String(o.order_number).padStart(6, "0");
    const obs = [
      `Pedido portal #${o.order_number}`,
      `Pagamento: ${o.payment_condition_name}`,
      o.delivery_address ? `Entrega: ${o.delivery_address}` : "",
      o.shipping_note || (o.shipping_fee != null ? `Frete: R$ ${Number(o.shipping_fee).toFixed(2)}` : ""),
      o.notes ? `Obs: ${o.notes}` : "",
    ].filter(Boolean).join(" | ");

    const head = await cigamRequest(o.external_id ? "PUT" : "POST", "api/comercial/fa/Pedido/Salvar", {
      body: {
        Codigo: code,
        CodigoCliente: p.external_code,
        DataPedido: o.created_at.slice(0, 10),
        PrazoEntrega: o.delivery_date ?? undefined,
        CodigoCondicaoPagamento: cond?.external_code || undefined,
        Observacao: obs.slice(0, 2000),
        OrigemPedido: "PORTAL",
      },
    });
    if (!head.ok) return fail(cigamMessage(head.json, `Erro ${head.status} ao criar pedido.`));

    let seq = 0;
    for (const i of items ?? []) {
      seq++;
      const r = await cigamRequest("POST", "api/comercial/fa/Pedido/SalvarItemPedido", {
        body: {
          CodigoPedido: code,
          Sequencia: seq,
          CodigoMaterial: i.sku,
          Quantidade: Number(i.qty),
          PrecoUnitario: Number(i.unit_price),
          PrazoEntrega: o.delivery_date ?? undefined,
        },
      });
      if (!r.ok) return fail(`Item ${i.product_name}: ${cigamMessage(r.json, `erro ${r.status}`)}`);
    }

    const msg = `Pedido enviado ao Cigam (código ${code}, ${seq} itens).`;
    await sb.from("orders").update({ external_id: code, cigam_sync_status: "enviado", cigam_sync_error: null, cigam_synced_at: new Date().toISOString() }).eq("id", o.id);
    await log(context, "pedido", o.id, true, msg);
    return { ok: true, message: msg };
  });

export const lookupCigam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ kind: z.enum(["pedido", "cliente"]), value: z.string().trim().min(1).max(30).regex(/^[\w.\-/]+$/) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { cigamRequest, cigamMessage } = await import("./cigam.server");
    const r =
      data.kind === "pedido"
        ? await cigamRequest("GET", "api/comercial/fa/Pedido/BuscarPedido", { query: { codigoPedido: data.value } })
        : await cigamRequest("GET", "api/genericos/ge/Pessoa/Buscar", {
            query: { $filter: `CnpjCpf eq '${digits(data.value) || data.value}' or Codigo eq '${data.value}'`, $top: "10" },
          });
    return { ok: r.ok, message: r.ok ? "" : cigamMessage(r.json, `Erro ${r.status}`), result: JSON.stringify(r.json?.data ?? r.raw, null, 2).slice(0, 20000) };
  });
