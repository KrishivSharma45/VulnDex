/**
 * Card review pipeline, as a Sanity Workflows definition.
 *
 *   draft ──verify──▶ verified ──publish──▶ published
 *     ▲  └─reject─┐      │
 *     └───────────┴──reject (with reason)
 *
 * The draft-card agent starts an instance (lands in `draft`). Only a human
 * reviewer can verify, publish or reject: those actions are gated on
 * REVIEWER_ROLES, and the agent's robot token has the Editor role.
 *
 * Ops can only write workflow fields, never the card itself, so every human
 * action queues an effect (`mark-*`) that the workflow worker drains to update
 * the card's `status` and review log. Each transition waits for its effect to
 * finish, so the workflow only reaches `published` once the card really is.
 *
 * NOTE: role gates are advisory (evaluated by the engine, not the Content
 * Lake). See docs/workflow.md for what is and isn't enforced.
 */
import {
  defineAction,
  defineActivity,
  defineField,
  defineStage,
  defineTransition,
  defineWorkflow,
} from '@sanity/workflow-engine/define'

export const CARD_REVIEW = 'card-review'

/** Project roles allowed to move a card forward. The agent token is "editor", so it can't. */
export const REVIEWER_ROLES = ['administrator']

/** Effect names → the card status their handler writes. */
export const CARD_EFFECTS = {
  'mark-verified': 'verified',
  'mark-published': 'published',
  // Effect names are unique per definition, so each reject gets its own.
  'mark-draft-rejected': 'draft',
  'mark-rejected': 'draft',
} as const

const syncCard = (name: keyof typeof CARD_EFFECTS) => ({
  name,
  title: `Set card status to "${CARD_EFFECTS[name]}"`,
  bindings: {subject: '$fields.subject._id'},
  retry: {kind: 'engine' as const, attempts: 3, backoff: {kind: 'exponential' as const, delayMs: 1000}},
})

const rejectAction = (opts: {exitsStage: boolean}) =>
  defineAction({
    name: 'reject',
    title: 'Reject with reason',
    description: 'Send the card back to draft. The reason is shown on the card.',
    roles: REVIEWER_ROLES,
    ...(opts.exitsStage ? {status: 'done' as const} : {}),
    params: [{type: 'string', name: 'reason', title: 'Reason', required: true}],
    ops: [
      {type: 'field.set', target: {field: 'rejectionReason'}, value: {type: 'param', param: 'reason'}},
      {type: 'field.set', target: {field: 'rejectedBy'}, value: {type: 'actor'}},
      {type: 'field.unset', target: {field: 'verifiedBy'}},
    ],
    effects: [syncCard(opts.exitsStage ? 'mark-rejected' : 'mark-draft-rejected')],
  })

export const cardReview = defineWorkflow({
  name: CARD_REVIEW,
  title: 'Card review',
  description:
    'An agent drafts a CVE card; a human verifies it, then publishes it, or rejects it back to draft with a reason.',
  initialStage: 'draft',
  fields: [
    defineField({
      type: 'subject',
      name: 'subject',
      title: 'Card',
      description: 'The CVE card under review.',
      required: true,
      initialValue: {type: 'input'},
      types: ['cveCard'],
    }),
    defineField({type: 'actor', name: 'verifiedBy', title: 'Verified by'}),
    defineField({type: 'actor', name: 'publishedBy', title: 'Published by'}),
    defineField({type: 'actor', name: 'rejectedBy', title: 'Last rejected by'}),
    defineField({type: 'string', name: 'rejectionReason', title: 'Rejection reason'}),
  ],
  start: {
    requirements: [{type: 'singleSubject', name: 'one-open-review', title: 'Review already in progress'}],
  },
  stages: [
    defineStage({
      name: 'draft',
      title: 'Draft',
      description: 'Drafted by the agent (or sent back). A reviewer fact-checks it against NVD.',
      activities: [
        defineActivity({
          name: 'fact-check',
          title: 'Fact-check the draft',
          actions: [
            defineAction({
              name: 'verify',
              title: 'Mark verified',
              description: 'Score, affected software and patch info checked against NVD.',
              roles: REVIEWER_ROLES,
              status: 'done',
              ops: [
                {type: 'field.set', target: {field: 'verifiedBy'}, value: {type: 'actor'}},
                {type: 'field.unset', target: {field: 'rejectionReason'}},
              ],
              effects: [syncCard('mark-verified')],
            }),
            // Rejecting a draft keeps it in draft (the agent can redraft), so it doesn't resolve the activity.
            rejectAction({exitsStage: false}),
          ],
        }),
      ],
      transitions: [
        defineTransition({
          name: 'to-verified',
          title: 'Verified',
          to: 'verified',
          when: "defined($fields.verifiedBy) && $effectStatus['mark-verified'] == 'done'",
        }),
      ],
    }),
    defineStage({
      name: 'verified',
      title: 'Verified',
      description: 'Facts checked. A reviewer publishes it to the public dex, or sends it back.',
      activities: [
        defineActivity({
          name: 'approval',
          title: 'Approve for the public dex',
          actions: [
            defineAction({
              name: 'publish',
              title: 'Publish',
              description: 'Make the card visible on the public site.',
              roles: REVIEWER_ROLES,
              status: 'done',
              ops: [{type: 'field.set', target: {field: 'publishedBy'}, value: {type: 'actor'}}],
              effects: [syncCard('mark-published')],
            }),
            rejectAction({exitsStage: true}),
          ],
        }),
      ],
      transitions: [
        defineTransition({
          name: 'to-published',
          title: 'Published',
          to: 'published',
          when: "defined($fields.publishedBy) && $effectStatus['mark-published'] == 'done'",
        }),
        defineTransition({
          name: 'back-to-draft',
          title: 'Rejected',
          to: 'draft',
          when: "defined($fields.rejectionReason) && $effectStatus['mark-rejected'] == 'done'",
        }),
      ],
    }),
    defineStage({
      name: 'published',
      title: 'Published',
      description: 'Live on the public dex.',
    }),
  ],
})
