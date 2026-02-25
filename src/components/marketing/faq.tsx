"use client";
import { useLanguage } from "@/contexts/language";

export function FAQ() {
  const { t } = useLanguage();

  const faqs = [
    { q: t("marketing.faq1q"), a: t("marketing.faq1a") },
    { q: t("marketing.faq2q"), a: t("marketing.faq2a") },
    { q: t("marketing.faq3q"), a: t("marketing.faq3a") },
    { q: t("marketing.faq4q"), a: t("marketing.faq4a") },
  ];

  return (
    <section id="faq" className="container mx-auto px-4 mt-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">{t("marketing.faqTitle")}</h2>
        <p className="mt-3 text-muted-foreground">{t("marketing.faqSubtitle")}</p>
      </div>
      <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6">
        {faqs.map((f) => (
          <div
            key={f.q}
            className="group relative overflow-hidden rounded-xl border border-gray-100/80 bg-white p-6 transition-all duration-300 will-change-transform hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-white/10 dark:bg-black"
          >
            <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[length:4px_4px] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
            </div>
            <h3 className="relative text-base font-semibold">{f.q}</h3>
            <p className="relative mt-2 text-sm text-muted-foreground">{f.a}</p>
            <div className="absolute inset-0 -z-10 rounded-xl p-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-transparent via-gray-100/50 to-transparent dark:via-white/10" />
          </div>
        ))}
      </div>
    </section>
  )
}
