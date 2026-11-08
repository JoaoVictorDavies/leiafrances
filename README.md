# Leia Francês

## Professor com IA (fundação experimental)

A rota `/professor` oferece login ou cadastro por e-mail, Google ou Facebook no Supabase, escolha de objetivo, nivelamento gerado por IA, plano de cinco fases e exercícios adaptativos. A jornada é independente do catálogo público, que continua acessível sem conta. Cada resposta é corrigida pelo gabarito salvo no servidor; a IA recebe o último resultado e um resumo limitado do estado, não um histórico de chat. A fase só pode avançar após um acerto e no máximo uma por vez. O nível CEFR é uma estimativa, e o conteúdo gerado pode conter erros.

Esta versão mantém uma jornada por conta: ao escolher e iniciar outro objetivo, a anterior é substituída. Não há conclusão automática da quinta fase, recuperação de senha na interface ou geração offline. A confirmação de e-mail depende das configurações do Supabase Auth. Um aviso solicita concordância antes de enviar o objetivo, as respostas e o resumo de aprendizado à OpenAI; a concordância é solicitada novamente após recarregar a página.

### Configuração e implantação

1. Faça backup e aplique, no projeto Supabase correto, a migração aditiva [`202611080001_teacher_journey.sql`](supabase/migrations/202611080001_teacher_journey.sql). Ela não modifica o catálogo existente. As tabelas da jornada têm RLS ativa, sem acesso direto dos clientes; apenas o servidor usa a chave privilegiada. As funções de limite de uso são restritas ao papel `service_role`.
2. Configure as variáveis no ambiente de execução e build:
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`: endereço e chave pública do projeto.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave privilegiada, **somente no servidor**, nunca com prefixo `NEXT_PUBLIC_`.
   - `OPENAI_API_KEY`: chave privada, **somente no servidor**.
   - `OPENAI_MODEL`: opcional; padrão `gpt-4o-mini`, compatível com Chat Completions e JSON mode. Confirme acesso ao modelo e custos antes de ativar.
3. Configure Auth, URLs de redirecionamento e entrega de e-mail no Supabase. Para Google e Facebook, habilite os provedores e permita a URL `https://SEU-DOMINIO/professor` em Auth → URL Configuration → Redirect URLs; configure também a URL de callback do Supabase nos respectivos provedores. Cada domínio de preview ou local precisa estar autorizado separadamente. Depois execute `npm test` e `npm run build`, publique e teste login social com cada provedor, duas contas e uma jornada completa. Em produção, configure limites de gasto e monitore erros e uso da OpenAI.

O limite inicial é de 20 tentativas de geração por usuário e 200 no total por dia UTC, com intervalo de cinco segundos e uma geração por vez por conta. Tentativas que falham também contam; a jornada só é atualizada depois de resposta válida e persistência bem-sucedida. Os limites de requisições não substituem limites financeiros no provedor. A API autentica cada requisição e procura o estado pelo ID verificado; o número da revisão evita sobrescritas silenciosas. Chaves e gabaritos nunca são retornados antes da resposta.

O service worker anterior armazenava respostas do Supabase sem separação de contas. A nova versão apaga os caches antigos do app e não armazena respostas do Supabase nem da API. Por segurança, a jornada espera a atualização do service worker antes de inicializar a autenticação. **A leitura offline anterior foi desativada**; não há garantia de acesso offline até uma futura implementação com armazenamento privado e sincronização adequados.

Em caso de falha, consulte os logs do servidor sem registrar tokens ou conteúdo pessoal. Para desativar a funcionalidade, remova o acesso à rota e publique essa alteração; não apague as tabelas sem avaliar retenção e backup.

### Erro 429 da OpenAI

Nos logs da Vercel, procure `Falha do provedor de IA` e o campo `code`. A aplicação registra somente status, código reconhecido e ID da requisição; não registra o corpo da resposta nem a chave. `rate_limit_exceeded` indica limitação temporária de requisições/tokens. `credit_balance_exhausted` indica saldo de créditos esgotado. `project_spend_limit_exceeded`, `organization_spend_limit_exceeded`, `organization_usage_limit_exceeded` ou `insufficient_quota` exigem verificar cobrança ou limites da organização/projeto OpenAI associado à chave usada em produção. `unknown` significa que não foi possível identificar a causa a partir da resposta e não permite afirmar que seja falta de créditos.

Verifique [cobrança da API](https://platform.openai.com/settings/organization/billing/overview) e [limites de uso](https://platform.openai.com/settings/organization/limits) no projeto/organização corretos; a cobrança da API é separada do ChatGPT. Para erros de quota/saldo, repetir não resolve: ajuste o limite ou a cobrança antes de testar novamente. Configure limites financeiros apropriados, sem compartilhar chaves no chat. Após alterar variáveis na Vercel, faça um novo deploy. Cada tentativa de geração, inclusive com falha, conta para os limites diários do aplicativo. Consulte também o [guia oficial de erros 429](https://help.openai.com/en/articles/5955604-troubleshooting-api-rate-limits-and-429-errors).

**Leia Francês** é um aplicativo web/PWA aberto para prática de leitura em francês.

Acesse em produção: https://leiafrances.vercel.app/

O projeto foi desenvolvido para oferecer uma experiência simples, leve e acessível para quem quer ler textos em francês com frequência. A aplicação reúne conteúdos em domínio público, organizados por categorias, com uma interface adaptada para celular, tablet e desktop.

O aplicativo funciona diretamente pelo navegador e também pode ser instalado como app no dispositivo.

---

## Objetivo

O objetivo do Leia Francês é reduzir a fricção no estudo de leitura em francês.

A proposta é simples:

```txt
abrir o app → escolher uma categoria → ler em francês → tocar no texto para ver a tradução
```

O projeto foi criado para apoiar o aprendizado por exposição frequente ao idioma, sem exigir cadastro, instalação obrigatória ou fluxo complexo.

A aplicação funciona como uma ferramenta direta para leitura, contato com vocabulário e prática gradual do francês.

---

## Funcionalidades

O Leia Francês possui:

* acesso aberto, sem necessidade de login;
* leitura de textos em francês;
* conteúdos em domínio público;
* categorias de leitura;
* interação direta com frases e trechos;
* exibição de tradução em português ao tocar no texto;
* modo claro e modo escuro;
* layout responsivo;
* adaptação para celular, tablet e desktop;
* suporte a uso em tela cheia;
* funcionamento como PWA;
* página própria de instalação;
* orientação de instalação para Android e iPhone;
* ícones próprios do aplicativo;
* deploy público na Vercel;
* Supabase como fonte única de verdade para os dados.

---

## Categorias de conteúdo

O aplicativo organiza os textos em diferentes categorias para ampliar o contato do usuário com registros variados do francês.

Entre as categorias disponíveis estão:

* filósofos;
* frases;
* gírias;
* história;
* moderno;
* piadas;
* poemas;
* religião.

A intenção é permitir que o usuário pratique leitura com diferentes estilos de linguagem, desde frases curtas até textos mais reflexivos ou literários.

---

## Interação com os textos

A leitura no Leia Francês não é apenas estática.

O usuário pode tocar em frases ou trechos em francês para visualizar a tradução em português.

Esse recurso foi pensado para manter o usuário dentro do fluxo de leitura, evitando a necessidade de alternar constantemente entre o aplicativo e um tradutor externo.

A proposta é preservar a experiência de leitura e, ao mesmo tempo, oferecer apoio imediato quando necessário.

---

## PWA e instalação

O Leia Francês foi desenvolvido para funcionar também como aplicativo instalável.

A aplicação possui uma área específica de instalação, com orientação conforme o dispositivo utilizado.

O fluxo considera diferenças entre Android e iPhone, conduzindo o usuário de forma mais clara no processo de instalação.

A ideia é permitir acesso rápido ao app, inclusive em tela cheia, aproximando a experiência de um aplicativo nativo sem exigir publicação em loja.

---

## Responsividade

O projeto foi pensado para funcionar bem em diferentes dispositivos e formatos de tela.

A interface se adapta a:

* celulares;
* tablets;
* notebooks;
* desktops;
* orientação vertical;
* orientação horizontal.

O foco visual é manter a leitura confortável, com baixa distração e boa adaptação ao tamanho da tela.

---

## Modos de visualização

O Leia Francês possui modo claro e modo escuro.

Essa escolha permite adaptar a leitura a diferentes contextos, como estudo noturno, ambientes iluminados ou uso prolongado no celular.

---

## Conteúdo em domínio público

Os textos utilizados no projeto são baseados em conteúdos de domínio público.

A curadoria busca organizar materiais úteis para leitura e exposição ao francês, respeitando o escopo do projeto como ferramenta aberta de estudo.

---

## Stack tecnológica

O projeto utiliza uma stack moderna para aplicação web/PWA:

* Next.js;
* React;
* TypeScript;
* JavaScript;
* CSS;
* Supabase;
* Vercel.

O Supabase atua como fonte única de verdade para os dados da aplicação, centralizando textos, traduções, categorias e metadados.

A Vercel hospeda a aplicação em produção.

---

## Decisões técnicas

### Next.js e React

A aplicação foi construída com Next.js e React para organizar a experiência web, as rotas, os componentes e a renderização das páginas.

Essa escolha permite manter uma base de código organizada e preparada para evolução.

### TypeScript

O TypeScript foi utilizado para facilitar manutenção e reduzir erros em atualizações futuras.

A tipagem ajuda especialmente na organização de textos, categorias, estados de interface, lógica de instalação e integração com dados externos.

### Supabase

O Supabase foi escolhido como fonte única de verdade.

Em vez de manter os dados espalhados diretamente pelo frontend, a aplicação centraliza conteúdos e metadados em uma base única, facilitando manutenção e evolução. ## Gestão de conteúdo via Supabase

O Leia Francês foi estruturado para ser alimentado diretamente pelo Supabase.

Os textos, traduções, categorias e metadados não precisam ser adicionados manualmente no frontend. Ao inserir um novo conteúdo no Supabase, seguindo a estrutura esperada pelo banco, o frontend passa a consumir e exibir esse conteúdo automaticamente.

Isso permite que novos textos sejam adicionados sem necessidade de alterar o código da aplicação ou fazer novo deploy apenas para atualizar conteúdo.

Fluxo conceitual:

```txt
insert no Supabase
      ↓
texto/categoria/metadados registrados
      ↓
frontend consome os dados
      ↓
conteúdo aparece no aplicativo
```

Essa decisão torna o projeto mais simples de manter e aproxima a aplicação de um modelo de curadoria dinâmica de conteúdo.

---

## Supabase como fonte única de verdade

O Supabase funciona como fonte única de verdade da aplicação.

A interface do Leia Francês depende dos dados cadastrados no Supabase para montar categorias, textos, traduções e conteúdos disponíveis ao usuário.

Essa abordagem evita que o conteúdo fique espalhado diretamente pelo frontend e permite organizar o projeto de forma mais escalável.

Em vez de alterar componentes sempre que um novo texto é adicionado, basta cadastrar o conteúdo no banco seguindo a estrutura esperada.

---

## Comportamento em caso de indisponibilidade do Supabase

O projeto foi pensado para não quebrar a interface caso o Supabase esteja temporariamente indisponível ou pausado.

Se a fonte de dados não responder, a aplicação continua acessível em produção, mas pode aparecer sem categorias e sem textos carregados.

Ou seja, o site permanece no ar, mas sem o conteúdo dinâmico vindo do banco.

Esse comportamento evita uma quebra completa da experiência e permite que a aplicação degrade de forma controlada:

```txt
Supabase disponível
      ↓
categorias e textos carregados normalmente

Supabase indisponível ou pausado
      ↓
site continua no ar
      ↓
conteúdo dinâmico não é exibido
      ↓
interface não quebra completamente
```

Esse desenho separa a disponibilidade da interface web da disponibilidade da camada de dados.


### PWA

A aplicação foi pensada para funcionar como app instalável, com ícones próprios, página de instalação e experiência adaptada para dispositivos móveis.

---

## Aprendizados do projeto

Este projeto envolveu prática em:

* desenvolvimento web com Next.js;
* uso de TypeScript em aplicação real;
* criação de PWA;
* experiência de instalação em dispositivos móveis;
* integração com Supabase;
* deploy com Vercel;
* responsividade;
* modo claro e escuro;
* organização de conteúdo em domínio público;
* criação de produto próprio voltado ao estudo de idioma.

---

## Possíveis evoluções

Melhorias possíveis para versões futuras:

* histórico de leitura;
* favoritos;
* marcação de textos lidos;
* filtros por nível de dificuldade;
* filtros por autor;
* busca por palavras;
* glossário;
* áudio;
* estatísticas de leitura;
* autenticação opcional;
* painel administrativo para cadastro de textos;
* cache/offline mais robusto;
* melhorias no fluxo de instalação em iOS;
* modo de revisão de vocabulário.

---

## Escopo

O Leia Francês não pretende substituir um curso completo de francês.

O objetivo é oferecer uma ferramenta simples para leitura, exposição ao idioma e consulta rápida de tradução.

O foco está em constância, acessibilidade e simplicidade.

---

## Status

Projeto publicado e funcional.

Acesse: https://leiafrances.vercel.app/

O app está em desenvolvimento contínuo e pode receber novos textos, categorias e melhorias de experiência ao longo do tempo.

---

## Autor

Desenvolvido por **João Victor Davies**.

Projeto criado para estudo de francês, prática de leitura e desenvolvimento de uma aplicação web/PWA com Next.js, TypeScript, Supabase e Vercel.
