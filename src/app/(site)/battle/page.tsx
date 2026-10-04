import type {Metadata} from 'next'

import {BattleArena} from '@/components/BattleArena'
import type {Card} from '@/lib/types'
import {sanityFetch} from '@/sanity/lib/client'
import {CARDS_QUERY} from '@/sanity/lib/queries'

export const revalidate = 60

const param = (v: string | string[] | undefined) => {
  const s = Array.isArray(v) ? v[0] : v
  return s ? decodeURIComponent(s).toUpperCase() : null
}

export async function generateMetadata({searchParams}: PageProps<'/battle'>): Promise<Metadata> {
  const {a, b} = await searchParams
  const [idA, idB] = [param(a), param(b)]
  if (!idA || !idB) return {title: 'Battle', description: 'Pit two infamous CVEs against each other.'}

  const cards = await sanityFetch<Card[]>(CARDS_QUERY)
  const [ca, cb] = [cards.find((c) => c.cveId === idA), cards.find((c) => c.cveId === idB)]
  if (!ca || !cb) return {title: 'Battle'}
  return {
    title: `${ca.nickname} vs ${cb.nickname}`,
    description: `${ca.nickname} (${ca.cveId}) battles ${cb.nickname} (${cb.cveId}) on VulnDex.`,
  }
}

export default async function BattlePage({searchParams}: PageProps<'/battle'>) {
  const [cards, params] = await Promise.all([sanityFetch<Card[]>(CARDS_QUERY), searchParams])

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-50 sm:text-5xl">Battle</h1>
        <p className="mt-3 text-lg text-zinc-400">
          Pick two cards and they face off over four rounds: power, age, reach and attack vector. Win the most
          rounds to take the match.
        </p>
      </header>

      {cards.length >= 2 ? (
        <BattleArena cards={cards} initialA={param(params.a)} initialB={param(params.b)} />
      ) : (
        <p className="text-zinc-500">You need at least two cards in the collection to battle.</p>
      )}
    </div>
  )
}
