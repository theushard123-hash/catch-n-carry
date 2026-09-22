import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { signUpCustomer } from "@/lib/auth.functions";
import { WaveLoader } from "@/components/WaveLoader";
import { Fish, Store } from "lucide-react";
import {
  digits,
  formatCep,
  formatCnpj,
  formatCpf,
  isValidCep,
  isValidCnpj,
  isValidCpf,
  lookupCep,
} from "@/lib/br-validation";


const searchSchema = z.object({
  redirect: z.string().optional(),
  tab: z.enum(["entrar", "cadastro"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — Portal Trapiche Pescados" },
      {
        name: "description",
        content: "Acesse o portal de pedidos da Trapiche Pescados para atacado e varejo.",
      },
      { property: "og:title", content: "Entrar — Portal Trapiche Pescados" },
      { property: "og:description", content: "Acesse o portal de pedidos da Trapiche Pescados." },
    ],
  }),
  component: AuthPage,
});

function safeRedirect(r?: string) {
  if (r && r.startsWith("/") && !r.startsWith("//")) return r;
  return "/catalogo";
}

function AuthPage() {
  const { redirect, tab } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string[]>(["Carregando..."]);
  const busyStarted = useRef(0);
  const [forgot, setForgot] = useState(false);

  // Garante que a animação de ondas apareça por pelo menos ~1s (sem "piscar").
  function startBusy(label: string | string[]) {
    busyStarted.current = Date.now();
    setBusyLabel(Array.isArray(label) ? label : [label]);
    setBusy(true);
  }
  async function stopBusy() {
    const elapsed = Date.now() - busyStarted.current;
    if (elapsed < 1000) await new Promise((r) => setTimeout(r, 1000 - elapsed));
    setBusy(false);
  }
  const [customerType, setCustomerType] = useState("atacado");
  const signUp = useServerFn(signUpCustomer);

  const isAtacado = customerType === "atacado";
  const [document, setDocument] = useState("");
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [cep, setCep] = useState("");
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepInfo, setCepInfo] = useState<string | null>(null);
  const [cepChecking, setCepChecking] = useState(false);
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const passwordMismatch = confirmTouched && confirmPassword.length > 0 && confirmPassword !== signupPassword;

  const docLabel = isAtacado ? "CNPJ" : "CPF";

  function validateDocument(value = document) {
    const d = digits(value);
    if (!d) {
      setDocumentError(`Informe o ${docLabel}.`);
      return false;
    }
    const ok = isAtacado ? isValidCnpj(d) : isValidCpf(d);
    setDocumentError(ok ? null : `${docLabel} inválido.`);
    return ok;
  }

  function handleDocumentChange(value: string) {
    const masked = isAtacado ? formatCnpj(value) : formatCpf(value);
    setDocument(masked);
    const d = digits(masked);
    const full = isAtacado ? 14 : 11;
    if (d.length === 0) setDocumentError(null);
    else if (d.length === full) setDocumentError((isAtacado ? isValidCnpj(d) : isValidCpf(d)) ? null : `${docLabel} inválido.`);
    else setDocumentError(null);
  }

  async function checkCep(value = cep) {
    const masked = formatCep(value);
    if (!isValidCep(masked)) {
      setCepInfo(null);
      setCepError(digits(masked).length ? "CEP deve ter 8 dígitos." : "Informe o CEP.");
      return false;
    }
    setCepChecking(true);
    const found = await lookupCep(masked);
    setCepChecking(false);
    if (!found) {
      setCepInfo(null);
      setCepError("CEP não encontrado.");
      return false;
    }
    setCepError(null);
    setCepInfo(
      [found.address, found.neighborhood, found.city && `${found.city} - ${found.state}`]
        .filter(Boolean)
        .join(", "),
    );
    return true;
  }

  function handleCepChange(value: string) {
    const masked = formatCep(value);
    setCep(masked);
    setCepInfo(null);
    setCepError(null);
    if (digits(masked).length === 8) void checkCep(masked);
  }

  // Trocar o tipo de cliente muda a regra do documento (CNPJ x CPF).
  useEffect(() => {
    setDocument("");
    setDocumentError(null);
  }, [customerType]);

  useEffect(() => {
    if (!loading && user) navigate({ to: safeRedirect(redirect), replace: true });
  }, [user, loading, redirect, navigate]);


  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startBusy("Entrando no portal...");
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    await stopBusy();
    if (error) {
      toast.error(
        error.message.includes("Invalid login") ? "E-mail ou senha incorretos." : error.message,
      );
      return;
    }
    navigate({ to: safeRedirect(redirect), replace: true });
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password.length < 12) {
      toast.error("A senha deve ter pelo menos 12 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setConfirmTouched(true);
      toast.error("As senhas não conferem. Digite novamente.");
      return;
    }
    const addressNumber = String(fd.get("address_number") ?? "").trim();
    if (!addressNumber) {
      toast.error("Informe o número do endereço.");
      return;
    }
    const stateRegistration = String(fd.get("state_registration") ?? "").trim();
    if (customerType === "atacado" && !stateRegistration) {
      toast.error("Informe a inscrição estadual para cadastro de atacado.");
      return;
    }
    if (!validateDocument()) {
      toast.error(`${docLabel} inválido.`);
      return;
    }
    if (!(await checkCep())) {
      toast.error("Verifique o CEP informado.");
      return;
    }
    startBusy("Criando seu cadastro...");
    try {
      const result = await signUp({
        data: {
          email: String(fd.get("email")),
          password,
          redirectTo: window.location.origin,
          data: {
            full_name: String(fd.get("full_name")),
            company_name: String(fd.get("company_name") ?? ""),
            document,
            phone: String(fd.get("phone")),
            customer_type: customerType === "atacado" ? "atacado" : "varejo",
            state_registration: stateRegistration,
            zip: cep,
            address_number: addressNumber,
            complement: String(fd.get("complement") ?? ""),
          },
        },
      });

      if (result.needsEmailConfirmation) {
        toast.success("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: String(fd.get("email")),
          password,
        });
        if (error) {
          toast.success("Cadastro realizado! Faça login para continuar.");
        } else {
          navigate({ to: "/catalogo", replace: true });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível criar a conta.";
      toast.error(
        message.includes("already registered")
          ? "Este e-mail já possui cadastro. Faça login."
          : message,
      );
    } finally {
      await stopBusy();
    }
  }

  async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startBusy("Enviando link de recuperação...");
    const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email")), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    await stopBusy();
    if (error) toast.error(error.message);
    else {
      toast.success("Enviamos um link de redefinição para seu e-mail.");
      setForgot(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: safeRedirect(redirect), replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {busy && <WaveLoader label={busyLabel} />}
      <aside className="relative hidden overflow-hidden bg-gradient-ocean p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/">
          <BrandLogo light size="md" />
        </Link>
        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight text-balance">
            Do mar para a sua mesa, agora com pedidos online.
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/75">
            Restaurantes, mercados e clientes do varejo fazem seus pedidos com poucos cliques e
            acompanham tudo em um só lugar.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/80">
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-aqua" /> Preços por tipo de cliente
            </li>
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-aqua" /> Condições de pagamento personalizadas
            </li>
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-aqua" /> Histórico completo de pedidos
            </li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/50">© Trapiche Pescados · Curitiba - PR</p>
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-aqua/20 blur-3xl" />
      </aside>

      <div className="flex items-center justify-center bg-background bg-waves p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex lg:hidden">
            <BrandLogo size="sm" />
          </Link>

          {forgot ? (
            <form method="post" onSubmit={handleForgot} className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold">Recuperar senha</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Informe seu e-mail para receber o link de redefinição.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-email">E-mail</Label>
                <Input id="f-email" name="email" type="email" required autoComplete="email" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Enviar link
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setForgot(false)}>
                Voltar
              </Button>
            </form>
          ) : (
            <Tabs defaultValue={tab ?? "entrar"} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="cadastro">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="entrar" className="mt-6">
                <form method="post" onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold">Bem-vindo de volta</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Entre para fazer e acompanhar seus pedidos.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="l-email">E-mail</Label>
                    <Input id="l-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="l-password">Senha</Label>
                      <button
                        type="button"
                        onClick={() => setForgot(true)}
                        className="text-xs font-medium text-ocean hover:underline"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <Input
                      id="l-password"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={busy}>
                    Entrar
                  </Button>
                  <GoogleButton onClick={handleGoogle} />
                </form>
              </TabsContent>

              <TabsContent value="cadastro" className="mt-6">
                <form method="post" onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold">Criar cadastro</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Seu cadastro será analisado pela equipe Trapiche antes do primeiro pedido.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de cliente</Label>
                    <RadioGroup
                      name="customer_type"
                      value={customerType}
                      onValueChange={setCustomerType}
                      className="grid grid-cols-2 gap-3"
                    >
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-input bg-card p-3 text-sm has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-secondary">
                        <RadioGroupItem value="atacado" id="t-atacado" />
                        <span className="flex items-center gap-2 font-medium">
                          <Store className="h-4 w-4 text-ocean" /> Atacado
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-input bg-card p-3 text-sm has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-secondary">
                        <RadioGroupItem value="varejo" id="t-varejo" />
                        <span className="flex items-center gap-2 font-medium">
                          <Fish className="h-4 w-4 text-ocean" /> Varejo
                        </span>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="s-name">Seu nome</Label>
                      <Input id="s-name" name="full_name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-company">Empresa / Razão social</Label>
                      <Input id="s-company" name="company_name" placeholder="Opcional no varejo" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-doc">{docLabel}</Label>
                      <Input
                        id="s-doc"
                        name="document"
                        required
                        inputMode="numeric"
                        value={document}
                        onChange={(e) => handleDocumentChange(e.target.value)}
                        onBlur={() => validateDocument()}
                        placeholder={isAtacado ? "00.000.000/0000-00" : "000.000.000-00"}
                        aria-invalid={!!documentError}
                      />
                      {documentError && <p className="text-xs font-medium text-destructive">{documentError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-phone">Telefone / WhatsApp</Label>
                      <Input id="s-phone" name="phone" required inputMode="tel" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-cep">CEP</Label>
                      <Input
                        id="s-cep"
                        name="zip"
                        required
                        inputMode="numeric"
                        value={cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        onBlur={() => void checkCep()}
                        placeholder="00000-000"
                        aria-invalid={!!cepError}
                      />
                      {cepChecking && <p className="text-xs text-muted-foreground">Verificando CEP...</p>}
                      {cepError && <p className="text-xs font-medium text-destructive">{cepError}</p>}
                      {!cepError && cepInfo && <p className="text-xs text-muted-foreground">{cepInfo}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-number">Número</Label>
                      <Input
                        id="s-number"
                        name="address_number"
                        required
                        inputMode="numeric"
                        placeholder="Ex.: 1710"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-complement">Complemento (opcional)</Label>
                      <Input
                        id="s-complement"
                        name="complement"
                        placeholder="Sala, bloco, ponto de referência..."
                      />
                    </div>
                  </div>

                  {customerType === "atacado" && (
                    <div className="space-y-2">
                      <Label htmlFor="s-ie">Inscrição Estadual</Label>
                      <Input
                        id="s-ie"
                        name="state_registration"
                        required
                        inputMode="numeric"
                        placeholder="Obrigatória para atacado"
                      />
                      <p className="text-xs text-muted-foreground">
                        Necessária para emissão da nota fiscal de atacado.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="s-email">E-mail</Label>
                    <Input id="s-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-password">Senha</Label>
                    <Input
                      id="s-password"
                      name="password"
                      type="password"
                      required
                      minLength={12}
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Use no mínimo 12 caracteres.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-password-confirm">Confirmar senha</Label>
                    <Input
                      id="s-password-confirm"
                      name="password_confirm"
                      type="password"
                      required
                      minLength={12}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => setConfirmTouched(true)}
                      aria-invalid={passwordMismatch}
                    />
                    {passwordMismatch && (
                      <p className="text-xs font-medium text-destructive">As senhas não conferem.</p>
                    )}
                    {!passwordMismatch && confirmTouched && confirmPassword.length > 0 && confirmPassword === signupPassword && (
                      <p className="text-xs text-muted-foreground">Senhas conferem.</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={busy}>
                    Criar conta
                  </Button>
                  <GoogleButton onClick={handleGoogle} />
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <>
      <div className="relative py-1 text-center text-xs text-muted-foreground">
        <span className="relative z-10 bg-background px-2">ou</span>
        <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={onClick}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
          />
        </svg>
        Continuar com Google
      </Button>
    </>
  );
}
