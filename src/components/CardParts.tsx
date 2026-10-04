import type {Rarity} from '@/lib/cvss'
import {RARITY_STYLES} from '@/lib/cards'
import type {AttackTypeSummary, CardSetSummary} from '@/lib/types'

export function RarityBadge({rarity, className = ''}: {rarity: Rarity; className?: string}) {
  const s = RARITY_STYLES[rarity]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ${s.badge} ${className}`}
    >
      <span aria-hidden>{s.stars}</span> {s.label}
    </span>
  )
}

export function SetLabel({set}: {set: CardSetSummary | null}) {
  if (!set) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
      <span aria-hidden className="size-2 rounded-full bg-neon shadow-[0_0_6px_rgb(214_227_106/0.32)]" />
      {set.title}
    </span>
  )
}

export function AttackChips({types, small}: {types: AttackTypeSummary[] | null; small?: boolean}) {
  if (!types?.length) return null
  return (
    <ul className="flex flex-wrap gap-1.5">
      {types.map((t) => (
        <li
          key={t._id}
          className={`rounded-full bg-white/[0.06] font-medium text-zinc-300 ring-1 ring-white/10 ${
            small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
          }`}
        >
          {t.name}
        </li>
      ))}
    </ul>
  )
}

export function SoftwareList({items}: {items: string[] | null}) {
  if (!items?.length) return <p className="text-zinc-500">Unknown</p>
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <li key={s} className="rounded bg-white/5 px-2 py-0.5 text-xs text-zinc-300">
          {s}
        </li>
      ))}
    </ul>
  )
}
