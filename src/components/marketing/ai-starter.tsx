"use client"

import { Bot, Sparkles, Zap } from "lucide-react"
import { GlowingEffect } from "@/components/ui/glowing-effect"

export function AIStarter() {
  return (
    <section id="ai-starter" className="relative mt-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(50%_50%_at_50%_0%,hsl(var(--primary)/0.15)_0%,transparent_70%)] blur-2xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mt-4 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-3xl font-semibold tracking-tight text-transparent md:text-4xl">
            Por que o StandOut?
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Ferramentas inteligentes para maximizar suas chances de aprovação em bolsas de estudo.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-6xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="relative rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3">
              <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
              <div className="relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-xl border-[0.75px] bg-background p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
                <span className="inline-flex size-8 items-center justify-center rounded-lg border-[0.75px] border-border bg-muted">
                  <Sparkles className="h-4 w-4 text-sky-500" />
                </span>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Feedback com IA</h3>
                  <p className="text-sm text-muted-foreground">Avaliação detalhada dos seus essays com critérios reais do Chevening e sugestões práticas.</p>
                </div>
              </div>
            </div>

            <div className="relative rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3">
              <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
              <div className="relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-xl border-[0.75px] bg-background p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
                <span className="inline-flex size-8 items-center justify-center rounded-lg border-[0.75px] border-border bg-muted">
                  <Bot className="h-4 w-4 text-emerald-500" />
                </span>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Sugestões de reescrita</h3>
                  <p className="text-sm text-muted-foreground">Comparação lado a lado do original com versões melhoradas e explicação de cada mudança.</p>
                </div>
              </div>
            </div>

            <div className="relative rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3">
              <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
              <div className="relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-xl border-[0.75px] bg-background p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
                <span className="inline-flex size-8 items-center justify-center rounded-lg border-[0.75px] border-border bg-muted">
                  <Zap className="h-4 w-4 text-amber-500" />
                </span>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Probabilidade de aprovação</h3>
                  <p className="text-sm text-muted-foreground">Saiba onde seu essay se posiciona e o que melhorar para aumentar suas chances.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
