// Simple in-memory sliding-window limiter (per serverless instance).
const buckets = new Map<string, number[]>()
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs)
  if (arr.length >= limit) { buckets.set(key, arr); return false }
  arr.push(now); buckets.set(key, arr)
  if (buckets.size > 5000) buckets.clear()
  return true
}
export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
}
