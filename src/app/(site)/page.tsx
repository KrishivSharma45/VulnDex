import Link from 'next/link'

import {CveCard} from '@/components/CveCard'
import {pickCardOfTheDay} from '@/lib/cards'
import type {Card} from '@/lib/types'
import {sanityFetch} from '@/sanity/lib/client'
import {CARDS_QUERY} from '@/sanity/lib/queries'

export const revalidate = 60

export default async function HomePage() {
  const cards = await sanityFetch<Card[]>(CARDS_QUERY)
  const today = new Date()
  const cardOfTheDay = pickCardOfTheDay(cards, today)
  const legendaryCount = cards.filter((c) => c.rarity === 'legendary').length
  const setCount = new Set(cards.map((c) => c.set?._id).filter(Boolean)).size

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-16">
      <section>
        <p className="font-mono text-xs text-terminal/80 sm:text-sm">
          <span className="text-zinc-600">root@vulndex:~$</span> grep -i infamous /var/log/history
        </p>
        <h1 className="mt-4 text-6xl font-black tracking-tighter text-zinc-50 sm:text-8xl">
          VulnDex
          <span aria-hidden className="ml-1 inline-block h-[0.8em] w-[0.45em] translate-y-[0.08em] animate-blink bg-terminal" />
        </h1>
        <p className="mt-4 max-w-xl text-xl text-zinc-300 sm:text-2xl">
          History&apos;s most infamous bugs, now collectible.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-500">
          Every card is a real CVE. Its <span className="font-mono text-zinc-300">power</span> is the CVSS score
          from the National Vulnerability Database, and its rarity follows from that. Flip a card to read how it
          went down and how it got patched.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/cards"
            className="rounded-lg bg-terminal px-5 py-2.5 font-mono text-sm font-semibold text-ink hover:bg-terminal/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal"
          >
            open the dex →
          </Link>
          <dl className="flex gap-6 font-mono text-xs text-zinc-500">
            <Stat label="cards" value={cards.length} />
            <Stat label="legendary" value={legendaryCount} />
            <Stat label="sets" value={setCount} />
          </dl>
        </div>
      </section>

      {cardOfTheDay ? (
        <section aria-labelledby="cotd" className="w-full lg:w-80">
          <div className="mb-3 flex items-baseline justify-between font-mono text-xs">
            <h2 id="cotd" className="text-terminal">
              {'//'} card_of_the_day
            </h2>
            <time dateTime={today.toISOString().slice(0, 10)} className="text-zinc-600">
              {today.toISOString().slice(0, 10)}
            </time>
          </div>
          <CveCard card={cardOfTheDay} />
          <p className="mt-3 text-center font-mono text-[11px] text-zinc-600">click the card to flip it</p>
        </section>
      ) : (
        <p className="font-mono text-sm text-zinc-500">No published cards yet. Add some in /studio.</p>
      )}
    </div>
  )
}

function Stat({label, value}: {label: string; value: number}) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="text-lg font-semibold text-zinc-200">{value}</span> {label}
      </dd>
    </div>
  )
}
