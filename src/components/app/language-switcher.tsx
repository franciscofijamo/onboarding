"use client";

import { useLanguage } from "@/contexts/language";
import { LOCALES, type Locale } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();
  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} className="gap-1.5">
          <span className="text-base leading-none">{current.flag}</span>
          {!compact && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {current.code.split("-")[0].toUpperCase()}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => setLocale(loc.code)}
            className={cn(
              "flex items-center gap-2.5 cursor-pointer",
              locale === loc.code && "bg-accent"
            )}
          >
            <span className="text-base leading-none">{loc.flag}</span>
            <span className="text-sm">{loc.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
