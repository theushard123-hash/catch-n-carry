import { CreditCard, Headset, ShieldCheck } from "lucide-react";

const benefits = [
  { icon: ShieldCheck, title: "Frete seguro", detail: "Cuidado em cada entrega" },
  { icon: CreditCard, title: "Pagamento facilitado", detail: "Escolha sua condição" },
  { icon: Headset, title: "Suporte Trapiche", detail: "Atendimento pelo WhatsApp" },
];

export function StoreBenefits() {
  return <section aria-label="Vantagens Trapiche" className="border-b bg-secondary/60">
    <div className="mx-auto grid max-w-6xl grid-cols-3 px-4 py-4 sm:py-5">
      {benefits.map(({ icon: Icon, title, detail }) => <div key={title} className="flex min-w-0 flex-col items-center gap-2 px-2 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left">
        <Icon className="h-5 w-5 shrink-0 text-ocean sm:h-6 sm:w-6" />
        <div className="min-w-0"><p className="text-xs font-bold sm:text-sm">{title}</p><p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{detail}</p></div>
      </div>)}
    </div>
  </section>;
}