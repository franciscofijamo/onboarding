import type { Metadata } from 'next'

type LogoPaths = {
  light?: string
  dark?: string
}

type IconPaths = {
  favicon?: string
  apple?: string
  shortcut?: string
}

export type AnalyticsConfig = {
  gtmId?: string
  gaMeasurementId?: string
  facebookPixelId?: string
}

export const site = {
  name: 'StandOut',
  shortName: 'StandOut',
  description:
    'StandOut — A plataforma inteligente para candidatos a bolsas de estudo. Avaliação de essays com IA, feedback detalhado e ferramentas para se destacar.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  author: 'StandOut',
  keywords: ['StandOut', 'Chevening', 'Bolsa de estudo', 'Essay', 'IA', 'Avaliação', 'Feedback'],
  ogImage: '/og-image.png',
  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
  } as LogoPaths,
  icons: {
    favicon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-16x16.png',
  } as IconPaths,
  socials: {
    twitter: '@standout',
  },
  support: {
    email: 'suporte@standout.app',
  },
  analytics: {
    gtmId: process.env.NEXT_PUBLIC_GTM_ID,
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_ID,
    facebookPixelId: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID,
  } as AnalyticsConfig,
} as const

export const siteMetadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.name,
  description: site.description,
  keywords: [...site.keywords],
  authors: [{ name: site.author }],
  openGraph: {
    title: site.name,
    description: site.description,
    url: site.url,
    siteName: site.name,
    images: site.ogImage ? [{ url: site.ogImage }] : undefined,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: site.name,
    description: site.description,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
    shortcut: ['/apple-touch-icon.png'],
  },
}
