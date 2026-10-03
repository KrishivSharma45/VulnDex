/**
 * Deploys the card-review workflow definition (programmatic equivalent of
 * `sanity-workflows deploy`, see sanity.workflow.ts).
 *
 *   npm run workflow:deploy             # validate + deploy
 *   npm run workflow:deploy -- --check  # validate only, writes nothing
 */
import {validateDefinition} from '@sanity/workflow-engine'

import {EXPECTED_MIN_READER_MODEL} from '../src/workflows/config'
import {cardReview} from '../src/workflows/cardReview'
import {workflowEngine} from './lib/workflow'

async function main() {
  validateDefinition(cardReview)
  console.log(`✓ ${cardReview.name}: definition is valid`)
  if (process.argv.includes('--check')) return

  const engine = workflowEngine('workflow-deploy')
  const {results} = await engine.deployDefinitions({
    expectedMinReaderModel: EXPECTED_MIN_READER_MODEL,
    definitions: [cardReview],
  })
  for (const r of results) console.log(`✓ deployed`, JSON.stringify(r))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
