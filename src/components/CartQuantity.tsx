import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuantityProduct = { unit: string; step_qty: number; min_qty: number };

export function CartQuantity({ product, qty, onChange, compact = false }: { product: QuantityProduct; qty: number; onChange: (qty: number) => void; compact?: boolean }) {
  const step = Number(product.step_qty) || 1;
  const min = Number(product.min_qty) || step;
  const [text, setText] = useState(String(qty));
  useEffect(() => setText(String(qty)), [qty]);

  function commit(value: string) {
    const number = Number(value.replace(",", "."));
    if (!Number.isFinite(number) || number <= 0) return onChange(0);
    onChange(Math.max(min, number));
  }

  return (
    <div className={cn("flex items-center rounded-lg border bg-background", compact ? "h-9 w-44" : "h-10 w-full")}>
      <Button type="button" variant="ghost" size={compact ? "iconSm" : "icon"} className="rounded-r-none" onClick={() => onChange(qty - step < min ? 0 : qty - step)} aria-label="Diminuir quantidade"><Minus /></Button>
      <input inputMode="decimal" value={text} onChange={(event) => setText(event.target.value)} onBlur={(event) => commit(event.target.value)} onKeyDown={(event) => event.key === "Enter" && commit((event.target as HTMLInputElement).value)} className="w-full min-w-0 bg-transparent text-center text-sm font-semibold outline-none" aria-label="Quantidade" />
      <span className="pr-1 text-xs text-muted-foreground">{product.unit}</span>
      <Button type="button" variant="ghost" size={compact ? "iconSm" : "icon"} className="rounded-l-none" onClick={() => onChange(qty + step)} aria-label="Aumentar quantidade"><Plus /></Button>
    </div>
  );
}
