import Link from 'next/link'
import { SITE, SERVICES } from '@/lib/site'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-24">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-3 text-sm text-gray-400">
        <div>
          <p className="font-black text-white text-lg mb-2">Elyashar<span className="grad-text">Labs</span></p>
          <p>{SITE.person} – בניית צ'אטבוטים, סוכני AI ואוטומציה לעסקים בישראל.</p>
        </div>
        <nav aria-label="שירותים">
          <p className="text-white font-bold mb-2">שירותים</p>
          <ul className="space-y-1">{SERVICES.map((s) => <li key={s.slug}><Link className="hover:text-white" href={`/services/${s.slug}/`}>{s.title}</Link></li>)}</ul>
        </nav>
        <div>
          <p className="text-white font-bold mb-2">יצירת קשר</p>
          <ul className="space-y-1">
            <li><a className="hover:text-white" href={`tel:${SITE.phoneIntl}`}>{SITE.phone}</a></li>
            <li><a className="hover:text-white" href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
            <li><a className="hover:text-white" href={SITE.whatsapp} rel="noopener" target="_blank">וואטסאפ</a></li>
            <li><a className="hover:text-white" href={SITE.github} rel="noopener" target="_blank">GitHub</a></li>
          </ul>
        </div>
      </div>
      <p className="text-center text-xs text-gray-600 pb-8">© {new Date().getFullYear()} {SITE.name}. כל הזכויות שמורות.</p>
    </footer>
  )
}
