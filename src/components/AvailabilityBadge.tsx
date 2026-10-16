import { Badge } from "@/components/ui/badge";

type Item = { label: string; variant: "success" | "warning" | "destructive" };
const DEFAULT: Item = { label: "Disponível hoje", variant: "success" };
const MAP: Record<string, Item> = {
  disponivel: { label: "Disponível hoje", variant: "success" },
  sob_consulta: { label: "Sob consulta", variant: "warning" },
  indisponivel: { label: "Em falta hoje", variant: "destructive" },
};

export function AvailabilityBadge({ value }: { value: string | null | undefined }) {
  const item = MAP[value ?? "disponivel"] ?? DEFAULT;
  return <Badge variant={item.variant}>{item.label}</Badge>;
}
