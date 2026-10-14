'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const links = [
  { href: '/#services', label: 'שירותים' },
  { href: '/#projects', label: 'פרויקטים' },
  { href: '/#process', label: 'איך זה עובד' },
  { href: '/#faq', label: 'שאלות נפוצות' },
  { href: '/blog/', label: 'בלוג' },
]

export default function Navigation() {
  const [open, setOpen] = useState(false)
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#05060a]/80 backdrop-blur-xl">
      <nav aria-label="ניווט ראשי" className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
        <Link href="/" className="font-black text-lg tracking-tight" aria-label="ElyasharLabs – דף הבית">
          Elyashar<span className="grad-text">Labs</span>
        </Link>
        <ul className="hidden md:flex items-center gap-7 text-sm text-gray-300">
          {links.map((l) => <li key={l.href}><Link className="hover:text-white transition-colors" href={l.href}>{l.label}</Link></li>)}
        </ul>
        <Link href="/#contact" className="hidden md:inline-flex rounded-full bg-white text-black px-5 py-2 text-sm font-bold hover:bg-cyan-300 transition-colors">ייעוץ ללא עלות</Link>
        <button className="md:hidden p-2" aria-label={open ? 'סגירת תפריט' : 'פתיחת תפריט'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open && (
        <ul id="mobile-menu" className="md:hidden px-4 pb-4 space-y-1 border-t border-white/5">
          {[...links, { href: '/#contact', label: 'ייעוץ ללא עלות' }].map((l) => (
            <li key={l.href}><Link onClick={() => setOpen(false)} className="block py-3 text-gray-200" href={l.href}>{l.label}</Link></li>
          ))}
        </ul>
      )}
    </header>
  )
}
