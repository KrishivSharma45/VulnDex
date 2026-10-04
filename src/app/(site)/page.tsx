import Link from 'next/link'

import {CveCard} from '@/components/CveCard'
import {RARITY_ORDER, RARITY_STYLES, pickCardOfTheDay} from '@/lib/cards'
import type {Rarity} from '@/lib/cvss'
import type {Card} from '@/lib/types'
import {sanityFetch} from '@/sanity/lib/client'
import {CARDS_QUERY} from '@/sanity/lib/queries'

export const revalidate = 60

const TIER_RANGES: Record<Rarity, string> = {
  legendary: 'CVSS 9.0 – 10',
  epic: 'CVSS 7.0 – 8.9',
  rare: 'CVSS 4.0 – 6.9',
  common: 'CVSS under 4.0',
}

const STEPS = [
  {title: 'Collect', body: 'Every card is a real vulnerability, scored by the National Vulnerability Database.'},
  {title: 'Flip', body: 'Tap any card to read how the bug worked, what it hit, and how it was finally patched.'},
  {title: 'Battle', body: 'Pit two cards against each other over power, age, reach and attack vector.'},
]

export default async function HomePage() {
  const cards = await sanityFetch<Card[]>(CARDS_QUERY)
  const today = new Date()
  const cardOfTheDay = pickCardOfTheDay(cards, today)
  const featured = cards.filter((c) => c._id !== cardOfTheDay?._id).slice(0, 4) // already sorted by power
  const setCount = new Set(cards.map((c) => c.set?._id).filter(Boolean)).size
  const countBy = (r: Rarity) => cards.filter((c) => c.rarity === r).length

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-16">
        <div>
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-neon/30 bg-neon/10 px-3 py-1 text-sm font-medium text-neon">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-neon" /> A trading card game for security
            history
          </p>
          <h1
            className="animate-fade-up mt-5 text-5xl font-extrabold tracking-tight text-zinc-50 sm:text-7xl"
            style={{animationDelay: '80ms'}}
          >
            Collect the bugs that <span className="text-neon">broke the internet</span>
          </h1>
          <p
            className="animate-fade-up mt-5 max-w-xl text-lg leading-relaxed text-zinc-400"
            style={{animationDelay: '160ms'}}
          >
            Every VulnDex card is a real vulnerability, from Heartbleed to Log4Shell. Its power is its official
            severity score, and the back of each card tells the story of what happened.
          </p>

          <div className="animate-fade-up mt-7 flex flex-wrap gap-3" style={{animationDelay: '240ms'}}>
            <Link
              href="/cards"
              className="rounded-full bg-neon px-6 py-3 font-bold text-ink shadow-[0_0_24px_-6px_rgb(214_227_106/0.29)] transition-all hover:scale-105 hover:shadow-[0_0_32px_-2px_rgb(214_227_106/0.32)]"
            >
              Browse the collection
            </Link>
            <Link
              href="/battle"
              className="rounded-full border border-neon/40 px-6 py-3 font-semibold text-neon transition-all hover:bg-neon/10"
            >
              Start a battle
            </Link>
          </div>

          <dl className="animate-fade-up mt-8 grid max-w-md grid-cols-3 gap-3" style={{animationDelay: '320ms'}}>
            <Stat value={cards.length} label="Cards" />
            <Stat value={countBy('legendary')} label="Legendary" />
            <Stat value={setCount} label="Sets" />
          </dl>
        </div>

        {cardOfTheDay ? (
          <aside aria-labelledby="cotd" className="animate-fade-up w-full lg:w-80" style={{animationDelay: '200ms'}}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="cotd" className="text-sm font-bold text-neon">
                Card of the day
              </h2>
              <time dateTime={today.toISOString().slice(0, 10)} className="text-xs text-zinc-500">
                {today.toLocaleDateString('en-US', {month: 'long', day: 'numeric', timeZone: 'UTC'})}
              </time>
            </div>
            <CveCard card={cardOfTheDay} />
          </aside>
        ) : (
          <p className="text-zinc-500">No cards yet. Add some in the Studio.</p>
        )}
      </section>

      {/* Featured */}
      {featured.length ? (
        <section aria-labelledby="featured">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="featured" className="text-3xl font-extrabold tracking-tight text-zinc-50">
                Most powerful cards
              </h2>
              <p className="mt-2 text-zinc-400">The highest-scoring bugs in the deck. Tap one to flip it.</p>
            </div>
            <Link href="/cards" className="shrink-0 text-sm font-semibold text-neon transition-opacity hover:opacity-80">
              See all {cards.length} →
            </Link>
          </div>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((card, i) => (
              <li key={card._id} className="animate-fade-up" style={{animationDelay: `${i * 90}ms`}}>
                <CveCard card={card} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* How to play + rarity */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-panel/80 p-6 sm:p-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-50">How to play</h2>
          <ol className="mt-6 space-y-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neon/50 font-bold text-neon shadow-[0_0_12px_-4px_rgb(214_227_106/0.29)]">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-zinc-100">{s.title}</p>
                  <p className="text-sm leading-relaxed text-zinc-400">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-3xl border border-white/10 bg-panel/80 p-6 sm:p-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-50">Rarity tiers</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Rarity follows the CVSS score, the 0–10 scale security teams use to rate how bad a bug is.
          </p>
          <ul className="mt-5 grid grid-cols-2 gap-3">
            {RARITY_ORDER.map((r) => (
              <li key={r}>
                <Link
                  href={`/cards?rarity=${r}`}
                  className="group block rounded-2xl border border-neon/20 bg-ink/60 p-4 transition-all hover:-translate-y-0.5 hover:border-neon/60 hover:shadow-[0_0_20px_-8px_rgb(214_227_106/0.29)]"
                >
                  <p className="text-xs text-neon">{RARITY_STYLES[r].stars}</p>
                  <p className="mt-1 font-bold text-zinc-100">{RARITY_STYLES[r].label}</p>
                  <p className="text-xs text-zinc-500">{TIER_RANGES[r]}</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    <span className="text-lg font-extrabold text-zinc-50 tabular-nums">{countBy(r)}</span>{' '}
                    {countBy(r) === 1 ? 'card' : 'cards'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

function Stat({value, label}: {value: number; label: string}) {
  return (
    <div className="rounded-2xl border border-neon/20 bg-panel/80 px-4 py-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-2xl font-extrabold text-neon tabular-nums">{value}</dd>
    </div>
  )
}
