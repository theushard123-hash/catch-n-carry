import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  disponivel: { label: "Disponível hoje", variant: "success" },
  sob_consulta: { label: "Sob consulta", variant: "warning" },
  indisponivel: { label: "Em falta hoje", variant: "destructive" },
};

export function AvailabilityBadge({ value }: { value: string | null | undefined }) {
  const item = MAP[value ?? "disponivel"] ?? MAP.disponivel;
  return <Badge variant={item.variant}>{item.label}</Badge>;
}
