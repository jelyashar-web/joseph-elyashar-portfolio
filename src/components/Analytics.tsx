'use client'
import { useEffect } from 'react'
import { track } from '@/lib/track'
export default function Analytics() {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a') as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute('href') || ''
      const page = location.pathname
      if (href.startsWith('tel:')) track('phone_click', { page })
      else if (href.includes('wa.me') || href.includes('whatsapp')) track('whatsapp_click', { page })
      else if (href.startsWith('mailto:')) track('email_click', { page })
    }
    document.addEventListener('click', h, true)
    return () => document.removeEventListener('click', h, true)
  }, [])
  return null
}
