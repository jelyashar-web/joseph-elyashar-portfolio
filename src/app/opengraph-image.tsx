export const dynamic = 'force-static'
import { ImageResponse } from 'next/og'
export const alt = 'יוסף אלישר – בניית צ\'אטבוט וסוכני AI לעסקים'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OG() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: 'linear-gradient(135deg,#05060a 0%,#1e1240 55%,#053845 100%)', color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 40, opacity: 0.8, display: 'flex' }}>ElyasharLabs</div>
        <div style={{ fontSize: 84, fontWeight: 900, marginTop: 20, display: 'flex' }}>AI Agents · Chatbots · Automation</div>
        <div style={{ fontSize: 40, marginTop: 30, color: '#22d3ee', display: 'flex' }}>Joseph Elyashar · elyasharlabs.com</div>
      </div>
    ),
    size
  )
}
