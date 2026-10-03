'use client'

import {useEffect, useMemo, useState} from 'react'

import type {Rarity} from '@/lib/cvss'
import {RARITY_ORDER, RARITY_STYLES} from '@/lib/cards'
import type {AttackTypeSummary, Card, CardSetSummary} from '@/lib/types'
import {CveCard} from './CveCard'

const SORTS = {
  'cvss-desc': {label: 'CVSS: high → low', compare: (a: Card, b: Card) => b.cvssScore - a.cvssScore || b.year - a.year},
  'cvss-asc': {label: 'CVSS: low → high', compare: (a: Card, b: Card) => a.cvssScore - b.cvssScore || a.year - b.year},
  'year-desc': {label: 'Year: newest', compare: (a: Card, b: Card) => b.year - a.year || b.cvssScore - a.cvssScore},
  'year-asc': {label: 'Year: oldest', compare: (a: Card, b: Card) => a.year - b.year || b.cvssScore - a.cvssScore},
} as const
type SortKey = keyof typeof SORTS

type Filters = {
  rarities: Rarity[]
  sets: string[]
  attacks: string[]
  from: number
  to: number
  sort: SortKey
}

type Props = {
  cards: Card[]
  sets: CardSetSummary[]
  attackTypes: AttackTypeSummary[]
  initialParams: Record<string, string | string[] | undefined>
}

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v.join(',') : (v ?? '')).split(',').filter(Boolean)

export function CardBrowser({cards, sets, attackTypes, initialParams}: Props) {
  const years = cards.map((c) => c.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const yearOptions = Array.from({length: maxYear - minYear + 1}, (_, i) => minYear + i)

  const defaults: Filters = {rarities: [], sets: [], attacks: [], from: minYear, to: maxYear, sort: 'cvss-desc'}

  const [filters, setFilters] = useState<Filters>(() => {
    const p = initialParams
    const num = (v: unknown, fallback: number) => {
      const n = Number(v)
      return Number.isInteger(n) && n >= minYear && n <= maxYear ? n : fallback
    }
    const sort = String(p.sort ?? '')
    return {
      rarities: list(p.rarity).filter((r): r is Rarity => RARITY_ORDER.includes(r as Rarity)),
      sets: list(p.set).filter((id) => sets.some((s) => s._id === id)),
      attacks: list(p.attack).filter((id) => attackTypes.some((a) => a._id === id)),
      from: num(p.from, minYear),
      to: num(p.to, maxYear),
      sort: sort in SORTS ? (sort as SortKey) : 'cvss-desc',
    }
  })

  // Mirror filters into the URL so a filtered view can be shared.
  useEffect(() => {
    const q = new URLSearchParams()
    if (filters.rarities.length) q.set('rarity', filters.rarities.join(','))
    if (filters.sets.length) q.set('set', filters.sets.join(','))
    if (filters.attacks.length) q.set('attack', filters.attacks.join(','))
    if (filters.from !== minYear) q.set('from', String(filters.from))
    if (filters.to !== maxYear) q.set('to', String(filters.to))
    if (filters.sort !== 'cvss-desc') q.set('sort', filters.sort)
    const qs = q.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [filters, minYear, maxYear])

  const visible = useMemo(() => {
    const lo = Math.min(filters.from, filters.to)
    const hi = Math.max(filters.from, filters.to)
    return cards
      .filter(
        (c) =>
          (!filters.rarities.length || filters.rarities.includes(c.rarity)) &&
          (!filters.sets.length || (c.set && filters.sets.includes(c.set._id))) &&
          (!filters.attacks.length || c.attackTypes?.some((a) => filters.attacks.includes(a._id))) &&
          c.year >= lo &&
          c.year <= hi,
      )
      .sort(SORTS[filters.sort].compare)
  }, [cards, filters])

  const toggle = <K extends 'rarities' | 'sets' | 'attacks'>(key: K, value: Filters[K][number]) =>
    setFilters((f) => {
      const current = f[key] as string[]
      return {
        ...f,
        [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      }
    })

  const isFiltered =
    filters.rarities.length || filters.sets.length || filters.attacks.length || filters.from !== minYear || filters.to !== maxYear

  return (
    <div className="space-y-8">
      <section aria-label="Filters" className="space-y-4 rounded-xl border border-white/5 bg-panel/80 p-4 sm:p-5">
        <FilterRow label="rarity">
          {RARITY_ORDER.map((r) => (
            <Chip
              key={r}
              on={filters.rarities.includes(r)}
              onClass={RARITY_STYLES[r].chipOn}
              onClick={() => toggle('rarities', r)}
            >
              {RARITY_STYLES[r].label}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="set">
          {sets.map((s) => (
            <Chip key={s._id} on={filters.sets.includes(s._id)} onClick={() => toggle('sets', s._id)}>
              <span aria-hidden className="size-2 rounded-full" style={{backgroundColor: s.themeColor ?? '#71717a'}} />
              {s.title}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="attack">
          {attackTypes.map((a) => (
            <Chip key={a._id} on={filters.attacks.includes(a._id)} onClick={() => toggle('attacks', a._id)}>
              {a.name}
            </Chip>
          ))}
        </FilterRow>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-white/5 pt-4">
          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">Year range</legend>
            <span className="w-14 font-mono text-xs text-zinc-500">year</span>
            <Select
              label="From year"
              value={filters.from}
              onChange={(v) => setFilters((f) => ({...f, from: Number(v)}))}
              options={yearOptions.map((y) => [String(y), String(y)])}
            />
            <span className="text-zinc-600">–</span>
            <Select
              label="To year"
              value={filters.to}
              onChange={(v) => setFilters((f) => ({...f, to: Number(v)}))}
              options={yearOptions.map((y) => [String(y), String(y)])}
            />
          </fieldset>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-zinc-500">sort</span>
            <Select
              label="Sort cards"
              value={filters.sort}
              onChange={(v) => setFilters((f) => ({...f, sort: v as SortKey}))}
              options={Object.entries(SORTS).map(([k, s]) => [k, s.label])}
            />
          </div>

          <div className="ml-auto flex items-center gap-3 font-mono text-xs">
            <p aria-live="polite" className="text-zinc-500">
              {visible.length}/{cards.length} cards
            </p>
            {isFiltered ? (
              <button
                type="button"
                onClick={() => setFilters({...defaults, sort: filters.sort})}
                className="text-terminal hover:underline"
              >
                reset
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {visible.length ? (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((card) => (
            <li key={card._id}>
              <CveCard card={card} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center font-mono text-sm text-zinc-500">
          <p>0 results. No known bugs match those filters.</p>
          <button
            type="button"
            onClick={() => setFilters(defaults)}
            className="mt-3 text-terminal hover:underline"
          >
            reset filters
          </button>
        </div>
      )}
    </div>
  )
}

function FilterRow({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div role="group" aria-label={`Filter by ${label}`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="w-14 shrink-0 font-mono text-xs text-zinc-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip({
  on,
  onClick,
  onClass = 'bg-terminal/15 text-terminal ring-terminal/60',
  children,
}: {
  on: boolean
  onClick: () => void
  onClass?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1 transition-colors ${
        on ? onClass : 'text-zinc-400 ring-white/10 hover:text-zinc-200 hover:ring-white/25'
      }`}
    >
      {children}
    </button>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  options: [string, string][]
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-white/10 bg-ink px-2 py-1.5 font-mono text-xs text-zinc-200 focus-visible:outline-2 focus-visible:outline-terminal"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  )
}
