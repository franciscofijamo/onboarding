"use client";

import { useLanguage } from "@/contexts/language"

export function Testimonials() {
  const { t } = useLanguage();
  const testimonials = [
    {
      name: "Ana M.",
      role: t("marketing.testimonial1Role"),
      quote: t("marketing.testimonial1Quote"),
    },
    {
      name: "Carlos P.",
      role: t("marketing.testimonial2Role"),
      quote: t("marketing.testimonial2Quote"),
    },
    {
      name: "Sofia R.",
      role: t("marketing.testimonial3Role"),
      quote: t("marketing.testimonial3Quote"),
    },
  ];

  return (
    <section className="container mx-auto px-4 mt-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">{t("marketing.testimonialsTitle")}</h2>
        <p className="mt-3 text-muted-foreground">{t("marketing.testimonialsSubtitle")}</p>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {testimonials.map((t) => (
          <figure
            key={t.name}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-300 will-change-transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[length:4px_4px] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
            </div>
            <blockquote className="relative text-sm leading-relaxed">"{t.quote}"</blockquote>
            <figcaption className="relative mt-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t.name}</span> · {t.role}
            </figcaption>
            <div className="absolute inset-0 -z-10 rounded-xl p-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-transparent via-gray-100/50 to-transparent dark:via-white/10" />
          </figure>
        ))}
      </div>
    </section>
  )
}
