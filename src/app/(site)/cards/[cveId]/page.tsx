import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {PortableText} from 'next-sanity'

import {AttackChips, RarityBadge, SetLabel, SoftwareList} from '@/components/CardParts'
import {CveCard} from '@/components/CveCard'
import {ATTACK_VECTOR_LABELS, RARITY_STYLES, nvdHref} from '@/lib/cards'
import type {Card} from '@/lib/types'
import {sanityFetch} from '@/sanity/lib/client'
import {CARD_BY_ID_QUERY, CARD_IDS_QUERY} from '@/sanity/lib/queries'

export const revalidate = 60

export async function generateStaticParams() {
  const ids = await sanityFetch<string[]>(CARD_IDS_QUERY)
  return ids.map((cveId) => ({cveId}))
}

// Accept /cards/cve-2014-0160 as well as /cards/CVE-2014-0160.
const getCard = (cveId: string) =>
  sanityFetch<Card | null>(CARD_BY_ID_QUERY, {cveId: decodeURIComponent(cveId).toUpperCase()})

export async function generateMetadata({params}: PageProps<'/cards/[cveId]'>): Promise<Metadata> {
  const card = await getCard((await params).cveId)
  if (!card) return {title: 'Card not found'}
  return {
    title: `${card.nickname} (${card.cveId})`,
    description: card.summary ?? `${card.nickname}, CVSS ${card.cvssScore}.`,
  }
}

export default async function CardPage({params}: PageProps<'/cards/[cveId]'>) {
  const card = await getCard((await params).cveId)
  if (!card) notFound()

  const r = RARITY_STYLES[card.rarity]

  return (
    <div className="space-y-12">
      <Link href="/cards" className="inline-flex text-sm font-medium text-zinc-400 hover:text-zinc-100">
        ← Back to the collection
      </Link>

      <div className="grid gap-10 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <CveCard card={card} showDetailsLink={false} />
          <p className="mt-3 text-center text-xs text-zinc-500">Tap the card to flip it</p>
        </div>

        <article className="min-w-0 space-y-8">
          <header>
            <p className="font-mono text-sm text-zinc-500">{card.cveId}</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-zinc-50 sm:text-5xl">{card.nickname}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <RarityBadge rarity={card.rarity} />
              <SetLabel set={card.set} />
            </div>
            <Link
              href={`/battle?a=${card.cveId}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-neon px-5 py-2.5 text-sm font-semibold text-ink shadow-[0_0_24px_-6px_rgb(214_227_106/0.25)] hover:bg-neon/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon"
            >
              Battle this card
            </Link>
          </header>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            <Stat label="Power (CVSS)">
              <span className={`text-2xl font-extrabold ${r.accent}`}>{card.cvssScore.toFixed(1)}</span>
            </Stat>
            <Stat label="Severity">
              <span className="capitalize">{card.severity}</span>
            </Stat>
            <Stat label="Attack vector">{ATTACK_VECTOR_LABELS[card.attackVector] ?? card.attackVector}</Stat>
            <Stat label="Year">{card.year}</Stat>
          </dl>

          {card.attackTypes?.length ? (
            <Section title="Attack types">
              <AttackChips types={card.attackTypes} />
            </Section>
          ) : null}

          {card.story?.length ? (
            <Section title="Story">
              <div className="prose prose-invert max-w-none prose-p:leading-relaxed">
                <PortableText value={card.story} />
              </div>
            </Section>
          ) : null}

          {card.summary ? (
            <Section title="Official summary">
              <blockquote className="rounded-xl border border-white/10 bg-panel/80 p-4 text-sm leading-relaxed text-zinc-400">
                {card.summary}
              </blockquote>
              <a
                href={nvdHref(card.cveId)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-medium text-neon hover:underline"
              >
                Read the full entry on NVD ↗
              </a>
            </Section>
          ) : null}

          <Section title="Affected software">
            <SoftwareList items={card.affectedSoftware} />
          </Section>

          {card.patchInfo ? (
            <Section title="How it was fixed">
              <p className="leading-relaxed text-zinc-300">{card.patchInfo}</p>
            </Section>
          ) : null}
        </article>
      </div>
    </div>
  )
}

function Stat({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="bg-panel px-4 py-3">
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-zinc-100">{children}</dd>
    </div>
  )
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-zinc-100">
        {title}
      </h2>
      {children}
    </section>
  )
}
