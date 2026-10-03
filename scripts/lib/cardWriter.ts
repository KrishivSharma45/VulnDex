/**
 * The draft-card agent's writer. Deterministic templates over NVD fields, so
 * every sentence traces back to the record (product, weakness, vector, score,
 * CISA KEV status) and a human reviewer can fact-check it against NVD.
 */
import type {NvdFacts, NvdRecord} from './nvd'

type AttackSlug = 'rce' | 'memory-disclosure' | 'privilege-escalation' | 'side-channel' | 'auth-bypass'
type SetSlug = 'legendary-breaches' | 'windows-woes' | 'web-apocalypse' | 'hardware-haunts' | 'linux-lore'

const CWE_FLAVOR: Record<string, string> = {
  'CWE-89': 'a SQL query that trusted its input a little too much',
  'CWE-78': 'a shell command stitched together from user input',
  'CWE-77': 'a command line built from strings it should never have trusted',
  'CWE-94': 'code that happily ran code it was handed',
  'CWE-502': 'a deserializer that unpacked whatever arrived',
  'CWE-22': 'a file path that wandered out of its directory',
  'CWE-119': 'a buffer that lost track of where it ended',
  'CWE-120': 'a copy that never checked whether it fit',
  'CWE-125': 'a read that kept going past the end of the buffer',
  'CWE-787': 'a write that kept going past the end of the buffer',
  'CWE-416': 'memory used after it had already been freed',
  'CWE-287': 'a login check that was not really checking',
  'CWE-306': 'a critical function with no authentication in front of it',
  'CWE-362': 'a race condition with very good timing',
  'CWE-200': 'a leak of information that was meant to stay private',
}

const VECTOR_LINE: Record<NvdFacts['attackVector'], string> = {
  network: 'Anyone who could reach it over the network could take a swing',
  adjacent: 'An attacker on the same network segment could take a swing',
  local: 'An attacker needed a foothold on the machine first',
  physical: 'An attacker needed to be physically at the machine',
}

const has = (record: NvdRecord, ...cwes: string[]) => cwes.some((c) => record.weaknesses?.includes(c))

export function classifyAttacks(record: NvdRecord, facts: NvdFacts): AttackSlug[] {
  const text = facts.summary.toLowerCase()
  const types = new Set<AttackSlug>()
  if (/execut\w* (arbitrary )?(code|commands)|code execution|remote code|web ?shell/.test(text) || has(record, 'CWE-78', 'CWE-94', 'CWE-502'))
    types.add('rce')
  if (/sensitive information|memory|over-?read|disclos|leak/.test(text) || has(record, 'CWE-125', 'CWE-200'))
    types.add('memory-disclosure')
  if (/privilege|elevat|escalat/.test(text)) types.add('privilege-escalation')
  if (/side[- ]channel|speculative|timing/.test(text)) types.add('side-channel')
  if (/bypass|hijack|session token|gain access|without (valid )?credentials/.test(text) || has(record, 'CWE-287', 'CWE-306'))
    types.add('auth-bypass')
  if (!types.size) types.add(facts.attackVector === 'network' ? 'rce' : 'privilege-escalation')
  return [...types]
}

export function pickSet(record: NvdRecord, facts: NvdFacts): SetSlug {
  const primary = (facts.affectedSoftware[0] ?? '').toLowerCase()
  if (/windows|microsoft/.test(primary)) return 'windows-woes'
  if (/linux|openssh|kernel/.test(primary)) return 'linux-lore'
  if (/intel|amd|arm cortex/.test(primary) || record.vulnerableCpes[0]?.split(':')[2] === 'h') return 'hardware-haunts'
  return 'web-apocalypse'
}

export function writeStory(nickname: string, record: NvdRecord, facts: NvdFacts): string[] {
  const product = facts.affectedSoftware[0] ?? 'the affected software'
  const cwe = record.weaknesses?.find((w) => CWE_FLAVOR[w])
  const flaw = cwe ? CWE_FLAVOR[cwe] : 'a bug in how it handled untrusted input'
  const score = facts.cvssScore.toFixed(1)

  const opener = `${nickname} (${record.id}) is ${flaw}, living in ${product}. ${VECTOR_LINE[facts.attackVector]}.`
  const scale =
    facts.cvssScore >= 9
      ? `NVD scores it ${score} out of 10, about as loud as the alarm goes.`
      : facts.cvssScore >= 7
        ? `NVD scores it ${score}: high enough that patch windows got cancelled.`
        : `NVD scores it ${score}, which undersells how much paperwork it caused.`
  const wild = record.cisa
    ? ` CISA added it to the Known Exploited Vulnerabilities catalog on ${record.cisa.added}, so this one was used in real attacks, not just in a lab.`
    : ''

  return [opener, `${scale}${wild}`]
}

export function writePatchInfo(record: NvdRecord): string {
  const parts: string[] = []
  const fixed = record.fixedIn?.slice(0, 4) ?? []
  if (fixed.length) parts.push(`Upgrade past the affected versions; per NVD, fixed from: ${fixed.join(', ')}.`)
  if (record.cisa?.requiredAction) parts.push(`CISA required action: ${record.cisa.requiredAction}`)
  const advisory = record.patchRefs?.[0]?.url
  if (advisory) parts.push(`Vendor advisory: ${advisory}`)
  return parts.join(' ') || 'No fixed version listed in NVD yet. Check the vendor advisory linked from the NVD entry.'
}
