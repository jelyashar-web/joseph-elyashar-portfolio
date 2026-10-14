const buckets = new Map<string, number[]>()
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs)
  if (arr.length >= limit) { buckets.set(key, arr); return false }
  arr.push(now); buckets.set(key, arr)
  if (buckets.size > 5000) buckets.clear()
  return true
}
export const ip = (req: Request) => req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
