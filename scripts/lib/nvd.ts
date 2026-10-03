/**
 * NVD API 2.0 client shared by the seed script and the draft-card agent.
 * https://nvd.nist.gov/developers/vulnerabilities
 */

const NVD_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0'
const NVD_API_KEY = process.env.NVD_API_KEY
// NVD limits: 5 req / 30s without a key, 50 req / 30s with one.
export const NVD_DELAY_MS = NVD_API_KEY ? 700 : 6500
const MAX_AFFECTED = 6

export type NvdFacts = {
  cvssScore: number
  cvssVersion: string
  attackVector: 'network' | 'adjacent' | 'local' | 'physical'
  summary: string
  affectedSoftware: string[]
  published: string
}

/** Trimmed NVD record as stored in the cache, so parsing can change without refetching. */
export type NvdRecord = {
  id: string
  published: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics: Record<string, any[]>
  descriptions: {lang: string; value: string}[]
  /** Vulnerable CPE 2.3 strings, in NVD order. */
  vulnerableCpes: string[]
  /** CWE ids, e.g. "CWE-89". Absent in caches written before the draft-card agent existed. */
  weaknesses?: string[]
  /** References NVD tags as "Patch" or "Vendor Advisory". */
  patchRefs?: {url: string; tags: string[]}[]
  /** First fixed versions (`versionEndExcluding`) per vulnerable product, e.g. "OpenSSH 9.8p1". */
  fixedIn?: string[]
  /** CISA Known Exploited Vulnerabilities entry, if listed. */
  cisa?: {added: string; name?: string; requiredAction?: string}
}

// --- NVD -------------------------------------------------------------------

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function fetchNvd(cveId: string, attempt = 1): Promise<NvdRecord> {
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
  const fixedIn = new Set<string>()
  for (const config of cve.configurations ?? []) {
    for (const node of config.nodes ?? []) {
      for (const match of node.cpeMatch ?? []) {
        if (!match.vulnerable) continue
        vulnerableCpes.push(match.criteria)
        if (match.versionEndExcluding) {
          const [, , , vendor, product] = match.criteria.split(':')
          fixedIn.add(`${productName(vendor, product)} ${match.versionEndExcluding}`)
        }
      }
    }
  }

  const weaknesses = [
    ...new Set<string>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cve.weaknesses ?? []).flatMap((w: any) => w.description.map((d: any) => d.value)),
    ),
  ].filter((w) => w.startsWith('CWE-'))

  const patchRefs = (cve.references ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((r: any) => r.tags?.some((t: string) => t === 'Patch' || t === 'Vendor Advisory'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => ({url: r.url as string, tags: r.tags as string[]}))

  return {
    id: cve.id,
    published: cve.published,
    metrics: cve.metrics,
    descriptions: cve.descriptions,
    vulnerableCpes,
    weaknesses,
    patchRefs,
    fixedIn: [...fixedIn],
    ...(cve.cisaExploitAdd
      ? {cisa: {added: cve.cisaExploitAdd, name: cve.cisaVulnerabilityName, requiredAction: cve.cisaRequiredAction}}
      : {}),
  }
}

export function parseNvd(cve: NvdRecord): NvdFacts {
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
  netscaler_gateway: 'NetScaler Gateway', netscaler_application_delivery_controller: 'NetScaler ADC',
  moveit_transfer: 'MOVEit Transfer', moveit_cloud: 'MOVEit Cloud',
}

const prettify = (s: string) =>
  CPE_NAMES[s] ??
  s.replace(/\\/g, '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/** CPE vendor + product → display name, e.g. "OpenBSD OpenSSH"; drops the vendor when the product repeats it. */
export function productName(vendor: string, product: string) {
  const p = prettify(product)
  const v = prettify(vendor)
  return p.toLowerCase().startsWith(v.toLowerCase()) ? p : `${v} ${p}`
}

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
    products.set(key, {
      vendor,
      name: productName(vendor, product),
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
