import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Fish } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ProductCardSkeleton } from "@/components/ProductCardSkeleton";
import { formatBRL } from "@/lib/format";

export function FeaturedProducts() {
  const productsQ = useQuery({ queryKey: ["storefront-featured-products"], staleTime: 60_000, queryFn: async () => {
    const { data, error } = await supabase.rpc("storefront_featured_products");
    if (error) throw error;
    return data;
  }});
  if (!productsQ.isLoading && !productsQ.isError && !productsQ.data?.length) return null;
  return <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="mb-2 text-xs font-semibold uppercase text-ocean">Seleção Trapiche</p><h2 className="font-display text-2xl font-bold sm:text-3xl">Produtos em Destaque</h2></div>
      <Button asChild variant="ghost" size="sm"><Link to="/catalogo">Ver catálogo <ArrowRight /></Link></Button>
    </div>
    {productsQ.isLoading ? <div role="status" aria-label="Carregando produtos em destaque" className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className={i > 0 ? "hidden sm:block" : ""}><ProductCardSkeleton index={i} /></div>)}</div> : productsQ.isError ? <div className="border-y py-8 text-center"><p className="mb-3 text-muted-foreground">Nossa seleção está demorando um pouquinho para chegar.</p><Button variant="outline" onClick={() => productsQ.refetch()}>Tentar novamente</Button></div> :
      <Carousel opts={{ align: "start", loop: false }} aria-label="Produtos em destaque" className="pb-14">
        <CarouselContent>{(productsQ.data ?? []).map((product) => <CarouselItem key={product.id} className="basis-[85%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
          <article className="flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-soft">
            <Link to="/catalogo" aria-label={`Ver ${product.name} no catálogo`} className="block aspect-[4/3] overflow-hidden bg-secondary">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Fish className="h-12 w-12 text-ocean/40" /></div>}</Link>
            <div className="flex flex-1 flex-col p-4"><h3 className="min-h-12 font-semibold leading-snug">{product.name}</h3><p className="mt-2 text-xl font-bold text-primary">{formatBRL(product.price_varejo)} <span className="text-xs font-normal text-muted-foreground">/ {product.unit}</span></p><p className="mt-1 text-xs text-muted-foreground">Preço de varejo</p><Button asChild variant="outline" className="mt-4 w-full"><Link to="/catalogo">Ver produto <ArrowRight /></Link></Button></div>
          </article>
        </CarouselItem>)}</CarouselContent>
        <CarouselPrevious aria-label="Produtos anteriores" title="Produtos anteriores" className="bottom-0 left-auto right-11 top-auto translate-y-0" />
        <CarouselNext aria-label="Próximos produtos" title="Próximos produtos" className="bottom-0 right-0 top-auto translate-y-0" />
      </Carousel>}
  </section>;
}