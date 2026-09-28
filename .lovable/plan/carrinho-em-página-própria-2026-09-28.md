# Carrinho em página própria

## Objetivo
Deixar o catálogo mais limpo e transformar o carrinho em uma página dedicada de revisão e finalização, semelhante ao fluxo de grandes lojas online.

## Alterações
- Remover o painel lateral/fixo de pedido do catálogo.
- Manter no catálogo apenas um acesso claro ao carrinho, com quantidade de itens e subtotal.
- Criar a página **Meu carrinho**, acessível em `/carrinho`, com:
  - itens escolhidos, quantidades, especificações e remoção;
  - condição de pagamento;
  - entrega no endereço cadastrado, outro endereço ou retirada na loja;
  - cálculo do frete, observações, subtotal e total;
  - revisão final antes do envio;
  - confirmação por WhatsApp após o pedido.
- Preservar o carrinho e as especificações ao navegar entre catálogo e carrinho.
- Adaptar a página para celular e computador: conteúdo em uma coluna no celular e resumo lateral estável no computador.
- Incluir “Meu carrinho” no menu para acesso rápido.

## Validação
- Conferir catálogo e carrinho em celular e computador.
- Testar adicionar, alterar quantidade, remover, voltar ao catálogo e manter os itens.
- Validar endereço, pagamento e revisão sem enviar um pedido real.
- Confirmar compilação sem erros e metadados próprios da nova página.

## Detalhes técnicos
- O carrinho continuará salvo localmente no navegador do cliente.
- A criação do pedido continuará usando a validação protegida existente no servidor; a mudança será somente na apresentação e navegação.
