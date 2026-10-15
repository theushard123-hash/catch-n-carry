import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Fish, Info, Plus, RotateCcw, Search, ShoppingBasket, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL, formatQty } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PromoBanners } from "@/components/PromoBanners";
import { ProductCardsSkeleton } from "@/components/ProductCardSkeleton";
import { cn } from "@/lib/utils";
import { WeightPickerDialog, formatWeight, type ItemSpec } from "@/components/WeightPickerDialog";
import { CartQuantity } from "@/components/CartQuantity";
import { readCart, readCartSpecs, writeCart, writeCartSpecs, type CartItem } from "@/lib/cart";
import { CatalogFilters } from "@/components/CatalogFilters";
import { filterCatalog, type CatalogSort } from "@/lib/catalog-filters";
import { redirectSellerToSales } from "@/lib/seller-guard";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({ meta: [
    { title: "Catálogo — Portal Trapiche Pescados" },
    { name: "description", content: "Escolha pescados e frutos do mar e adicione ao seu carrinho." },
    { property: "og:title", content: "Catálogo — Portal Trapiche Pescados" },
    { property: "og:description", content: "Escolha pescados e frutos do mar e adicione ao seu carrinho." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  beforeLoad: redirectSellerToSales,
  component: CatalogPage,
});

type Product = Tables<"products">;
const isWeighted = (product: Product) => product.variable_weight === true;
const roundQty = (number: number) => Math.round(number * 1000) / 1000;

function CatalogPage() {
  const { profile } = useAuth();
  const customerType = profile?.customer_type ?? "varejo";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<CatalogSort>("featured");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specs, setSpecs] = useState<Record<string, ItemSpec>>({});
  const [hydrated, setHydrated] = useState(false);
  const [weightFor, setWeightFor] = useState<Product | null>(null);

  useEffect(() => { setCart(readCart()); setSpecs(readCartSpecs()); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) writeCart(cart); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) writeCartSpecs(specs); }, [specs, hydrated]);

  const categoriesQ = useQuery({ queryKey: ["categories"], queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").eq("active", true).order("sort_order");
    if (error) throw error; return data;
  }});
  const productsQ = useQuery({ queryKey: ["products"], queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*").eq("active", true).order("sort_order").order("name");
    if (error) throw error; return data;
  }});
  const settingsQ = useQuery({ queryKey: ["app_settings"], queryFn: async () => {
    const { data, error } = await supabase.from("app_settings_customer").select("*").eq("id", 1).maybeSingle();
    if (error) throw error; return data;
  }});
  const salesQ = useQuery({ queryKey: ["catalog-sales-ranking"], enabled: sort === "bestsellers", staleTime: 60_000, queryFn: async () => {
    const { data, error } = await supabase.rpc("catalog_sales_ranking");
    if (error) throw error;
    return data;
  }});

  const products = productsQ.data ?? [];
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const priceOf = (product: Product) => Number(customerType === "atacado" ? product.price_atacado : product.price_varejo);
  const ranks = useMemo(() => new Map((salesQ.data ?? []).map((item) => [item.product_id, Number(item.sales_rank)])), [salesQ.data]);
  const filtered = useMemo(() => filterCatalog(products, { search, category, minPrice, maxPrice, sort, customerType, ranks }), [products, search, category, minPrice, maxPrice, sort, customerType, ranks]);
  const filtersActive = Boolean(search || category !== "all" || minPrice || maxPrice || sort !== "featured");
  const resetFilters = () => { setSearch(""); setCategory("all"); setMinPrice(""); setMaxPrice(""); setSort("featured"); };
  const cartLines = cart.map((item) => ({ ...item, product: productMap.get(item.productId) })).filter((line): line is CartItem & { product: Product } => Boolean(line.product));
  const subtotal = cartLines.reduce((sum, line) => sum + priceOf(line.product) * line.qty, 0);
  const blocked = Boolean(settingsQ.data?.require_approval && profile?.customer_type === "atacado" && !profile.approved);

  function setQty(product: Product, qty: number) {
    const rounded = roundQty(qty);
    setCart((previous) => rounded <= 0 ? previous.filter((item) => item.productId !== product.id) : previous.some((item) => item.productId === product.id) ? previous.map((item) => item.productId === product.id ? { ...item, qty: rounded } : item) : [...previous, { productId: product.id, qty: rounded }]);
    if (rounded <= 0) setSpecs((previous) => { const next = { ...previous }; delete next[product.id]; return next; });
  }

  return (
    <div className="animate-fade-up pb-24 sm:pb-28">
      {blocked && <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/50 bg-warning/15 p-4"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" /><div className="text-sm"><p className="font-semibold text-warning-foreground">Cadastro em análise</p><p className="text-muted-foreground">Você já pode montar o carrinho. O envio será liberado após a aprovação.</p></div></div>}
      {settingsQ.data?.notice && <div className="mb-6 flex items-start gap-3 rounded-xl border border-info/40 bg-info/10 p-4 text-sm"><Info className="mt-0.5 h-5 w-5 shrink-0 text-info" /><p>{settingsQ.data.notice}</p></div>}
      <PromoBanners customerType={customerType} />

      <section>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0"><h1 className="text-3xl font-bold">Catálogo</h1><p className="text-sm text-muted-foreground">Preços de <span className="font-semibold text-foreground">{customerType}</span></p></div>
          <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Buscar produto" placeholder="Buscar produto ou código" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        </div>
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>Todos</Chip>
          {(categoriesQ.data ?? []).map((item) => <Chip key={item.id} active={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</Chip>)}
        </div>
        <CatalogFilters minPrice={minPrice} maxPrice={maxPrice} sort={sort} onMinChange={setMinPrice} onMaxChange={setMaxPrice} onSortChange={setSort} onReset={resetFilters} active={filtersActive} />
        {salesQ.isError && sort === "bestsellers" && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span>Não conseguimos carregar os mais vendidos agora.</span><Button variant="outline" size="sm" onClick={() => salesQ.refetch()}>Tentar novamente</Button></div>}
        {!productsQ.isLoading && !productsQ.isError && <p aria-live="polite" className="mb-4 text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "produto encontrado" : "produtos encontrados"}</p>}
        {productsQ.isLoading || (sort === "bestsellers" && salesQ.isLoading) ? <ProductCardsSkeleton count={8} /> : productsQ.isError ? <div role="alert" className="py-12 text-center"><Fish className="mx-auto mb-4 h-10 w-10 text-ocean" /><h2 className="text-lg font-bold">O catálogo não chegou por aqui ainda.</h2><p className="mt-2 text-sm text-muted-foreground">Tente novamente em instantes.</p><Button variant="outline" className="mt-5" onClick={() => productsQ.refetch()}>Tentar novamente</Button></div> : filtered.length === 0 ? <div className="flex flex-col items-center border-y px-4 py-14 text-center"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary"><Fish className="h-8 w-8 text-ocean" /></div><h2 className="text-xl font-bold">Nenhum peixe caiu nessa rede!</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">Não encontramos produtos com essa busca. Que tal conferir nossa seleção completa?</p><Button className="mt-6" onClick={resetFilters}><RotateCcw /> Voltar para todos os produtos</Button></div> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => {
              const inCart = cart.find((item) => item.productId === product.id);
              const spec = specs[product.id];
              return <article key={product.id} className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-soft transition-shadow hover:shadow-lift">
                <div className="aspect-[4/3] overflow-hidden bg-secondary">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><Fish className="h-12 w-12 text-ocean/40" /></div>}</div>
                <div className="flex flex-1 flex-col p-4"><div className="flex items-start justify-between gap-2"><h2 className="font-semibold leading-snug">{product.name}</h2>{product.sku && <Badge variant="muted">{product.sku}</Badge>}</div>{product.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>}<div className="mt-3 flex items-baseline gap-1"><span className="text-xl font-bold text-primary">{formatBRL(priceOf(product))}</span><span className="text-xs text-muted-foreground">/ {product.unit}</span></div><p className="text-[11px] text-muted-foreground">Mín. {formatQty(product.min_qty, product.unit)}</p>
                  <div className="mt-auto pt-4">{inCart ? isWeighted(product) ? <div className="space-y-2"><Button variant="outline" className="w-full" onClick={() => setWeightFor(product)}>{formatWeight(inCart.qty)}{spec?.cut ? ` · ${spec.cut}` : ""} — alterar</Button><Button variant="ghost" size="sm" className="w-full" onClick={() => setQty(product, 0)}><Trash2 /> Remover</Button></div> : <CartQuantity product={product} qty={inCart.qty} onChange={(qty) => setQty(product, qty)} /> : <Button className="w-full" onClick={() => isWeighted(product) ? setWeightFor(product) : setQty(product, Number(product.min_qty))}><Plus /> Adicionar</Button>}</div>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>

      {cartLines.length > 0 && !weightFor && (
        <div className="fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
          <Button asChild size="lg" variant="aqua" className="h-12 rounded-full pl-4 pr-3 shadow-lift">
            <Link to="/carrinho" aria-label="Ir para o carrinho">
              <ShoppingBasket />
              <span className="hidden sm:inline">Carrinho</span>
              <span className="hidden text-sm font-semibold sm:inline">{formatBRL(subtotal)}</span>
              <Badge variant="default">{cartLines.length}</Badge>
            </Link>
          </Button>
        </div>
      )}
      <WeightPickerDialog open={Boolean(weightFor)} onOpenChange={(open) => !open && setWeightFor(null)} productName={weightFor?.name ?? ""} cutOptions={weightFor?.cut_options ?? []} minQty={Number(weightFor?.min_qty ?? 0.1)} initialQty={weightFor ? cart.find((item) => item.productId === weightFor.id)?.qty : undefined} initialSpec={weightFor ? specs[weightFor.id] : undefined} onConfirm={(qty, spec) => { if (!weightFor) return; setQty(weightFor, qty); setSpecs((previous) => ({ ...previous, [weightFor.id]: spec })); }} />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button type="button" variant={active ? "default" : "outline"} size="sm" onClick={onClick} className={cn("shrink-0 rounded-full", active && "shadow-none")}>{children}</Button>;
}
