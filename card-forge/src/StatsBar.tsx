import {RARITIES, RARITY_STYLE, columnOf, type BoardCard} from './cards'

export function StatsBar({cards}: {cards: BoardCard[]}) {
  const published = cards.filter((c) => c.status === 'published')
  const pending = cards.filter((c) => columnOf(c) === 'draft' || columnOf(c) === 'verified').length
  const avg = published.length ? published.reduce((sum, c) => sum + c.cvssScore, 0) / published.length : 0

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/5 bg-white/5 font-mono sm:grid-cols-4">
      <Stat label="total cards" value={cards.length} />
      <Stat label="pending review" value={pending} accent={pending ? 'text-terminal' : undefined} />
      <Stat label="avg cvss · published deck" value={avg ? avg.toFixed(2) : '—'} />
      <div className="bg-panel px-4 py-3">
        <dt className="text-[10px] tracking-widest text-zinc-500 uppercase">by rarity</dt>
        <dd className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {RARITIES.map((r) => (
            <span key={r} className={`inline-flex items-center gap-1.5 ${RARITY_STYLE[r].text}`}>
              <span aria-hidden className={`size-2 rounded-full ${RARITY_STYLE[r].dot}`} />
              {cards.filter((c) => c.rarity === r).length} {RARITY_STYLE[r].label.toLowerCase()}
            </span>
          ))}
        </dd>
      </div>
    </dl>
  )
}

function Stat({label, value, accent}: {label: string; value: string | number; accent?: string}) {
  return (
    <div className="bg-panel px-4 py-3">
      <dt className="text-[10px] tracking-widest text-zinc-500 uppercase">{label}</dt>
      <dd className={`mt-1 text-2xl font-bold tabular-nums ${accent ?? 'text-zinc-100'}`}>{value}</dd>
    </div>
  )
}
