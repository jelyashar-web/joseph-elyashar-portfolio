import { FAQ } from '@/lib/site'
export default function Faq({ items = FAQ }: { items?: { q: string; a: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((f) => (
        <details key={f.q} className="card p-5 group">
          <summary className="cursor-pointer font-bold flex justify-between items-center list-none">{f.q}<span aria-hidden className="text-cyan-400 group-open:rotate-45 transition-transform text-2xl leading-none">+</span></summary>
          <p className="mt-3 text-gray-300 leading-relaxed">{f.a}</p>
        </details>
      ))}
    </div>
  )
}
