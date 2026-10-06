import Link from 'next/link'

import {SiteNav} from './SiteNav'

const FOOTER_LINKS = [
  {href: '/cards', label: 'Collection'},
  {href: '/battle', label: 'Battle'},
  {href: '/about', label: 'About'},
]

/** Header, main column and footer shared by every public page (and the 404). */
export function SiteChrome({children}: {children: React.ReactNode}) {
  return (
    <div className="bg-grid flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-neon/10 bg-ink/70 backdrop-blur-xl">
        <SiteNav />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>

      <footer className="border-t border-neon/10 bg-ink/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
          <div>
            <p className="font-extrabold text-zinc-100">
              Vuln<span className="text-neon">Dex</span>
            </p>
            <p className="mt-1 text-zinc-500">
              History&apos;s most infamous bugs, now collectible. Scores and summaries from the{' '}
              <a href="https://nvd.nist.gov" className="text-zinc-400 underline-offset-2 hover:text-neon hover:underline">
                National Vulnerability Database
              </a>
              .
            </p>
          </div>
          <ul className="flex gap-5">
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-zinc-400 transition-colors hover:text-neon">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  )
}
