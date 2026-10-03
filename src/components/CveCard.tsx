'use client'

import {useState} from 'react'
import Link from 'next/link'
import {PortableText} from 'next-sanity'

import {RARITY_STYLES, cardHref} from '@/lib/cards'
import type {Card} from '@/lib/types'
import {AttackChips, RarityBadge, SetLabel, SoftwareList} from './CardParts'

/**
 * Trading card with a 3D flip. Front: stats. Back: story, affected software, patch.
 * Clicking anywhere on the card flips it; the corner button does the same for keyboards.
 */
export function CveCard({card, showDetailsLink = true}: {card: Card; showDetailsLink?: boolean}) {
  const [flipped, setFlipped] = useState(false)
  const r = RARITY_STYLES[card.rarity]
  const flip = () => setFlipped((f) => !f)

  const face = `absolute inset-0 flex flex-col overflow-hidden rounded-2xl border-2 bg-panel backface-hidden ${r.frame}`

  return (
    <div className="mx-auto aspect-[5/7] w-full max-w-[20rem] perspective-[1400px]">
      <div
        onClick={flip}
        className={`relative size-full cursor-pointer transition-transform duration-700 ease-out transform-3d motion-reduce:transition-none ${
          flipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front */}
        <article inert={flipped} aria-label={`${card.nickname}, ${card.cveId}`} className={face}>
          <div aria-hidden className="h-1.5 shrink-0" style={{backgroundColor: card.set?.themeColor ?? '#3f3f46'}} />
          <div className="flex items-center justify-between px-4 pt-3 font-mono text-[11px] text-zinc-500">
            <span>{card.cveId}</span>
            <span>{card.year}</span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <p className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">Power</p>
            <p className={`font-mono text-7xl leading-none font-bold tabular-nums ${r.accent}`}>
              {card.cvssScore.toFixed(1)}
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
              CVSS · {card.severity}
            </p>
            <h3 className="mt-5 text-2xl font-bold tracking-tight text-zinc-50">{card.nickname}</h3>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <RarityBadge rarity={card.rarity} />
              <SetLabel set={card.set} />
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 border-t border-white/5 px-4 py-3">
            <AttackChips types={card.attackTypes} small />
            <FlipButton onFlip={flip} label={`Flip ${card.nickname} card to see its story`} />
          </div>
        </article>

        {/* Back */}
        <article inert={!flipped} aria-label={`${card.nickname} story`} className={`${face} rotate-y-180`}>
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <p className="font-mono text-xs text-terminal">
              <span className="text-zinc-500">$ cat</span> {card.nickname.toLowerCase()}.log
            </p>
            <RarityBadge rarity={card.rarity} />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm [scrollbar-width:thin]">
            {card.story?.length ? (
              <div className="prose prose-sm prose-invert prose-p:my-2 prose-p:leading-relaxed">
                <PortableText value={card.story} />
              </div>
            ) : null}
            <section>
              <h4 className="mb-1.5 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">Affected</h4>
              <SoftwareList items={card.affectedSoftware} />
            </section>
            {card.patchInfo ? (
              <section>
                <h4 className="mb-1.5 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">Patch</h4>
                <p className="text-xs leading-relaxed text-zinc-300">{card.patchInfo}</p>
              </section>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
            {showDetailsLink ? (
              <Link
                href={cardHref(card.cveId)}
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-xs text-terminal hover:underline"
              >
                full dossier →
              </Link>
            ) : (
              <span />
            )}
            <FlipButton onFlip={flip} label={`Flip ${card.nickname} card back to the front`} />
          </div>
        </article>
      </div>
    </div>
  )
}

function FlipButton({onFlip, label}: {onFlip: () => void; label: string}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onFlip()
      }}
      className="shrink-0 rounded-md border border-white/10 px-2 py-1 font-mono text-xs text-zinc-400 hover:border-terminal/50 hover:text-terminal focus-visible:outline-2 focus-visible:outline-terminal"
    >
      ↻ flip
    </button>
  )
}
