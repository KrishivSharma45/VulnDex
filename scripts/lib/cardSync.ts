/**
 * Effect handlers for the card-review workflow: keep the cveCard document in
 * step with its workflow instance (status, rejection reason, review log).
 *
 * Handlers may run more than once for one effect (at-least-once delivery),
 * so every write here is idempotent: the review log is upserted by the
 * workflow history entry's `_key`.
 */
import type {SanityClient} from '@sanity/client'
import {
  parseGdr,
  resolveClientActor,
  type Actor,
  type EffectHandler,
  type HistoryEntry,
  type WorkflowClient,
  type WorkflowInstance,
} from '@sanity/workflow-engine'

import {CARD_EFFECTS} from '../../src/workflows/cardReview'

/** History entries that move a card: the start, and human-fired actions. */
export type MoveEntry = Extract<HistoryEntry, {_type: 'stageEntered' | 'actionFired'}>

type CardStatus = (typeof CARD_EFFECTS)[keyof typeof CARD_EFFECTS]

export type ReviewEvent = {
  _key: string
  _type: 'reviewEvent'
  action: 'drafted' | 'verified' | 'published' | 'rejected'
  status: CardStatus
  actorName: string
  actorId?: string
  via?: string
  reason?: string
  at: string
}

/** Workflow actions that move a card, and the card status after each. */
const ACTION_EVENTS: Record<string, {action: ReviewEvent['action']; status: CardStatus}> = {
  verify: {action: 'verified', status: 'verified'},
  publish: {action: 'published', status: 'published'},
  reject: {action: 'rejected', status: 'draft'},
}

export function cardSyncHandlers(content: SanityClient): Record<string, EffectHandler> {
  return Object.fromEntries(
    Object.entries(CARD_EFFECTS).map(([name, status]) => [name, syncCard(content, status)]),
  )
}

const syncCard =
  (content: SanityClient, status: CardStatus): EffectHandler =>
  async (params, ctx) => {
    const subject = String(params.subject)
    const {documentId} = parseGdr(subject)
    const instance = await ctx.client.getDocument<WorkflowInstance>(ctx.instanceId)
    if (!instance) throw new Error(`Workflow instance ${ctx.instanceId} not found`)

    const field = (name: string) => instance.fields.find((f) => f.name === name)?.value
    const reason = status === 'draft' ? (field('rejectionReason') as string | undefined) : undefined

    const ids = [documentId, `drafts.${documentId}`]
    const docs = await content.fetch<{_id: string; reviewLog?: ReviewEvent[]}[]>(
      `*[_id in $ids]{_id, reviewLog}`,
      {ids},
    )
    if (!docs.length) throw new Error(`Card ${documentId} not found`)

    const existing = docs.find((d) => d._id === documentId)?.reviewLog ?? docs[0].reviewLog ?? []
    const reviewLog = await buildReviewLog(instance, existing, reason, {workflow: ctx.client, content})

    const tx = content.transaction()
    for (const doc of docs) {
      tx.patch(doc._id, (p) => {
        const patch = p.set({status, reviewLog})
        return reason ? patch.set({rejectionReason: reason}) : patch.unset(['rejectionReason'])
      })
    }
    await tx.commit({visibility: 'sync'})
    ctx.log(`card ${documentId} → ${status}`, {reason})
  }

/** Mirror the instance's audit trail onto the card, keeping reasons already recorded. */
async function buildReviewLog(
  instance: WorkflowInstance,
  existing: ReviewEvent[],
  latestReason: string | undefined,
  clients: {workflow: WorkflowClient; content: SanityClient},
): Promise<ReviewEvent[]> {
  const byKey = new Map(existing.map((e) => [e._key, e]))
  const names = new Map<string, string>()
  const events: ReviewEvent[] = []

  const entries = instance.history.filter(
    (h): h is MoveEntry =>
      (h._type === 'stageEntered' && !h.fromStage) || (h._type === 'actionFired' && !h.triggered && h.action in ACTION_EVENTS),
  )
  const lastRejectKey = entries.filter((h) => h._type === 'actionFired' && h.action === 'reject').at(-1)?._key

  for (const h of entries) {
    const meta =
      h._type === 'actionFired' ? ACTION_EVENTS[h.action] : {action: 'drafted' as const, status: 'draft' as const}
    const prior = byKey.get(h._key)
    events.push({
      _key: h._key,
      _type: 'reviewEvent',
      action: meta.action,
      status: meta.status,
      actorName: await actorName(h.actor, h.executionContext?.id, clients, names),
      actorId: h.actor?.id,
      via: h.executionContext?.id ?? h.executionContext?.kind,
      reason: meta.action === 'rejected' ? (prior?.reason ?? (h._key === lastRejectKey ? latestReason : undefined)) : undefined,
      at: h.at,
    })
  }
  return events
}

async function actorName(
  actor: Actor | undefined,
  via: string | undefined,
  clients: {workflow: WorkflowClient; content: SanityClient},
  cache: Map<string, string>,
): Promise<string> {
  if (!actor) return 'unknown'
  if (via === 'draft-card') return 'draft-card agent (robot token)'
  const cached = cache.get(actor.id)
  if (cached) return cached

  // Directory lookups are best-effort; the actor id is always recorded alongside.
  let name: string | undefined
  try {
    const projectId = clients.workflow.config?.().projectId
    if (projectId) {
      const res = await resolveClientActor(clients.workflow, {actor, projectId})
      if (res.status === 'resolved') name = res.user.displayName
    }
  } catch {}
  if (!name) {
    // A robot token gets "inaccessible" from the engine's directory bridge,
    // but the project's /users/{id} endpoint still resolves the person.
    try {
      const user = await clients.content.request<{displayName?: string}>({url: `/users/${actor.id}`})
      name = user.displayName
    } catch {}
  }
  const resolved = name ?? actor.id
  cache.set(actor.id, resolved)
  return resolved
}
