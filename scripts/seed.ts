/**
 * Seeds VulnDex with card sets, attack types and CVE cards.
 * CVSS score, attack vector, summary and affected software come from the NVD API 2.0.
 *
 *   npm run seed            # fetch NVD (cached) and write to Sanity
 *   npm run seed -- --dry-run
 *
 * Env (.env.local): NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
 * SANITY_API_WRITE_TOKEN, optional NVD_API_KEY (raises the rate limit).
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {createClient} from '@sanity/client'

import {getRarity, getSeverity} from '../src/lib/cvss'
import {attackTypes, cards, cardSets} from './seed-data'
import {attackId, cardId, setId, toBlocks} from './lib/documents'
import {NVD_DELAY_MS, fetchNvd, parseNvd, sleep, type NvdFacts, type NvdRecord} from './lib/nvd'

const DRY_RUN = process.argv.includes('--dry-run')
const CACHE_PATH = new URL('./nvd-cache.json', import.meta.url)

async function loadNvdFacts(): Promise<Record<string, NvdFacts>> {
  const cache: Record<string, NvdRecord> = existsSync(CACHE_PATH)
    ? JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
    : {}

  // Entries without vulnerableCpes are from an older cache format.
  const missing = cards.filter((c) => !cache[c.cveId]?.vulnerableCpes)
  if (missing.length) console.log(`Fetching ${missing.length} CVE(s) from NVD (~${NVD_DELAY_MS / 1000}s apart)…`)

  for (const [i, {cveId}] of missing.entries()) {
    if (i > 0) await sleep(NVD_DELAY_MS)
    cache[cveId] = await fetchNvd(cveId)
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n')
    console.log(`  ✓ ${cveId}`)
  }

  return Object.fromEntries(cards.map((c) => [c.cveId, parseNvd(cache[c.cveId])]))
}

// --- Sanity documents ---------------------------------------------------------


type SeedDocument = {_id: string; _type: string; [field: string]: unknown}

function buildDocuments(nvd: Record<string, NvdFacts>): SeedDocument[] {
  const setDocs = cardSets.map((s) => ({
    _id: setId(s.slug),
    _type: 'cardSet',
    title: s.title,
    description: s.description,
    themeColor: s.themeColor,
  }))

  const attackDocs = attackTypes.map((a) => ({
    _id: attackId(a.slug),
    _type: 'attackType',
    name: a.name,
    description: a.description,
  }))

  const cardDocs = cards.map((c) => {
    const f = nvd[c.cveId]
    return {
      _id: cardId(c.cveId),
      _type: 'cveCard',
      cveId: c.cveId,
      nickname: c.nickname,
      year: Number(c.cveId.split('-')[1]),
      cvssScore: f.cvssScore,
      severity: getSeverity(f.cvssScore),
      rarity: getRarity(f.cvssScore),
      attackVector: f.attackVector,
      affectedSoftware: f.affectedSoftware,
      summary: f.summary,
      story: toBlocks(c.story),
      patchInfo: c.patchInfo,
      status: 'published',
      set: {_type: 'reference', _ref: setId(c.set)},
      attackTypes: c.attackTypes.map((slug) => ({_type: 'reference', _ref: attackId(slug), _key: slug})),
    }
  })

  return [...setDocs, ...attackDocs, ...cardDocs]
}

// --- Main ------------------------------------------------------------------

async function main() {
  const nvd = await loadNvdFacts()
  const docs = buildDocuments(nvd)

  if (DRY_RUN) {
    for (const c of docs.filter((d) => d._type === 'cveCard')) {
      console.log(`${c.cveId} ${c.nickname}: ${c.cvssScore} ${c.rarity}/${c.severity} ${c.attackVector} | ${(c.affectedSoftware as string[]).join(', ')}`)
    }
    console.log(`\nDry run: ${docs.length} documents built, nothing written.`)
    return
  }

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!projectId || !dataset) throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET')
  if (!token) throw new Error('Missing SANITY_API_WRITE_TOKEN in .env.local')

  const client = createClient({projectId, dataset, token, apiVersion: '2026-05-15', useCdn: false})

  const tx = client.transaction()
  for (const doc of docs) tx.createOrReplace(doc)
  const result = await tx.commit()
  console.log(`Wrote ${result.results.length} documents to ${projectId}/${dataset}.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
