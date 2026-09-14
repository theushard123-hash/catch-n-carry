import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate, formatQty, ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do pedido — Portal Trapiche Pescados" },
      { name: "description", content: "Itens, pagamento e status do seu pedido na Trapiche Pescados." },
    ],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [{ data: order, error }, { data: items }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
      ]);
      if (error) throw error;
      return { order, items: items ?? [] };
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").update({ status: "cancelado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido cancelado.");
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: () => toast.error("Não foi possível cancelar o pedido."),
  });

  function repeat() {
    const items = (q.data?.items ?? [])
      .filter((i) => i.product_id)
      .map((i) => ({ productId: i.product_id as string, qty: Number(i.qty) }));
    localStorage.setItem("trapiche-cart", JSON.stringify(items));
    toast.success("Itens adicionados ao pedido.");
    navigate({ to: "/catalogo" });
  }

  if (q.isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!q.data?.order) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center">
        <p className="font-semibold">Pedido não encontrado</p>
        <Button asChild variant="link">
          <Link to="/pedidos">Voltar aos pedidos</Link>
        </Button>
      </div>
    );
  }

  const { order, items } = q.data;

  return (
    <div className="animate-fade-up mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/pedidos">
          <ArrowLeft /> Meus pedidos
        </Link>
      </Button>

      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Pedido</p>
            <h1 className="text-3xl font-bold">#{String(order.order_number).padStart(4, "0")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enviado em {formatDate(order.created_at, true)}</p>
          </div>
          <Badge variant={ORDER_STATUS_VARIANT[order.status]} className="px-3 py-1 text-sm">
            {ORDER_STATUS_LABEL[order.status]}
          </Badge>
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Condição de pagamento</dt>
            <dd className="font-semibold">{order.payment_condition_name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Entrega desejada</dt>
            <dd className="font-semibold">{order.delivery_date ? formatDate(order.delivery_date + "T12:00:00") : "A combinar"}</dd>
          </div>
          {order.external_id && (
            <div>
              <dt className="text-muted-foreground">Código CIGAM</dt>
              <dd className="font-semibold">{order.external_id}</dd>
            </div>
          )}
          {order.notes && (
            <div className="sm:col-span-3">
              <dt className="text-muted-foreground">Observações</dt>
              <dd className="whitespace-pre-wrap">{order.notes}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <p className="font-medium">{i.product_name}</p>
                    {i.sku && <p className="text-xs text-muted-foreground">{i.sku}</p>}
                  </TableCell>
                  <TableCell className="text-right">{formatQty(i.qty, i.unit)}</TableCell>
                  <TableCell className="text-right">{formatBRL(i.unit_price)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(i.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-6">
          <span className="text-sm text-muted-foreground">Total do pedido</span>
          <span className="text-2xl font-bold text-primary">{formatBRL(order.total)}</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t pt-6">
          <Button variant="outline" onClick={repeat}>
            <RotateCcw /> Repetir pedido
          </Button>
          {order.status === "pendente" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <XCircle /> Cancelar pedido
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar este pedido?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O pedido ainda não foi aprovado e será cancelado. Você poderá refazê-lo a qualquer momento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancel.mutate()}>Confirmar cancelamento</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}
