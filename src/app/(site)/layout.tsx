import Link from 'next/link'

export default function SiteLayout({children}: LayoutProps<'/'>) {
  return (
    <div className="bg-grid flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-ink/80 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-mono text-sm font-semibold tracking-tight text-zinc-100">
            <span className="text-terminal">&gt;_</span> vulndex
          </Link>
          <div className="flex items-center gap-1 font-mono text-sm">
            <Link href="/" className="rounded px-2 py-1.5 text-zinc-400 sm:px-3 hover:bg-white/5 hover:text-zinc-100">
              ~/home
            </Link>
            <Link href="/cards" className="rounded px-2 py-1.5 text-zinc-400 sm:px-3 hover:bg-white/5 hover:text-zinc-100">
              ~/cards
            </Link>
            <Link href="/battle" className="rounded px-2 py-1.5 text-zinc-400 sm:px-3 hover:bg-white/5 hover:text-zinc-100">
              ~/battle
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 font-mono text-xs text-zinc-500 sm:flex-row sm:justify-between sm:px-6">
          <p>CVSS scores and summaries: NIST National Vulnerability Database.</p>
          <p>Content managed in Sanity · Built for the DEV Sanity Challenge</p>
        </div>
      </footer>
    </div>
  )
}
