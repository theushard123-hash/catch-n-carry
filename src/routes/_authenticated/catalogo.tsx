import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Fish, Info, Minus, Plus, Search, ShoppingBasket, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { createOrder } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL, formatQty } from "@/lib/format";
import { formatCep, isValidCep } from "@/lib/br-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PromoBanners } from "@/components/PromoBanners";
import { ProductCardsSkeleton } from "@/components/ProductCardSkeleton";
import { cn } from "@/lib/utils";
import { WeightPickerDialog, formatWeight, type ItemSpec } from "@/components/WeightPickerDialog";

const DEFAULT_WHATSAPP = "554130147701";
const isWeighted = (p: { variable_weight?: boolean | null }) => p.variable_weight === true;

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo — Portal Trapiche Pescados" },
      { name: "description", content: "Monte seu pedido de pescados e frutos do mar com preços do seu perfil." },
    ],
  }),
  component: CatalogPage,
});

type Product = Tables<"products">;
type CartItem = { productId: string; qty: number };
const CART_KEY = "trapiche-cart";

function roundQty(n: number) {
  return Math.round(n * 1000) / 1000;
}

function formatDatePtBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function CatalogPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const customerType = profile?.customer_type ?? "varejo";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [specs, setSpecs] = useState<Record<string, ItemSpec>>({});
  const [weightFor, setWeightFor] = useState<Product | null>(null);
  const [waOrder, setWaOrder] = useState<{ id: string; text: string } | null>(null);
  const [addrMode, setAddrMode] = useState<"cadastro" | "outro">("cadastro");
  const [addrFields, setAddrFields] = useState({
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    municipio: "",
    estado: "",
    cep: "",
  });
  const setAddr = (key: keyof typeof addrFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddrFields((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const productsQ = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  const conditionsQ = useQuery({
    queryKey: ["payment_conditions", customerType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_conditions")
        .select("*")
        .eq("active", true)
        .or(`customer_type.is.null,customer_type.eq.${customerType}`)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const settingsQ = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings_customer")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const products = productsQ.data ?? [];
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const priceOf = (p: Product) => Number(customerType === "atacado" ? p.price_atacado : p.price_varejo);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (category === "all" || p.category_id === category) &&
        (!s || p.name.toLowerCase().includes(s) || (p.sku ?? "").toLowerCase().includes(s)),
    );
  }, [products, search, category]);

  const cartLines = cart
    .map((c) => ({ ...c, product: productMap.get(c.productId) }))
    .filter((l): l is CartItem & { product: Product } => !!l.product);
  const subtotal = cartLines.reduce((s, l) => s + priceOf(l.product) * l.qty, 0);
  const itemCount = cartLines.length;

  // Apenas atacado depende de aprovação; varejo compra direto.
  const blocked =
    !!settingsQ.data?.require_approval && profile?.customer_type === "atacado" && !profile?.approved;

  const minOrder = Number(
    customerType === "atacado" ? settingsQ.data?.min_order_atacado ?? 0 : settingsQ.data?.min_order_varejo ?? 0,
  );

  function setQty(p: Product, qty: number) {
    const q = roundQty(qty);
    setCart((prev) => {
      if (q <= 0) return prev.filter((c) => c.productId !== p.id);
      const exists = prev.some((c) => c.productId === p.id);
      return exists
        ? prev.map((c) => (c.productId === p.id ? { ...c, qty: q } : c))
        : [...prev, { productId: p.id, qty: q }];
    });
  }

  const profileAddress = useMemo(() => {
    if (!profile) return "";
    const parts = [
      profile.address,
      profile.neighborhood,
      [profile.city, profile.state].filter(Boolean).join(" - "),
      profile.zip ? `CEP ${profile.zip}` : "",
    ].filter((p) => p && String(p).trim());
    return parts.join(", ");
  }, [profile]);

  const customAddress = useMemo(() => {
    const f = addrFields;
    const parts = [
      [f.rua.trim(), f.numero.trim()].filter(Boolean).join(", "),
      f.complemento.trim(),
      f.bairro.trim(),
      [f.municipio.trim(), f.estado.trim().toUpperCase()].filter(Boolean).join(" - "),
      f.cep.trim() ? `CEP ${formatCep(f.cep)}` : "",
    ].filter(Boolean);
    return parts.join(", ");
  }, [addrFields]);

  const deliveryAddress = addrMode === "cadastro" ? profileAddress : customAddress;

  function specText(productId: string) {
    const sp = specs[productId];
    if (!sp) return "";
    return [sp.cut && `separar em: ${sp.cut}`, sp.note && `obs.: ${sp.note}`].filter(Boolean).join("; ");
  }
  const itemsSpecNotes = cartLines
    .filter((l) => specText(l.productId))
    .map((l) => `- ${l.product.name}: ${specText(l.productId)}`)
    .join("\n");
  const fullNotes = [notes.trim(), itemsSpecNotes && `Especificações dos itens:\n${itemsSpecNotes}`]
    .filter(Boolean)
    .join("\n\n");

  const createOrderFn = useServerFn(createOrder);
  const submit = useMutation({
    mutationFn: async () => {
      if (!paymentId) throw new Error("Selecione a condição de pagamento.");
      if (cartLines.length === 0) throw new Error("Adicione produtos ao pedido.");
      return createOrderFn({
        data: {
          paymentConditionId: paymentId,
          notes: fullNotes.slice(0, 2000),
          deliveryDate: deliveryDate || null,
          deliveryAddress,
          items: cartLines.map((l) => ({ productId: l.productId, qty: l.qty })),
        },
      });
    },
    onSuccess: (res) => {
      const num = String(res.orderNumber).padStart(4, "0");
      toast.success(`Pedido #${num} enviado!`);
      const lines = cartLines.map((l) => {
        const q = isWeighted(l.product) ? formatWeight(l.qty) : formatQty(l.qty, l.product.unit);
        const sp = specText(l.productId);
        return `• ${l.product.name} — ${q}${sp ? ` (${sp})` : ""}`;
      });
      const text = [
        `Olá! Acabei de fazer o pré-pedido *#${num}* no portal da Trapiche Pescados e gostaria de confirmar as especificações e gramaturas.`,
        "",
        `*Cliente:* ${profile?.company_name || profile?.full_name || ""}`,
        "*Itens:*",
        ...lines,
        "",
        `*Total estimado:* ${formatBRL(res.total)}`,
        paymentName ? `*Pagamento:* ${paymentName}` : "",
        deliveryDate ? `*Entrega:* ${formatDatePtBR(deliveryDate)}` : "",
        deliveryAddress ? `*Endereço:* ${deliveryAddress}` : "",
        notes.trim() ? `*Observações:* ${notes.trim()}` : "",
      ]
        .filter((x, i, a) => x !== "" || a[i - 1] !== "")
        .join("\n");
      setWaOrder({ id: res.id, text });
      setSpecs({});
      setReviewOpen(false);
      setCart([]);
      setNotes("");
      setDeliveryDate("");
      setSheetOpen(false);
    },
    onError: (e: Error) => {
      let msg = e.message;
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed) && parsed[0]?.message) msg = parsed[0].message;
      } catch {}
      toast.error(msg);
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const paymentName = (conditionsQ.data ?? []).find((c) => c.id === paymentId)?.name;

  function openReview() {
    if (cartLines.length === 0) {
      toast.error("Adicione produtos ao pedido.");
      return;
    }
    if (!paymentId) {
      toast.error("Selecione a condição de pagamento.");
      return;
    }
    if (addrMode === "cadastro" && (!profile?.address?.trim() || !profile?.city?.trim() || profileAddress.length < 10)) {
      toast.error("O endereço do seu cadastro está incompleto. Informe o endereço de entrega abaixo.");
      setAddrMode("outro");
      return;
    }
    if (addrMode === "outro") {
      const missing: string[] = [];
      if (!addrFields.rua.trim()) missing.push("rua");
      if (!addrFields.numero.trim()) missing.push("número");
      if (!addrFields.bairro.trim()) missing.push("bairro");
      if (!addrFields.municipio.trim()) missing.push("município");
      if (!addrFields.estado.trim()) missing.push("estado");
      if (!isValidCep(addrFields.cep)) missing.push("CEP válido");
      if (missing.length > 0) {
        toast.error(`Preencha o endereço de entrega: ${missing.join(", ")}.`);
        return;
      }
    }
    setSheetOpen(false);
    setReviewOpen(true);
  }

  const cartPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-28 flex-1 space-y-3 overflow-y-auto pr-1">
        {cartLines.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Seu pedido está vazio. Adicione produtos do catálogo.
          </div>
        ) : (
          cartLines.map((l) => (
            <div key={l.productId} className="rounded-xl border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{l.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatQty(l.qty, l.product.unit)} × {formatBRL(priceOf(l.product))}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold">{formatBRL(priceOf(l.product) * l.qty)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <QtyStepper product={l.product} qty={l.qty} onChange={(q) => setQty(l.product, q)} compact />
                <Button variant="ghost" size="iconSm" onClick={() => setQty(l.product, 0)} aria-label="Remover">
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 shrink-0 space-y-3 border-t pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-lg font-bold">{formatBRL(subtotal)}</span>
        </div>
        {minOrder > 0 && (
          <p className={cn("text-xs", subtotal < minOrder ? "text-warning-foreground" : "text-muted-foreground")}>
            Pedido mínimo: {formatBRL(minOrder)}
          </p>
        )}
        <div className="space-y-1.5">
          <Label>Condição de pagamento *</Label>
          <Select value={paymentId} onValueChange={setPaymentId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {(conditionsQ.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Endereço de entrega *</Label>
          <RadioGroup value={addrMode} onValueChange={(v) => setAddrMode(v as "cadastro" | "outro")} className="gap-2">
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition-colors",
                addrMode === "cadastro" ? "border-primary bg-primary/5" : "bg-card hover:bg-secondary/60",
              )}
            >
              <RadioGroupItem value="cadastro" className="mt-0.5" />
              <span>
                <span className="font-medium">Usar endereço do cadastro</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {profileAddress || "Endereço não informado no cadastro."}
                </span>
              </span>
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition-colors",
                addrMode === "outro" ? "border-primary bg-primary/5" : "bg-card hover:bg-secondary/60",
              )}
            >
              <RadioGroupItem value="outro" className="mt-0.5" />
              <span className="font-medium">Entregar em outro endereço</span>
            </label>
          </RadioGroup>
          {addrMode === "outro" && (
            <div className="grid gap-3 rounded-xl border bg-secondary/30 p-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="addr-rua">Rua *</Label>
                <Input id="addr-rua" placeholder="Ex.: Alameda Princesa Izabel" value={addrFields.rua} onChange={setAddr("rua")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-numero">Número *</Label>
                <Input id="addr-numero" inputMode="numeric" placeholder="1710" value={addrFields.numero} onChange={setAddr("numero")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-complemento">Complemento</Label>
                <Input id="addr-complemento" placeholder="Opcional" value={addrFields.complemento} onChange={setAddr("complemento")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-bairro">Bairro *</Label>
                <Input id="addr-bairro" placeholder="Bigorrilho" value={addrFields.bairro} onChange={setAddr("bairro")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-cep">CEP *</Label>
                <Input
                  id="addr-cep"
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={addrFields.cep}
                  onChange={(e) => setAddrFields((f) => ({ ...f, cep: formatCep(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-municipio">Município *</Label>
                <Input id="addr-municipio" placeholder="Curitiba" value={addrFields.municipio} onChange={setAddr("municipio")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-estado">Estado (UF) *</Label>
                <Input
                  id="addr-estado"
                  maxLength={2}
                  placeholder="PR"
                  value={addrFields.estado}
                  onChange={(e) => setAddrFields((f) => ({ ...f, estado: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") }))}
                />
              </div>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="delivery">Data de entrega desejada</Label>
          <Input id="delivery" type="date" min={today} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            rows={2}
            placeholder="Ex.: entregar antes das 10h, cortar em postas..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button
          size="lg"
          variant="aqua"
          className="w-full"
          disabled={blocked || cartLines.length === 0 || submit.isPending}
          onClick={openReview}
        >
          {submit.isPending ? "Enviando..." : "Enviar pedido"}
        </Button>
        {blocked && (
          <p className="text-center text-xs text-muted-foreground">Pedidos liberados após aprovação do cadastro.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-up pb-24 lg:pb-0">
      {blocked && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/50 bg-warning/15 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
          <div className="text-sm">
            <p className="font-semibold text-warning-foreground">Cadastro em análise</p>
            <p className="text-muted-foreground">
              Sua conta está aguardando aprovação da equipe Trapiche. Você já pode consultar o catálogo; o envio de
              pedidos será liberado em breve.
            </p>
          </div>
        </div>
      )}
      {settingsQ.data?.notice && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-info/40 bg-info/10 p-4 text-sm">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-info" />
          <p>{settingsQ.data.notice}</p>
        </div>
      )}
      <PromoBanners customerType={customerType} />


      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Catálogo</h1>
              <p className="text-sm text-muted-foreground">
                Preços de <span className="font-semibold text-foreground">{customerType === "atacado" ? "atacado" : "varejo"}</span>
              </p>
            </div>
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar produto ou código"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <Chip active={category === "all"} onClick={() => setCategory("all")}>
              Todos
            </Chip>
            {(categoriesQ.data ?? []).map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>

          {productsQ.isLoading ? (
            <ProductCardsSkeleton />
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => {
                const inCart = cart.find((c) => c.productId === p.id);
                return (
                  <article
                    key={p.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-shadow hover:shadow-lift"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-secondary">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Fish className="h-12 w-12 text-ocean/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-snug">{p.name}</h3>
                        {p.sku && <Badge variant="muted">{p.sku}</Badge>}
                      </div>
                      {p.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                      )}
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-xl font-bold text-primary">{formatBRL(priceOf(p))}</span>
                        <span className="text-xs text-muted-foreground">/ {p.unit}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Mín. {formatQty(p.min_qty, p.unit)}</p>
                      <div className="mt-auto pt-4">
                        {inCart ? (
                          isWeighted(p) ? (
                            <div className="space-y-2">
                              <Button variant="outline" className="w-full" onClick={() => setWeightFor(p)}>
                                {formatWeight(inCart.qty)}
                                {specs[p.id]?.cut ? ` · ${specs[p.id]!.cut}` : ""} — alterar
                              </Button>
                              <Button variant="ghost" size="sm" className="w-full" onClick={() => setQty(p, 0)}>
                                <Trash2 /> Remover
                              </Button>
                            </div>
                          ) : (
                            <QtyStepper product={p} qty={inCart.qty} onChange={(q) => setQty(p, q)} />
                          )
                        ) : (
                          <Button
                            className="w-full"
                            onClick={() => (isWeighted(p) ? setWeightFor(p) : setQty(p, Number(p.min_qty)))}
                          >
                            <Plus /> Adicionar
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] h-[calc(100vh-7rem)] flex-col overflow-y-auto rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="mb-4 flex shrink-0 items-center gap-2 text-lg font-bold">
              <ShoppingBasket className="h-5 w-5 text-ocean" /> Seu pedido
              {itemCount > 0 && <Badge variant="aqua">{itemCount}</Badge>}
            </h2>
            <div className="min-h-0 flex-1">{cartPanel}</div>
          </div>
        </aside>
      </div>

      {/* Mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 p-3 backdrop-blur lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="lg" variant="aqua" className="w-full justify-between">
              <span className="inline-flex items-center gap-2">
                <ShoppingBasket /> Ver pedido ({itemCount} {itemCount === 1 ? "item" : "itens"})
              </span>
              <span>{formatBRL(subtotal)}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[88vh] overflow-hidden rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Seu pedido</SheetTitle>
            </SheetHeader>
            <div className="mt-4 h-[calc(88vh-5rem)]">{cartPanel}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Conferência antes de finalizar */}
      <AlertDialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <AlertDialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Fish className="h-5 w-5 text-ocean" /> Confira seu pedido
            </AlertDialogTitle>
            <AlertDialogDescription>
              Uma última olhada antes de puxar as redes — depois é só aguardar o contato da equipe Trapiche.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {cartLines.length > 0 && (
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border bg-secondary/50 p-3">
              {cartLines.map((l) => (
                <div key={l.productId} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatQty(l.qty, l.product.unit)} × {formatBRL(priceOf(l.product))}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">{formatBRL(priceOf(l.product) * l.qty)}</p>
                </div>
              ))}
            </div>
          )}

          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Condição de pagamento</dt>
              <dd className="text-right font-medium">{paymentName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">Endereço de entrega</dt>
              <dd className="text-right font-medium">{deliveryAddress}</dd>
            </div>
            {deliveryDate && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Entrega desejada</dt>
                <dd className="font-medium">{formatDatePtBR(deliveryDate)}</dd>
              </div>
            )}
            {notes.trim() && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">Observações</dt>
                <dd className="text-right">{notes.trim()}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className="text-lg font-bold text-primary">{formatBRL(subtotal)}</dd>
            </div>
          </dl>

          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e revisar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? "Enviando..." : "Confirmar e enviar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <WeightPickerDialog
        open={!!weightFor}
        onOpenChange={(o) => !o && setWeightFor(null)}
        productName={weightFor?.name ?? ""}
        cutOptions={weightFor?.cut_options ?? []}
        minQty={Number(weightFor?.min_qty ?? 0.1)}
        initialQty={weightFor ? cart.find((c) => c.productId === weightFor.id)?.qty : undefined}
        initialSpec={weightFor ? specs[weightFor.id] : undefined}
        onConfirm={(q, sp) => {
          if (!weightFor) return;
          setQty(weightFor, q);
          setSpecs((prev) => ({ ...prev, [weightFor.id]: sp }));
        }}
      />

      <AlertDialog open={!!waOrder}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Fish className="h-5 w-5 text-ocean" /> Pedido recebido! As redes já foram lançadas.
            </AlertDialogTitle>
            <AlertDialogDescription>
              Quer confirmar seu pedido com o vendedor? Ele confere as especificações e gramaturas pelo WhatsApp
              com você — a mensagem do pré-pedido já vai pronta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                const id = waOrder!.id;
                setWaOrder(null);
                navigate({ to: "/pedidos/$id", params: { id } });
              }}
            >
              Agora não
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={() => {
                const o = waOrder!;
                const phone = (settingsQ.data?.whatsapp || "").replace(/\D/g, "") || DEFAULT_WHATSAPP;
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(o.text)}`, "_blank", "noopener");
                setWaOrder(null);
                navigate({ to: "/pedidos/$id", params: { id: o.id } });
              }}
            >
              Confirmar pelo WhatsApp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

function QtyStepper({
  product,
  qty,
  onChange,
  compact,
}: {
  product: Product;
  qty: number;
  onChange: (q: number) => void;
  compact?: boolean;
}) {
  const step = Number(product.step_qty) || 1;
  const min = Number(product.min_qty) || step;
  const [text, setText] = useState(String(qty));
  useEffect(() => setText(String(qty)), [qty]);

  function commit(v: string) {
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return onChange(0);
    onChange(Math.max(min, n));
  }

  return (
    <div className={cn("flex items-center rounded-lg border bg-background", compact ? "h-8" : "h-10 w-full")}>
      <Button
        type="button"
        variant="ghost"
        size={compact ? "iconSm" : "icon"}
        className="rounded-r-none"
        onClick={() => onChange(qty - step < min ? 0 : qty - step)}
        aria-label="Diminuir"
      >
        <Minus />
      </Button>
      <input
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
        className="w-full min-w-0 bg-transparent text-center text-sm font-semibold outline-none"
        aria-label="Quantidade"
      />
      <span className="pr-1 text-xs text-muted-foreground">{product.unit}</span>
      <Button
        type="button"
        variant="ghost"
        size={compact ? "iconSm" : "icon"}
        className="rounded-l-none"
        onClick={() => onChange(qty + step)}
        aria-label="Aumentar"
      >
        <Plus />
      </Button>
    </div>
  );
}
