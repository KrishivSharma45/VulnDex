'use client'

import {useState} from 'react'
import Link from 'next/link'
import {PortableText, toPlainText} from 'next-sanity'

import {ATTACK_VECTOR_LABELS, RARITY_STYLES, cardHref} from '@/lib/cards'
import type {Card} from '@/lib/types'
import {AttackChips, SoftwareList} from './CardParts'

/**
 * Trading card with a 3D flip.
 * Front (classic TCG layout): name bar + power, art window, type line, story teaser, attack chips.
 * Back: full story, affected software, patch.
 * Clicking anywhere on the card flips it; the corner button does the same for keyboards.
 */
export function CveCard({card, showDetailsLink = true}: {card: Card; showDetailsLink?: boolean}) {
  const [flipped, setFlipped] = useState(false)
  const r = RARITY_STYLES[card.rarity]
  const flip = () => setFlipped((f) => !f)
  const teaser = card.story?.length ? toPlainText(card.story) : (card.summary ?? '')

  const face = `absolute inset-0 flex flex-col overflow-hidden rounded-2xl border-2 bg-panel backface-hidden ${r.frame}`

  return (
    <div className="group mx-auto aspect-[5/7] w-full max-w-[20rem] perspective-[1400px]">
      <div
        onClick={flip}
        className={`relative size-full cursor-pointer transition-transform duration-700 ease-out transform-3d ${
          flipped ? 'rotate-y-180' : 'group-hover:-translate-y-1.5'
        }`}
      >
        {/* Front */}
        <article inert={flipped} aria-label={`${card.nickname}, ${card.cveId}`} className={`${face} p-3`}>
          {/* Name bar */}
          <header className="flex items-center justify-between gap-2 px-1">
            <h3 className="truncate text-xl font-extrabold tracking-tight text-zinc-50">{card.nickname}</h3>
            <div
              aria-label={`Power ${card.cvssScore.toFixed(1)}`}
              className="flex size-12 shrink-0 flex-col items-center justify-center rounded-full border-2 border-neon/70 bg-ink shadow-[0_0_14px_-2px_rgb(214_227_106/0.25)]"
            >
              <span className="text-glow text-base leading-none font-extrabold text-neon tabular-nums">
                {card.cvssScore.toFixed(1)}
              </span>
              <span className="mt-0.5 text-[8px] font-bold tracking-widest text-neon/70 uppercase">Power</span>
            </div>
          </header>

          {/* Art window */}
          <div className="bg-grid relative mt-2.5 flex h-[36%] shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-neon/15 bg-ink p-3">
            <div aria-hidden className="absolute -right-6 -bottom-8 size-32 rounded-full bg-neon/15 blur-2xl" />
            <div className="relative flex items-start justify-between text-[11px] text-zinc-400">
              <span className="font-mono">{card.cveId}</span>
              <span>{card.year}</span>
            </div>
            <div className="relative">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
                {card.severity} severity
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-neon shadow-[0_0_10px_rgb(214_227_106/0.29)]"
                  style={{width: `${card.cvssScore * 10}%`}}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-300">
                Attack vector: <span className="font-semibold text-zinc-100">{ATTACK_VECTOR_LABELS[card.attackVector]}</span>
              </p>
            </div>
          </div>

          {/* Type line */}
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-panel-raised px-2.5 py-1.5 text-xs">
            <span className="font-semibold text-neon">
              <span aria-hidden className="mr-1 tracking-tight">
                {r.stars}
              </span>
              {r.label}
            </span>
            <span className="truncate text-zinc-400">{card.set?.title}</span>
          </div>

          {/* Story teaser */}
          <div className="mt-2.5 min-h-0 flex-1 px-1">
            <p className="line-clamp-3 text-[13px] leading-snug text-zinc-400">{teaser}</p>
          </div>

          {/* Footer */}
          <footer className="mt-2 flex items-end justify-between gap-2 border-t border-white/5 px-1 pt-2.5">
            <AttackChips types={card.attackTypes} small />
            <FlipButton onFlip={flip} label={`Flip ${card.nickname} card to see its story`} />
          </footer>
        </article>

        {/* Back */}
        <article inert={!flipped} aria-label={`${card.nickname} story`} className={`${face} rotate-y-180`}>
          <div className="flex items-center justify-between border-b border-neon/20 bg-neon/5 px-4 py-3">
            <p className="text-sm font-bold text-zinc-50">{card.nickname}</p>
            <span className="text-xs font-semibold text-neon">
              {r.stars} {r.label}
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm [scrollbar-width:thin]">
            {card.story?.length ? (
              <section>
                <h4 className="mb-1 text-[11px] font-semibold tracking-wider text-neon/80 uppercase">The story</h4>
                <div className="prose prose-sm prose-invert prose-p:my-2 prose-p:leading-relaxed">
                  <PortableText value={card.story} />
                </div>
              </section>
            ) : null}
            <section>
              <h4 className="mb-1.5 text-[11px] font-semibold tracking-wider text-neon/80 uppercase">Affected software</h4>
              <SoftwareList items={card.affectedSoftware} />
            </section>
            {card.patchInfo ? (
              <section>
                <h4 className="mb-1.5 text-[11px] font-semibold tracking-wider text-neon/80 uppercase">Patch</h4>
                <p className="text-xs leading-relaxed text-zinc-300">{card.patchInfo}</p>
              </section>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
            {showDetailsLink ? (
              <Link
                href={cardHref(card.cveId)}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-semibold text-neon transition-opacity hover:opacity-80"
              >
                View details →
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
      className="shrink-0 rounded-full border border-neon/40 px-3 py-1 text-xs font-semibold text-neon transition-all hover:bg-neon hover:text-ink focus-visible:outline-2 focus-visible:outline-neon"
    >
      Flip
    </button>
  )
}
