import { SITE_URL } from '@/lib/site'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const siteUrl = SITE_URL

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Simultaneity Index',
    template: '%s · Simultaneity Index',
  },
  description:
    'See how many teams are already inventing your idea. Live crowding evidence across GitHub, Hacker News, arXiv, OpenAlex, npm, PyPI, and Hugging Face.',
  applicationName: 'Simultaneity Index',
  keywords: [
    'startup idea validation',
    'competitive intelligence',
    'crowding analysis',
    'open source research',
    'idea twins',
  ],
  openGraph: {
    title: 'Simultaneity Index',
    description: 'Live crowding intelligence for builders and AI agents.',
    url: '/',
    siteName: 'Simultaneity Index',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simultaneity Index',
    description: 'How many teams are already inventing your idea?',
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f9f8f7',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
