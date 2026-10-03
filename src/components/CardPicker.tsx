'use client'

import {useId, useMemo, useRef, useState} from 'react'

import {RARITY_STYLES} from '@/lib/cards'
import type {Card} from '@/lib/types'

type Props = {
  label: string
  cards: Card[]
  value: Card | null
  onChange: (card: Card) => void
  /** Card picked on the other side; shown but not selectable. */
  excludeId?: string
}

/** Searchable single-select (ARIA combobox). Matches nickname or CVE ID. */
export function CardPicker({label, cards, value, onChange, excludeId}: Props) {
  const id = useId()
  const listId = `${id}-list`
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter(
      (c) => !q || c.nickname.toLowerCase().includes(q) || c.cveId.toLowerCase().includes(q),
    )
  }, [cards, query])

  const choose = (card: Card | undefined) => {
    if (!card || card.cveId === excludeId) return
    onChange(card)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (options.length ? (i + step + options.length) % options.length : 0))
    } else if (e.key === 'Enter' && open) {
      e.preventDefault()
      choose(options[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block font-mono text-xs text-zinc-500">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${options[active].cveId}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={value ? `${value.nickname} · ${value.cveId}` : 'search nickname or CVE…'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={`w-full rounded-lg border border-white/10 bg-ink px-3 py-2.5 font-mono text-sm text-zinc-100 focus:border-terminal/60 focus:outline-none ${
          value ? 'placeholder:text-zinc-200' : 'placeholder:text-zinc-600'
        }`}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          // Keep focus in the input while clicking an option.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-white/10 bg-panel py-1 shadow-xl shadow-black/50"
        >
          {options.length ? (
            options.map((c, i) => {
              const disabled = c.cveId === excludeId
              return (
                <li
                  key={c.cveId}
                  id={`${listId}-${c.cveId}`}
                  role="option"
                  aria-selected={value?.cveId === c.cveId}
                  aria-disabled={disabled}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                    i === active ? 'bg-white/5' : ''
                  } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <span className="truncate text-zinc-100">
                    {c.nickname}
                    <span className="ml-2 font-mono text-xs text-zinc-500">{c.cveId}</span>
                  </span>
                  <span className={`shrink-0 font-mono text-xs ${RARITY_STYLES[c.rarity].accent}`}>
                    {c.cvssScore.toFixed(1)}
                  </span>
                </li>
              )
            })
          ) : (
            <li className="px-3 py-2 font-mono text-xs text-zinc-500">no matching CVE</li>
          )}
        </ul>
      ) : null}
    </div>
  )
}
