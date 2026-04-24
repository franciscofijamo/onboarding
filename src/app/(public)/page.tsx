"use client";

import { Hero } from "@/components/marketing/hero"
import { Features } from "@/components/marketing/features"
import { Testimonials } from "@/components/marketing/testimonials"
import { FAQ } from "@/components/marketing/faq"
import { GuestEvaluator } from "@/components/marketing/guest-evaluator"

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center pt-20 pb-16 px-4">
      <div className="text-center space-y-6 max-w-3xl mb-12">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          StandOut
        </h1>
        <p className="text-xl text-muted-foreground">
          Descubra o seu Match e consiga aquela vaga dos sonhos com ajuda da IA.
        </p>
      </div>
      
      <GuestEvaluator />
    </div>
  )
}
