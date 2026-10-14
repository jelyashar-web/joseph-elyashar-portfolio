import { E, sleep } from './lib.mjs'
export async function chat(messages, { model, temperature = 0.6, max_tokens = 8000, json = false } = {}) {
  let last
  const tries = [[model || E.LLM_MODEL || 'auto/best-chat', E.OMNIROUTE_FULL_KEY], [model || E.LLM_MODEL || 'auto/best-chat', E.OMNIROUTE_FULL_KEY], ['golem-fast', E.OMNIROUTE_API_KEY], ['golem-fast', E.OMNIROUTE_API_KEY]]
  for (let i = 0; i < tries.length; i++) {
    const [mdl, key] = tries[i]; if (!key) continue
    try {
      const r = await fetch('http://127.0.0.1:20128/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
        body: JSON.stringify({ model: mdl, messages, temperature, max_tokens, stream: false }), signal: AbortSignal.timeout(180000) })
      const j = await r.json(); if (!r.ok) throw new Error('LLM ' + r.status + ' ' + JSON.stringify(j).slice(0, 300))
      let t = j.choices[0].message.content || ''
      t = t.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      if (json) { const m = t.match(/\{[\s\S]*\}/); return JSON.parse(m[0]) }
      return t
    } catch (e) { last = e; console.error("llm retry", mdl, String(e.message).slice(0,150)); await sleep(3000 * (i + 1)) }
  }
  throw last
}
