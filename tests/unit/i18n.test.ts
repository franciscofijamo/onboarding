import { describe, expect, it } from "vitest";
import enUS from "@/i18n/locales/en-US.json";
import enGB from "@/i18n/locales/en-GB.json";
import ptMZ from "@/i18n/locales/pt-MZ.json";
import { DEFAULT_LOCALE, isLocale, translate } from "@/i18n";

function collectKeys(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") {
    return [prefix];
  }

  if (Array.isArray(value)) {
    return [prefix];
  }

  if (!value || typeof value !== "object") {
    return [prefix];
  }

  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, nested]) => collectKeys(nested, prefix ? `${prefix}.${key}` : key))
    .sort();
}

describe("i18n dictionaries", () => {
  it("keeps the same translation key shape across locales", () => {
    expect(collectKeys(enGB)).toEqual(collectKeys(enUS));
    expect(collectKeys(ptMZ)).toEqual(collectKeys(enUS));
  });

  it("validates supported locales", () => {
    expect(isLocale("en-US")).toBe(true);
    expect(isLocale("en-GB")).toBe(true);
    expect(isLocale("pt-MZ")).toBe(true);
    expect(isLocale("pt-BR")).toBe(false);
  });

  it("falls back to the default locale for missing keys", () => {
    expect(DEFAULT_LOCALE).toBe("pt-MZ");
    expect(translate("pt-MZ", "missing.key")).toBe("missing.key");
    expect(translate("en-GB", "common.save")).toBe("Save");
  });
});
