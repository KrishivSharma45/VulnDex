import {useClient} from '@sanity/sdk-react'
import {ENGINE_API_VERSION, createEngine, type Engine} from '@sanity/workflow-engine'
import {useMemo} from 'react'

import {DATASET, PROJECT_ID, WORKFLOW_TAG} from './config'

/**
 * The workflow engine, on the signed-in user's App SDK client. The user's
 * token is the actor, so actions here pass the same role gates (and land in
 * the same audit trail) as Studio. `card-forge` labels the surface in history.
 */
export function useEngine(): Engine {
  const client = useClient({apiVersion: ENGINE_API_VERSION})
  return useMemo(
    () =>
      createEngine({
        client,
        workflowResource: {type: 'dataset', id: `${PROJECT_ID}.${DATASET}`},
        tag: WORKFLOW_TAG,
        executionContext: {kind: 'sdk-app', id: 'card-forge'},
      }),
    [client],
  )
}

/** Global document reference for a card, as the engine expects. */
export const cardGdr = (cardId: string) => `dataset:${PROJECT_ID}:${DATASET}:${cardId}` as const
