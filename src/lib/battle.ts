import {ATTACK_VECTOR_LABELS} from './cards'
import type {AttackVector, Card} from './types'

export type Side = 'a' | 'b' | 'draw'

export type Round = {
  key: 'power' | 'age' | 'reach' | 'vector'
  label: string
  rule: string
  a: string
  b: string
  winner: Side
}

export type BattleResult = {
  rounds: Round[]
  score: {a: number; b: number}
  winner: Side
  /** How a tie on rounds was settled, if it was. */
  tiebreak: string | null
  log: string
}

// Network beats Adjacent beats Local beats Physical.
const VECTOR_RANK: Record<AttackVector, number> = {network: 4, adjacent: 3, local: 2, physical: 1}

const compare = (a: number, b: number): Side => (a > b ? 'a' : b > a ? 'b' : 'draw')
const reach = (c: Card) => c.affectedSoftware?.length ?? 0

export function battle(a: Card, b: Card): BattleResult {
  const rounds: Round[] = [
    {
      key: 'power',
      label: 'Power',
      rule: 'Higher CVSS wins',
      a: a.cvssScore.toFixed(1),
      b: b.cvssScore.toFixed(1),
      winner: compare(a.cvssScore, b.cvssScore),
    },
    {
      key: 'age',
      label: 'Age',
      rule: 'Older wins (legacy damage)',
      a: String(a.year),
      b: String(b.year),
      winner: compare(b.year, a.year),
    },
    {
      key: 'reach',
      label: 'Reach',
      rule: 'More affected software wins',
      a: `${reach(a)} products`,
      b: `${reach(b)} products`,
      winner: compare(reach(a), reach(b)),
    },
    {
      key: 'vector',
      label: 'Vector',
      rule: 'Network > Adjacent > Local > Physical',
      a: ATTACK_VECTOR_LABELS[a.attackVector],
      b: ATTACK_VECTOR_LABELS[b.attackVector],
      winner: compare(VECTOR_RANK[a.attackVector], VECTOR_RANK[b.attackVector]),
    },
  ]

  const score = {
    a: rounds.filter((r) => r.winner === 'a').length,
    b: rounds.filter((r) => r.winner === 'b').length,
  }

  let winner = compare(score.a, score.b)
  let tiebreak: string | null = null
  if (winner === 'draw') {
    winner = compare(a.cvssScore, b.cvssScore)
    tiebreak = winner === 'draw' ? null : 'Rounds tied; settled on raw CVSS power.'
  }

  return {rounds, score, winner, tiebreak, log: battleLog(a, b, rounds, winner)}
}

// --- Battle log ----------------------------------------------------------------

/** Stable hash so the same matchup always gets the same log line (shareable, hydration-safe). */
function hash(s: string) {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return h
}

const pick = <T,>(options: T[], seed: number) => options[seed % options.length]

const VECTOR_WEAKNESS: Record<AttackVector, string> = {
  network: 'is reachable from anywhere',
  adjacent: 'has to be on the same network first',
  local: 'still needs a shell on the box',
  physical: 'needs someone to physically walk up to the machine',
}

type Flavor = (w: Card, l: Card) => string

/** "a 9.8" / "an 8.8" */
const aScore = (c: Card) => {
  const s = c.cvssScore.toFixed(1)
  return `${s.startsWith('8') ? 'an' : 'a'} ${s}`
}

const FLAVORS: Record<Round['key'], Flavor[]> = {
  power: [
    (w, l) => `${aScore(w)} hits harder than ${aScore(l)}, no matter how good the logo is.`,
    (w) => `CVSS ${w.cvssScore.toFixed(1)}. The scoring calculator has spoken.`,
    (w, l) => `${l.nickname} brought ${aScore(l)} to ${aScore(w)} fight.`,
  ],
  age: [
    (w) => `it's been lurking since ${w.year} and nobody dared touch the legacy code.`,
    (w, l) => `${w.year} vintage. ${l.nickname} wasn't even assigned a CVE yet.`,
    (w) => `some servers still haven't patched it since ${w.year}.`,
  ],
  reach: [
    (w) => `it's in ${reach(w)} products and counting.`,
    (w, l) => `${reach(w)} vendors' advisories vs ${reach(l)}. Supply chains remember.`,
    () => `it's bundled in firmware nobody knew they were running.`,
  ],
  vector: [
    (w, l) => `${w.nickname} ${VECTOR_WEAKNESS[w.attackVector]}, while ${l.nickname} ${VECTOR_WEAKNESS[l.attackVector]}.`,
    (_w, l) => `${l.nickname} ${VECTOR_WEAKNESS[l.attackVector]}. Amateur hour.`,
  ],
}

const OPENERS: ((w: string, l: string) => string)[] = [
  (w, l) => `${w} exploits ${l}'s weakness:`,
  (w, l) => `${w} owns ${l}:`,
  (w, l) => `${l} gets patched out by ${w}:`,
  (w, l) => `${w} pivots straight through ${l}:`,
]

function battleLog(a: Card, b: Card, rounds: Round[], winner: Side): string {
  const seed = hash(`${a.cveId}|${b.cveId}`)

  if (winner === 'draw') {
    return pick(
      [
        `${a.nickname} and ${b.nickname} deadlock. Both get added to the same incident report.`,
        `Stalemate. ${a.nickname} and ${b.nickname} agree to share the SOC's weekend.`,
      ],
      seed,
    )
  }

  const [w, l] = winner === 'a' ? [a, b] : [b, a]
  // Flavor comes from a round the winner actually won; fall back to power.
  const won = rounds.filter((r) => r.winner === winner).map((r) => r.key)
  const key = won.length ? pick(won, seed >>> 3) : 'power'
  const opener = pick(OPENERS, seed >>> 7)(w.nickname, l.nickname)
  const flavor = pick(FLAVORS[key], seed >>> 11)(w, l)
  return `${opener} ${flavor}`
}
