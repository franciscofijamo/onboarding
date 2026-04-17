"use client";
import Link from "next/link"
import { site } from "@/lib/brand-config"
import { useLanguage } from "@/contexts/language"

export function PublicFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t mt-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:flex-row lg:px-10">
        <p>
          © {new Date().getFullYear()} {site.name}. {t("marketing.allRightsReserved")}
        </p>
        <nav className="flex items-center gap-6">
          <Link className="hover:text-foreground" href="#features">{t("marketing.features")}</Link>
          <Link className="hover:text-foreground" href="#pricing">{t("marketing.pricing")}</Link>
          <Link className="hover:text-foreground" href="#faq">{t("marketing.faqNav")}</Link>
          <Link className="hover:text-foreground" href="/sign-in">{t("marketing.signIn")}</Link>
        </nav>
      </div>
    </footer>
  )
}
