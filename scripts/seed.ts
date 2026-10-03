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
import {randomUUID} from 'node:crypto'
import {createClient} from '@sanity/client'

import {getRarity, getSeverity} from '../src/lib/cvss'
import {attackTypes, cards, cardSets} from './seed-data'

const DRY_RUN = process.argv.includes('--dry-run')
const NVD_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0'
const NVD_API_KEY = process.env.NVD_API_KEY
// NVD limits: 5 req / 30s without a key, 50 req / 30s with one.
const NVD_DELAY_MS = NVD_API_KEY ? 700 : 6500
const CACHE_PATH = new URL('./nvd-cache.json', import.meta.url)
const MAX_AFFECTED = 6

type NvdFacts = {
  cvssScore: number
  cvssVersion: string
  attackVector: 'network' | 'adjacent' | 'local' | 'physical'
  summary: string
  affectedSoftware: string[]
  published: string
}

/** Trimmed NVD record as stored in the cache, so parsing can change without refetching. */
type NvdRecord = {
  id: string
  published: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics: Record<string, any[]>
  descriptions: {lang: string; value: string}[]
  /** Vulnerable CPE 2.3 strings, in NVD order. */
  vulnerableCpes: string[]
}

// --- NVD -------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchNvd(cveId: string, attempt = 1): Promise<NvdRecord> {
  const res = await fetch(`${NVD_URL}?cveId=${encodeURIComponent(cveId)}`, {
    headers: NVD_API_KEY ? {apiKey: NVD_API_KEY} : {},
  })
  if ((res.status === 403 || res.status === 429 || res.status >= 500) && attempt < 4) {
    const wait = 30_000
    console.warn(`  NVD ${res.status} for ${cveId}, retrying in ${wait / 1000}s…`)
    await sleep(wait)
    return fetchNvd(cveId, attempt + 1)
  }
  if (!res.ok) throw new Error(`NVD ${res.status} for ${cveId}`)

  const cve = (await res.json()).vulnerabilities?.[0]?.cve
  if (!cve) throw new Error(`NVD returned no record for ${cveId}`)

  const vulnerableCpes: string[] = []
  for (const config of cve.configurations ?? []) {
    for (const node of config.nodes ?? []) {
      for (const match of node.cpeMatch ?? []) {
        if (match.vulnerable) vulnerableCpes.push(match.criteria)
      }
    }
  }
  return {id: cve.id, published: cve.published, metrics: cve.metrics, descriptions: cve.descriptions, vulnerableCpes}
}

function parseNvd(cve: NvdRecord): NvdFacts {
  // Prefer NVD's own (Primary) v3.1 score, then other v3/v4, then v2.
  const order = ['cvssMetricV31', 'cvssMetricV30', 'cvssMetricV40', 'cvssMetricV2']
  let metric
  let version = ''
  for (const key of order) {
    const list = cve.metrics?.[key]
    if (list?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metric = list.find((m: any) => m.type === 'Primary') ?? list[0]
      version = metric.cvssData.version
      break
    }
  }
  if (!metric) throw new Error(`${cve.id}: no CVSS metrics`)

  const vector = String(metric.cvssData.attackVector ?? metric.cvssData.accessVector).toLowerCase()
  const attackVector = vector.startsWith('adjacent') ? 'adjacent' : (vector as NvdFacts['attackVector'])

  const summary = cve.descriptions.find((d) => d.lang === 'en')?.value ?? ''

  return {
    cvssScore: metric.cvssData.baseScore,
    cvssVersion: version,
    attackVector,
    summary,
    affectedSoftware: parseAffected(cve.vulnerableCpes, summary),
    published: cve.published,
  }
}

// CPE tokens that title-casing gets wrong.
const CPE_NAMES: Record<string, string> = {
  openssl: 'OpenSSL', openbsd: 'OpenBSD', openssh: 'OpenSSH', gnu: 'GNU', vmware: 'VMware',
  ibm: 'IBM', amd: 'AMD', redhat: 'Red Hat', netapp: 'NetApp', log4j: 'Log4j',
  'filezilla-project': 'FileZilla', filezilla_server: 'FileZilla Server', suse: 'SUSE',
  fedoraproject: 'Fedora', opensuse: 'openSUSE', qnap: 'QNAP', almalinux: 'AlmaLinux',
  sonicwall: 'SonicWall', eos: 'EOS', qts: 'QTS',
}

const prettify = (s: string) =>
  CPE_NAMES[s] ??
  s.replace(/\\/g, '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/**
 * Vulnerable CPEs → up to MAX_AFFECTED "Vendor Product" names.
 * CPE lists can hold hundreds of downstream products (e.g. every Siemens firmware bundling
 * OpenSSL), so products named in NVD's own description come first (up to 2 per vendor),
 * then the remaining slots go to one product per other vendor, in NVD order.
 */
function parseAffected(cpes: string[], summary: string): string[] {
  const text = summary.toLowerCase()
  const products = new Map<string, {vendor: string; name: string; mentioned: boolean}>()
  for (const cpe of cpes) {
    const [, , , vendor, product] = cpe.split(':')
    const key = `${vendor}:${product}`
    if (products.has(key)) continue
    const p = prettify(product)
    const v = prettify(vendor)
    products.set(key, {
      vendor,
      name: p.toLowerCase().startsWith(v.toLowerCase()) ? p : `${v} ${p}`,
      mentioned: text.includes(product.replace(/_/g, ' ').replace(/\\/g, '')),
    })
  }

  const all = [...products.values()]
  const picked: typeof all = []
  const perVendor = new Map<string, number>()
  const take = (candidates: typeof all, maxPerVendor: number) => {
    for (const c of candidates) {
      if (picked.length >= MAX_AFFECTED) return
      const count = perVendor.get(c.vendor) ?? 0
      if (count >= maxPerVendor || picked.includes(c)) continue
      perVendor.set(c.vendor, count + 1)
      picked.push(c)
    }
  }
  take(all.filter((c) => c.mentioned), 2)
  take(all, 1)
  return picked.map((c) => c.name)
}

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

const key = () => randomUUID().replace(/-/g, '').slice(0, 12)

const toBlocks = (paragraphs: string[]) =>
  paragraphs.map((text) => ({
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: key(), text, marks: []}],
  }))

// IDs use hyphens, not dots: dotted IDs are treated as private paths in Sanity.
const setId = (slug: string) => `cardSet-${slug}`
const attackId = (slug: string) => `attackType-${slug}`
const cardId = (cveId: string) => cveId.toLowerCase()

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
