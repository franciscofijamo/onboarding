# Plano de Correcção UI/UX (Remediation Plan)
> **Baseado em:** `ui-ux-audit.md`  
> **Objectivo:** Roadmap estruturado para resolver os 22 problemas de UI/UX documentados, organizados de forma lógica e por fases de implementação.

O plano está dividido em **4 Fases principais** para que as implementações sejam ágeis, agrupando problemas por contexto técnico (ex: mexer no mesmo ficheiro/componente de uma vez) em vez de apenas seguir a lista cega de prioridades.

---

## Fase 1: Desbloqueadores Críticos e Navegação Core (P0)
*Foco: Garantir que a plataforma é utilizável em mobile e que os fluxos principais (candidatar, gerir vagas) funcionam sem atrito.*

- [x] **1.1. Implementar Navegação Mobile (Audit 1.2)**
  - Ficheiros: `src/components/app/sidebar.tsx`, `src/components/app/topbar.tsx`
  - Acção: Adicionar um `Sheet` (drawer) do Radix UI no topbar para resoluções mobile, contendo os mesmos links da sidebar.
- [x] **1.2. Corrigir Acessibilidade Mobile para Recrutadores (Audit 3.1, 6.1)**
  - Ficheiros: `src/app/(protected)/recruiter/postings/page.tsx`
  - Acção: Substituir o comportamento de opacity no hover das acções do `PostingCard`. Mudar para acções sempre visíveis ou incluir um componente `<DropdownMenu>` (menu estilo "três pontos") para ecrãs menores. Trocar atribuições `title` por `aria-label`.
- [x] **1.3. Remover Double Redirect na Candidatura (Audit 2.1, 2.12)**
  - Ficheiros: `src/app/(public)/jobs/[id]/page.tsx`, `src/app/(protected)/applications/new/page.tsx`
  - Acção: No `ApplyButton`, redirecionar de `/jobs/[id]` directamente para `/onboarding?new=1&jobPostingId=<id>`.
- [x] **1.4. Limpar Dashboard do Candidato (Audit 2.7, 1.5)**
  - Ficheiros: `src/app/(protected)/dashboard/page.tsx`
  - Acção: Mover "Scenarios" da secção "Em breve" e conectá-la ao estado activo. Ligar ou esconder o widget de "Análises realizadas" no dashboard caso os dados não estejam disponíveis.
- [x] **1.5. Rectificar Stepper no Onboarding (Audit 2.2)**
  - Ficheiros: `src/app/(protected)/onboarding/page.tsx`
  - Acção: Esconder visulamente do `StepIndicator` a opção "Cover Letter" quando `isPublicApplication === true`.

---

## Fase 2: Consistência de Dados e Localização (P0/P1)
*Foco: Padronizar o idioma para Português (PT-MZ) e uniformizar sistemas de avaliação como datas e fit scores.*

- [ ] **2.1. Internacionalização Completa (PT-MZ) (Audit 1.1, 2.3, 2.8, 2.10)**
  - Ficheiros: `src/app/(protected)/scenarios/**/*.tsx`, `src/app/(protected)/applications/**/*.tsx`, etc.
  - Acção: Eliminar todos os traces de Inglês hardcoded. Envolver tudo que falta no i18n via `t()`. Remover `fb.status` subtítulos internos e trocar fallbacks "My Resume" por "O Meu CV".
- [ ] **2.2. Normalização de Fit Scores a 100% (Audit 2.6, 5.4)**
  - Ficheiros: `src/app/(protected)/scenarios/[sessionId]/page.tsx`, `src/app/(protected)/onboarding/page.tsx`, `src/app/(protected)/applications/page.tsx`
  - Acção: Uniformizar para o modelo `/100` (Percentual) as análises de candidaturas e as sessões de cenários de entrevista para consistência visual em todo o site.
- [ ] **2.3. Sistema Centralizado de Formatação de Datas (Audit 5.3)**
  - Ficheiros: Múltiplos (Job board, scenarios, recruiter, etc) + `src/lib/utils.ts`
  - Acção: Centralizar um método partilhado `formatDate` no `utils.ts` que consuma `pt-MZ` para evitar redundâncias espalhadas pela app.
- [ ] **2.4. Centralização do System Type Pipeline (Audit 3.6)**
  - Ficheiros: `src/app/(protected)/recruiter/postings/[id]/candidates/page.tsx`, `src/app/(protected)/applications/page.tsx`, `src/lib/recruiter/pipeline.ts` (novo)
  - Acção: Criar e importar uma fonte única para o tipo utilitário `PipelineStage` para impedir falhas de TS types futuras entre recrutadores e candidatos.

---

## Fase 3: Lógica e Componentes em Falta (P1)
*Foco: Adicionar interações cruciais que faltam, feedbacks para prevenção de perdas de dados e coerência financeira.*

- [ ] **3.1. Estado "Já Candidatado" no Job Board (Audit 2.11)**
  - Ficheiros: `src/app/(public)/jobs/page.tsx`, `src/app/(public)/jobs/[id]/page.tsx`
  - Acção: Para candidatos, desactivar e mostrar um label de "Candidatura submetida" ou badge associado após a aplicação nas vagas.
- [ ] **3.2. Botões Interativos na Application Kanban Candidato (Audit 2.4, 2.5)**
  - Ficheiros: `src/app/(protected)/applications/page.tsx`
  - Acção: Colocar botão alternativo "Ver Candidatura" e redirecionamento apropriado aos painéis invés de devolver aos cargos públicos para `isPlatformApp`.
- [ ] **3.3. Confirmações de Acções de Risco Recrutador (Audit 3.2, 3.3, 3.9, 4.1, 4.2)**
  - Ficheiros: `src/app/(protected)/recruiter/postings/page.tsx`, `.../candidates/page.tsx`
  - Acção: Inserir Confirm Modals para fechamento de vagas ou eliminação de candidaturas, adicionar `<Button>` para Reabrir Vagas (`CLOSED -> DRAFT|PUBLISHED`) e tratar com toasts os cenários `onError` e `onSuccess`.
- [ ] **3.4. Melhorias no Formulário Nova Vaga (Audit 3.7, 3.8)**
  - Ficheiros: `src/app/(protected)/dashboard/page.tsx`, `src/app/(protected)/recruiter/postings/new/page.tsx`
  - Acção: Acertar a hiperligação no Dashboard de `nova vaga`, e incluir hooks para reter estado num draft na memória (caso de saida acidental).
- [ ] **3.5. Transparência Financeira - Sistema Billing (Audit 2.9, 2.13, 2.14, 4.3)**
  - Ficheiros: `src/app/(protected)/billing/page.tsx`, `src/app/(protected)/scenarios/page.tsx`
  - Acção: Revelar custos na página de Cenários antes do uso de crédito. Melhorar página Billing para histórico de acção ou opções fraccionadas de compra se a API permitir.
- [ ] **3.6. Submissão de Flow Scenarios "RECORDED" (Audit 2.11)**
  - Ficheiros: `src/app/(protected)/scenarios/[sessionId]/page.tsx`
  - Acção: Fornecer a via de apenas "Submit/Analisar" no estado em que apenas o audio foi gravado e faltou submeter, reativando este callback sem precisar de novo voice-record.

---

## Fase 4: Polimento, UI System e Acessibilidade (P2/P3)
*Foco: Padronização estética final entre skeleton loaders, tamanhos de letra, focus bounds, e fallbacks.*

- [ ] **4.1. Refatoração Visual Consistente de Components (Audit 1.3, 5.1, 5.2, 5.4)**
  - Ficheiros: `src/components/app/sidebar.tsx`, váriados genéricos.
  - Acção: Trocar o íncone de `Settings` por um logo, aplicar regra estrita do `Card = rounded-2xl` e `Button = rounded-xl`. Alargar tamanhos de classes menores que `text-[10px]` para minimo tolerado de acessibilidade (`text-xs`). Adotar Skeletion padrão para todos os requests.
- [ ] **4.2. Drag-and-Drop Fallback Pipeline e Links Rápidos (Audit 3.4, 3.5)**
  - Ficheiros: `src/app/(protected)/recruiter/postings/[id]/candidates/page.tsx`
  - Acção: Dar um Menu "Ações" as candidaturas dos recrutadores para transferências manuais pelo teclado e touch em mobile s/ DnD. Adicionar link das vagas públicas pro painel (`ExternalLink`).
- [ ] **4.3. Configuração de Perfil via Menu de Topbar (Audit 2.15)**
  - Ficheiros: `src/components/app/topbar.tsx`
  - Acção: Fazer o Link de perfil de utilizador re-abrir `ProfileCompletionModal` ou direccionar para um `Settings` se houver necessidade.
- [ ] **4.4 Focus de Acessibilidade Radix (Audit 6.2)**
  - Ficheiros: `src/components/ui/alert-dialog.tsx`
  - Acção: Rever gestão do Autofocus de confirmação dentro dos `Dialog` Radix que devem ir aos botões "Cancelar".
