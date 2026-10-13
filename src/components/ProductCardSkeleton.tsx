import { cn } from "@/lib/utils";
import { Fish, Waves } from "lucide-react";

/**
 * Esqueletos de carregamento no formato exato dos cards de produto
 * (imagem no topo, título, tag de preço/kg, mínimo e botão).
 * Bones pulsam (animate-pulse) e uma onda de shimmer varre cada bloco;
 * o atraso escalonado entre cards cria o efeito de onda na grade.
 */

function Bone({ className }: { className?: string }) {
  return (
    <div className={cn("rounded bg-muted", className)} />
  );
}

export function ProductCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <article aria-hidden className={cn("relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-soft", index % 3 === 1 && "[&>.product-shimmer]:[animation-delay:180ms]", index % 3 === 2 && "[&>.product-shimmer]:[animation-delay:360ms]")}>
      {/* Imagem no topo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/30 motion-safe:animate-product-wave"><Fish className="h-10 w-10" strokeWidth={1.2} /><Waves className="h-5 w-14" strokeWidth={1.2} /></div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {/* Título + tag de código */}
        <div className="flex items-start justify-between gap-2">
          <Bone className="h-5 w-2/3 rounded-md" />
          <Bone className="h-5 w-14 shrink-0 rounded-full" />
        </div>
        {/* Descrição */}
        <Bone className="mt-2 h-3 w-full" />
        <Bone className="mt-1.5 h-3 w-4/5" />
        {/* Preço / kg */}
        <div className="mt-3 flex items-baseline gap-1.5">
          <Bone className="h-7 w-24 rounded-md" />
          <Bone className="h-3 w-8" />
        </div>
        {/* Quantidade mínima */}
        <Bone className="mt-1.5 h-3 w-20" />
        {/* Botão */}
        <div className="mt-auto pt-4">
          <Bone className="h-9 w-full rounded-md" />
        </div>
      </div>
      <div className="product-shimmer pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/55 to-transparent motion-safe:animate-product-shimmer" />
    </article>
  );
}

export function ProductCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Carregando pescados e frutos do mar">
      <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground"><Waves className="h-4 w-4 motion-safe:animate-product-wave" /> Puxando as redes com os melhores peixes...</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
