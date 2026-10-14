export type Env = { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string; OMNIROUTE_BASE_URL?: string; OMNIROUTE_API_KEY?: string; OMNIROUTE_MODEL?: string }
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))

export type Lead = { name?: string; phone?: string; email?: string; message?: string; service?: string; source?: string; page?: string }

export async function sendLeadToTelegram(lead: Lead, env: Env): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN
  const chatId = env.TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('Telegram env missing')
  const lines = [
    '🚀 <b>ליד חדש מ-elyasharlabs.com</b>',
    lead.source ? `📍 מקור: ${esc(lead.source)}` : '',
    lead.name ? `👤 שם: ${esc(lead.name)}` : '',
    lead.phone ? `📞 טלפון: ${esc(lead.phone)}` : '',
    lead.email ? `✉️ מייל: ${esc(lead.email)}` : '',
    lead.service ? `🛠 שירות: ${esc(lead.service)}` : '',
    lead.message ? `💬 הודעה:\n${esc(lead.message)}` : '',
    lead.page ? `🔗 ${esc(lead.page)}` : '',
    `🕒 ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`,
  ].filter(Boolean)
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
  })
  return res.ok
}
