"use client";

import { FileText, Mic, BookOpen, Bot, BarChart2, MessageCircle } from "lucide-react"
import { useLanguage } from "@/contexts/language"

export function Features() {
  const { t } = useLanguage();

  const features = [
    {
      title: "CV Analysis",
      titlePtMZ: "Análise de CV",
      description: "AI-powered comparison of your CV against job descriptions with detailed fit scoring.",
      descriptionPtMZ: "Comparação do seu CV com descrições de vagas usando IA com nota de adequação detalhada.",
      icon: FileText,
    },
    {
      title: "Interview Prep",
      titlePtMZ: "Preparação para Entrevista",
      description: "AI-generated flashcards with interview questions tailored to your role and industry.",
      descriptionPtMZ: "Flashcards com perguntas de entrevista geradas por IA adaptadas à sua função e indústria.",
      icon: BookOpen,
    },
    {
      title: "Workplace Scenarios",
      titlePtMZ: "Cenários de Trabalho",
      description: "Audio simulations of real workplace situations like meetings and presentations.",
      descriptionPtMZ: "Simulações áudio de situações reais de trabalho como reuniões e apresentações.",
      icon: Mic,
    },
    {
      title: "AI Career Coach",
      titlePtMZ: "Coach de Carreira IA",
      description: "Personalized career advice, Business English coaching, and application support.",
      descriptionPtMZ: "Conselhos personalizados de carreira, coaching de Business English e apoio na candidatura.",
      icon: Bot,
    },
    {
      title: "Skills Gap Analysis",
      titlePtMZ: "Análise de Lacunas",
      description: "Identify missing skills and get actionable recommendations to improve your profile.",
      descriptionPtMZ: "Identifique competências em falta e receba recomendações práticas para melhorar o seu perfil.",
      icon: BarChart2,
    },
    {
      title: "Business English",
      titlePtMZ: "Business English",
      description: "Professional vocabulary, email writing, and meeting etiquette coaching.",
      descriptionPtMZ: "Coaching de vocabulário profissional, escrita de emails e etiqueta de reuniões.",
      icon: MessageCircle,
    },
  ]

  const isPtMZ = t("nav.dashboard") === "Painel";

  return (
    <section id="features" className="container mx-auto px-4 mt-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">{t("marketing.featuresTitle")}</h2>
        <p className="mt-3 text-muted-foreground">{t("marketing.featuresDescription")}</p>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="group relative rounded-xl border bg-card/60 p-6 backdrop-blur-md">
            <div className="flex size-10 items-center justify-center rounded-md border bg-white/40 dark:bg-white/10">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{isPtMZ ? f.titlePtMZ : f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{isPtMZ ? f.descriptionPtMZ : f.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
