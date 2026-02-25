"use client";
import { useLanguage } from "@/contexts/language";

export function FeaturesHeading() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">{t("marketing.featuresTitle")}</h2>
      <p className="mt-3 text-muted-foreground">{t("marketing.featuresDescription")}</p>
    </div>
  );
}
