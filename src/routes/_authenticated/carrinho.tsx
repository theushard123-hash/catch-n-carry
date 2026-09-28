import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Fish, MapPin, PackageOpen, ShoppingBasket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { createOrder } from "@/lib/orders.functions";
import { findShippingFee } from "@/lib/shipping";
import { formatBRL, formatQty } from "@/lib/format";
import { formatCep, isValidCep } from "@/lib/br-validation";
import { readCart, readCartSpecs, writeCart, writeCartSpecs, type CartItem } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CartQuantity } from "@/components/CartQuantity";
import { WeightPickerDialog, formatWeight, type ItemSpec } from "@/components/WeightPickerDialog";
import { cn } from "@/lib/utils";

const STORE_ADDRESS = "Alameda Princesa Izabel, 1710 — Bigorrilho, Curitiba — PR";
const DEFAULT_WHATSAPP = "554130147701";
type Product = Tables<"products">;
type AddressMode = "cadastro" | "outro" | "retirada";
const isWeighted = (product: Product) => product.variable_weight === true;
const roundQty = (number: number) => Math.round(number * 1000) / 1000;

export const Route = createFileRoute("/_authenticated/carrinho")({
  head: () => ({ meta: [
    { title: "Meu carrinho — Portal Trapiche Pescados" },
    { name: "description", content: "Revise os produtos, escolha entrega e pagamento e finalize seu pedido Trapiche." },
    { property: "og:title", content: "Meu carrinho — Portal Trapiche Pescados" },
    { property: "og:description", content: "Revise os produtos, escolha entrega e pagamento e finalize seu pedido Trapiche." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: CartPage,
});

function CartPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const customerType = profile?.customer_type ?? "varejo";
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specs, setSpecs] = useState<Record<string, ItemSpec>>({});
  const [hydrated, setHydrated] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [addressMode, setAddressMode] = useState<AddressMode>("cadastro");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [weightFor, setWeightFor] = useState<Product | null>(null);
  const [whatsappOrder, setWhatsappOrder] = useState<{ id: string; text: string } | null>(null);
  const [address, setAddress] = useState({ rua: "", numero: "", complemento: "", bairro: "", municipio: "", estado: "", cep: "" });

  useEffect(() => { setCart(readCart()); setSpecs(readCartSpecs()); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) writeCart(cart); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) writeCartSpecs(specs); }, [specs, hydrated]);

  const productsQ = useQuery({ queryKey: ["products"], queryFn: async () => { const { data, error } = await supabase.from("products").select("*").eq("active", true).order("name"); if (error) throw error; return data; } });
  const conditionsQ = useQuery({ queryKey: ["payment_conditions", customerType], queryFn: async () => { const { data, error } = await supabase.from("payment_conditions").select("*").eq("active", true).or(`customer_type.is.null,customer_type.eq.${customerType}`).order("sort_order"); if (error) throw error; return data; } });
  const settingsQ = useQuery({ queryKey: ["app_settings"], queryFn: async () => { const { data, error } = await supabase.from("app_settings_customer").select("*").eq("id", 1).maybeSingle(); if (error) throw error; return data; } });
  const ratesQ = useQuery({ queryKey: ["shipping-rates"], queryFn: async () => { const { data, error } = await supabase.from("shipping_rates").select("city, neighborhood, fee, active"); if (error) throw error; return data; } });

  const products = productsQ.data ?? [];
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const lines = cart.map((item) => ({ ...item, product: productMap.get(item.productId) })).filter((line): line is CartItem & { product: Product } => Boolean(line.product));
  const priceOf = (product: Product) => Number(customerType === "atacado" ? product.price_atacado : product.price_varejo);
  const subtotal = lines.reduce((sum, line) => sum + priceOf(line.product) * line.qty, 0);
  const minOrder = Number(customerType === "atacado" ? settingsQ.data?.min_order_atacado ?? 0 : settingsQ.data?.min_order_varejo ?? 0);
  const blocked = Boolean(settingsQ.data?.require_approval && profile?.customer_type === "atacado" && !profile.approved);
  const profileAddress = [profile?.address, profile?.neighborhood, [profile?.city, profile?.state].filter(Boolean).join(" - "), profile?.zip ? `CEP ${profile.zip}` : ""].filter(Boolean).join(", ");
  const customAddress = [[address.rua.trim(), address.numero.trim()].filter(Boolean).join(", "), address.complemento.trim(), address.bairro.trim(), [address.municipio.trim(), address.estado.trim()].filter(Boolean).join(" - "), address.cep ? `CEP ${formatCep(address.cep)}` : ""].filter(Boolean).join(", ");
  const isPickup = addressMode === "retirada";
  const deliveryAddress = isPickup ? `Retirada na loja — ${STORE_ADDRESS}` : addressMode === "cadastro" ? profileAddress : customAddress;
  const deliveryCity = isPickup ? "" : addressMode === "cadastro" ? profile?.city ?? "" : address.municipio;
  const deliveryNeighborhood = isPickup ? "" : addressMode === "cadastro" ? profile?.neighborhood ?? "" : address.bairro;
  const shippingFee = isPickup ? 0 : findShippingFee(ratesQ.data ?? [], deliveryCity, deliveryNeighborhood);
  const shippingLabel = isPickup ? "Grátis" : shippingFee === null ? "A consultar" : formatBRL(shippingFee);
  const total = subtotal + (shippingFee ?? 0);
  const paymentName = (conditionsQ.data ?? []).find((condition) => condition.id === paymentId)?.name;
  const today = new Date().toISOString().slice(0, 10);

  function setQty(product: Product, qty: number) {
    const rounded = roundQty(qty);
    setCart((previous) => rounded <= 0 ? previous.filter((item) => item.productId !== product.id) : previous.map((item) => item.productId === product.id ? { ...item, qty: rounded } : item));
    if (rounded <= 0) setSpecs((previous) => { const next = { ...previous }; delete next[product.id]; return next; });
  }
  function specText(productId: string) { const spec = specs[productId]; return spec ? [spec.cut && `separar em: ${spec.cut}`, spec.note && `obs.: ${spec.note}`].filter(Boolean).join("; ") : ""; }
  const fullNotes = [notes.trim(), lines.filter((line) => specText(line.productId)).map((line) => `- ${line.product.name}: ${specText(line.productId)}`).join("\n")].filter(Boolean).join("\n\n");

  function validateAndReview() {
    if (!paymentId) { toast.error("Selecione a condição de pagamento."); return; }
    if (subtotal < minOrder) { toast.error(`O pedido mínimo é ${formatBRL(minOrder)}.`); return; }
    if (addressMode === "cadastro" && (!profile?.address?.trim() || !profile?.city?.trim() || profileAddress.length < 10)) { setAddressMode("outro"); toast.error("O endereço cadastrado está incompleto. Informe outro endereço."); return; }
    if (addressMode === "outro") {
      const missing = [!address.rua.trim() && "rua", !address.numero.trim() && "número", !address.bairro.trim() && "bairro", !address.municipio.trim() && "município", !address.estado.trim() && "estado", !isValidCep(address.cep) && "CEP válido"].filter(Boolean);
      if (missing.length) { toast.error(`Preencha: ${missing.join(", ")}.`); return; }
    }
    setReviewOpen(true);
  }

  const createOrderFn = useServerFn(createOrder);
  const submit = useMutation({ mutationFn: () => createOrderFn({ data: { paymentConditionId: paymentId, notes: fullNotes.slice(0, 2000), deliveryDate: deliveryDate || null, deliveryAddress, deliveryCity, deliveryNeighborhood, pickup: isPickup, items: lines.map((line) => ({ productId: line.productId, qty: line.qty })) } }), onSuccess: (result) => {
    const number = String(result.orderNumber).padStart(4, "0");
    const message = [`Olá! Acabei de fazer o pré-pedido *#${number}* no portal da Trapiche Pescados e gostaria de confirmar as especificações e gramaturas.`, "", `*Cliente:* ${profile?.company_name || profile?.full_name || ""}`, "*Itens:*", ...lines.map((line) => `• ${line.product.name} — ${isWeighted(line.product) ? formatWeight(line.qty) : formatQty(line.qty, line.product.unit)}${specText(line.productId) ? ` (${specText(line.productId)})` : ""}`), "", `*Frete:* ${result.shippingFee == null ? "a consultar" : formatBRL(result.shippingFee)}`, `*Total estimado:* ${formatBRL(result.total)}`, paymentName ? `*Pagamento:* ${paymentName}` : "", deliveryAddress ? `*Endereço:* ${deliveryAddress}` : "", notes.trim() ? `*Observações:* ${notes.trim()}` : ""].filter(Boolean).join("\n");
    toast.success(`Pedido #${number} enviado!`); setWhatsappOrder({ id: result.id, text: message }); setCart([]); setSpecs({}); setReviewOpen(false);
  }, onError: (error: Error) => toast.error(error.message) });

  if (hydrated && lines.length === 0 && !productsQ.isLoading && !whatsappOrder) return <div className="mx-auto max-w-xl py-16 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary"><PackageOpen className="h-9 w-9 text-ocean" /></div><h1 className="mt-5 text-3xl font-bold">Seu carrinho está vazio</h1><p className="mt-2 text-muted-foreground">Escolha os produtos no catálogo para começar seu pedido.</p><Button asChild size="lg" className="mt-6"><Link to="/catalogo"><ArrowLeft /> Voltar ao catálogo</Link></Button></div>;

  return <div className="animate-fade-up pb-28 lg:pb-0">
    <div className="mb-6"><Button asChild variant="ghost" className="-ml-3"><Link to="/catalogo"><ArrowLeft /> Continuar comprando</Link></Button><h1 className="mt-2 text-3xl font-bold">Meu carrinho</h1><p className="text-sm text-muted-foreground">Revise os produtos e complete os dados do pedido.</p></div>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section aria-labelledby="cart-items"><h2 id="cart-items" className="mb-3 text-xl font-bold">Produtos <Badge variant="aqua">{lines.length}</Badge></h2><div className="divide-y rounded-xl border bg-card shadow-soft">{lines.map((line) => <article key={line.productId} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:p-4"><div className="aspect-square overflow-hidden rounded-lg bg-secondary">{line.product.image_url ? <img src={line.product.image_url} alt="" className="h-full w-full object-cover" /> : <Fish className="m-auto h-full w-9 text-ocean/40" />}</div><div className="min-w-0"><h3 className="font-semibold">{line.product.name}</h3><p className="text-sm text-muted-foreground">{formatBRL(priceOf(line.product))} / {line.product.unit}</p>{specText(line.productId) && <p className="mt-1 text-xs text-ocean">{specText(line.productId)}</p>}<div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden"><CartQuantity product={line.product} qty={line.qty} onChange={(qty) => setQty(line.product, qty)} compact /><Button variant="ghost" size="iconSm" onClick={() => setQty(line.product, 0)} aria-label={`Remover ${line.product.name}`}><Trash2 className="text-destructive" /></Button></div></div><div className="col-span-2 flex items-center justify-between border-t pt-3 sm:col-span-1 sm:block sm:border-0 sm:pt-0"><div className="hidden sm:flex sm:justify-end sm:gap-2"><CartQuantity product={line.product} qty={line.qty} onChange={(qty) => setQty(line.product, qty)} compact /><Button variant="ghost" size="iconSm" onClick={() => setQty(line.product, 0)} aria-label={`Remover ${line.product.name}`}><Trash2 className="text-destructive" /></Button></div>{isWeighted(line.product) && <Button variant="link" size="sm" className="px-0 sm:mt-1" onClick={() => setWeightFor(line.product)}>Alterar gramatura</Button>}<p className="font-bold sm:mt-2 sm:text-right">{formatBRL(priceOf(line.product) * line.qty)}</p></div></article>)}</div></section>
        <section aria-labelledby="delivery" className="space-y-4"><h2 id="delivery" className="flex items-center gap-2 text-xl font-bold"><MapPin className="text-ocean" /> Entrega ou retirada</h2><RadioGroup value={addressMode} onValueChange={(value) => setAddressMode(value as AddressMode)} className="grid gap-3 sm:grid-cols-3">{([{ value: "cadastro", title: "Meu endereço", text: profileAddress || "Endereço incompleto" }, { value: "outro", title: "Outro endereço", text: "Informar novo local" }, { value: "retirada", title: "Retirar na loja", text: STORE_ADDRESS }] as const).map((option) => <label key={option.value} className={cn("cursor-pointer rounded-xl border bg-card p-4", addressMode === option.value && "border-primary ring-2 ring-ring/20")}><div className="flex items-center gap-2"><RadioGroupItem value={option.value} /><span className="font-semibold">{option.title}</span></div><span className="mt-2 block text-xs text-muted-foreground">{option.text}</span></label>)}</RadioGroup>
          {addressMode === "outro" && <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2"><Field label="Rua *" wide><Input value={address.rua} onChange={(event) => setAddress({ ...address, rua: event.target.value })} /></Field><Field label="Número *"><Input value={address.numero} onChange={(event) => setAddress({ ...address, numero: event.target.value })} /></Field><Field label="Complemento"><Input value={address.complemento} onChange={(event) => setAddress({ ...address, complemento: event.target.value })} /></Field><Field label="Bairro *"><Input value={address.bairro} onChange={(event) => setAddress({ ...address, bairro: event.target.value })} /></Field><Field label="CEP *"><Input inputMode="numeric" value={address.cep} onChange={(event) => setAddress({ ...address, cep: formatCep(event.target.value) })} /></Field><Field label="Município *"><Input value={address.municipio} onChange={(event) => setAddress({ ...address, municipio: event.target.value })} /></Field><Field label="Estado (UF) *"><Input maxLength={2} value={address.estado} onChange={(event) => setAddress({ ...address, estado: event.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} /></Field></div>}
        </section>
        <section className="grid gap-4 sm:grid-cols-2"><Field label="Condição de pagamento *"><Select value={paymentId} onValueChange={setPaymentId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{(conditionsQ.data ?? []).map((condition) => <SelectItem key={condition.id} value={condition.id}>{condition.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Data de entrega desejada"><Input type="date" min={today} value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /></Field><div className="sm:col-span-2"><Label htmlFor="notes">Observações</Label><Textarea id="notes" className="mt-1.5" rows={4} placeholder="Ex.: entregar antes das 10h..." value={notes} onChange={(event) => setNotes(event.target.value)} /></div></section>
      </div>
      <aside className="hidden lg:block"><OrderSummary subtotal={subtotal} shippingLabel={shippingLabel} total={total} minOrder={minOrder} disabled={blocked || lines.length === 0 || submit.isPending} onCheckout={validateAndReview} /></aside>
    </div>
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 p-3 backdrop-blur lg:hidden"><div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">Total estimado</p><p className="text-lg font-bold">{formatBRL(total)}</p></div><Button size="lg" variant="aqua" disabled={blocked || lines.length === 0 || submit.isPending} onClick={validateAndReview}>Revisar pedido</Button></div></div>

    <AlertDialog open={reviewOpen} onOpenChange={setReviewOpen}><AlertDialogContent className="max-h-[88dvh] overflow-y-auto"><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><Fish className="text-ocean" /> Confira seu pedido</AlertDialogTitle><AlertDialogDescription>Uma última olhada antes de puxar as redes.</AlertDialogDescription></AlertDialogHeader><div className="space-y-2 rounded-xl bg-secondary/50 p-3">{lines.map((line) => <div key={line.productId} className="flex justify-between gap-3 text-sm"><span>{line.product.name} · {isWeighted(line.product) ? formatWeight(line.qty) : formatQty(line.qty, line.product.unit)}</span><strong>{formatBRL(priceOf(line.product) * line.qty)}</strong></div>)}</div><dl className="space-y-2 text-sm"><Row label="Pagamento" value={paymentName ?? "—"} /><Row label="Entrega" value={deliveryAddress} /><Row label="Frete" value={shippingLabel} /><Row label="Total" value={formatBRL(total)} strong /></dl><AlertDialogFooter><AlertDialogCancel>Voltar e revisar</AlertDialogCancel><AlertDialogAction disabled={submit.isPending} onClick={() => submit.mutate()}>{submit.isPending ? "Enviando..." : "Confirmar e enviar"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <WeightPickerDialog open={Boolean(weightFor)} onOpenChange={(open) => !open && setWeightFor(null)} productName={weightFor?.name ?? ""} cutOptions={weightFor?.cut_options ?? []} minQty={Number(weightFor?.min_qty ?? 0.1)} initialQty={weightFor ? cart.find((item) => item.productId === weightFor.id)?.qty : undefined} initialSpec={weightFor ? specs[weightFor.id] : undefined} onConfirm={(qty, spec) => { if (!weightFor) return; setQty(weightFor, qty); setSpecs((previous) => ({ ...previous, [weightFor.id]: spec })); }} />
    <AlertDialog open={Boolean(whatsappOrder)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Pedido recebido! As redes já foram lançadas.</AlertDialogTitle><AlertDialogDescription>Quer confirmar especificações e gramaturas com o vendedor pelo WhatsApp?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => { if (!whatsappOrder) return; const id = whatsappOrder.id; setWhatsappOrder(null); navigate({ to: "/pedidos/$id", params: { id } }); }}>Agora não</AlertDialogCancel><AlertDialogAction className="bg-success text-success-foreground hover:bg-success/90" onClick={() => { if (!whatsappOrder) return; const order = whatsappOrder; const phone = (settingsQ.data?.whatsapp || "").replace(/\D/g, "") || DEFAULT_WHATSAPP; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(order.text)}`, "_blank", "noopener"); setWhatsappOrder(null); navigate({ to: "/pedidos/$id", params: { id: order.id } }); }}>Confirmar pelo WhatsApp</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <div className={cn("space-y-1.5", wide && "sm:col-span-2")}><Label>{label}</Label>{children}</div>; }
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className={cn("flex justify-between gap-4", strong && "border-t pt-2 text-base")}><dt className="shrink-0 text-muted-foreground">{label}</dt><dd className={cn("text-right", strong && "font-bold text-primary")}>{value}</dd></div>; }
function OrderSummary({ subtotal, shippingLabel, total, minOrder, disabled, onCheckout }: { subtotal: number; shippingLabel: string; total: number; minOrder: number; disabled: boolean; onCheckout: () => void }) { return <div className="sticky top-24 rounded-xl border bg-card p-5 shadow-soft"><h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingBasket className="text-ocean" /> Resumo do pedido</h2><dl className="mt-5 space-y-3 text-sm"><Row label="Subtotal" value={formatBRL(subtotal)} /><Row label="Frete" value={shippingLabel} /><Row label="Total estimado" value={formatBRL(total)} strong /></dl>{minOrder > 0 && <p className={cn("mt-3 text-xs", subtotal < minOrder ? "text-destructive" : "text-muted-foreground")}>Pedido mínimo: {formatBRL(minOrder)}</p>}<Button size="lg" variant="aqua" className="mt-5 w-full" disabled={disabled} onClick={onCheckout}><Check /> Revisar pedido</Button><p className="mt-3 text-center text-xs text-muted-foreground">O pedido só será enviado após sua confirmação.</p></div>; }
