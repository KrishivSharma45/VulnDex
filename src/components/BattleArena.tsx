'use client'

import {useEffect, useMemo, useState} from 'react'
import Link from 'next/link'

import {battle, type Round, type Side} from '@/lib/battle'
import {RARITY_STYLES, cardHref} from '@/lib/cards'
import type {Card} from '@/lib/types'
import {RarityBadge} from './CardParts'
import {CardPicker} from './CardPicker'

const ROUND_DELAY_MS = 900

type Props = {cards: Card[]; initialA: string | null; initialB: string | null}

export function BattleArena({cards, initialA, initialB}: Props) {
  const byId = useMemo(() => new Map(cards.map((c) => [c.cveId, c])), [cards])
  const [a, setA] = useState<Card | null>(() => (initialA && byId.get(initialA)) || null)
  const [b, setB] = useState<Card | null>(() => {
    const card = (initialB && byId.get(initialB)) || null
    return card && card.cveId !== initialA ? card : null
  })
  const [fight, setFight] = useState(0) // bump to replay the reveal
  const [copied, setCopied] = useState(false)

  // Keep the URL shareable: /battle?a=CVE-…&b=CVE-…
  useEffect(() => {
    const q = new URLSearchParams()
    if (a) q.set('a', a.cveId)
    if (b) q.set('b', b.cveId)
    const qs = q.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
    document.title = a && b ? `${a.nickname} vs ${b.nickname} · VulnDex` : 'Battle · VulnDex'
  }, [a, b])

  const randomCard = (exclude?: string) => {
    const pool = cards.filter((c) => c.cveId !== exclude)
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const randomMatchup = () => {
    const first = randomCard()
    setA(first)
    setB(randomCard(first.cveId))
    setFight((f) => f + 1)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked; the URL bar already has the shareable link.
    }
  }

  return (
    <div className="space-y-8">
      <section aria-label="Choose fighters" className="rounded-xl border border-white/5 bg-panel/80 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <CardPicker label="Player 1" cards={cards} value={a} onChange={setA} excludeId={b?.cveId} />
          <span aria-hidden className="hidden pb-2.5 text-center text-sm font-extrabold text-zinc-500 sm:block">
            vs
          </span>
          <CardPicker label="Player 2" cards={cards} value={b} onChange={setB} excludeId={a?.cveId} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={randomMatchup}
            className="rounded-full bg-neon px-5 py-2 font-semibold text-ink shadow-[0_0_24px_-6px_rgb(214_227_106/0.25)] hover:bg-neon/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon"
          >
            Random matchup
          </button>
          {a && !b ? (
            <button
              type="button"
              onClick={() => setB(randomCard(a.cveId))}
              className="rounded-full border border-neon/40 px-5 py-2 font-medium text-neon hover:bg-neon/10"
            >
              Random opponent for {a.nickname}
            </button>
          ) : null}
          {a && b ? (
            <>
              <button
                type="button"
                onClick={() => setFight((f) => f + 1)}
                className="rounded-full border border-white/10 px-5 py-2 font-medium text-zinc-300 hover:border-white/25"
              >
                Rematch
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="rounded-full border border-white/10 px-5 py-2 font-medium text-zinc-300 hover:border-white/25"
              >
                {copied ? 'Link copied ✓' : 'Copy battle link'}
              </button>
            </>
          ) : null}
        </div>
      </section>

      {a || b ? (
        // Keyed so each new matchup or rematch remounts and replays the reveal from round 1.
        <BattleStage key={`${a?.cveId}|${b?.cveId}|${fight}`} a={a} b={b} />
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-zinc-400">
          Pick two cards to battle, or hit Random matchup.
        </p>
      )}
    </div>
  )
}

function BattleStage({a, b}: {a: Card | null; b: Card | null}) {
  const result = useMemo(() => (a && b ? battle(a, b) : null), [a, b])
  const [revealed, setRevealed] = useState(0)

  // Reveal rounds one by one, then the verdict. Instant if the user prefers reduced motion.
  useEffect(() => {
    if (!result) return
    const total = result.rounds.length + 1
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ROUND_DELAY_MS
    const timer = window.setInterval(() => {
      setRevealed((n) => {
        if (n + 1 >= total) window.clearInterval(timer)
        return Math.min(n + 1, total)
      })
    }, delay)
    return () => window.clearInterval(timer)
  }, [result])

  const done = !!result && revealed > result.rounds.length
  const winner = done && result ? result.winner : null
  const tally = {a: 0, b: 0}
  for (const r of result?.rounds.slice(0, revealed) ?? []) {
    if (r.winner !== 'draw') tally[r.winner] += 1
  }

  return (
    <>
      <section aria-label="Fighters" className="grid grid-cols-2 gap-3 sm:gap-6">
        <Fighter card={a} side="a" result={winner} score={tally.a} />
        <Fighter card={b} side="b" result={winner} score={tally.b} />
      </section>

      {result && a && b ? (
        <section aria-label="Rounds" aria-live="polite" className="space-y-3">
          {result.rounds.map((round, i) => (
            <RoundRow key={round.key} round={round} index={i} shown={revealed > i} />
          ))}

          <div
            className={`rounded-2xl border border-neon/30 bg-gradient-to-br from-neon/15 to-transparent p-6 transition-all duration-500 motion-reduce:transition-none ${
              done ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
            }`}
            aria-hidden={!done}
          >
            <p className="text-sm font-semibold text-neon">
              {result.winner === 'draw'
                ? `It's a draw · ${result.score.a}–${result.score.b}`
                : `Winner · ${result.score.a}–${result.score.b}`}
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-zinc-50 sm:text-3xl">
              {result.winner === 'draw' ? 'Nobody patches in time.' : (result.winner === 'a' ? a : b).nickname}
            </p>
            {result.tiebreak ? <p className="mt-1 text-sm text-zinc-500">{result.tiebreak}</p> : null}
            <p className="mt-4 text-base leading-relaxed text-zinc-300">
              <span className="font-semibold text-zinc-100">Battle report: </span>
              {result.log}
            </p>
          </div>
        </section>
      ) : null}
    </>
  )
}


function Fighter({card, side, result, score}: {card: Card | null; side: 'a' | 'b'; result: Side | null; score: number}) {
  if (!card) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-zinc-500">
        Waiting for an opponent…
      </div>
    )
  }
  const r = RARITY_STYLES[card.rarity]
  const won = result === side
  const lost = result !== null && result !== 'draw' && !won
  return (
    <article
      className={`relative overflow-hidden rounded-xl border-2 bg-panel p-3 transition-all duration-500 sm:p-5 ${r.frame} ${
        lost ? 'opacity-45 grayscale' : ''
      } ${won ? 'scale-[1.02]' : ''}`}
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-neon shadow-[0_0_10px_rgb(214_227_106/0.29)]" />
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-mono text-[11px] text-zinc-500 sm:text-xs">{card.cveId}</p>
        <p className="rounded-full bg-white/10 px-2 text-xs font-bold text-zinc-200 tabular-nums" aria-label={`${score} rounds won`}>
          {score}
        </p>
      </div>
      <p className={`mt-2 text-4xl leading-none font-extrabold tracking-tight tabular-nums sm:text-6xl ${r.accent}`}>
        {card.cvssScore.toFixed(1)}
      </p>
      <h2 className="mt-2 truncate text-lg font-bold tracking-tight text-zinc-50 sm:text-2xl">{card.nickname}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <RarityBadge rarity={card.rarity} />
        {won ? <span className="rounded-full bg-neon/15 px-2 py-0.5 text-[11px] font-bold text-neon ring-1 ring-neon/60">★ Winner</span> : null}
      </div>
      <Link href={cardHref(card.cveId)} className="mt-3 inline-block text-xs font-medium text-zinc-400 hover:text-neon">
        View card →
      </Link>
    </article>
  )
}

function RoundRow({round, index, shown}: {round: Round; index: number; shown: boolean}) {
  const cell = (side: 'a' | 'b') => {
    const win = round.winner === side
    const draw = round.winner === 'draw'
    return (
      <p
        className={`text-base font-semibold tabular-nums sm:text-lg ${side === 'b' ? 'text-right' : ''} ${
          win ? 'text-neon' : draw ? 'text-zinc-300' : 'text-zinc-600 line-through decoration-zinc-700'
        }`}
      >
        {side === 'a' && win ? '▲ ' : ''}
        {round[side]}
        {side === 'b' && win ? ' ▲' : ''}
      </p>
    )
  }
  return (
    <div
      aria-hidden={!shown}
      className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-white/5 bg-panel/80 px-4 py-3 transition-all duration-500 motion-reduce:transition-none ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      {cell('a')}
      <div className="text-center">
        <p className="text-[11px] font-medium text-zinc-500">Round {index + 1}</p>
        <p className="text-sm font-bold text-zinc-100">{round.label}</p>
        <p className="hidden text-xs text-zinc-500 sm:block">{round.rule}</p>
        {round.winner === 'draw' ? <p className="text-xs font-medium text-zinc-400">Draw</p> : null}
      </div>
      {cell('b')}
    </div>
  )
}
