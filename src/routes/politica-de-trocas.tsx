import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/politica-de-trocas")({
  head: () => ({
    meta: [
      { title: "Política de Trocas e Devoluções — Trapiche Pescados" },
      {
        name: "description",
        content:
          "Conheça a política de trocas, devoluções e direito de arrependimento da Trapiche Pescados, em conformidade com o Código de Defesa do Consumidor.",
      },
      { property: "og:title", content: "Política de Trocas e Devoluções — Trapiche Pescados" },
      {
        property: "og:description",
        content: "Trocas, devoluções e direito de arrependimento, conforme o CDC.",
      },
    ],
  }),
  component: ExchangePolicy,
});

const sections: LegalSection[] = [
  {
    heading: "1. Nossa política em resumo",
    paragraphs: [
      "Queremos que você receba sempre produtos frescos e na quantidade certa. Se algo sair diferente do combinado, fale com a gente o quanto antes: resolvemos trocas, reposições e reembolsos conforme o Código de Defesa do Consumidor (Lei nº 8.078/90).",
    ],
  },
  {
    heading: "2. Direito de arrependimento — 7 dias (art. 49 do CDC)",
    paragraphs: [
      "Para compras realizadas pelo portal, você pode desistir em até 7 (sete) dias corridos a contar do recebimento, comunicando nosso atendimento. Para que o arrependimento se aplique, o produto deve estar sem uso, na embalagem original e com conservação adequada.",
      "Atenção aos perecíveis: pescados e frutos do mar são produtos perecíveis refrigerados/congelados. Por segurança alimentar, o arrependimento sem justificativa não se aplica a produtos já abertos, descongelados ou armazenados fora das condições de conservação indicadas.",
      "Nos casos de arrependimento aceito, os valores pagos serão devolvidos, inclusive o frete quando houver.",
    ],
  },
  {
    heading: "3. Produtos com avaria, divergência ou vício",
    items: [
      "Conferência no recebimento: verifique o pedido na entrega (itens, pesos, temperatura e integridade das embalagens);",
      "Avaria ou divergência visível na entrega: comunique na hora ao entregador e registre a ocorrência pelo atendimento em até 24 horas;",
      "Vício de qualidade apurado após o recebimento (arts. 18 a 20 do CDC): comuniquese em até 7 dias corridos quando o vício for aparente; a Trapiche fará a análise e providenciará a substituição do produto ou o reembolso, conforme o caso;",
      "Produto em desacordo com o pedido (item, quantidade ou preço divergente do faturado): a correção é feita por complemento de entrega, crédito ou reembolso da diferença.",
    ],
  },
  {
    heading: "4. Cancelamento de pedidos",
    paragraphs: [
      "Pedidos com status \"pendente\" podem ser cancelados diretamente no portal, em \"Meus pedidos\". Pedidos já aprovados ou faturados devem ter o cancelamento solicitado ao atendimento; se os produtos ainda não tiverem sido expedidos, o cancelamento é gratuito.",
    ],
  },
  {
    heading: "5. Como solicitar troca, devolução ou reembolso",
    items: [
      "Fale com o atendimento pelo telefone/WhatsApp (41) 3014-7701 ou pelo canal indicado no portal;",
      "Tenha em mãos o número do pedido (disponível em \"Meus pedidos\") e, se possível, fotos do produto e da embalagem;",
      "Nosso prazo para analisar e responder sua solicitação é de até 5 dias úteis.",
    ],
  },
  {
    heading: "6. Formas e prazos de reembolso",
    items: [
      "PIX ou cartão: estorno pela mesma forma de pagamento, conforme o prazo da operadora (geralmente 1 a 2 faturas);",
      "Boleto faturado: reembolso por PIX em nome do titular do cadastro ou crédito na próxima fatura, conforme combinação com o atendimento;",
      "Pagamento na entrega: devolução do valor em dinheiro na entrega da reposição ou por PIX.",
    ],
  },
];

function ExchangePolicy() {
  return <LegalPage title="Política de Trocas e Devoluções" sections={sections} />;
}
