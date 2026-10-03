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
          <CardPicker label="player_1" cards={cards} value={a} onChange={setA} excludeId={b?.cveId} />
          <span aria-hidden className="hidden pb-2.5 text-center font-mono text-sm font-bold text-terminal sm:block">
            vs
          </span>
          <CardPicker label="player_2" cards={cards} value={b} onChange={setB} excludeId={a?.cveId} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={randomMatchup}
            className="rounded-lg bg-terminal px-4 py-2 font-semibold text-ink hover:bg-terminal/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terminal"
          >
            ⚄ random matchup
          </button>
          {a && !b ? (
            <button
              type="button"
              onClick={() => setB(randomCard(a.cveId))}
              className="rounded-lg border border-terminal/40 px-4 py-2 text-terminal hover:bg-terminal/10"
            >
              random challenger for {a.nickname}
            </button>
          ) : null}
          {a && b ? (
            <>
              <button
                type="button"
                onClick={() => setFight((f) => f + 1)}
                className="rounded-lg border border-white/10 px-4 py-2 text-zinc-300 hover:border-white/25"
              >
                ↻ rematch
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="rounded-lg border border-white/10 px-4 py-2 text-zinc-300 hover:border-white/25"
              >
                {copied ? '✓ copied' : '⧉ copy battle link'}
              </button>
            </>
          ) : null}
        </div>
      </section>

      {a || b ? (
        // Keyed so each new matchup or rematch remounts and replays the reveal from round 1.
        <BattleStage key={`${a?.cveId}|${b?.cveId}|${fight}`} a={a} b={b} />
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 p-10 text-center font-mono text-sm text-zinc-500">
          Pick two CVEs, or roll a random matchup.
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
            className={`rounded-xl border border-terminal/30 bg-terminal/5 p-5 transition-all duration-500 motion-reduce:transition-none ${
              done ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
            }`}
            aria-hidden={!done}
          >
            <p className="font-mono text-xs tracking-widest text-terminal uppercase">
              {result.winner === 'draw'
                ? `draw · ${result.score.a}–${result.score.b}`
                : `winner · ${result.score.a}–${result.score.b}`}
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-zinc-50 sm:text-3xl">
              {result.winner === 'draw' ? 'Nobody patches in time.' : (result.winner === 'a' ? a : b).nickname}
            </p>
            {result.tiebreak ? <p className="mt-1 font-mono text-xs text-zinc-500">{result.tiebreak}</p> : null}
            <p className="mt-4 font-mono text-sm leading-relaxed text-zinc-300">
              <span className="text-zinc-600">[battle.log]</span> {result.log}
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
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-white/10 p-4 text-center font-mono text-xs text-zinc-600">
        awaiting challenger…
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
      <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{backgroundColor: card.set?.themeColor ?? '#3f3f46'}} />
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-mono text-[10px] text-zinc-500 sm:text-xs">{card.cveId}</p>
        <p className="font-mono text-xs font-bold text-zinc-300 tabular-nums" aria-label={`${score} rounds won`}>
          {score}
        </p>
      </div>
      <p className={`mt-2 font-mono text-4xl leading-none font-bold tabular-nums sm:text-6xl ${r.accent}`}>
        {card.cvssScore.toFixed(1)}
      </p>
      <h2 className="mt-2 truncate text-lg font-bold tracking-tight text-zinc-50 sm:text-2xl">{card.nickname}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <RarityBadge rarity={card.rarity} />
        {won ? <span className="font-mono text-[10px] font-bold tracking-widest text-terminal">★ WINNER</span> : null}
      </div>
      <Link href={cardHref(card.cveId)} className="mt-3 inline-block font-mono text-[11px] text-zinc-500 hover:text-terminal">
        dossier →
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
        className={`font-mono text-sm tabular-nums sm:text-base ${side === 'b' ? 'text-right' : ''} ${
          win ? 'font-bold text-terminal' : draw ? 'text-zinc-300' : 'text-zinc-600 line-through decoration-zinc-700'
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
        <p className="font-mono text-[10px] text-zinc-600">round {index + 1}</p>
        <p className="text-sm font-bold text-zinc-100">{round.label}</p>
        <p className="hidden font-mono text-[10px] text-zinc-500 sm:block">{round.rule}</p>
        {round.winner === 'draw' ? <p className="font-mono text-[10px] text-zinc-400">draw</p> : null}
      </div>
      {cell('b')}
    </div>
  )
}
