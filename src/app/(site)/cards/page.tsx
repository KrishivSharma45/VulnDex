import type {Metadata} from 'next'

import {CardBrowser} from '@/components/CardBrowser'
import type {Card} from '@/lib/types'
import {sanityFetch} from '@/sanity/lib/client'
import {CARDS_QUERY} from '@/sanity/lib/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'The collection',
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
      <header className="max-w-2xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-50 sm:text-5xl">The collection</h1>
        <p className="mt-3 text-lg text-zinc-400">
          Every infamous vulnerability in the deck. Tap a card to flip it and read its story.
        </p>
      </header>

      {cards.length ? (
        <CardBrowser cards={cards} sets={sets} attackTypes={attackTypes} initialParams={params} />
      ) : (
        <p className="text-zinc-500">No cards in the collection yet.</p>
      )}
    </div>
  )
}

function uniqueById<T extends {_id: string}>(items: T[]): T[] {
  return [...new Map(items.map((i) => [i._id, i])).values()]
}
