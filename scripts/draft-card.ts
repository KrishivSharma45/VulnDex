/**
 * The draft-card agent, from the command line. Card Forge triggers the same
 * flow through src/app/api/agent/draft-card/route.ts.
 *
 *   npm run draft-card CVE-2023-4966 -- --nickname "Citrix Bleed"
 *   npm run draft-card CVE-2023-4966 -- --dry-run
 *
 * The agent never publishes. See scripts/lib/draftCard.ts.
 */
import {CVE_ID, draftCard} from './lib/draftCard'

function args() {
  const argv = process.argv.slice(2)
  const cveId = argv.find((a) => CVE_ID.test(a))
  const i = argv.indexOf('--nickname')
  const nickname = i >= 0 ? argv[i + 1] : undefined
  if (!cveId) throw new Error('Usage: npm run draft-card CVE-YYYY-NNNN [-- --nickname "Name"] [--dry-run]')
  return {cveId, nickname, dryRun: argv.includes('--dry-run')}
}

draftCard({...args(), log: console.log})
  .then((r) => {
    if (r.dryRun) console.log('\nDry run: nothing written.')
    else console.log('  Next: a reviewer verifies, then publishes or rejects it (Studio or Card Forge).')
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
