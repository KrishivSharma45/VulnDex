'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useState} from 'react'

const LINKS = [
  {href: '/', label: 'Home'},
  {href: '/cards', label: 'Collection'},
  {href: '/battle', label: 'Battle'},
  {href: '/about', label: 'About'},
]

export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <nav aria-label="Main" className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
      <Link href="/" onClick={() => setOpen(false)} className="group flex items-center gap-2.5 text-zinc-50">
        <Logo />
        <span className="text-lg font-extrabold tracking-tight">
          Vuln<span className="text-neon transition-[text-shadow] group-hover:text-glow">Dex</span>
        </span>
      </Link>

      {/* Desktop */}
      <div className="hidden items-center gap-1 md:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? 'page' : undefined}
            className={`group relative px-4 py-2 text-sm font-medium transition-colors ${
              isActive(l.href) ? 'text-neon' : 'text-zinc-400 hover:text-zinc-50'
            }`}
          >
            {l.label}
            <span
              aria-hidden
              className={`absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full bg-neon shadow-[0_0_8px_rgb(234_255_61/0.54)] transition-transform duration-300 ${
                isActive(l.href) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`}
            />
          </Link>
        ))}
        <Link
          href="/battle"
          className="ml-3 rounded-full bg-neon px-5 py-2 text-sm font-bold text-ink shadow-[0_0_20px_-4px_rgb(234_255_61/0.48)] transition-all hover:scale-105 hover:shadow-[0_0_28px_-2px_rgb(234_255_61/0.54)]"
        >
          Play now
        </Link>
      </div>

      {/* Mobile */}
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 items-center justify-center rounded-full border border-white/10 text-zinc-200 transition-colors hover:border-neon/50 md:hidden"
      >
        <span aria-hidden className="relative block h-3 w-4">
          <span className={`absolute left-0 h-0.5 w-4 rounded bg-current transition-all duration-300 ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
          <span className={`absolute top-1.5 left-0 h-0.5 w-4 rounded bg-current transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} />
          <span className={`absolute left-0 h-0.5 w-4 rounded bg-current transition-all duration-300 ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
        </span>
      </button>

      {open ? (
        <div
          id="mobile-menu"
          className="animate-menu-in absolute inset-x-4 top-[calc(100%+0.5rem)] rounded-2xl border border-neon/20 bg-panel p-2 shadow-2xl shadow-black/60 backdrop-blur-md md:hidden"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(l.href) ? 'page' : undefined}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                isActive(l.href) ? 'bg-neon/10 text-neon' : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              {l.label}
              {isActive(l.href) ? <span aria-hidden className="size-1.5 rounded-full bg-neon shadow-[0_0_8px_rgb(234_255_61/0.6)]" /> : null}
            </Link>
          ))}
          <Link
            href="/battle"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-xl bg-neon px-4 py-3 text-center font-bold text-ink"
          >
            Play now
          </Link>
        </div>
      ) : null}
    </nav>
  )
}

/** Two fanned cards in neon. */
function Logo() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="size-8 drop-shadow-[0_0_6px_rgb(234_255_61/0.42)] transition-transform duration-300 group-hover:-rotate-6">
      <rect x="5" y="7" width="15" height="21" rx="3" transform="rotate(-12 12.5 17.5)" fill="none" stroke="#eaff3d" strokeOpacity="0.5" strokeWidth="1.5" />
      <rect x="11" y="4" width="15" height="21" rx="3" transform="rotate(8 18.5 14.5)" fill="#eaff3d" />
      <path d="M18.5 10.5 16 15.5h3l-1.5 4 4-6h-3l1.5-3z" fill="#05080d" transform="rotate(8 18.5 14.5)" />
    </svg>
  )
}
