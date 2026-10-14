'use client'
import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { track } from '@/lib/track'

type Msg = { role: 'user' | 'assistant'; content: string }
const LEAD_RE = /\[\[LEAD:(\{[\s\S]*?\})\]\]/

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: 'היי! אני גולם, העוזר של יוסף 👋 ספרו לי על העסק שלכם ואמליץ איך AI ואוטומציה יכולים לחסוך לכם זמן וכסף.' }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const leadSent = useRef(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs])
  const sid = useRef('')
  const greeted = useRef(false)
  function getSid() {
    if (sid.current) return sid.current
    try { sid.current = sessionStorage.getItem('golem_sid') || '' } catch {}
    if (!sid.current) { sid.current = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, ''); try { sessionStorage.setItem('golem_sid', sid.current) } catch {} }
    return sid.current
  }
  useEffect(() => {
    if (!open) return
    track('chat_open', { page: location.pathname })
    if (greeted.current) return; greeted.current = true
    fetch('/api/chat').then((r) => r.json()).then((j) => { if (j.greeting) setMsgs((m) => (m.length === 1 ? [{ role: 'assistant', content: j.greeting }] : m)) }).catch(() => {})
  }, [open])

  async function send(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    const history: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs([...history, { role: 'assistant', content: '' }]); setInput(''); setBusy(true); track('chat_message')
    let full = ''
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(1), sessionId: getSid(), page: location.href }) })
      if (!res.ok || !res.body) { full = await res.text() } else {
        const reader = res.body.getReader(); const dec = new TextDecoder()
        for (;;) {
          const { done, value } = await reader.read(); if (done) break
          full += dec.decode(value, { stream: true })
          setMsgs([...history, { role: 'assistant', content: full.replace(/\[\[LEAD:[\s\S]*$/, '').trim() }])
        }
      }
    } catch { full = 'אופס, משהו השתבש. אפשר לפנות בוואטסאפ 058-442-3342.' }
    const m = full.match(LEAD_RE)
    if (m && !leadSent.current) {
      try {
        const lead = JSON.parse(m[1])
        if (lead.phone || lead.email) {
          leadSent.current = true; track('chat_lead')
          fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
            name: lead.name, phone: lead.phone, email: lead.email, source: 'צ\'אטבוט באתר',
            message: (lead.need ? `צורך: ${lead.need}\n\n` : '') + history.filter((h) => h.role === 'user').map((h) => '• ' + h.content).join('\n').slice(0, 1500),
            page: location.href }) }).catch(() => {})
        }
      } catch {}
    }
    setMsgs([...history, { role: 'assistant', content: full.replace(LEAD_RE, '').trim() || '…' }])
    setBusy(false)
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label={open ? 'סגירת הצ\'אט' : 'פתיחת צ\'אט עם העוזר החכם'} aria-expanded={open}
        className="fixed bottom-5 left-5 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-black shadow-lg shadow-cyan-500/30 grid place-items-center hover:scale-105 transition-transform">
        {open ? <X /> : <MessageCircle />}
      </button>
      {open && (
        <section role="dialog" aria-label="צ'אט עם העוזר החכם" style={{ background: "#0b0d14" }} className="fixed bottom-24 left-5 right-5 sm:right-auto sm:w-96 z-50 card bg-[#0b0d14]/95 backdrop-blur-xl flex flex-col max-h-[70vh] shadow-2xl">
          <header className="px-4 py-3 border-b border-white/10">
            <p className="font-bold">גולם · העוזר החכם</p>
            <p className="text-xs text-gray-400">מבוסס AI · עונה מיד</p>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
            {msgs.map((m, i) => (
              <p key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'mr-auto ml-0 bg-cyan-400 text-black' : 'bg-white/5 text-gray-100'}`} style={m.role === 'user' ? { marginRight: 'auto' } : undefined}>
                {m.content || <span className="opacity-60">מקליד…</span>}
              </p>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="p-3 border-t border-white/10 flex gap-2">
            <label htmlFor="chat-input" className="sr-only">הודעה</label>
            <input id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="כתבו הודעה…" maxLength={1000}
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-400" />
            <button disabled={busy} aria-label="שליחה" className="rounded-xl bg-cyan-400 text-black px-3 disabled:opacity-50"><Send className="w-4 h-4 -scale-x-100" /></button>
          </form>
        </section>
      )}
    </>
  )
}
