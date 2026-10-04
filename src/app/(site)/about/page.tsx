import type {Metadata} from 'next'
import Link from 'next/link'

import type {Card} from '@/lib/types'
import {sanityFetch} from '@/sanity/lib/client'
import {CARDS_QUERY} from '@/sanity/lib/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'About',
  description: 'What VulnDex is, where the data comes from, and how a card gets into the collection.',
}

const PIPELINE = [
  {
    title: 'An agent drafts the card',
    body: 'Given a CVE ID, it pulls the official score, affected software and fixed versions from the National Vulnerability Database, then writes the story and patch notes from those facts.',
  },
  {
    title: 'A human verifies it',
    body: 'A reviewer checks the draft against NVD. They can mark it verified, or send it back with a reason.',
  },
  {
    title: 'A human publishes it',
    body: 'Only a person can publish. The agent can draft as many cards as it likes, but none reach this site without a reviewer’s sign-off.',
  },
]

const FACTS = [
  {title: 'Power', body: 'The CVSS base score from NVD, from 0 to 10. Higher means more severe.'},
  {title: 'Rarity', body: 'Follows power: 9+ Legendary, 7–8.9 Epic, 4–6.9 Rare, under 4 Common.'},
  {title: 'Story', body: 'A short, readable account of the bug, written from the NVD record.'},
  {title: 'Battles', body: 'Four rounds: power, age (older wins), reach (more affected software wins) and attack vector.'},
]

export default async function AboutPage() {
  const cards = await sanityFetch<Card[]>(CARDS_QUERY)
  const avg = cards.length ? cards.reduce((s, c) => s + c.cvssScore, 0) / cards.length : 0
  const years = cards.map((c) => c.year)

  return (
    <div className="space-y-12">
      <header className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="text-sm font-bold text-neon">About VulnDex</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-zinc-50 sm:text-5xl">
            Security history, <span className="text-neon">one card at a time</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
            VulnDex turns the vulnerabilities that shaped the internet into collectible cards. Each card is a real
            CVE (a publicly catalogued security flaw), with its real severity score and the story of what happened.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          <Fact value={String(cards.length)} label="Cards" />
          <Fact value={avg ? avg.toFixed(1) : '—'} label="Avg power" />
          <Fact value={years.length ? `${Math.min(...years)}–${String(Math.max(...years)).slice(2)}` : '—'} label="Years" />
        </dl>
      </header>

      <section aria-labelledby="pipeline" className="rounded-3xl border border-white/10 bg-panel/80 p-6 sm:p-8">
        <h2 id="pipeline" className="text-2xl font-extrabold tracking-tight text-zinc-50">
          How a card gets made
        </h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {PIPELINE.map((step, i) => (
            <li key={step.title} className="animate-fade-up relative" style={{animationDelay: `${i * 100}ms`}}>
              <span className="flex size-10 items-center justify-center rounded-full border border-neon/50 text-lg font-bold text-neon shadow-[0_0_14px_-4px_rgb(234_255_61/0.54)]">
                {i + 1}
              </span>
              <h3 className="mt-4 font-bold text-zinc-100">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="rules" className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-panel/80 p-6 sm:p-8">
          <h2 id="rules" className="text-2xl font-extrabold tracking-tight text-zinc-50">
            Reading a card
          </h2>
          <dl className="mt-5 space-y-4">
            {FACTS.map((f) => (
              <div key={f.title} className="border-l-2 border-neon/50 pl-4">
                <dt className="font-bold text-zinc-100">{f.title}</dt>
                <dd className="text-sm leading-relaxed text-zinc-400">{f.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col rounded-3xl border border-white/10 bg-panel/80 p-6 sm:p-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-50">Where the data comes from</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Scores, summaries, affected software and fixed versions come from the{' '}
            <a href="https://nvd.nist.gov" className="text-neon hover:underline">
              National Vulnerability Database
            </a>{' '}
            (NIST). Exploited-in-the-wild status comes from CISA&apos;s Known Exploited Vulnerabilities catalog.
            Stories are written to be readable, and every claim can be checked against those records.
          </p>
          <h3 className="mt-6 font-bold text-zinc-100">Built with</h3>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {['Next.js', 'Sanity', 'Sanity Workflows', 'Sanity App SDK', 'Tailwind CSS'].map((t) => (
              <li key={t} className="rounded-full border border-neon/30 bg-neon/5 px-3 py-1 text-zinc-300">
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-6 text-sm text-zinc-500">Made for the DEV Sanity Challenge.</p>
        </div>
      </section>

      <section className="flex flex-col items-center gap-4 rounded-3xl border border-neon/30 bg-neon/5 px-6 py-10 text-center">
        <h2 className="text-2xl font-extrabold text-zinc-50">Ready to play?</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/cards"
            className="rounded-full bg-neon px-6 py-3 font-bold text-ink shadow-[0_0_24px_-6px_rgb(234_255_61/0.48)] transition-all hover:scale-105"
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
      </section>
    </div>
  )
}

function Fact({value, label}: {value: string; label: string}) {
  return (
    <div className="rounded-2xl border border-neon/20 bg-panel/80 px-4 py-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-2xl font-extrabold text-neon tabular-nums">{value}</dd>
    </div>
  )
}
