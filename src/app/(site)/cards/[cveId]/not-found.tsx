import Link from 'next/link'

export default function CardNotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-7xl font-extrabold text-neon">404</p>
      <h1 className="mt-4 text-2xl font-bold text-zinc-50">This card isn&apos;t in the collection</h1>
      <p className="mt-2 text-zinc-400">It may not be published yet, or the link is mistyped.</p>
      <Link
        href="/cards"
        className="mt-8 inline-block rounded-full bg-neon px-6 py-3 font-semibold text-ink hover:bg-neon/85"
      >
        Browse the collection
      </Link>
    </div>
  )
}
