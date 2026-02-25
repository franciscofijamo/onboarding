import type { Metadata } from "next";
import { Onest, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { LanguageProvider } from "@/contexts/language";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import { siteMetadata } from "@/lib/brand-config";
import { AnalyticsPixels } from "@/components/analytics/pixels";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = siteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="pt-br" suppressHydrationWarning>
        <body
          suppressHydrationWarning
          className={`${onest.variable} ${geistMono.variable} antialiased  text-foreground`}
        >
          <AnalyticsPixels />
          <QueryProvider>
            <ThemeProvider>
              <LanguageProvider>
                {children}
                <Toaster />
              </LanguageProvider>
            </ThemeProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
