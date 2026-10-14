import { rateLimit, ip, json } from '../_lib/util'
import { sendLeadToTelegram, type Env } from '../_lib/telegram'

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

export const onRequestPost = async ({ request: req, env }: { request: Request; env: Env }) => {
  if (!rateLimit('lead:' + ip(req), 5, 10 * 60_000))
    return json({ ok: false, error: 'יותר מדי פניות, נסו שוב בעוד כמה דקות' }, 429)
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ ok: false, error: 'bad json' }, 400) }

  // Honeypot: real users never fill "website". Pretend success.
  if (clip(body.website, 200)) return json({ ok: true })

  const lead = {
    name: clip(body.name, 100),
    phone: clip(body.phone, 30),
    email: clip(body.email, 120),
    message: clip(body.message, 2000),
    service: clip(body.service, 100),
    source: clip(body.source, 50) || 'טופס באתר',
    page: clip(body.page, 300),
  }
  if (!lead.phone && !lead.email)
    return json({ ok: false, error: 'נא להשאיר טלפון או מייל' }, 400)
  if (lead.phone && !/^[+\d][\d\s-]{6,}$/.test(lead.phone))
    return json({ ok: false, error: 'מספר טלפון לא תקין' }, 400)
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email))
    return json({ ok: false, error: 'כתובת מייל לא תקינה' }, 400)

  try {
    const ok = await sendLeadToTelegram(lead, env)
    if (!ok) throw new Error('telegram rejected')
    return json({ ok: true })
  } catch (e) {
    console.error('lead error', e)
    return json({ ok: false, error: 'שגיאה בשליחה, אפשר להתקשר 058-442-3342' }, 502)
  }
}
