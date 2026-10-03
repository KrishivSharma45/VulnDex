import type {Metadata} from 'next'

import {CardBrowser} from '@/components/CardBrowser'
import type {Card} from '@/lib/types'
import {sanityFetch} from '@/sanity/lib/client'
import {CARDS_QUERY} from '@/sanity/lib/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'All cards',
  description: 'Browse every VulnDex card. Filter by rarity, set, attack type and year.',
}

export default async function CardsPage({searchParams}: PageProps<'/cards'>) {
  const [cards, params] = await Promise.all([sanityFetch<Card[]>(CARDS_QUERY), searchParams])

  // Filter options come from published cards only, so every option matches something.
  const sets = uniqueById(cards.flatMap((c) => (c.set ? [c.set] : []))).sort((a, b) =>
    a.title.localeCompare(b.title),
  )
  const attackTypes = uniqueById(cards.flatMap((c) => c.attackTypes ?? [])).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs text-zinc-600">~/cards</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">The Dex</h1>
        <p className="mt-2 text-zinc-400">Click any card to flip it.</p>
      </header>

      {cards.length ? (
        <CardBrowser cards={cards} sets={sets} attackTypes={attackTypes} initialParams={params} />
      ) : (
        <p className="font-mono text-sm text-zinc-500">No published cards yet.</p>
      )}
    </div>
  )
}

function uniqueById<T extends {_id: string}>(items: T[]): T[] {
  return [...new Map(items.map((i) => [i._id, i])).values()]
}
