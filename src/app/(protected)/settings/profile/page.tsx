"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, FileUser, Globe } from "lucide-react";
import { useSetPageMetadata } from "@/contexts/page-metadata";
import { useLanguage } from "@/contexts/language";
import { useProfile } from "@/hooks/use-profile";
import { api } from "@/lib/api-client";
import { LOCALES, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function ProfileSettingsPage() {
  const queryClient = useQueryClient();
  const { t, locale, setLocale } = useLanguage();
  const { role } = useProfile();
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedLocale(locale);
  }, [locale]);

  useSetPageMetadata({
    title: t("profileSettings.title"),
    description: t("profileSettings.description"),
    breadcrumbs: [
      { label: t("nav.dashboard"), href: "/dashboard" },
      { label: t("nav.settings") },
    ],
  });

  const profileHref = role === "RECRUITER" ? "/company/profile" : "/onboarding";
  const ProfileIcon = role === "RECRUITER" ? Building2 : FileUser;
  const profileTitle = role === "RECRUITER"
    ? t("profileSettings.companyProfileTitle")
    : t("profileSettings.candidateProfileTitle");
  const profileDescription = role === "RECRUITER"
    ? t("profileSettings.companyProfileDescription")
    : t("profileSettings.candidateProfileDescription");

  const handleSaveLanguage = async () => {
    if (selectedLocale === locale) return;

    setIsSaving(true);
    try {
      await api.patch("/api/profile", { locale: selectedLocale });
      setLocale(selectedLocale);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: t("profileSettings.languageSaved"),
        description: t("profileSettings.languageSavedDescription"),
      });
    } catch {
      toast({
        title: t("profileSettings.languageSaveError"),
        description: t("profileSettings.languageSaveErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="rounded-3xl border-border/70">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t("profileSettings.languageTitle")}</CardTitle>
              <CardDescription>{t("profileSettings.languageDescription")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <RadioGroup
            value={selectedLocale}
            onValueChange={(value) => setSelectedLocale(value as Locale)}
            className="grid gap-3"
          >
            {LOCALES.map((option) => (
              <Label
                key={option.code}
                htmlFor={option.code}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors",
                  selectedLocale === option.code
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <RadioGroupItem value={option.code} id={option.code} />
                <span className="text-xl leading-none">{option.flag}</span>
                <div className="flex flex-1 items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {t(`profileSettings.localeHelp.${option.code}`)}
                    </div>
                  </div>
                  {locale === option.code && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("profileSettings.currentLanguage")}
                    </span>
                  )}
                </div>
              </Label>
            ))}
          </RadioGroup>

          <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
            {t("profileSettings.languageImpact")}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveLanguage} disabled={isSaving || selectedLocale === locale}>
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
              <ProfileIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{profileTitle}</CardTitle>
              <CardDescription>{profileDescription}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("profileSettings.profileCtaDescription")}
          </p>
          <Button asChild variant="outline" className="w-full justify-start rounded-xl">
            <Link href={profileHref}>
              <ProfileIcon className="mr-2 h-4 w-4" />
              {t("profileSettings.openProfile")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
