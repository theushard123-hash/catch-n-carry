import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — Portal Trapiche Pescados" },
      { name: "description", content: "Defina uma nova senha para sua conta no portal Trapiche Pescados." },
      { property: "og:title", content: "Redefinir senha — Trapiche Pescados" },
      { property: "og:description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password.length < 12) {
      toast.error("A senha deve ter pelo menos 12 caracteres.");
      return;
    }
    if (password !== String(fd.get("confirm"))) {
      toast.error("As senhas não conferem.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Senha atualizada com sucesso!");
      navigate({ to: "/catalogo" });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-waves p-6">
      <ThemeToggle className="fixed right-4 top-4 border bg-background/80 shadow-soft backdrop-blur" />
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-soft">
        <BrandLogo size="sm" className="mb-6" />
        <h1 className="text-2xl font-bold">Nova senha</h1>
        {!ready ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Abra esta página pelo link enviado ao seu e-mail.
          </p>
        ) : (
          <form method="post" onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" name="password" type="password" required minLength={12} />
              <p className="text-xs text-muted-foreground">Use no mínimo 12 caracteres.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input id="confirm" name="confirm" type="password" required minLength={12} />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              Salvar nova senha
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
