import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CatalogSort } from "@/lib/catalog-filters";

export function CatalogFilters({ minPrice, maxPrice, sort, onMinChange, onMaxChange, onSortChange, onReset, active }: {
  minPrice: string; maxPrice: string; sort: CatalogSort;
  onMinChange: (value: string) => void; onMaxChange: (value: string) => void;
  onSortChange: (value: CatalogSort) => void; onReset: () => void; active: boolean;
}) {
  const invalidRange = minPrice !== "" && maxPrice !== "" && Number(minPrice.replace(",", ".")) > Number(maxPrice.replace(",", "."));
  return <div className="mb-6 border-y py-4">
    <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
      <fieldset className="min-w-0"><legend className="mb-2 flex items-center gap-2 text-xs font-semibold"><SlidersHorizontal className="h-3.5 w-3.5" /> Faixa de preço (R$)</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input aria-label="Preço mínimo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="De" value={minPrice} onChange={(e) => onMinChange(e.target.value)} />
          <Input aria-label="Preço máximo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="Até" value={maxPrice} onChange={(e) => onMaxChange(e.target.value)} />
        </div>
      </fieldset>
      <div className="min-w-0"><label id="catalog-sort-label" className="mb-2 block text-xs font-semibold">Ordenar por</label>
        <Select value={sort} onValueChange={(value) => onSortChange(value as CatalogSort)}><SelectTrigger aria-labelledby="catalog-sort-label"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="featured">Destaques</SelectItem><SelectItem value="bestsellers">Mais vendidos</SelectItem><SelectItem value="price-asc">Menor preço</SelectItem><SelectItem value="price-desc">Maior preço</SelectItem>
        </SelectContent></Select>
      </div>
      <Button variant="ghost" onClick={onReset} disabled={!active} className="justify-self-start"><RotateCcw className="h-4 w-4" /> Limpar filtros</Button>
    </div>
    {invalidRange && <p role="alert" className="mt-2 text-xs text-destructive">O preço máximo deve ser maior ou igual ao mínimo.</p>}
  </div>;
}