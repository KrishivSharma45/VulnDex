// Single source of truth for values derived from a CVSS score.
// Used by the Studio (auto-filled fields) and the frontend.

export const SEVERITIES = [
  {title: 'None', value: 'none'},
  {title: 'Low', value: 'low'},
  {title: 'Medium', value: 'medium'},
  {title: 'High', value: 'high'},
  {title: 'Critical', value: 'critical'},
] as const

export const RARITIES = [
  {title: 'Common', value: 'common'},
  {title: 'Rare', value: 'rare'},
  {title: 'Epic', value: 'epic'},
  {title: 'Legendary', value: 'legendary'},
] as const

export type Severity = (typeof SEVERITIES)[number]['value']
export type Rarity = (typeof RARITIES)[number]['value']

/** CVSS v3 qualitative severity rating. */
export function getSeverity(score: number): Severity {
  if (score === 0) return 'none'
  if (score < 4) return 'low'
  if (score < 7) return 'medium'
  if (score < 9) return 'high'
  return 'critical'
}

/** 9+ Legendary, 7–8.9 Epic, 4–6.9 Rare, <4 Common. */
export function getRarity(score: number): Rarity {
  if (score >= 9) return 'legendary'
  if (score >= 7) return 'epic'
  if (score >= 4) return 'rare'
  return 'common'
}
