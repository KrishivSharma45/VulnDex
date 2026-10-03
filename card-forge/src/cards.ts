export type Rarity = 'legendary' | 'epic' | 'rare' | 'common'
export type Status = 'draft' | 'verified' | 'published'
export type Column = 'draft' | 'verified' | 'published' | 'rejected'

export type BoardCard = {
  _id: string
  cveId: string
  nickname: string
  cvssScore: number
  rarity: Rarity
  status: Status
  rejectionReason: string | null
  _updatedAt: string
  last: {action: string; actorName: string; at: string; via?: string} | null
}

/** Live board query: every card, newest activity first. */
export const BOARD_QUERY = `*[_type == "cveCard" && defined(cveId)] | order(_updatedAt desc) {
  _id, cveId, nickname, cvssScore, rarity, status, rejectionReason, _updatedAt,
  "last": reviewLog[-1]{action, actorName, at, via}
}`

/** "Rejected" is a draft that carries a reviewer's reason. */
export const columnOf = (c: BoardCard): Column =>
  c.status === 'draft' && c.rejectionReason ? 'rejected' : c.status

export const COLUMNS: {key: Column; title: string; hint: string}[] = [
  {key: 'draft', title: 'Draft', hint: 'agent drafted · awaiting fact-check'},
  {key: 'verified', title: 'Verified', hint: 'facts checked · awaiting publish'},
  {key: 'published', title: 'Published', hint: 'live on the public dex'},
  {key: 'rejected', title: 'Rejected', hint: 'sent back with a reason'},
]

export const RARITIES: Rarity[] = ['legendary', 'epic', 'rare', 'common']

// Same palette as the public site (src/lib/cards.ts there).
export const RARITY_STYLE: Record<Rarity, {label: string; border: string; text: string; dot: string}> = {
  legendary: {label: 'Legendary', border: 'border-amber-400/70 shadow-[0_0_16px_-6px_rgb(251_191_36/0.7)]', text: 'text-amber-300', dot: 'bg-amber-400'},
  epic: {label: 'Epic', border: 'border-purple-500/70', text: 'text-purple-300', dot: 'bg-purple-500'},
  rare: {label: 'Rare', border: 'border-blue-500/70', text: 'text-blue-300', dot: 'bg-blue-500'},
  common: {label: 'Common', border: 'border-zinc-600', text: 'text-zinc-300', dot: 'bg-zinc-500'},
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
