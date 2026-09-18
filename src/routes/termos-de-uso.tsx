import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Trapiche Pescados" },
      {
        name: "description",
        content:
          "Condições de uso do portal de pedidos da Trapiche Pescados: cadastro, pedidos, preços, condições de pagamento e entregas.",
      },
      { property: "og:title", content: "Termos de Uso — Trapiche Pescados" },
      {
        property: "og:description",
        content: "Regras de uso do portal de pedidos da Trapiche Pescados.",
      },
    ],
  }),
  component: TermsOfUse,
});

const sections: LegalSection[] = [
  {
    heading: "1. Objeto e aceitação",
    paragraphs: [
      "Estes Termos regulam o uso do portal de pedidos online da Trapiche Pescados, disponível para clientes de atacado e varejo. Ao criar um cadastro ou enviar um pedido pelo portal, você declara ter lido e aceito estes Termos e a nossa Política de Privacidade.",
    ],
  },
  {
    heading: "2. Cadastro e aprovação",
    items: [
      "O cadastro exige informações verdadeiras, completas e atualizadas; é responsabilidade do cliente mantê-las corretas em \"Meu cadastro\";",
      "Clientes de atacado informam CNPJ e Inscrição Estadual e a ativação da conta fica condicionada à aprovação da equipe Trapiche;",
      "Clientes de varejo informam CPF e podem comprar após a conclusão do cadastro;",
      "O portal é de uso pessoal e intransferível: as credenciais de acesso não devem ser compartilhadas.",
    ],
  },
  {
    heading: "3. Produtos, preços e condições de pagamento",
    items: [
      "Preços e disponibilidade exibidos no catálogo podem ser alterados sem aviso prévio; o valor confirmado pela equipe no faturamento é o que prevalece;",
      "As condições de pagamento disponíveis (PIX, cartão, boleto faturado para atacado e pagamento na entrega) são exibidas no momento do pedido;",
      "Pedidos podem estar sujeitos a valor mínimo, conforme o perfil do cliente.",
    ],
  },
  {
    heading: "4. Pedidos",
    items: [
      "O pedido enviado pelo portal é uma proposta de compra, sujeita à confirmação de estoque, preço e condições pela equipe Trapiche;",
      "Você acompanha o status de cada pedido no portal: pendente, aprovado, faturado ou cancelado;",
      "Pedidos ainda pendentes podem ser cancelados diretamente no portal; após aprovação ou faturamento, o cancelamento deve ser solicitado ao atendimento;",
      "A função \"repetir pedido\" reaproveita os itens de um pedido anterior, mas os preços vigentes no dia são os que valerão.",
    ],
  },
  {
    heading: "5. Entrega",
    paragraphs: [
      "As entregas são combinadas com a equipe Trapiche no momento da aprovação, respeitando a logística de cadeia do frio. É responsabilidade do cliente informar endereço correto e garantir recebimento na data acordada.",
    ],
  },
  {
    heading: "6. Uso adequado do portal",
    items: [
      "É vedado usar o portal para fins ilícitos, tentar acessar contas de outros clientes ou interferir no funcionamento do sistema;",
      "A Trapiche pode suspender contas com dados falsos, uso indevido ou inadimplência reiterada, mediante aviso;",
      "O conteúdo do portal (marca, textos, imagens e layout) pertence à Trapiche Pescados e não pode ser copiado sem autorização.",
    ],
  },
  {
    heading: "7. Responsabilidade",
    paragraphs: [
      "A Trapiche Pescados se responsabiliza pela qualidade e conservação dos produtos entregues e pela correção das informações prestadas pela equipe. O cliente é responsável pela veracidade dos dados de cadastro e pelo uso adequado das credenciais de acesso.",
      "A Trapiche não se responsabiliza por indisponibilidades temporárias do portal causadas por manutenção ou falhas de infraestrutura de terceiros, comprometendo-se a restaurá-lo com brevidade.",
    ],
  },
  {
    heading: "8. Alterações e foro",
    paragraphs: [
      "Estes Termos podem ser atualizados a qualquer momento; a versão vigente está sempre publicada nesta página, com a data da última atualização. Alterações relevantes serão comunicadas pelos canais de atendimento.",
      "Fica eleito o foro da comarca de Curitiba — PR para dirimir eventuais controvérsias, sem prejuízo das normas de proteção do consumidor quanto ao foro de domicílio.",
    ],
  },
];

function TermsOfUse() {
  return <LegalPage title="Termos de Uso" sections={sections} />;
}
