"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { type Locale, DEFAULT_LOCALE, translate, getTranslationArray } from "@/i18n";

const STORAGE_KEY = "app.language";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === "pt-MZ" || saved === "en-US" || saved === "en-GB")) {
      setLocaleState(saved as Locale);
    }
    setHydrated(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, newLocale);
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      return translate(locale, key, vars);
    },
    [locale]
  );

  const tArray = useCallback(
    (key: string) => {
      return getTranslationArray(locale, key);
    },
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, tArray }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
