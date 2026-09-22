import { cn } from "@/lib/utils";

/**
 * Esqueletos de carregamento no formato exato dos cards de produto
 * (imagem no topo, título, tag de preço/kg, mínimo e botão).
 * Bones pulsam (animate-pulse) e uma onda de shimmer varre cada bloco;
 * o atraso escalonado entre cards cria o efeito de onda na grade.
 */

function Bone({ className, delay }: { className?: string; delay: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded bg-muted", className)}>
      <div
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/70 to-transparent"
        style={{ animation: `trapiche-shimmer 1.6s ease-in-out ${delay} infinite` }}
      />
    </div>
  );
}

export function ProductCardSkeleton({ index = 0 }: { index?: number }) {
  const delay = `${(index % 3) * 0.18}s`;
  return (
    <article aria-hidden className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft">
      {/* Imagem no topo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <div
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/60 to-transparent"
          style={{ animation: `trapiche-shimmer 1.6s ease-in-out ${delay} infinite` }}
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        {/* Título + tag de código */}
        <div className="flex items-start justify-between gap-2">
          <Bone className="h-4 w-2/3 rounded-md" delay={delay} />
          <Bone className="h-5 w-14 shrink-0 rounded-full" delay={delay} />
        </div>
        {/* Descrição */}
        <Bone className="mt-2 h-3 w-full" delay={delay} />
        {/* Preço / kg */}
        <div className="mt-3 flex items-baseline gap-1.5">
          <Bone className="h-6 w-24 rounded-md" delay={delay} />
          <Bone className="h-3 w-8" delay={delay} />
        </div>
        {/* Quantidade mínima */}
        <Bone className="mt-1.5 h-3 w-20" delay={delay} />
        {/* Botão */}
        <div className="mt-auto pt-4">
          <Bone className="h-10 w-full rounded-md" delay={delay} />
        </div>
      </div>
    </article>
  );
}

export function ProductCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      <style>{`@keyframes trapiche-shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }`}</style>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
