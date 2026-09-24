import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
};

export function LegalPage({
  title,
  sections,
  updated = "Setembro de 2026",
}: {
  title: string;
  sections: LegalSection[];
  updated?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="shrink-0">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última atualização: {updated}</p>

        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-display text-lg font-bold text-foreground">{s.heading}</h2>
              {s.paragraphs?.map((p, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {s.items && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {s.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border bg-card p-6 shadow-soft">
          <p className="text-sm font-semibold text-foreground">Fale com a Trapiche Pescados</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Telefone/WhatsApp: (41) 3014-7701 — Alameda Princesa Izabel, 1710 — Bigorrilho,
            Curitiba — PR
          </p>
        </div>
      </main>
    </div>
  );
}
