# Template SaaS em Next.js

Um template pronto para produção em Next.js com autenticação (Clerk), banco de dados (PostgreSQL + Prisma), billing e sistema de créditos. Inclui UI com Radix + Tailwind, TypeScript e estrutura organizada para acelerar entregas.

> Template mantido pela **AI Coders Academy** — saiba mais em [`https://www.aicoders.academy/`](https://www.aicoders.academy/). Suporte: `suporte@aicoders.academy`.

## Início Rápido
```bash
# 1) Clonar e instalar
git clone <your-repo-url>
cd nextjs-saas-template
npm install

# 2) Variáveis de ambiente
cp .env.example .env
# Edite .env (Clerk, DATABASE_URL, chaves de AI se necessário)

# 3) Banco de dados (dev)
npm run db:push

# 4) Rodar o app
npm run dev
# Acesse http://localhost:3000
```

Para visão geral completa, leia: [.context/docs/README.md](.context/docs/README.md)

## Recursos
- 🔐 Autenticação: Clerk com rotas protegidas e middleware.
- 💾 Banco: PostgreSQL + Prisma ORM, modelos prontos (usuários, créditos, billing).
- 💳 Pagamentos: integração com Asaas para processamento de pagamentos e webhooks.
- 📝 Planos e Assinaturas: Gerenciamento manual de planos de assinatura diretamente pelo painel de administração.
- 🪙 Créditos: rastreamento/consumo de créditos por operação.
- 🤖 AI Chat: integração com Vercel AI SDK usando OpenRouter (streaming e seleção de modelos).
- 📎 Anexos no Chat: upload de arquivos para Vercel Blob e anexos clicáveis na conversa.
- 🎨 UI: Radix UI + Tailwind CSS.
- 🔒 Type-safe: TypeScript do frontend ao backend.

## Primeiros Passos
### Pré-requisitos
- Node.js 22+
- Banco PostgreSQL
- Conta no Clerk (obrigatório para autenticação)
- Conta no Asaas (obrigatório para processamento de pagamentos)

### Configuração
1. Clonar o repositório:
```bash
git clone <your-repo-url>
cd nextjs-saas-template
```
2. Instalar dependências:
```bash
npm install
```
3. Variáveis de ambiente:
```bash
cp .env.example .env
```
4. Editar `.env`:
   - Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (e `CLERK_WEBHOOK_SECRET` para sincronia de usuários)
   - Asaas: `ASAAS_API_KEY` (e `ASAAS_WEBHOOK_SECRET` para receber status de pagamentos)
   - Banco: `DATABASE_URL`
   - App: `NEXT_PUBLIC_APP_URL`
   - Analytics (opcional): `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_FACEBOOK_PIXEL_ID`
   - AI (opcional): `OPENROUTER_API_KEY`
   - Uploads (opcional): `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
5. Preparar o banco (dev):
```bash
npm run db:push
```
6. Iniciar o servidor de desenvolvimento:
```bash
npm run dev
```
Acesse http://localhost:3000.

## Documentação
- Índice central: [.context/docs/README.md](.context/docs/README.md)
- Arquitetura: [.context/docs/architecture.md](.context/docs/architecture.md)
- Backend & API: [.context/docs/backend.md](.context/docs/backend.md), [.context/docs/api.md](.context/docs/api.md)
- Frontend: [.context/docs/frontend.md](.context/docs/frontend.md), [.context/docs/components.md](.context/docs/components.md)
- Autenticação: [.context/docs/authentication.md](.context/docs/authentication.md)
- Banco de Dados (Prisma): [.context/docs/database.md](.context/docs/database.md)
- Créditos: [.context/docs/credits.md](.context/docs/credits.md)
- Diretrizes de desenvolvimento: [.context/docs/development-guidelines.md](.context/docs/development-guidelines.md)

Guias de agentes (prompts e checklists): [.context/agents/README.md](.context/agents/README.md)

## AI Chat (Vercel AI SDK)
- Rota de API: `POST /api/ai/chat` usa `ai` (Vercel AI SDK) com `streamText` para respostas via SSE.
- Provedor suportado: OpenRouter (compatível com OpenAI via `baseURL`).
- Página protegida: `/ai-chat` com seletor de provedor/modelo e chat com streaming.
- Geração de imagem (OpenRouter): alternar “Modo: Imagem” na página; envia para `POST /api/ai/image` e retorna imagens como data URLs.
 - Anexos: botão de clipe para enviar arquivo ao Vercel Blob e inserir links nos prompts.

Créditos
- Custos por feature e créditos por plano são configuráveis pelo admin:
  - Página: `/admin/settings` (abas: custos e planos/mensalidade de créditos)
  - API pública: `GET /api/credits/settings` para a UI
  - Custos padrão: `ai_text_chat` e `ai_image_generation` (sobrepostos por overrides)
- Enforced no backend via `validateCreditsForFeature`/`deductCreditsForFeature` e integrados na UI via `useCredits().getCost()`/`canPerformOperation()`.
- Reembolso automático:
  - Chat: se a chamada ao provedor falhar após o débito, o sistema reembolsa e retorna 502
  - Imagem: reembolsa em respostas inválidas/erros ou sem imagens

Configuração
- Defina `OPENROUTER_API_KEY` no `.env`.
- Abra `/ai-chat`, selecione provedor/modelo e envie mensagens.

Extensão
- Para adicionar modelos estáticos, edite `MODELS` em `src/app/(protected)/ai-chat/page.tsx` (modelos dinâmicos vêm da API do OpenRouter).

### Uploads de Arquivos (Storage Providers)
- API: `POST /api/upload` (multipart/form-data com campo `file`). Requer sessão (Clerk).
- Armazena em `uploads/<clerkUserId>/<timestamp>-<arquivo>` no provedor de storage configurado.
- Retorna `{ url, pathname, contentType, size, name }`.
- **Vercel Blob**: defina `BLOB_READ_WRITE_TOKEN` em `.env`. O token já inclui Store/Região; não é preciso configurar no código.
- **Replit App Storage**: defina `REPLIT_STORAGE_BUCKET_ID` em `.env`. A autenticação é automática no ambiente Replit.
- O sistema detecta automaticamente qual provedor usar baseado nas variáveis de ambiente configuradas.
- Base URL padrão (Vercel): `https://blob.vercel-storage.com` (ou domínio customizado se configurado no Vercel Blob).
- Detalhes: veja `.context/docs/uploads.md`.

## Estrutura do Projeto
```
src/
├── app/
│   ├── (public)/         # Rotas públicas (landing, auth)
│   ├── (protected)/      # Rotas protegidas (dashboard, billing)
│   └── api/              # API Routes (App Router)
├── components/
│   ├── ui/               # Componentes de UI reutilizáveis
│   └── credits/          # Componentes do sistema de créditos
├── hooks/                # Hooks React personalizados
└── lib/                  # Auth, DB, utilidades, domínios e queries
    └── queries/          # Camada de acesso a dados (DAL) para uso em Server Components
```

### Marca & Metadados
- Configuração central da marca: `src/lib/brand-config.ts`
  - Nome, descrição, palavras-chave, URL pública, logos/ícones e imagem OG
  - IDs de analytics/pixels (GTM, GA4, Meta Pixel)
- Usos:
  - Metadados globais em `src/app/layout.tsx`
  - Header/Footer públicos
  - Injeção de pixels via `AnalyticsPixels`
- Guia: veja `.context/docs/brand-config.md`

## Recursos Principais
### Autenticação
- Páginas de login/cadastro com Clerk
- Rotas protegidas via middleware (`src/middleware.ts`)

### Banco de Dados
- Prisma ORM + PostgreSQL
- Modelos para usuários e créditos

### Acesso a Dados (padrão atualizado)
- Nunca importe o Prisma Client (`@/lib/db`) em Client Components ou no browser.
- Server Components não devem executar queries diretamente via Prisma. Em vez disso, consuma funções da camada de queries em `src/lib/queries/*`.
  - Exemplo: `getActivePlansSorted()` em `src/lib/queries/plans.ts` usado por `src/app/(public)/page.tsx`.
- API Routes (`src/app/api/*`) e Server Actions podem usar Prisma diretamente ou reutilizar funções da camada de queries.

### Planos e Pagamentos (Asaas)
O sistema de planos e pagamentos foi desacoplado de provedores externos como o Clerk, permitindo gerenciamento manual e integração com o Asaas.

#### Gerenciamento de Planos
- **Painel de Administração**: Os planos de assinatura são criados e gerenciados manualmente no painel de administração em `/admin/settings/plans`.
- **Flexibilidade**: Crie quantos planos forem necessários, definindo nome, quantidade de créditos, preços (mensal/anual), e se o plano está ativo.
- **CTA Personalizado**: Cada plano pode ter uma chamada para ação (CTA) configurável, como um link de checkout do Asaas ou um "Fale Conosco".

#### Integração com Asaas
- **Processamento de Pagamentos**: O Asaas é utilizado como o provedor para processar os pagamentos das assinaturas.
- **Geração de Cobranças**: Ao selecionar um plano, o usuário é direcionado para o checkout, onde uma cobrança é gerada no Asaas.
- **Webhooks**: O sistema recebe webhooks do Asaas para confirmar pagamentos e atualizar o status da assinatura do usuário e liberar os créditos correspondentes. A rota do webhook está em `src/app/api/webhooks/asaas/route.ts`.

#### Créditos e Consumo
- **Fonte da Verdade no Servidor**: O saldo de créditos do usuário é sempre consultado do backend através de `GET /api/credits/me`. O hook `useCredits` no frontend gerencia o estado e a atualização automática.
- **Consumo Transacional**: O uso de features que consomem créditos (como chat de IA) é validado e debitado no backend de forma segura usando as funções `validateCreditsForFeature` e `deductCreditsForFeature`.
- **Configuração de Custos**: Os custos em créditos de cada funcionalidade podem ser ajustados no painel de administração em `/admin/settings`.

### Painel Admin
- Acesso: `/admin` (SSR guard + middleware). Configure `.env`: `ADMIN_EMAILS` ou `ADMIN_USER_IDS`.
- Funcionalidades:
  - **Planos e Assinaturas**: Criar e gerenciar planos de assinatura.
  - **Usuários**: Listar, ajustar créditos, e gerenciar usuários.
  - **Convites**: Convidar novos usuários por e-mail (via Clerk).
  - **Sincronização**: Sincronizar dados de usuários do Clerk para o banco de dados local.
- Requisitos Clerk para convites:
  - Invitations e envio de e‑mails habilitados no projeto Clerk
  - Redirect permitido: `${NEXT_PUBLIC_APP_URL}/sign-up`
- APIs Admin relevantes:
  - `GET/POST /api/admin/plans`
  - `PUT/DELETE /api/admin/plans/:id`
  - `POST /api/admin/users/invite`
  - `POST /api/admin/users/sync`
  - `PUT  /api/admin/users/:id/credits`

Notas Prisma
- O Prisma Client é gerado em `prisma/generated/client`.
- O código usa esse client gerado (não `@prisma/client`) para evitar divergências de enums/tipos em runtime.
- Atalho de tipos: `src/lib/prisma-types.ts` reexporta `OperationType` do client gerado.

## Scripts
- `npm run dev` — Dev server
- `npm run build` — Gera Prisma Client e build de produção
- `npm start` — Servidor em produção
- `npm run lint` — Lint do Next/TypeScript
- `npm run typecheck` — Verificação de tipos
- `npm run db:push` — Sincroniza schema (dev)
- `npm run db:migrate` — Migrações Prisma
- `npm run db:studio` — Prisma Studio

## Deploy
Pronto para Vercel/Netlify/Node. Na Vercel:
- Configure variáveis de `.env.example` (Clerk, Asaas, `DATABASE_URL`, etc.)
- Use runtime Node (não Edge) para endpoints com Prisma
- Aponte webhooks (Clerk, Asaas) para rotas em `src/app/api/webhooks/*`

### Variáveis de Ambiente (produção)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ASAAS_API_KEY`
- `DATABASE_URL`
- Outras de `.env.example`, conforme necessário

## Guias de Agentes
Use estes guias/prompts ao iniciar tarefas ou revisões:
- `.context/AGENTS.md` — Diretrizes do Repositório (estrutura, scripts, estilo, PRs)
- `.context/agents/README.md` — Índice dos Guias
- `.context/agents/security-check.md` — Verificação de Segurança
- `.context/agents/frontend-development.md` — Desenvolvimento Frontend
- `.context/agents/backend-development.md` — Desenvolvimento Backend
- `.context/agents/database-development.md` — Banco de Dados
- `.context/agents/architecture-planning.md` — Arquitetura & Planejamento

## Guia Interno de Desenvolvimento (pt-BR)
Guia detalhado para Clerk, banco, deploy na Vercel e uso de agentes.

### Variáveis de Ambiente (copie de `.env.example` para `.env`)
- Clerk:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pública)
  - `CLERK_SECRET_KEY` (secreta)
  - `CLERK_WEBHOOK_SECRET` (webhooks de usuário)
- Asaas:
  - `ASAAS_API_KEY` (secreta)
  - `ASAAS_WEBHOOK_SECRET` (webhooks de pagamento)
- URLs do Clerk (padrões do template):
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
  - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
  - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`
- Banco: `DATABASE_URL=postgresql://user:password@host:5432/saas_template`
- App: `NEXT_PUBLIC_APP_URL=http://localhost:3000`

### Configurar Clerk
1) Crie um app em dashboard.clerk.com e copie as chaves.
2) Defina `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY` em `.env`.
3) Redirects/origens autorizadas:
   - Dev: `http://localhost:3000`
   - Produção: domínio `.vercel.app` e custom domain
4) Rotas de auth: `src/app/(public)/sign-in` e `src/app/(public)/sign-up`. Rotas protegidas: `src/app/(protected)`.
5) Webhooks (opcional): configure um endpoint para sincronização de usuários e defina `CLERK_WEBHOOK_SECRET`.

### Configurar Asaas
1) Crie uma conta no [Asaas](https://www.asaas.com/) e obtenha sua chave de API.

2) **Escolha o ambiente:**
   - **SANDBOX (Desenvolvimento/Testes)**:
     - Use para testes sem cobranças reais
     - URL padrão: `https://sandbox.asaas.com/api/v3`
     - Chaves geralmente começam com letras/números
     - Não precisa configurar `ASAAS_API_URL` (usa sandbox por padrão)

   - **PRODUÇÃO**:
     - Gera cobranças e pagamentos REAIS
     - URL: `https://api.asaas.com/v3`
     - Chaves começam com `$` (exemplo: `$aas_...`)
     - **IMPORTANTE**: Chaves com `$` precisam de escape no `.env`:
       ```env
       ASAAS_API_KEY="$aas_sua_chave_aqui"  # Opção 1 (recomendado)
       ASAAS_API_KEY=\$aas_sua_chave_aqui   # Opção 2
       ASAAS_API_URL=https://api.asaas.com/v3
       ```

3) Defina as variáveis no `.env`:
   ```env
   # Para SANDBOX (desenvolvimento)
   ASAAS_API_KEY=sua_chave_sandbox_aqui

   # Para PRODUÇÃO
   ASAAS_API_KEY="$aas_sua_chave_producao_aqui"
   ASAAS_API_URL=https://api.asaas.com/v3
   ```

4) **Configure webhooks e callbacks** (entenda a diferença):

   **Webhook** (configuração global no dashboard Asaas):
   - **Propósito**: Backend recebe EVENTOS de pagamento do Asaas
   - **URL**: `https://seudominio.com/api/webhooks/asaas`
   - **Configuração**: Dashboard Asaas → Integrações → Webhooks
   - **Token**: Defina `ASAAS_WEBHOOK_SECRET` no `.env`
   - **Processa**: Confirmações de pagamento, atualiza créditos automaticamente

   **Callback** (configurado automaticamente via código):
   - **Propósito**: Redireciona o USUÁRIO após pagar
   - **URL**: `https://seudominio.com/dashboard?payment=success`
   - **Configuração**: Via `NEXT_PUBLIC_APP_URL` no `.env`
   - **Processa**: Apenas experiência do usuário

   **⚠️ CRÍTICO**: Ambas as URLs devem usar o mesmo domínio base (`NEXT_PUBLIC_APP_URL`).

   **Cenário 1** - Webhook Configurado (Recomendado):
   - ✅ Eventos processados automaticamente
   - ✅ Créditos atualizados ao confirmar pagamento
   - ✅ Usuário redirecionado após pagar

   **Cenário 2** - Sem Webhook:
   - ❌ Eventos NÃO processados automaticamente
   - ⚠️ Créditos não atualizados automaticamente
   - ✅ Usuário ainda é redirecionado (callback funciona)

   Ver guia completo: [.context/docs/asaas-webhooks.md](.context/docs/asaas-webhooks.md)

5) Ao iniciar o servidor, você verá logs indicando qual ambiente está ativo:
   ```
   [Asaas] Environment: SANDBOX
   [Asaas] API URL: https://sandbox.asaas.com/api/v3
   ```

6) **IMPORTANTE - Valor Mínimo**: O Asaas exige um valor mínimo de **R$ 5,00** para cobranças:
   - Certifique-se de que todos os planos pagos tenham valor ≥ R$ 5,00
   - Planos com valor menor devem ser gratuitos (sem cobrança via Asaas)
   - O sistema valida automaticamente antes de criar assinaturas

### Acesso Admin
- Defina ao menos um admin via variáveis de ambiente:
  - `ADMIN_EMAILS=admin@seudominio.com,ops@seudominio.com`
  - ou `ADMIN_USER_IDS=usr_123,usr_456` (IDs do Clerk)
- Acesse o painel: `/admin` (somente admins conseguem entrar). As APIs em `src/app/api/admin/*` validam admin no servidor.

### Configurar Banco de Dados (Prisma + Postgres)
#### Postgres via Docker (script automatizado)
Recomendado para desenvolvimento local. Requer Docker instalado e em execução.

Comando padrão:
```bash
npm run db:docker
```
O script `scripts/setup-postgres-docker.mjs`:
- Cria (se necessário) um volume Docker para persistir dados
- Sobe um PostgreSQL em um container nomeado
- Mapeia a porta local escolhida e imprime a `DATABASE_URL` pronta para colar no `.env`

Personalização via variáveis de ambiente:
- `PG_CONTAINER_NAME` (padrão: `saas_template`)
- `PG_DB` (padrão: `saas_template`)
- `PG_USER` (padrão: `postgres`)
- `PG_PASSWORD` (padrão: `postgres`)
- `PG_PORT` (padrão: `5432`)
- `PG_IMAGE` (padrão: `postgres:16`)
- `PG_VOLUME` (padrão: `saas_template_data`)

Exemplos:
```bash
# Porta alternativa e credenciais próprias
PG_PORT=5433 PG_DB=app PG_USER=app PG_PASSWORD=secret npm run db:docker

# Alterar nome do container e volume
PG_CONTAINER_NAME=my-db PG_VOLUME=my_db_volume npm run db:docker
```

Comandos úteis do Docker (após criar o container):
```bash
docker stop saas_template        # parar
docker start saas_template       # iniciar
docker logs -f saas_template     # logs
```

Defina a `DATABASE_URL` no `.env` com a URL impressa pelo script, por exemplo:
```env
DATABASE_URL="postgresql://app:secret@localhost:5433/app"
```

Depois, rode:
```bash
npm run db:push      # ambiente de desenvolvimento
# ou
npm run db:migrate   # migrações versionadas
```
Opção A — Docker local (manual):
```
docker run --name saas_template -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=saas_template -p 5432:5432 -d postgres:16
```
`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saas_template`

Opção B — Gerenciado (Neon, Supabase, RDS): crie a base e copie a URL.

Sincronizar/Migrar:
- Rápido (dev): `npm run db:push`
- Versionado (recomendado): `npm run db:migrate`
- Inspecionar: `npm run db:studio`

Observações:
- `npm run dev` e `npm run build` executam `prisma generate` automaticamente.
- O Prisma Client é gerado em `prisma/generated/client` e não é versionado (gitignored). Se faltar, rode `npx prisma generate`.
- Mantenha `userId`/`workspaceId` em modelos multi-tenant.

### Rodar Localmente
1) `npm install`
2) Configure `.env`
3) Inicie banco (`db:push` ou `db:migrate`)
4) `npm run dev` → http://localhost:3000
5) Valide sign-in/sign-up e acesso às rotas protegidas

## Webhooks (Local)
Para integrar webhooks localmente, você precisa expor seu `localhost` através de um túnel público.

### Webhooks do Clerk
- O webhook do Clerk é usado para sincronizar dados de usuários (criação, atualização).
- Inicie o app: `npm run dev`
- Inicie um túnel (ex: `npm run tunnel:cf` para Cloudflare Tunnel).
- No Clerk → Webhooks → Add endpoint:
  - URL: `https://<URL-DO-TUNEL>/api/webhooks/clerk`
  - Copie o “Signing secret” e adicione em `.env`: `CLERK_WEBHOOK_SECRET=whsec_...`

### Webhooks do Asaas
- O webhook do Asaas é usado para receber o status de pagamentos.
- Inicie o app e o túnel.
- No Asaas → Integrações → Webhooks → Adicionar:
  - URL: `https://<URL-DO-TUNEL>/api/webhooks/asaas`
  - Copie o token de verificação e adicione em `.env`: `ASAAS_WEBHOOK_SECRET=...`

## Documentação Complementar
- Admin detalhado: `.context/docs/admin.md`
- Créditos e sincronização: `.context/docs/credits.md`
- Uploads de arquivos: `.context/docs/uploads.md`


### Deploy na Vercel
1) Importe o repositório
2) Configure variáveis de ambiente (Clerk, Asaas, `DATABASE_URL`)
3) Build & Runtime:
   - Build padrão do Next (gera Prisma Client)
   - Runtime Node (não Edge) para Prisma
4) Banco: use provedor acessível pela Vercel (Neon/Supabase); habilite pooling se necessário
5) Clerk (Produção): adicione domínios `.vercel.app` e customizados.
6) Asaas (Produção): atualize a URL do webhook para o domínio de produção.
7) Webhooks: aponte os serviços para `src/app/api/webhooks/*` e defina as `*_WEBHOOK_SECRET` correspondentes.
8) Pós-deploy: teste auth, rotas protegidas, acesso ao DB, criação de planos e fluxo de pagamento.

### Usar os Agents (prompts)
- Leia `.context/AGENTS.md` e `.context/agents/README.md`
- Copie o prompt do arquivo em `.context/agents/` pertinente e inclua contexto (arquivos/rotas/contratos)
- Anexe o guia do agente na descrição do PR
 - Para recursos que consomem créditos, use as keys: `ai_text_chat` e `ai_image_generation` (custos em `src/lib/credits/feature-config.ts`)

### Solução de Problemas (FAQ)
- **Asaas API Key inválida**: A chave de API do Asaas para o ambiente de produção geralmente começa com o prefixo `$aact_...`. O caractere `$` pode causar problemas de interpretação em alguns terminais ou arquivos `.env`. Para evitar erros, coloque a chave entre aspas (`"..."`) ou faça o escape do caractere `$` com uma contrabarra (`\$aact_...`).
- **Prisma em produção**: use runtime Node e confirme `prisma generate` no build
- **Login falha no deploy**: verifique domínios/redirects no Clerk e variáveis na Vercel
- **`DATABASE_URL` inválida**: teste conexão localmente; confirme SSL/Pooling no provedor
- **Tipos/ESLint**: execute `npm run typecheck` e `npm run lint` antes do PR

## Licença
MIT
