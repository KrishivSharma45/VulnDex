import type {Metadata} from 'next'
import Link from 'next/link'

import {SiteChrome} from '@/components/SiteChrome'

export const metadata: Metadata = {title: 'Page not found'}

/** Site-wide 404 for URLs that don't match any route. */
export default function NotFound() {
  return (
    <SiteChrome>
      <div className="animate-fade-up py-16 text-center sm:py-24">
        <p className="text-8xl font-extrabold tracking-tight text-neon">404</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-50">This page was never patched in</h1>
        <p className="mx-auto mt-3 max-w-md text-zinc-400">
          The link may be mistyped, or the page has moved. Here&apos;s where you can go instead:
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-neon px-6 py-3 font-bold text-ink transition-transform hover:scale-105"
          >
            Back home
          </Link>
          <Link
            href="/cards"
            className="rounded-full border border-neon/40 px-6 py-3 font-semibold text-neon transition-colors hover:bg-neon/10"
          >
            Browse the collection
          </Link>
        </div>
      </div>
    </SiteChrome>
  )
}
