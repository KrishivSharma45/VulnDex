/**
 * The draft-card agent's flow, shared by the CLI (scripts/draft-card.ts) and
 * Card Forge (via src/app/api/agent/draft-card/route.ts).
 *
 * Fetches a CVE from NVD API 2.0, writes the card, and starts it in the
 * card-review workflow, which lands it in "draft". Runs on
 * SANITY_API_WRITE_TOKEN (robot, Editor role), so it can never verify,
 * publish or reject: those actions require the administrator role.
 */
import {gdrUri, refDataset} from '@sanity/workflow-engine'

import {getRarity, getSeverity} from '../../src/lib/cvss'
import {CARD_REVIEW} from '../../src/workflows/cardReview'
import type {MoveEntry, ReviewEvent} from './cardSync'
import {classifyAttacks, pickSet, writePatchInfo, writeStory} from './cardWriter'
import {attackId, cardId, setId, toBlocks} from './documents'
import {fetchNvd, parseNvd} from './nvd'
import {contentClient, env, workflowEngine} from './workflow'

export const CVE_ID = /^CVE-\d{4}-\d{4,}$/i

export type DraftCardResult = {
  cardId: string
  cveId: string
  nickname: string
  cvssScore: number
  rarity: string
  instanceId?: string
  stage?: string
  redrafted: boolean
  dryRun: boolean
}

export class AgentRefusedError extends Error {}

export async function draftCard(opts: {
  cveId: string
  nickname?: string
  dryRun?: boolean
  log?: (line: string) => void
}): Promise<DraftCardResult> {
  const log = opts.log ?? (() => {})
  if (!CVE_ID.test(opts.cveId)) throw new AgentRefusedError(`"${opts.cveId}" is not a CVE ID (CVE-YYYY-NNNN)`)
  const cveId = opts.cveId.toUpperCase()
  const {projectId, dataset} = env()
  const content = contentClient()
  const _id = cardId(cveId)

  // 1. Refuse to touch a card a human has already moved on.
  const existing = await content.fetch<{status?: string} | null>(`*[_id == $id][0]{status}`, {id: _id})
  if (existing && existing.status !== 'draft') {
    throw new AgentRefusedError(`${cveId} is "${existing.status}". The agent only drafts; a human owns it from here.`)
  }

  // 2. Research: NVD is the source of truth for score, vector, products and fixes.
  log(`Fetching ${cveId} from NVD…`)
  const record = await fetchNvd(cveId)
  const facts = parseNvd(record)
  const nickname = opts.nickname?.trim() || `${facts.affectedSoftware[0] ?? 'Mystery'} ${cveId.split('-')[1]}`
  const story = writeStory(nickname, record, facts)

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
    story: toBlocks(story),
    patchInfo: writePatchInfo(record),
    set: {_type: 'reference', _ref: setId(pickSet(record, facts))},
    attackTypes: classifyAttacks(record, facts).map((slug) => ({_type: 'reference', _ref: attackId(slug), _key: slug})),
  }

  log(`  ${nickname}: CVSS ${facts.cvssScore} (${card.rarity}), ${facts.attackVector}`)
  log(`  set: ${card.set._ref}, attacks: ${card.attackTypes.map((a) => a._key).join(', ')}`)
  log(`  story: ${story.join(' ')}`)
  log(`  patch: ${card.patchInfo}`)

  const result: DraftCardResult = {
    cardId: _id,
    cveId,
    nickname,
    cvssScore: facts.cvssScore,
    rarity: card.rarity,
    redrafted: !!existing,
    dryRun: !!opts.dryRun,
  }
  if (opts.dryRun) return result

  // Content fields only: status and the review log belong to the workflow.
  await content
    .transaction()
    .createIfNotExists({...card, status: 'draft'})
    .patch(_id, (p) => p.set(card))
    .commit({visibility: 'sync'})
  log(`✓ wrote card ${_id} (status: draft)`)

  // 4. Enter the review workflow (once per card; a redraft keeps its instance).
  const engine = workflowEngine('draft-card')
  const document = gdrUri({scheme: 'dataset', projectId, dataset, documentId: _id})
  const active = (await engine.instancesForDocument({document})).find(
    (i) => i.definition === CARD_REVIEW && !i.completedAt && !i.abortedAt,
  )
  if (active) {
    log(`✓ already in review (${active._id}, stage: ${active.currentStage}); redrafted in place`)
    return {...result, instanceId: active._id, stage: active.currentStage}
  }

  const {instance} = await engine.startInstance({
    definition: CARD_REVIEW,
    initialFields: [
      {type: 'subject', name: 'subject', value: refDataset({projectId, dataset, documentId: _id, type: 'cveCard'})},
    ],
  })

  // Seed the card's review log with the agent's own move, keyed like the worker's entries.
  const started = instance.history.find((h): h is MoveEntry => h._type === 'stageEntered' && !h.fromStage)
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
  log(`✓ started ${CARD_REVIEW} ${instance._id} → stage: ${instance.currentStage}`)
  return {...result, instanceId: instance._id, stage: instance.currentStage}
}
