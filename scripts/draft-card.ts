/**
 * The draft-card agent. Fetches a CVE from NVD API 2.0, writes the card, and
 * starts it in the card-review workflow, which lands it in "draft".
 *
 *   npm run draft-card CVE-2023-4966 -- --nickname "Citrix Bleed"
 *
 * The agent never publishes. It runs on SANITY_API_WRITE_TOKEN (a robot token
 * with the Editor role); the workflow's verify / publish / reject actions
 * require the administrator role, so only a human reviewer can move the card on.
 * Re-running on a card that's back in draft (e.g. rejected) redrafts it in place.
 */
import {gdrUri, refDataset} from '@sanity/workflow-engine'

import {getRarity, getSeverity} from '../src/lib/cvss'
import {CARD_REVIEW} from '../src/workflows/cardReview'
import {classifyAttacks, pickSet, writePatchInfo, writeStory} from './lib/cardWriter'
import type {MoveEntry, ReviewEvent} from './lib/cardSync'
import {attackId, cardId, setId, toBlocks} from './lib/documents'
import {fetchNvd, parseNvd} from './lib/nvd'
import {contentClient, env, workflowEngine} from './lib/workflow'

function args() {
  const argv = process.argv.slice(2)
  const cveId = argv.find((a) => /^CVE-\d{4}-\d{4,}$/i.test(a))?.toUpperCase()
  const i = argv.indexOf('--nickname')
  const nickname = i >= 0 ? argv[i + 1] : undefined
  if (!cveId) throw new Error('Usage: npm run draft-card CVE-YYYY-NNNN [-- --nickname "Name"]')
  return {cveId, nickname, dryRun: argv.includes('--dry-run')}
}

async function main() {
  const {cveId, nickname: givenName, dryRun} = args()
  const {projectId, dataset} = env()
  const content = contentClient()
  const _id = cardId(cveId)

  // 1. Refuse to touch a card a human has already moved on.
  const existing = await content.fetch<{status?: string} | null>(`*[_id == $id][0]{status}`, {id: _id})
  if (existing && existing.status !== 'draft') {
    throw new Error(`${cveId} is "${existing.status}". The agent only drafts; a human owns it from here.`)
  }

  // 2. Research: NVD is the source of truth for score, vector, products and fixes.
  console.log(`Fetching ${cveId} from NVD…`)
  const record = await fetchNvd(cveId)
  const facts = parseNvd(record)
  const nickname = givenName ?? `${facts.affectedSoftware[0] ?? 'Mystery'} ${cveId.split('-')[1]}`

  // 3. Write the card.
  const card = {
    _id,
    _type: 'cveCard',
    cveId,
    nickname,
    year: Number(cveId.split('-')[1]),
    cvssScore: facts.cvssScore,
    severity: getSeverity(facts.cvssScore),
    rarity: getRarity(facts.cvssScore),
    attackVector: facts.attackVector,
    affectedSoftware: facts.affectedSoftware,
    summary: facts.summary,
    story: toBlocks(writeStory(nickname, record, facts)),
    patchInfo: writePatchInfo(record),
    set: {_type: 'reference', _ref: setId(pickSet(record, facts))},
    attackTypes: classifyAttacks(record, facts).map((slug) => ({_type: 'reference', _ref: attackId(slug), _key: slug})),
  }

  console.log(`  ${nickname}: CVSS ${facts.cvssScore} (${card.rarity}), ${facts.attackVector}`)
  console.log(`  set: ${card.set._ref}, attacks: ${card.attackTypes.map((a) => a._key).join(', ')}`)
  console.log(`  story: ${writeStory(nickname, record, facts).join(' ')}`)
  console.log(`  patch: ${card.patchInfo}`)
  if (dryRun) return console.log('\nDry run: nothing written.')

  // Content fields only: status and the review log belong to the workflow.
  await content
    .transaction()
    .createIfNotExists({...card, status: 'draft'})
    .patch(_id, (p) => p.set(card))
    .commit({visibility: 'sync'})
  console.log(`✓ wrote card ${_id} (status: draft)`)

  // 4. Enter the review workflow (once per card; a redraft keeps its instance).
  const engine = workflowEngine('draft-card')
  const document = gdrUri({scheme: 'dataset', projectId, dataset, documentId: _id})
  const active = (await engine.instancesForDocument({document})).find(
    (i) => i.definition === CARD_REVIEW && !i.completedAt && !i.abortedAt,
  )
  if (active) {
    console.log(`✓ already in review (${active._id}, stage: ${active.currentStage}); redrafted in place`)
    return
  }

  const {instance} = await engine.startInstance({
    definition: CARD_REVIEW,
    initialFields: [
      {type: 'subject', name: 'subject', value: refDataset({projectId, dataset, documentId: _id, type: 'cveCard'})},
    ],
  })

  // Seed the card's review log with the agent's own move, keyed like the worker's entries.
  const started = instance.history.find(
    (h): h is MoveEntry => h._type === 'stageEntered' && !h.fromStage,
  )
  if (started) {
    const event: ReviewEvent = {
      _key: started._key,
      _type: 'reviewEvent',
      action: 'drafted',
      status: 'draft',
      actorName: 'draft-card agent (robot token)',
      actorId: started.actor?.id,
      via: 'draft-card',
      at: started.at,
    }
    await content.patch(_id).setIfMissing({reviewLog: []}).append('reviewLog', [event]).commit()
  }
  console.log(`✓ started ${CARD_REVIEW} ${instance._id} → stage: ${instance.currentStage}`)
  console.log('  Next: a reviewer verifies, then publishes or rejects it in Studio.')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
