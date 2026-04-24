"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { useProfile } from "@/hooks/use-profile";
import { type Locale, DEFAULT_LOCALE, LOCALES, translate, getTranslationArray, isLocale } from "@/i18n";

const STORAGE_KEY = "app.language";

const validLocales = LOCALES.map((l) => l.code) as string[];

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { locale: profileLocale } = useProfile({ enabled: isLoaded && isSignedIn });
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isLocale(saved) && validLocales.includes(saved)) {
      setLocaleState(saved as Locale);
    } else {
      window.localStorage.setItem(STORAGE_KEY, DEFAULT_LOCALE);
      setLocaleState(DEFAULT_LOCALE);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    if (!isLocale(profileLocale)) return;

    setLocaleState(profileLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, profileLocale);
    }
  }, [isLoaded, isSignedIn, profileLocale]);

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
