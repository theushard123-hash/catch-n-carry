export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return brl.format(Number.isFinite(n) ? n : 0);
}

export function formatQty(value: number | string, unit?: string) {
  const n = typeof value === "string" ? Number(value) : value;
  const s = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(n);
  return unit ? `${s} ${unit}` : s;
}

export function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(d);
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  faturado: "Faturado",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "destructive"> = {
  pendente: "warning",
  aprovado: "info",
  faturado: "success",
  cancelado: "destructive",
};

export const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  atacado: "Atacado",
  varejo: "Varejo",
};

export function formatDocument(doc: string) {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
}
