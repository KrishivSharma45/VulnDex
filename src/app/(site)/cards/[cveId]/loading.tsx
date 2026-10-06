/** Skeleton for a card's detail page (overrides the collection skeleton above it). */
export default function CardLoading() {
  return (
    <div role="status" aria-label="Loading card" className="space-y-12">
      <div className="h-5 w-48 animate-pulse rounded-lg bg-white/5" />
      <div className="grid gap-10 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-14">
        <div className="mx-auto aspect-[5/7] w-full max-w-[20rem] animate-pulse rounded-2xl border-2 border-neon/15 bg-panel" />
        <div className="space-y-5">
          <div className="h-4 w-36 animate-pulse rounded bg-white/5" />
          <div className="h-12 w-2/3 animate-pulse rounded-xl bg-white/10" />
          <div className="h-10 w-40 animate-pulse rounded-full bg-white/5" />
          <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-panel/80" />
          <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  )
}
