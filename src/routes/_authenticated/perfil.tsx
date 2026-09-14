import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CUSTOMER_TYPE_LABEL } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu cadastro — Portal Trapiche Pescados" },
      { name: "description", content: "Atualize os dados da sua empresa e endereço de entrega." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  if (!profile || !user) return <Skeleton className="h-96 rounded-2xl" />;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: String(fd.get("full_name")),
        company_name: String(fd.get("company_name")),
        document: String(fd.get("document")),
        phone: String(fd.get("phone")),
        address: String(fd.get("address")),
        city: String(fd.get("city")),
        state: String(fd.get("state")).toUpperCase().slice(0, 2),
        zip: String(fd.get("zip")),
      })
      .eq("user_id", user!.id);
    setBusy(false);
    if (error) toast.error("Não foi possível salvar.");
    else {
      toast.success("Cadastro atualizado!");
      await refreshProfile();
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("new_password"));
    if (password.length < 6) return toast.error("A nova senha deve ter ao menos 6 caracteres.");
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({
      password,
      current_password: String(fd.get("current_password")),
    } as Parameters<typeof supabase.auth.updateUser>[0]);
    setPwBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Senha alterada!");
      e.currentTarget.reset();
    }
  }

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meu cadastro</h1>
        <p className="text-sm text-muted-foreground">Mantenha seus dados atualizados para agilizar entregas e faturamento.</p>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs text-muted-foreground">E-mail</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Badge variant="aqua">{CUSTOMER_TYPE_LABEL[profile.customer_type]}</Badge>
            <Badge variant={profile.approved ? "success" : "warning"}>
              {profile.approved ? "Cadastro aprovado" : "Aguardando aprovação"}
            </Badge>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Tipo de cliente e aprovação são definidos pela equipe Trapiche. Fale conosco para alterar.
        </p>
      </div>

      <form onSubmit={save} className="rounded-2xl border bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">Dados da empresa</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Seu nome" name="full_name" defaultValue={profile.full_name} required />
          <Field label="Empresa / Razão social" name="company_name" defaultValue={profile.company_name} />
          <Field label="CNPJ ou CPF" name="document" defaultValue={profile.document} required />
          <Field label="Telefone / WhatsApp" name="phone" defaultValue={profile.phone} required />
          <div className="sm:col-span-2">
            <Field label="Endereço de entrega" name="address" defaultValue={profile.address} />
          </div>
          <Field label="Cidade" name="city" defaultValue={profile.city} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="UF" name="state" defaultValue={profile.state} maxLength={2} />
            <Field label="CEP" name="zip" defaultValue={profile.zip} />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>

      <form onSubmit={changePassword} className="rounded-2xl border bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">Alterar senha</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha atual" name="current_password" type="password" autoComplete="current-password" />
          <Field label="Nova senha" name="new_password" type="password" autoComplete="new-password" minLength={6} required />
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="outline" disabled={pwBusy}>
            Atualizar senha
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
