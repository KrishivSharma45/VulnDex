import type {AttackVector, Card} from './types'
import type {Rarity} from './cvss'

export const RARITY_ORDER: Rarity[] = ['legendary', 'epic', 'rare', 'common']

// Full class strings so Tailwind can see them.
export const RARITY_STYLES: Record<
  Rarity,
  {label: string; frame: string; badge: string; accent: string; chipOn: string}
> = {
  legendary: {
    label: 'Legendary',
    frame: 'border-amber-400/80 animate-legendary',
    badge: 'bg-amber-400/15 text-amber-300 ring-amber-400/60',
    accent: 'text-amber-300',
    chipOn: 'bg-amber-400/20 text-amber-200 ring-amber-400/70',
  },
  epic: {
    label: 'Epic',
    frame: 'border-purple-500/80 shadow-[0_0_22px_-6px_rgb(168_85_247/0.6)]',
    badge: 'bg-purple-500/15 text-purple-300 ring-purple-500/60',
    accent: 'text-purple-300',
    chipOn: 'bg-purple-500/20 text-purple-200 ring-purple-500/70',
  },
  rare: {
    label: 'Rare',
    frame: 'border-blue-500/80 shadow-[0_0_18px_-8px_rgb(59_130_246/0.6)]',
    badge: 'bg-blue-500/15 text-blue-300 ring-blue-500/60',
    accent: 'text-blue-300',
    chipOn: 'bg-blue-500/20 text-blue-200 ring-blue-500/70',
  },
  common: {
    label: 'Common',
    frame: 'border-zinc-600',
    badge: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/60',
    accent: 'text-zinc-300',
    chipOn: 'bg-zinc-500/25 text-zinc-100 ring-zinc-400/70',
  },
}

export const ATTACK_VECTOR_LABELS: Record<AttackVector, string> = {
  network: 'Network',
  adjacent: 'Adjacent',
  local: 'Local',
  physical: 'Physical',
}

export const cardHref = (cveId: string) => `/cards/${cveId}`
export const nvdHref = (cveId: string) => `https://nvd.nist.gov/vuln/detail/${cveId}`

/** Deterministic daily pick: random-looking, but the same for everyone all day (UTC). */
export function pickCardOfTheDay(cards: Card[], date = new Date()): Card | undefined {
  if (!cards.length) return undefined
  const day = date.toISOString().slice(0, 10)
  let hash = 2166136261
  for (const ch of day) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0
  return cards[hash % cards.length]
}
