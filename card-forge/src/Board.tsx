import {useQuery} from '@sanity/sdk-react'
import {Suspense, useEffect, useState} from 'react'

import {BOARD_QUERY, COLUMNS, RARITY_STYLE, columnOf, timeAgo, type BoardCard} from './cards'
import {DraftForm} from './DraftForm'
import {ReviewPanel} from './ReviewPanel'
import {StatsBar} from './StatsBar'

/** Live: useQuery subscribes to the Live Content API, so Studio edits, agent drafts and worker updates appear without a refresh. */
export function Board() {
  const {data: cards} = useQuery<BoardCard[]>({query: BOARD_QUERY})
  const [openId, setOpenId] = useState<string>()
  const now = useNow()

  return (
    <div className="space-y-5">
      <StatsBar cards={cards} />
      <DraftForm />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = cards.filter((c) => columnOf(c) === col.key)
          return (
            <section key={col.key} aria-labelledby={`col-${col.key}`} className="flex min-h-40 flex-col rounded-xl border border-white/5 bg-panel/60">
              <header className="border-b border-white/5 px-3 py-2.5">
                <h2 id={`col-${col.key}`} className="flex items-baseline justify-between font-mono text-sm text-zinc-100">
                  <span>
                    <span className="text-terminal">#</span> {col.title.toLowerCase()}
                  </span>
                  <span className="text-xs text-zinc-500 tabular-nums">{items.length}</span>
                </h2>
                <p className="font-mono text-[10px] text-zinc-600">{col.hint}</p>
              </header>
              <ul className="flex flex-1 flex-col gap-2 p-2">
                {items.map((card) => (
                  <Tile
                    key={card._id}
                    card={card}
                    now={now}
                    open={openId === card._id}
                    onToggle={() => setOpenId((id) => (id === card._id ? undefined : card._id))}
                  />
                ))}
                {!items.length ? <li className="p-3 text-center font-mono text-[11px] text-zinc-600">empty</li> : null}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Tile({card, now, open, onToggle}: {card: BoardCard; now: number; open: boolean; onToggle: () => void}) {
  const r = RARITY_STYLE[card.rarity] ?? RARITY_STYLE.common
  const reviewable = card.status !== 'published'
  return (
    <li className={`rounded-lg border bg-ink/80 p-3 ${r.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-zinc-50">{card.nickname}</p>
          <p className="font-mono text-[11px] text-zinc-500">{card.cveId}</p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-lg leading-none font-bold tabular-nums ${r.text}`}>{card.cvssScore.toFixed(1)}</p>
          <p className={`mt-1 font-mono text-[9px] tracking-widest uppercase ${r.text}`}>{r.label}</p>
        </div>
      </div>

      <p className="mt-2 font-mono text-[11px] text-zinc-500">
        {card.last ? (
          <>
            {card.last.action} by <span className="text-zinc-300">{card.last.actorName}</span>{' '}
            <time dateTime={card.last.at} title={new Date(card.last.at).toLocaleString()}>
              {timeAgo(card.last.at, now)}
            </time>
          </>
        ) : (
          <>seeded · updated {timeAgo(card._updatedAt, now)}</>
        )}
      </p>
      {card.rejectionReason ? (
        <p className="mt-1.5 border-l-2 border-red-400/50 pl-2 text-[11px] text-red-300/90">“{card.rejectionReason}”</p>
      ) : null}

      {reviewable ? (
        <div className="mt-2 border-t border-white/5 pt-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className="font-mono text-[11px] text-terminal hover:underline"
          >
            {open ? '▾ close review' : '▸ review'}
          </button>
          {open ? (
            <div className="mt-2">
              <Suspense fallback={<p className="font-mono text-[11px] text-zinc-500">loading workflow…</p>}>
                <ReviewPanel cardId={card._id} />
              </Suspense>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

/** Re-render relative times every 30s. */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  return now
}
