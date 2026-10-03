/**
 * Workflow runtime for the card-review pipeline: drains queued effects so a
 * Verify / Publish / Reject in Studio actually updates the card.
 *
 * Workflows is a library, not a service: nothing drains effects on its own.
 * In production this loop belongs in a Sanity Function (see docs/workflow.md);
 * locally, run:
 *
 *   npm run workflow:worker            # poll every 3s
 *   npm run workflow:worker -- --once  # drain once and exit
 */
import {WORKFLOW_INSTANCE_TYPE} from '@sanity/workflow-engine'

import {WORKFLOW_TAG} from '../src/workflows/config'
import {cardSyncHandlers} from './lib/cardSync'
import {sleep} from './lib/nvd'
import {contentClient, workflowEngine} from './lib/workflow'

const POLL_MS = 3000
const once = process.argv.includes('--once')

// drainEffects works per instance, so first find the instances with queued work.
const PENDING_QUERY = `*[_type == $instanceType && tag == $workflowTag && count(pendingEffects) > 0]._id`

async function main() {
  const content = contentClient()
  const engine = workflowEngine('workflow-worker', cardSyncHandlers(content))
  console.log(once ? 'Draining once…' : `Workflow worker running (every ${POLL_MS / 1000}s). Ctrl+C to stop.`)

  let failures = 0
  do {
    try {
      await drainOnce(content, engine)
      failures = 0
    } catch (err) {
      // A dropped request must not kill the runtime; unclaimed effects stay queued and drain next pass.
      if (once) throw err
      failures += 1
      console.warn(`! poll failed (${failures}x): ${err instanceof Error ? err.message : err}`)
    }
    if (!once) await sleep(Math.min(POLL_MS * 2 ** failures, 60_000))
  } while (!once)
}

async function drainOnce(content: ReturnType<typeof contentClient>, engine: ReturnType<typeof workflowEngine>) {
  const instanceIds = await content.fetch<string[]>(PENDING_QUERY, {instanceType: WORKFLOW_INSTANCE_TYPE, workflowTag: WORKFLOW_TAG})
  for (const instanceId of instanceIds) {
    const {drained, failed, lost} = await engine.drainEffects({instanceId})
    for (const e of drained) console.log(`✓ ${e.name} on ${instanceId}`)
    for (const e of failed) console.error(`✗ ${e.name} failed on ${instanceId}`)
    for (const e of lost) console.warn(`~ ${e.name} lost its claim on ${instanceId}`)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
