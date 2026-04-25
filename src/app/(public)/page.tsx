"use client";

import { Hero } from "@/components/marketing/hero"
import { Features } from "@/components/marketing/features"
import { Testimonials } from "@/components/marketing/testimonials"
import { FAQ } from "@/components/marketing/faq"
import { GuestEvaluator } from "@/components/marketing/guest-evaluator"

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 pb-16 pt-16 sm:pt-20">
      <div className="mb-10 max-w-3xl space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          AI career fit check
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
          StandOut
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          Descubra o seu Match e consiga aquela vaga dos sonhos com ajuda da IA.
        </p>
      </div>
      
      <GuestEvaluator />
    </div>
  )
}
