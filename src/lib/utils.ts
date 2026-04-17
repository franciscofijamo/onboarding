import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { randomBytes } from 'crypto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateApiKey(): string {
  const bytes = randomBytes(32);
  return bytes.toString('hex');
}

export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions, locale: string = "pt-MZ") {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options
  }).format(new Date(iso));
}

export function withAssetVersion(url?: string | null, version?: string | null) {
  if (!url) return null;
  if (!version) return url;

  try {
    const isAbsolute = /^https?:\/\//i.test(url);
    const resolved = new URL(url, isAbsolute ? undefined : "http://localhost");
    resolved.searchParams.set("v", version);

    if (isAbsolute) return resolved.toString();

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${encodeURIComponent(version)}`;
  }
}
