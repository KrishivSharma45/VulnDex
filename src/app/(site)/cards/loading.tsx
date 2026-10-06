/** Skeleton for the collection while cards load. */
export default function CollectionLoading() {
  return (
    <div role="status" aria-label="Loading the collection" className="space-y-8">
      <div className="max-w-2xl space-y-3">
        <div className="h-12 w-72 animate-pulse rounded-xl bg-white/10" />
        <div className="h-5 w-full max-w-lg animate-pulse rounded-lg bg-white/5" />
      </div>
      <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-panel/80" />
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({length: 8}, (_, i) => (
          <li key={i}>
            <div
              className="mx-auto aspect-[5/7] w-full max-w-[20rem] animate-pulse rounded-2xl border-2 border-neon/15 bg-panel"
              style={{animationDelay: `${i * 80}ms`}}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
