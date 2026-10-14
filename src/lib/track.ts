'use client'
export function track(event: string, data?: Record<string, string | number>) {
  try { (window as any).umami?.track(event, data) } catch {}
}
