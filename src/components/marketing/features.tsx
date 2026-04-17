"use client";

import { FileText, Mic, BookOpen, Bot, BarChart2, MessageCircle } from "lucide-react"
import { useLanguage } from "@/contexts/language"

export function Features() {
  const { t } = useLanguage();

  const features = [
    {
      title: t("marketing.feature1Title"),
      description: t("marketing.feature1Description"),
      icon: FileText,
    },
    {
      title: t("marketing.feature2Title"),
      description: t("marketing.feature2Description"),
      icon: BookOpen,
    },
    {
      title: t("marketing.feature3Title"),
      description: t("marketing.feature3Description"),
      icon: Mic,
    },
    {
      title: t("marketing.feature4Title"),
      description: t("marketing.feature4Description"),
      icon: Bot,
    },
    {
      title: t("marketing.feature5Title"),
      description: t("marketing.feature5Description"),
      icon: BarChart2,
    },
    {
      title: t("marketing.feature6Title"),
      description: t("marketing.feature6Description"),
      icon: MessageCircle,
    },
  ]

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
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
