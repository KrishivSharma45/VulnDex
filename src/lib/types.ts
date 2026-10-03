import type {PortableTextBlock} from 'next-sanity'

import type {Rarity, Severity} from './cvss'

export type AttackVector = 'network' | 'adjacent' | 'local' | 'physical'

export type CardSetSummary = {_id: string; title: string; themeColor?: string}
export type AttackTypeSummary = {_id: string; name: string}

/** Shape returned by CARD_PROJECTION in src/sanity/lib/queries.ts */
export type Card = {
  _id: string
  cveId: string
  nickname: string
  year: number
  cvssScore: number
  severity: Severity
  rarity: Rarity
  attackVector: AttackVector
  affectedSoftware: string[] | null
  summary: string | null
  story: PortableTextBlock[] | null
  patchInfo: string | null
  set: CardSetSummary | null
  attackTypes: AttackTypeSummary[] | null
}
