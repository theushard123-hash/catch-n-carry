# Seletor de tema claro e escuro

## O que será feito
- Criar um controle reutilizável com opções **Claro**, **Escuro** e **Automático**.
- Exibir o controle nos cabeçalhos da página inicial, área do cliente, painel administrativo e páginas institucionais.
- Salvar a escolha no navegador e usar a preferência do aparelho quando estiver em modo automático.
- Aplicar o tema antes da página aparecer para evitar troca brusca de cores.
- Completar a paleta escura dos elementos da marca e revisar contraste de cartões, textos, formulários e menus.

## Detalhes técnicos
- O tema será aplicado pela classe `dark` no documento, aproveitando as variáveis de cores já existentes.
- A configuração será isolada em um provedor e um botão reutilizável, sem alterar regras de pedidos, cadastro ou administração.
- Ao final, serão verificados os modos claro e escuro em telas grandes e pequenas.
