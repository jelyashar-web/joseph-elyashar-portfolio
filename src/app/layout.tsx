import type { Metadata, Viewport } from 'next'
import { Heebo } from 'next/font/google'
import './globals.css'
import { SITE } from '@/lib/site'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'

const heebo = Heebo({ subsets: ['hebrew', 'latin'], variable: '--font-heebo', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: '%s | יוסף אלישר' },
  description: SITE.description,
  keywords: SITE.keywords,
  authors: [{ name: SITE.person, url: SITE.url }],
  creator: SITE.person,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: 'he_IL', siteName: SITE.name, url: SITE.url, title: SITE.title, description: SITE.description },
  twitter: { card: 'summary_large_image', title: SITE.title, description: SITE.description },
  robots: { index: true, follow: true, googleBot: { 'max-image-preview': 'large', 'max-snippet': -1 } },
  formatDetection: { telephone: true },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#05060a', colorScheme: 'dark' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`dark ${heebo.variable}`}>
      <body className="bg-[#05060a] text-white antialiased overflow-x-hidden">
        <a href="#main" className="skip-link">דילוג לתוכן הראשי</a>
        <Navigation />
        <div id="main">{children}</div>
        <Footer />
        <ChatWidget />
      </body>
    </html>
  )
}
