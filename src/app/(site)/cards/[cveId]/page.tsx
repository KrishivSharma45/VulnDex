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
    <div className="space-y-8">
      <Link href="/cards" className="font-mono text-xs text-zinc-500 hover:text-terminal">
        ← cd ../cards
      </Link>

      <div className="grid gap-10 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <CveCard card={card} showDetailsLink={false} />
          <p className="mt-3 text-center font-mono text-[11px] text-zinc-600">click the card to flip it</p>
        </div>

        <article className="min-w-0 space-y-8">
          <header>
            <p className="font-mono text-sm text-zinc-500">{card.cveId}</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-zinc-50 sm:text-5xl">{card.nickname}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <RarityBadge rarity={card.rarity} />
              <SetLabel set={card.set} />
            </div>
          </header>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/5 bg-white/5 font-mono sm:grid-cols-4">
            <Stat label="power (cvss)">
              <span className={`text-2xl font-bold ${r.accent}`}>{card.cvssScore.toFixed(1)}</span>
            </Stat>
            <Stat label="severity">
              <span className="capitalize">{card.severity}</span>
            </Stat>
            <Stat label="vector">{ATTACK_VECTOR_LABELS[card.attackVector] ?? card.attackVector}</Stat>
            <Stat label="year">{card.year}</Stat>
          </dl>

          {card.attackTypes?.length ? (
            <Section title="attack_types">
              <AttackChips types={card.attackTypes} />
            </Section>
          ) : null}

          {card.story?.length ? (
            <Section title="story">
              <div className="prose prose-invert max-w-none prose-p:leading-relaxed">
                <PortableText value={card.story} />
              </div>
            </Section>
          ) : null}

          {card.summary ? (
            <Section title="official_summary">
              <blockquote className="border-l-2 border-terminal/40 pl-4 text-sm leading-relaxed text-zinc-400">
                {card.summary}
              </blockquote>
              <a
                href={nvdHref(card.cveId)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block font-mono text-xs text-terminal hover:underline"
              >
                view on NVD ↗
              </a>
            </Section>
          ) : null}

          <Section title="affected_software">
            <SoftwareList items={card.affectedSoftware} />
          </Section>

          {card.patchInfo ? (
            <Section title="patch">
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
      <dt className="text-[10px] tracking-widest text-zinc-500 uppercase">{label}</dt>
      <dd className="mt-1 text-zinc-200">{children}</dd>
    </div>
  )
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-xs text-terminal">
        <span className="text-zinc-600">{'//'}</span> {title}
      </h2>
      {children}
    </section>
  )
}
