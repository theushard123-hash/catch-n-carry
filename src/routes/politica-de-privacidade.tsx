import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Trapiche Pescados" },
      {
        name: "description",
        content:
          "Saiba como a Trapiche Pescados coleta, usa e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD).",
      },
      { property: "og:title", content: "Política de Privacidade — Trapiche Pescados" },
      {
        property: "og:description",
        content: "Como coletamos, usamos e protegemos seus dados, conforme a LGPD.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

const sections: LegalSection[] = [
  {
    heading: "1. Quem somos e a quem esta política se aplica",
    paragraphs: [
      "A Trapiche Pescados, com endereço na Alameda Princesa Izabel, 1710 — Bigorrilho, Curitiba — PR, telefone (41) 3014-7701, é a controladora dos dados pessoais tratados por meio deste portal de pedidos.",
      "Esta política se aplica a todos os visitantes e clientes cadastrados no portal, pessoas físicas (varejo) e pessoas jurídicas e seus representantes (atacado).",
    ],
  },
  {
    heading: "2. Dados que coletamos",
    paragraphs: ["Coletamos apenas os dados necessários para viabilizar o cadastro e os pedidos:"],
    items: [
      "Dados de identificação: nome completo, nome da empresa (quando aplicável), telefone e e-mail;",
      "Dados fiscais: CPF (varejo) ou CNPJ e Inscrição Estadual (atacado);",
      "Dados de endereço: CEP, endereço, número, complemento, bairro, cidade e estado;",
      "Dados de pedidos: produtos, quantidades, condição de pagamento e histórico de compras;",
      "Dados de navegação: informações técnicas básicas de uso do portal, para segurança e melhoria do serviço.",
    ],
  },
  {
    heading: "3. Para que usamos seus dados e com qual base legal",
    items: [
      "Execução de contrato: criar e manter seu cadastro, receber pedidos, faturar, entregar e prestar atendimento;",
      "Obrigação legal: emitir documentos fiscais e atender exigências da legislação tributária e do Código de Defesa do Consumidor;",
      "Legítimo interesse: proteger o portal contra fraudes e usos indevidos, garantir a segurança da informação e melhorar a experiência de uso;",
      "Consentimento (quando aplicável): para comunicações comerciais que não decorram do próprio relacionamento de compra.",
    ],
  },
  {
    heading: "4. Com quem compartilhamos",
    paragraphs: [
      "Seus dados não são vendidos nem cedidos para fins de publicidade. Podemos compartilhar apenas o necessário com:",
    ],
    items: [
      "Transportadoras e operadores logísticos, para entrega dos pedidos;",
      "Meios de pagamento e instituições financeiras, para processamento de PIX, cartão e boletos;",
      "Órgãos públicos e autoridades fiscais, quando exigido por lei ou ordem judicial;",
      "Fornecedores de infraestrutura de tecnologia que operam o portal, sempre sob contrato de proteção de dados.",
    ],
  },
  {
    heading: "5. Por quanto tempo mantemos seus dados",
    paragraphs: [
      "Mantemos seus dados enquanto durar o relacionamento com a Trapiche Pescados e, após isso, somente pelo prazo necessário ao cumprimento de obrigações legais e fiscais (documentos de pedido e faturamento) ou à defesa em processos administrativos e judiciais.",
    ],
  },
  {
    heading: "6. Seus direitos (art. 18 da LGPD)",
    paragraphs: ["A qualquer momento e sem custo, você pode solicitar:"],
    items: [
      "Confirmação da existência de tratamento e acesso aos seus dados;",
      "Correção de dados incompletos, inexatos ou desatualizados;",
      "Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;",
      "Portabilidade dos dados a outro fornecedor;",
      "Eliminação dos dados tratados com base em consentimento;",
      "Informação sobre com quem compartilhamos seus dados;",
      "Revogação do consentimento, quando o tratamento se basear nele.",
    ],
  },
  {
    heading: "7. Segurança",
    paragraphs: [
      "Adotamos medidas técnicas e organizativas para proteger seus dados: acesso restrito por autenticação, criptografia na transmissão, controle de permissões por perfil e monitoramento do sistema. Nenhum sistema é absolutamente infalível; se identificarmos incidente relevante, comunicaremos os afetados e a autoridade competente, conforme a LGPD.",
    ],
  },
  {
    heading: "8. Cookies e dados de sessão",
    paragraphs: [
      "O portal utiliza apenas cookies e armazenamentos locais estritamente necessários para manter você autenticado e o carrinho funcionando. Não usamos cookies de publicidade ou rastreamento de terceiros.",
    ],
  },
  {
    heading: "9. Encarregado de dados (DPO) e contato",
    paragraphs: [
      "O encarregado de proteção de dados da Trapiche Pescados responde por pedidos de titulares e pela interação com a Autoridade Nacional de Proteção de Dados (ANPD).",
      "Para exercer seus direitos ou tirar dúvidas, fale pelo telefone/WhatsApp (41) 3014-7701 ou pelo canal de atendimento indicado no portal, informando o assunto \"Dados pessoais (LGPD)\".",
    ],
  },
];

function PrivacyPolicy() {
  return <LegalPage title="Política de Privacidade" sections={sections} />;
}
