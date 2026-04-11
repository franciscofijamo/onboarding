# StandOut — Auditoria UI/UX Completa
> **Data:** Abril 2026  
> **Escopo:** Fluxos Candidato e Empresa (Recrutador) — todas as páginas e interações

---

## Metodologia
Cada problema é catalogado com:
- **Área** — página ou componente afetado
- **Tipo** — Linguagem · Visual · Fluxo · Funcionalidade · Feedback · Acessibilidade
- **Severidade** — 🔴 Crítico · 🟠 Alto · 🟡 Médio · 🟢 Baixo
- **Descrição** e **Sugestão de Correção**

---

## 1. Problemas Globais (Ambos os Fluxos)

### 1.1 Mistura de Idiomas (EN/PT)
**Severidade: 🔴 Crítico**

A plataforma mistura inglês e português em múltiplos ecrãs sem consistência clara:

| Ecrã | Conteúdo em EN | Conteúdo em PT |
|---|---|---|
| `applications/page.tsx` | Search placeholder "Search by job title or company..." | Labels de colunas em PT |
| `applications/page.tsx` | "Clear search", "No results for…" | "Candidaturas", "Em progresso" |
| `scenarios/[sessionId]` | "Detailed Feedback", "Strengths", "Improvements", "Model Response", "Communication Tips", "Evaluation Criteria", "Your Response" | Headers da sessão em PT |
| `scenarios/page.tsx` | "New Session", "Continue", "View", "In Progress", "Completed" | "Total Sessions", "Questions Analysed" |
| `sidebar.tsx` | Badge "Soon" | Labels de navegação em PT |
| `onboarding/page.tsx` | Labels "CV / Resume", "Cover Letter", "AI Analysis" | Outros labels em PT |

**Correção:** Decisão estratégica urgente: escolher um idioma primário (PT-MZ) e migrar todo o conteúdo hardcoded. Criar keys i18n para todos os strings que ainda não as têm.

---

### 1.2 Sidebar — Sem Responsividade Mobile
**Severidade: 🔴 Crítico**

A sidebar usa `hidden md:flex` — em mobile, não existe nenhum menu de navegação alternativo (hamburger, bottom nav, drawer). O utilizador em mobile não consegue navegar entre secções após o login.

**Correção:** Adicionar um `Sheet` (drawer) para mobile acionado pelo botão já existente no `Topbar`. Ou implementar uma `BottomNavBar` para mobile.

---

### 1.3 Logo da Sidebar com Ícone Errado
**Severidade: 🟠 Alto**

O logótipo da aplicação na sidebar usa o ícone `<Settings />` (engrenagem) como placeholder em vez de um logótipo real ou ícone representativo da marca StandOut.

**Correção:** Substituir por um ícone ou SVG que represente a identidade da StandOut.

---

### 1.4 Spinner de Loading Global sem Indicação de Contexto
**Severidade: 🟡 Médio**

O estado de loading inicial do layout protegido (layout.tsx L89-91) mostra apenas um spinner sem mensagem e não usa o componente `Skeleton` padrão.

**Correção:** Adicionar texto contextual como "A carregar a sua conta..." ou usar o mesmo padrão de Skeleton das páginas individuais.

---

### 1.5 Análises — Contador no Dashboard Obsoleto
**Severidade: 🟡 Médio**

No Dashboard do candidato, o widget "Análises realizadas" mostra sempre `—` (hardcoded em dashboard/page.tsx L208). Não consulta nenhum endpoint.

**Correção:** Conectar ao endpoint de candidaturas ou análises e exibir o valor real. Se ainda não existir endpoint, esconder o widget.

---

## 2. Fluxo Candidato

### 2.1 Onboarding — Double Redirect no CTA Principal
**Severidade: 🔴 Crítico**

O botão "Candidatar-se" em `/jobs/[id]` → `/applications/new?postingId=<id>` → `/onboarding?new=1&jobPostingId=<id>`. Dois renders de loading, URL muda duas vezes, lento e confuso.

**Correção:** Redirecionar diretamente para `/onboarding?new=1&jobPostingId=<id>` no `ApplyButton`, removendo a página intermédia `/applications/new`.

---

### 2.2 Onboarding — "Cover Letter" Visível no Stepper para Candidaturas Públicas
**Severidade: 🟠 Alto**

Para `isPublicApplication === true`, a navegação salta o step `cover-letter` mas o ícone continua visível na barra de progresso, criando confusão — o utilizador vê um passo que não vai utilizar.

**Correção:** Filtrar os steps renderizados no `StepIndicator` para excluir `cover-letter` quando `isPublicApplication === true`.

---

### 2.3 Onboarding — Títulos Padrão em Inglês
**Severidade: 🟠 Alto**

Os fallback titles "My Resume" e "My Cover Letter" usados ao guardar documentos sem título estão em inglês.

**Correção:** Traduzir para PT-MZ: "O Meu CV", "A Minha Carta de Apresentação".

---

### 2.4 Applications Kanban — Click em Card Público Vai para Vaga, Não para Painel
**Severidade: 🟠 Alto**

Para candidaturas públicas (`isPlatformApp`), clicar no card navega para `/jobs/<posting-id>`. O candidato perde o contexto do seu pipeline e não vê o estado da candidatura nem histórico.

**Correção:** Abrir um painel lateral com o estado da candidatura ou criar rota `/applications/<id>` com detalhe.

---

### 2.5 Applications Kanban — Candidaturas Públicas sem Botões de Acção
**Severidade: 🟠 Alto**

Para candidaturas públicas, os botões "Editar" e "Practice Interview" ficam ocultos. O candidato não tem nenhuma acção disponível no card.

**Correção:** Substituir por: "Ver Candidatura" (estado no pipeline) + "Praticar Entrevista" (se existir staging activo).

---

### 2.6 Applications Kanban — Score em Escalas Diferentes
**Severidade: 🟠 Alto**

O fit score é apresentado como `x/100` nas stats do Kanban e como `x/10` na análise do onboarding e nas sessões de scenarios. Escalas inconsistentes confundem o utilizador.

**Correção:** Normalizar para uma única escala (0-100) em toda a apresentação.

---

### 2.7 Dashboard — Scenarios Marcado como "Em Breve" mas Está Activo
**Severidade: 🟠 Alto**

A secção "Em breve" do dashboard inclui "Scenarios", mas a página `/scenarios` está totalmente funcional e visível na sidebar. Contradição directa que gera desconfiança.

**Correção:** Remover da secção "Em breve" qualquer funcionalidade já activa. Actualizar o dashboard para reflectir o estado real de cada feature.

---

### 2.8 Scenarios — Badge "Entrevista da empresa" Misturado com Labels EN
**Severidade: 🟡 Médio**

O badge "Entrevista da empresa" (PT) coexiste com "New Session", "Continue", "View" (EN) na mesma ficha.

**Correção:** Traduzir todos os labels da página para PT-MZ ou consolidar em EN.

---

### 2.9 Scenarios — Sem Indicação de Custo na Página Principal
**Severidade: 🟡 Médio**

O utilizador só descobre que uma sessão custa 15 créditos depois de clicar em "New Session". Não há indicação prévia na página de listagem.

**Correção:** Adicionar nota discreta na página: "Cada sessão custa 15 créditos".

---

### 2.10 Scenarios — `fb.status` Mostrado Raw ao Utilizador
**Severidade: 🟡 Médio**

O valor interno `fb.status` (ex: `"ANALYZED"`) aparece como subtítulo do feedback (scenarios/[sessionId] L686). Não é user-friendly.

**Correção:** Mapear `fb.status` para label legível ou remover o subtítulo.

---

### 2.11 Scenarios — Estado "RECORDED" Sem CTA de Submissão
**Severidade: 🟡 Médio**

Quando a resposta está em `RECORDED`, o utilizador não tem opção de submeter o áudio existente — apenas "Re-gravar" ou "Fazer upload". O áudio gravado é descartado forçosamente.

**Correção:** Adicionar botão "Submeter e Analisar" para o áudio já gravado.

---

### 2.12 Job Board — Sem Estado "Já Candidatado"
**Severidade: 🟠 Alto**

Na listagem `/jobs`, um candidato autenticado que já se candidatou a uma vaga não tem indicação visual disso. O botão "Candidatar-se" aparece igual para todas as vagas.

**Correção:** Cruzar candidaturas existentes com `jobPostingId` e mostrar badge "Candidatura enviada" ou desactivar botão com label alternativo.

---

### 2.13 Billing — Plano Único sem Opção de Quantidade
**Severidade: 🟡 Médio**

A página de Billing mostra apenas um pacote de créditos. Não há escalabilidade de compra.

**Correção:** Disponibilizar pelo menos 2-3 pacotes de créditos.

---

### 2.14 Billing — Sem Histórico de Transações
**Severidade: 🟠 Alto**

Não existe histórico de compras ou deduções de crédito. O candidato não sabe quando e como os créditos foram usados.

**Correção:** Adicionar secção de histórico: data, tipo de acção, créditos debitados/creditados.

---

### 2.15 Candidato — Sem Página de Perfil Pessoal Acessível
**Severidade: 🟡 Médio**

Não existe link na sidebar para editar o perfil pessoal após o preenchimento inicial. O `ProfileCompletionModal` só aparece uma vez.

**Correção:** Adicionar item de navegação "Perfil" ou acessível via Topbar/avatar.

---

## 3. Fluxo Empresa (Recrutador)

### 3.1 Posting Card — Acções Só Visíveis no Hover
**Severidade: 🔴 Crítico**

Os botões de acção (editar, publicar, pausar, eliminar) só aparecem no hover (`opacity-0 group-hover:opacity-100`). Em dispositivos touch, hover não existe — acções completamente inacessíveis.

**Correção:** Mostrar acções primárias sempre visíveis ou usar um menu contextual (DropdownMenu) acessível por toque.

---

### 3.2 Posting — Sem Confirmação ao Fechar Vaga
**Severidade: 🟠 Alto**

As acções de Publicar, Pausar e Fechar são executadas imediatamente. Fechar uma vaga com candidaturas activas é destrutivo sem aviso.

**Correção:** Adicionar dialog de confirmação antes de `CLOSED`, especialmente se houver candidaturas activas.

---

### 3.3 Posting — Não É Possível Reabrir Vaga Fechada
**Severidade: 🟠 Alto**

Não existe transição de `CLOSED` → `PUBLISHED` ou `CLOSED` → `DRAFT`. Apenas vagas não-fechadas têm o botão de encerrar, mas nenhuma vaga fechada tem botão de reabrir.

**Correção:** Adicionar botão "Reabrir" para vagas fechadas.

---

### 3.4 Posting — Sem Link para a Vaga Pública
**Severidade: 🟡 Médio**

O recrutador não pode ver como a vaga aparece publicamente sem sair do painel de gestão.

**Correção:** Adicionar botão "Ver como candidato" com ícone `ExternalLink` que abre `/jobs/<id>` em nova tab.

---

### 3.5 Candidates Pipeline — Drag-and-Drop sem Fallback Touch
**Severidade: 🟠 Alto**

O DnD com `@dnd-kit` pode ser impreciso ou não funcionar em mobile/touch. Não há alternativa clara para mover candidatos entre etapas.

**Correção:** Adicionar select "Mover para..." ou botões de acção dentro do card como alternativa ao DnD.

---

### 3.6 `PipelineStage` Type Definido Localmente em Dois Lugares
**Severidade: 🟡 Médio**

`PipelineStage` é definido localmente em `applications/page.tsx` e em `recruiter/postings/[id]/candidates/page.tsx` — risco de divergência futura.

**Correção:** Extrair para `src/lib/recruiter/pipeline.ts` e importar em ambos.

---

### 3.7 Nova Vaga — Sem Autosave nem Confirmação de Saída
**Severidade: 🟠 Alto**

Se o recrutador navegiar fora do formulário de nova vaga, todo o conteúdo é perdido. Não há autosave, `localStorage`, nem dialog de confirmação antes de sair.

**Correção:** Implementar autosave em `localStorage` ou `beforeunload` dialog quando há dados não guardados.

---

### 3.8 Dashboard Recrutador — Botão "Nova vaga" Vai para Lista e Não para Formulário
**Severidade: 🟡 Médio**

```tsx
// dashboard/page.tsx linha 53
<Link href="/recruiter/postings">Nova vaga</Link>  // devia ser /recruiter/postings/new
```

**Correção:** Mudar `href` para `/recruiter/postings/new`.

---

### 3.9 Interview Stage Modal — Sem Confirmação ao Publicar
**Severidade: 🟡 Médio**

Publicar uma fase de entrevista envia sessões de prática automaticamente aos candidatos nessa etapa — sem aviso ou confirmação.

**Correção:** Adicionar passo de confirmação: "X candidatos vão receber as perguntas. Confirmar?"

---

### 3.10 Sem Página de Candidatos Global
**Severidade: 🟠 Alto**

A sidebar tem "Candidatos" (`/recruiter/candidates`) marcado como `disabled`. Não existe forma de ver todos os candidatos da empresa cross-postings.

---

## 4. Problemas de Feedback e Estado

### 4.1 Recruiter — Sem Toast de Sucesso em Mutações de Status
**Severidade: 🟡 Médio**

As mutações de status (publicar, pausar, encerrar) usam optimistic update mas não emitem toast de confirmação.

**Correção:** Adicionar `toast({ title: "Vaga publicada!" })` no `onSuccess` de `updateStatusMutation`.

---

### 4.2 Recruiter — Sem Tratamento de Erro na Eliminação
**Severidade: 🟡 Médio**

A `deleteMutation` não tem `onError` na UI do recruiter postings. Se a eliminação falhar, o utilizador não vê nenhum feedback.

**Correção:** Adicionar `onError` com toast de erro descritivo.

---

### 4.3 Análise sem Confirmação de Custo (Candidatura Privada)
**Severidade: 🟡 Médio**

Para candidaturas privadas, o utilizador pode accionar análise IA directamente sem ver o custo previamente. Apenas candidaturas públicas têm o passo "Enviar Candidatura" com resumo de crédito.

**Correção:** Mostrar custo antes de executar, ou exibir num tooltip proeminente.

---

## 5. Problemas Visuais e de Consistência

### 5.1 Raios de Borda sem Sistema Documentado
**Severidade: 🟢 Baixo**

Mistura de `rounded-xl`, `rounded-2xl`, `rounded-3xl` sem regra clara de uso.

**Correção:** Documentar sistema: Cards de página → `rounded-3xl`, Cards de lista → `rounded-2xl`, Botões/inputs → `rounded-xl`.

---

### 5.2 Skeleton Loading Inconsistente
**Severidade: 🟢 Baixo**

Algumas páginas usam `<Skeleton>` com shapes correctos; outras mostram apenas um spinner centralizado.

**Correção:** Adoptar Skeleton como padrão para carregamento de conteúdo. Usar spinner apenas para mutations em progresso.

---

### 5.3 Formatação de Datas Inconsistente
**Severidade: 🟢 Baixo**

Função `formatDate` definida localmente em pelo menos 5 ficheiros com opções diferentes. `scenarios/page.tsx` usa `toLocaleDateString()` sem locale.

**Correção:** Criar utilitário partilhado `formatDate(iso, options?)` em `src/lib/utils.ts`.

---

### 5.4 Recruiting Card — Texto Demasiado Pequeno
**Severidade: 🟡 Médio**

O `PostingCard` usa `text-[10px]` para metadados — abaixo do mínimo recomendado de acessibilidade (12px).

**Correção:** `text-xs` (12px) como mínimo para qualquer texto de interface.

---

## 6. Problemas de Acessibilidade

### 6.1 Icon Buttons sem `aria-label`
**Severidade: 🟠 Alto**

Botões de ícone no `PostingCard` usam `title` (não lido consistentemente por screen readers) em vez de `aria-label`.

**Correção:** Substituir `title` por `aria-label` em todos os icon buttons.

---

### 6.2 Dialog de Confirmação — Foco não Gerido
**Severidade: 🟡 Médio**

Nos dialogs de confirmação, o foco pode não ir para o botão seguro ("Cancelar") ao abrir. Utilizadores de teclado podem confirmar acções destrutivas acidentalmente.

**Correção:** Verificar que o Radix `AlertDialog` foca o botão `Cancel` como primeiro elemento.

---

### 6.3 Navegação por Questões sem `role="tab"`
**Severidade: 🟢 Baixo**

Os botões de navegação entre questões no `scenarios/[sessionId]` não têm `role="tab"` nem `aria-selected`.

**Correção:** Adicionar `role="tablist"` no container e `role="tab"` + `aria-selected` nos botões.

---

## 7. Funcionalidades em Falta

| # | Utilizador | Feature | Impacto |
|---|---|---|---|
| 7.1 | Candidato | Notificações in-app de mudança de etapa no pipeline | Alto |
| 7.2 | Candidato | Página de perfil pessoal editável | Médio |
| 7.3 | Candidato | Estado "Já candidatado" no job board | Alto |
| 7.4 | Candidato | Histórico de transações de créditos | Alto |
| 7.5 | Candidato | Pré-visualização formatada do CV | Médio |
| 7.6 | Recrutador | Vista global de candidatos (cross-postings) | Alto |
| 7.7 | Recrutador | Exportação de dados de candidatos (CSV/PDF) | Médio |
| 7.8 | Recrutador | Link "Ver como candidato" nas vagas | Baixo |

---

## 8. Sumário Prioritário

| Prioridade | Problema | Severidade |
|---|---|---|
| **P0** | Mistura EN/PT em toda a app | 🔴 Crítico |
| **P0** | Sem navegação mobile | 🔴 Crítico |
| **P0** | Double redirect `/applications/new` → onboarding | 🔴 Crítico |
| **P0** | Acções do card recruiter só visíveis no hover | 🔴 Crítico |
| **P1** | Cover letter visível mas inutilizável em candidatura pública | 🟠 Alto |
| **P1** | Card de candidatura pública sem acções relevantes | 🟠 Alto |
| **P1** | Score em escalas diferentes (x/10 vs x/100) | 🟠 Alto |
| **P1** | Dashboard mostra Scenarios como "Em breve" mas já existe | 🟠 Alto |
| **P1** | Sem histórico de transações de créditos | 🟠 Alto |
| **P1** | Sem confirmação ao fechar vaga | 🟠 Alto |
| **P1** | Não é possível reabrir vaga fechada | 🟠 Alto |
| **P1** | Sem autosave no formulário de nova vaga | 🟠 Alto |
| **P1** | Job Board sem estado "Já candidatado" | 🟠 Alto |
| **P1** | Pipeline DnD sem fallback touch | 🟠 Alto |
| **P2** | Logo com ícone de Settings | 🟡 Médio |
| **P2** | Formatação de datas inconsistente | 🟡 Médio |
| **P2** | Skeleton loading inconsistente | 🟡 Médio |
| **P2** | Análise sem confirmação de custo (privada) | 🟡 Médio |
| **P2** | Dashboard botão "Nova vaga" vai para lista | 🟡 Médio |
| **P2** | `fb.status` mostrado raw ao utilizador | 🟡 Médio |
| **P3** | Border radius sem sistema documentado | 🟢 Baixo |
| **P3** | Icon buttons sem `aria-label` | 🟠 Alto |

---

## Notas de Manutenção
- Marcar problemas resolvidos com ✅ e data de resolução
- Adicionar novos problemas detectados em novos sprints
- Cruzar com `candidate-application-onboarding.md` e `job-applications-kanban-plan.md`
