import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const CUT_OPTIONS = ["Inteiro", "Limpo / eviscerado", "Filé", "Postas", "Em cubos", "Sem pele", "Sem espinha"];

export type ItemSpec = { cut: string; note: string };

export function formatWeight(kg: number) {
  if (kg < 1) return `${Math.round(kg * 1000)}g`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(kg)} kg`;
}

function buildOptions(minKg: number) {
  const step = 0.1;
  const start = Math.max(step, Math.ceil((minKg || step) / step) * step);
  return Array.from({ length: 50 }, (_, i) => Math.round((start + i * step) * 1000) / 1000);
}

export function WeightPickerDialog({
  open,
  onOpenChange,
  productName,
  minQty,
  initialQty,
  initialSpec,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  productName: string;
  minQty: number;
  initialQty?: number;
  initialSpec?: ItemSpec;
  onConfirm: (qty: number, spec: ItemSpec) => void;
}) {
  const options = buildOptions(minQty);
  const [qty, setQty] = useState(options[0]!);
  const [cut, setCut] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const q = initialQty && options.includes(initialQty) ? initialQty : options[0]!;
    setQty(q);
    setCut(initialSpec?.cut ?? "");
    setNote(initialSpec?.note ?? "");
    setShowNote(!!initialSpec?.note);
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-kg="${q}"]`)?.scrollIntoView({ block: "center" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{productName}</DialogTitle>
          <DialogDescription className="font-medium text-foreground">Você gostaria de quantos gramas?</DialogDescription>
        </DialogHeader>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong className="text-foreground">Produtos por kg podem variar na pesagem.</strong> Faremos o possível
            para chegar o mais próximo do seu pedido.
          </span>
        </p>

        <div ref={listRef} className="h-44 snap-y overflow-y-auto rounded-xl border bg-muted/40 py-14">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              data-kg={o}
              onClick={() => setQty(o)}
              className={cn(
                "block w-full snap-center py-2 text-center text-sm transition-colors",
                o === qty
                  ? "border-y bg-card text-base font-bold text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {formatWeight(o)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Label className="shrink-0">Separar em:</Label>
          <Select value={cut} onValueChange={setCut}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {CUT_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showNote ? (
          <Textarea
            placeholder="Ex.: cortar em postas de 2 cm, embalar separado..."
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
          />
        ) : (
          <Button variant="secondary" className="w-full justify-start" onClick={() => setShowNote(true)}>
            Deixar instrução extra
          </Button>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            onConfirm(qty, { cut, note: note.trim() });
            onOpenChange(false);
          }}
        >
          Selecionar {formatWeight(qty)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
