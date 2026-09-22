import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardList,
  CreditCard,
  Fish,
  PackageCheck,
  Phone,
  ShieldCheck,
  Snowflake,
  Truck,
  Waves,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import heroImg from "@/assets/hero-seafood.jpg";
import { getPublicSettings } from "@/lib/settings.functions";
import { BrandLogo } from "@/components/BrandLogo";
import { PromoBanners } from "@/components/PromoBanners";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { WaveLoader } from "@/components/WaveLoader";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trapiche Pescados — Portal de Pedidos para Atacado e Varejo" },
      {
        name: "description",
        content:
          "Faça seus pedidos de pescados e frutos do mar online. Catálogo completo, condições de pagamento flexíveis e acompanhamento de pedidos. Trapiche Pescados, Curitiba - PR.",
      },
      { property: "og:title", content: "Trapiche Pescados — Portal de Pedidos" },
      {
        property: "og:description",
        content:
          "Pedidos online de pescados e frutos do mar para atacado e varejo. Cadastre-se e faça seu primeiro pedido.",
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: Fish,
    title: "Catálogo completo",
    text: "Peixes, camarões, lulas, polvo, bacalhau e muito mais — sempre com preços do seu perfil: atacado ou varejo.",
  },
  {
    icon: CreditCard,
    title: "Condições de pagamento",
    text: "PIX à vista, cartão, boletos faturados para atacado e pagamento na entrega. Você escolhe no pedido.",
  },
  {
    icon: ClipboardList,
    title: "Acompanhamento em tempo real",
    text: "Veja o status de cada pedido: enviado, aprovado, faturado. Repita pedidos anteriores com um clique.",
  },
  {
    icon: ShieldCheck,
    title: "Cadastro aprovado pela equipe",
    text: "Seus dados comerciais ficam protegidos e o faturamento segue as regras da Trapiche, sem retrabalho.",
  },
];

const steps = [
  { n: "1", title: "Crie seu cadastro", text: "Informe os dados da sua empresa e escolha atacado ou varejo." },
  { n: "2", title: "Monte o pedido", text: "Escolha os produtos no catálogo e a condição de pagamento." },
  { n: "3", title: "Nós faturamos", text: "A equipe Trapiche aprova, fatura e agenda a entrega com você." },
];

function LandingPage() {
  const fetchSettings = useServerFn(getPublicSettings);
  const settingsQ = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => fetchSettings(),
  });
  const s = settingsQ.data;

  // Pequeno atraso mínimo para a animação de ondas não "piscar" na entrada.
  const [minDelayDone, setMinDelayDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 900);
    return () => clearTimeout(t);
  }, []);
  const showSplash = settingsQ.isLoading || !minDelayDone;

  const heroSrc = s?.hero_image_url || heroImg;
  const heroTitle = s?.hero_title?.trim();
  const heroSubtitle = s?.hero_subtitle?.trim();

  return (
    <div className="min-h-screen bg-background">
      {showSplash && <WaveLoader label="Preparando o portal..." />}
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild variant="aqua">
              <Link to="/auth" search={{ tab: "cadastro" }}>
                Criar cadastro
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-ocean">
        <div className="bg-waves absolute inset-0 opacity-20" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-aqua/20 px-3 py-1 text-xs font-semibold text-aqua">
              <Waves className="h-3.5 w-3.5" /> Portal de pedidos Trapiche Pescados
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-primary-foreground md:text-5xl">
              {heroTitle ? (
                heroTitle
              ) : (
                <>
                  Peça seus pescados online, <span className="text-aqua">sem ligação, sem papelada.</span>
                </>
              )}
            </h1>
            <p className="mt-4 max-w-lg text-lg text-primary-foreground/80">
              {heroSubtitle ||
                "Restaurantes, mercados e revendedores: montem seus pedidos direto no portal, escolham a condição de pagamento e acompanhem até o faturamento."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="aqua">
                <Link to="/auth" search={{ tab: "cadastro" }}>
                  Fazer meu primeiro pedido <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="heroOutline">
                <Link to="/auth">Já tenho cadastro</Link>
              </Button>
            </div>
          </div>
          <div className="animate-fade-up relative">
            <img
              src={heroSrc}
              alt="Seleção de pescados e frutos do mar frescos sobre gelo"
              className="shadow-lift w-full rounded-3xl object-cover"
              loading="eager"
            />
            <div className="absolute -bottom-4 -left-4 hidden items-center gap-3 rounded-2xl bg-card p-4 shadow-lift md:flex">
              <Snowflake className="h-8 w-8 text-aqua" />
              <div>
                <p className="text-sm font-bold">Cadeia do frio garantida</p>
                <p className="text-xs text-muted-foreground">Do mar até a sua cozinha</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Novidades / Ofertas */}
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <PromoBanners />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <h2 className="text-center font-display text-3xl font-bold">Tudo que o seu pedido precisa</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
          Um portal feito para facilitar a vida de quem compra pescado em quantidade.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-soft transition-transform hover:-translate-y-1">
              <div className="mb-4 inline-flex rounded-xl bg-aqua/15 p-3 text-ocean">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center font-display text-3xl font-bold">Como funciona</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl bg-card p-6 shadow-soft">
                <span className="font-display text-5xl font-bold text-aqua/40">{s.n}</span>
                <h3 className="mt-2 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg" variant="aqua">
              <Link to="/auth" search={{ tab: "cadastro" }}>
                Começar agora <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Wholesale strip */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-8 rounded-3xl bg-gradient-ocean p-8 md:grid-cols-[1fr_auto] md:p-12">
          <div>
            <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl">
              Compra em atacado? Temos condições especiais.
            </h2>
            <p className="mt-2 max-w-xl text-primary-foreground/80">
              Boletos faturados, pedido mínimo diferenciado e tabela exclusiva para restaurantes e revendedores.
              Cadastre-se como atacado e aguarde a aprovação da nossa equipe.
            </p>
          </div>
          <div className="flex items-center gap-3 text-aqua">
            <Truck className="h-10 w-10" />
            <PackageCheck className="h-10 w-10" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 md:flex-row md:justify-between">
          <BrandLogo size="sm" />
          <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground md:items-end">
            <a href="tel:+554130147701" className="inline-flex items-center gap-2 hover:text-foreground">
              <Phone className="h-4 w-4" /> (41) 3014-7701
            </a>
            <p>Alameda Princesa Izabel, 1710 — Bigorrilho, Curitiba — PR</p>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 pb-6">
          <Link to="/politica-de-privacidade" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Política de Privacidade
          </Link>
          <Link to="/termos-de-uso" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Termos de Uso
          </Link>
          <Link to="/politica-de-trocas" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Trocas e Devoluções
          </Link>
        </div>
        <p className="border-t py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Trapiche Pescados. Todos os direitos reservados.
        </p>
      </footer>

      <WhatsAppButton />
    </div>
  );
}
