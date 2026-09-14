import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OrderWithCustomer = Tables<"orders"> & { customer: Tables<"profiles"> | null };

export async function fetchOrdersWithCustomers(limit?: number): Promise<OrderWithCustomer[]> {
  let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data: orders, error } = await q;
  if (error) throw error;
  const ids = Array.from(new Set((orders ?? []).map((o) => o.user_id)));
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("*").in("user_id", ids)
    : { data: [] as Tables<"profiles">[] };
  const map = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return (orders ?? []).map((o) => ({ ...o, customer: map.get(o.user_id) ?? null }));
}

export function customerLabel(p: Tables<"profiles"> | null | undefined) {
  if (!p) return "Cliente";
  return p.company_name || p.full_name || p.email || "Cliente";
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = typeof v === "number" ? v.toFixed(2).replace(".", ",") : String(v ?? "");
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
