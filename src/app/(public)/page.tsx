"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ListChecks,
  FileText,
  Link2,
  MessagesSquare,
  Mic2,
} from "lucide-react";
import { GuestEvaluator } from "@/components/marketing/guest-evaluator";

const proofPoints = [
  {
    title: "Análise gratuita",
    description: "Antes do registo",
    icon: BadgeCheck,
  },
  {
    title: "CV em PDF ou Word",
    description: "Carregamento direto",
    icon: FileText,
  },
  {
    title: "Link ou texto da vaga",
    description: "Duas formas de comparar",
    icon: Link2,
  },
  {
    title: "Preparação para entrevistas",
    description: "Próximo passo com IA",
    icon: MessagesSquare,
  },
];

const resultHighlights = [
  {
    title: "Score de adequação",
    description: "Veja onde o seu perfil encaixa melhor.",
    icon: BarChart3,
  },
  {
    title: "Prioridades claras",
    description: "Saiba o que ajustar antes de enviar.",
    icon: ListChecks,
  },
  {
    title: "Próxima entrevista",
    description: "Prepare respostas com base na vaga.",
    icon: Mic2,
  },
];

const LOOP_DURATION = "10s";
const STEP_COLORS = [
  "hsl(45, 93%, 47%)", // Amarelo claro
  "hsl(35, 92%, 50%)", // Amarelo escuro
  "hsl(142, 71%, 45%)", // Verde leve
  "hsl(142, 76%, 36%)", // Verde escuro
];

export default function HomePage() {
  return (
    <main className="w-full pb-16">
      <section className="relative min-h-svh overflow-hidden px-4">
        <div
          aria-hidden
          className="absolute inset-x-0 top-24 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 -z-10 h-32 border-t border-border/60 bg-muted/20"
        />

        <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col justify-between pt-8 sm:pt-9">
          <div className="grid flex-1 gap-10 py-2.5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-3">
            <div className="space-y-8">
              <div className="space-y-5">
                <p className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  AI career fit check
                </p>
                <div className="space-y-5">
                  <h1 className="max-w-5xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl lg:text-7xl">
                    Melhore o seu CV para conquistar mais entrevistas na vaga
                    certa.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                    O StandOut compara o seu CV com a descrição real da vaga,
                    mostra o seu Match Score e aponta o que precisa de melhorar
                    para aumentar as hipóteses de entrevista.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="#avaliador"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Melhorar o meu CV agora
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href="/sign-up"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Criar conta grátis
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-lg">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Caminho completo
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Da análise ao treino.
                  </h2>
                </div>
                <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                  4 etapas
                </div>
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-4 left-[1.35rem] w-px overflow-hidden bg-border">
                  <span
                    className="block h-1/4 w-full bg-gradient-to-b from-transparent via-primary to-transparent"
                    style={{
                      animation: `timeline-scan ${LOOP_DURATION} linear infinite`,
                    }}
                  />
                </div>
                <div className="space-y-3">
                  {proofPoints.map((point, index) => {
                    const Icon = point.icon;
                    const animationDelay = `${index * 1.8}s`;

                    return (
                      <div
                        key={point.title}
                        className="group relative flex items-center gap-3 rounded-xl border border-border bg-background/80 p-3 transition-colors"
                        style={{
                          animation: `step-focus ${LOOP_DURATION} ease-in-out infinite`,
                          animationDelay,
                          // @ts-ignore
                          "--active-bg": STEP_COLORS[index],
                        }}
                      >
                        <div
                          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-sm"
                          style={{
                            animation: `step-icon ${LOOP_DURATION} ease-in-out infinite`,
                            animationDelay,
                          }}
                        >
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow-[0_0_0_4px_hsl(var(--background))]">
                            {index + 1}
                          </span>
                          <span
                            className="absolute inset-0 rounded-xl border border-primary/30 opacity-0"
                            style={{
                              animation: `step-ring ${LOOP_DURATION} ease-in-out infinite`,
                              animationDelay,
                            }}
                          />
                          <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-sm font-semibold text-foreground"
                            style={{
                              animation: `step-text ${LOOP_DURATION} ease-in-out infinite`,
                              animationDelay,
                            }}
                          >
                            {point.title}
                          </p>
                          <p
                            className="text-xs leading-5 text-muted-foreground"
                            style={{
                              animation: `step-text ${LOOP_DURATION} ease-in-out infinite`,
                              animationDelay,
                            }}
                          >
                            {point.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="mt-5 rounded-xl border border-border bg-background/70 p-4 opacity-0"
                style={{
                  animation: `score-box ${LOOP_DURATION} ease-in-out infinite`,
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Exemplo
                    </p>
                    <p className="text-sm font-semibold">Match Score</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex h-8 overflow-hidden text-2xl font-bold leading-8 text-foreground">
                      <div
                        className="flex flex-col transition-transform"
                        style={{
                          animation: `count-tens ${LOOP_DURATION} cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite`,
                        }}
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <span key={n}>{n}</span>
                        ))}
                      </div>
                      <div
                        className="flex flex-col transition-transform"
                        style={{
                          animation: `count-units ${LOOP_DURATION} cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite`,
                        }}
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2].map((n, i) => (
                          <span key={i}>{n}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      / 100
                    </p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      animation: `score-bar ${LOOP_DURATION} cubic-bezier(0.65, 0, 0.35, 1) infinite`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 pb-6 md:grid-cols-3 lg:pb-8">
            {resultHighlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="flex items-center gap-3 border-t border-border py-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-sm ring-1 ring-border">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="avaliador"
        className="mx-auto w-full max-w-6xl scroll-mt-24 mt-24 pt-12"
      >
        <div className="mb-12 mx-auto max-w-3xl space-y-5 px-4 text-center flex flex-col items-center">
          <p className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 shadow-sm">
            Teste gratuito
          </p>
          <div className="space-y-3 mt-5">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl text-balance">
              Compare o seu CV com uma vaga em poucos minutos.
            </h2>
            <p className="max-w-2xl mx-auto text-base leading-7 text-muted-foreground md:text-lg text-pretty">
              Carregue o documento, indique a oportunidade e veja uma
              pré-análise clara antes de criar o perfil completo.
            </p>
          </div>
        </div>

        <GuestEvaluator />
      </section>

      <style jsx>{`
        @keyframes step-focus {
          0%,
          13%,
          100% {
            transform: translateX(0);
            border-color: hsl(var(--border));
            background: hsl(var(--background) / 0.8);
            box-shadow: none;
          }
          5%,
          8% {
            transform: translateX(4px);
            border-color: var(--active-bg);
            background: var(--active-bg);
            box-shadow: 0 12px 30px -15px var(--active-bg);
          }
        }

        @keyframes step-text {
          0%,
          13%,
          100% {
            color: inherit;
          }
          5%,
          8% {
            color: white;
          }
        }

        @keyframes step-icon {
          0%,
          13%,
          100% {
            transform: scale(1);
          }
          5%,
          8% {
            transform: scale(1.08);
          }
        }

        @keyframes step-ring {
          0%,
          13%,
          100% {
            opacity: 0;
            transform: scale(1);
          }
          5% {
            opacity: 0.7;
            transform: scale(1);
          }
          10% {
            opacity: 0;
            transform: scale(1.55);
          }
        }

        @keyframes timeline-scan {
          0% {
            transform: translateY(-100%);
          }
          65%,
          100% {
            transform: translateY(420%);
          }
        }
        @keyframes score-box {
          0%,
          65% {
            opacity: 0;
            transform: translateY(10px);
          }
          68%,
          95% {
            opacity: 1;
            transform: translateY(0);
          }
          98%,
          100% {
            opacity: 0;
            transform: translateY(-5px);
          }
        }

        @keyframes score-bar {
          0%,
          65% {
            width: 0;
          }
          72%,
          95% {
            width: 82%;
          }
          100% {
            width: 82%;
          }
        }

        @keyframes count-tens {
          0%,
          65% {
            transform: translateY(0);
          }
          72%,
          95% {
            transform: translateY(-800%);
          }
          100% {
            transform: translateY(-800%);
          }
        }

        @keyframes count-units {
          0%,
          65% {
            transform: translateY(0);
          }
          72%,
          95% {
            transform: translateY(-1200%);
          }
          100% {
            transform: translateY(-1200%);
          }
        }
      `}</style>
    </main>
  );
}
