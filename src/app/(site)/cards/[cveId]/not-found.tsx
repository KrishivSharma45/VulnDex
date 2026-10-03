import Link from 'next/link'

export default function CardNotFound() {
  return (
    <div className="py-16 text-center font-mono">
      <p className="text-6xl font-bold text-terminal">404</p>
      <p className="mt-4 text-zinc-400">No such CVE in the dex. It may be unpublished, or very well hidden.</p>
      <Link href="/cards" className="mt-6 inline-block text-sm text-terminal hover:underline">
        ← back to all cards
      </Link>
    </div>
  )
}
