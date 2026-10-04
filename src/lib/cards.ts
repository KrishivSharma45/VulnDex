import type {AttackVector, Card} from './types'
import type {Rarity} from './cvss'

export const RARITY_ORDER: Rarity[] = ['legendary', 'epic', 'rare', 'common']

// One colour for every card: the site's neon accent. Rarity is told apart by
// stars (and only Legendary pulses), not by a different colour per tier.
// Full class strings so Tailwind can see them.
const NEON = {
  frame: 'border-neon/35 shadow-[0_0_20px_-8px_rgb(234_255_61/0.36)]',
  badge: 'bg-neon/10 text-neon ring-neon/35',
  accent: 'text-neon',
  chipOn: 'bg-neon/15 text-neon ring-neon/70',
}

export const RARITY_STYLES: Record<
  Rarity,
  {label: string; stars: string; frame: string; badge: string; accent: string; chipOn: string}
> = {
  legendary: {...NEON, label: 'Legendary', stars: '★★★★', frame: 'border-neon/70 animate-neon-pulse'},
  epic: {...NEON, label: 'Epic', stars: '★★★'},
  rare: {...NEON, label: 'Rare', stars: '★★'},
  common: {...NEON, label: 'Common', stars: '★', frame: 'border-neon/25'},
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
