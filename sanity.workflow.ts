/**
 * Workflows CLI config (`npx @sanity/workflow-cli deploy`). The repo deploys
 * the same definition with `npm run workflow:deploy`; this file keeps the CLI
 * path available for inspecting and driving instances, e.g.
 * `npx @sanity/workflow-cli show <instanceId>`.
 */
import {defineWorkflowConfig} from '@sanity/workflow-engine/define'

import {EXPECTED_MIN_READER_MODEL, WORKFLOW_TAG, workflowResource} from './src/workflows/config'
import {cardReview} from './src/workflows/cardReview'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ''
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

export default defineWorkflowConfig({
  deployments: [
    {
      name: 'production',
      tag: WORKFLOW_TAG,
      expectedMinReaderModel: EXPECTED_MIN_READER_MODEL,
      workflowResource: workflowResource(projectId, dataset),
      definitions: [cardReview],
    },
  ],
})
