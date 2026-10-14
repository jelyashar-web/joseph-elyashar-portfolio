'use client'
import { useState } from 'react'
import { track } from '@/lib/track'

export default function LeadFormClient({ source = 'טופס צור קשר', compact = false, services = [] }: { source?: string; compact?: boolean; services?: string[] }) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    try {
      const res = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, source, page: location.href }) })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error || 'שגיאה')
      setState('ok'); track('lead_submit', { source })
    } catch (err) {
      setError((err as Error).message); setState('err')
    }
  }

  if (state === 'ok') return <p role="status" className="card p-6 text-center text-lg">תודה! קיבלתי את הפרטים ואחזור אליך בהקדם 🙌</p>

  const input = 'w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-gray-500 focus:border-cyan-400 outline-none'
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      <div className={compact ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2'}>
        <label className="block"><span className="block text-sm mb-1 text-gray-300">שם מלא</span><input name="name" required autoComplete="name" className={input} /></label>
        <label className="block"><span className="block text-sm mb-1 text-gray-300">טלפון</span><input name="phone" type="tel" required inputMode="tel" autoComplete="tel" dir="ltr" className={input + ' text-right'} /></label>
      </div>
      {!compact && <>
        <label className="block"><span className="block text-sm mb-1 text-gray-300">מייל (לא חובה)</span><input name="email" type="email" autoComplete="email" dir="ltr" className={input + ' text-right'} /></label>
        <label className="block"><span className="block text-sm mb-1 text-gray-300">במה אפשר לעזור?</span>
          <select name="service" className={input} defaultValue=""><option value="">בחירת שירות</option>{services.map((t) => <option key={t}>{t}</option>)}<option>אחר</option></select>
        </label>
        <label className="block"><span className="block text-sm mb-1 text-gray-300">ספרו בקצרה על העסק והצורך</span><textarea name="message" rows={4} className={input} /></label>
      </>}
      {/* honeypot */}
      <div aria-hidden="true" className="sr-only">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <button disabled={state === 'sending'} className="w-full rounded-xl bg-gradient-to-l from-violet-500 to-cyan-400 text-black font-black py-3 hover:opacity-90 disabled:opacity-60">
        {state === 'sending' ? 'שולח…' : 'שלחו לי הצעה ללא עלות'}
      </button>
      {state === 'err' && <p role="alert" className="text-red-400 text-sm">{error}</p>}
    </form>
  )
}
