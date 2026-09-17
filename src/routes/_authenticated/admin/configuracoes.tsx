import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploadField } from "@/components/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Administração Trapiche Pescados" },
      { name: "description", content: "Ajuste contatos, pedido mínimo, aviso do portal e aprovação de cadastros." },
    ],
  }),
  component: AdminSettingsPage,
});

type Settings = Tables<"app_settings">;

function AdminSettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);

  const q = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  useEffect(() => {
    if (q.data && !form) setForm(q.data);
  }, [q.data, form]);

  const save = useMutation({
    mutationFn: async (s: Settings) => {
      const { error } = await supabase
        .from("app_settings")
        .update({
          company_name: s.company_name,
          whatsapp: s.whatsapp,
          contact_email: s.contact_email,
          min_order_atacado: Number(String(s.min_order_atacado).replace(",", ".")) || 0,
          min_order_varejo: Number(String(s.min_order_varejo).replace(",", ".")) || 0,
          notice: s.notice,
          require_approval: s.require_approval,
          logo_url: s.logo_url,
          hero_image_url: s.hero_image_url,
          hero_title: s.hero_title,
          hero_subtitle: s.hero_subtitle,
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas.");
      qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: () => toast.error("Não foi possível salvar as configurações."),
  });

  if (q.isLoading || !form) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground">Dados de contato, regras de pedido e aviso do portal.</p>
      </div>

      <form
        className="grid gap-4 rounded-2xl border bg-card p-5 shadow-soft sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form);
        }}
      >
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="s-company">Nome da empresa</Label>
          <Input
            id="s-company"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-wa">WhatsApp</Label>
          <Input id="s-wa" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-mail">E-mail de contato</Label>
          <Input
            id="s-mail"
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-min-a">Pedido mínimo atacado (R$)</Label>
          <Input
            id="s-min-a"
            inputMode="decimal"
            value={String(form.min_order_atacado)}
            onChange={(e) => setForm({ ...form, min_order_atacado: e.target.value as unknown as number })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-min-v">Pedido mínimo varejo (R$)</Label>
          <Input
            id="s-min-v"
            inputMode="decimal"
            value={String(form.min_order_varejo)}
            onChange={(e) => setForm({ ...form, min_order_varejo: e.target.value as unknown as number })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="s-notice">Aviso exibido no catálogo</Label>
          <Textarea
            id="s-notice"
            value={form.notice}
            placeholder="Ex.: Pedidos até 16h são entregues no dia seguinte."
            onChange={(e) => setForm({ ...form, notice: e.target.value })}
          />
        </div>
        <div className="flex items-start gap-3 sm:col-span-2">
          <Switch
            id="s-approval"
            checked={form.require_approval}
            onCheckedChange={(v) => setForm({ ...form, require_approval: v })}
          />
          <div>
            <Label htmlFor="s-approval">Exigir aprovação do cadastro antes do primeiro pedido</Label>
            <p className="text-xs text-muted-foreground">
              Desligado, qualquer cliente cadastrado consegue enviar pedidos imediatamente.
            </p>
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border bg-secondary/40 p-4 sm:col-span-2">
          <div>
            <h3 className="font-semibold">Imagens e textos do site</h3>
            <p className="text-sm text-muted-foreground">
              Troque a logo e a foto principal da página inicial sem precisar de programação.
            </p>
          </div>
          <ImageUploadField
            label="Logo"
            folder="site"
            value={form.logo_url}
            onChange={(url) => setForm({ ...form, logo_url: url })}
            hint="Aparece no topo do site e no portal do cliente."
          />
          <ImageUploadField
            label="Foto principal da página inicial"
            folder="site"
            value={form.hero_image_url}
            onChange={(url) => setForm({ ...form, hero_image_url: url })}
          />
          <div className="space-y-2">
            <Label htmlFor="s-hero-title">Título da página inicial</Label>
            <Input
              id="s-hero-title"
              value={form.hero_title}
              placeholder="Peça seus pescados online, sem ligação, sem papelada."
              onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-hero-sub">Texto da página inicial</Label>
            <Textarea
              id="s-hero-sub"
              value={form.hero_subtitle}
              placeholder="Restaurantes, mercados e revendedores: montem seus pedidos direto no portal."
              onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" disabled={save.isPending}>
            Salvar configurações
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-dashed bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-ocean" />
          <h3 className="font-semibold">Integração CIGAM (em breve)</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Enquanto a integração automática não está disponível, os pedidos podem ser exportados em planilha na aba
          Pedidos e importados no CIGAM. Quando a API estiver liberada, ativamos o envio automático aqui.
        </p>
      </div>
    </div>
  );
}
