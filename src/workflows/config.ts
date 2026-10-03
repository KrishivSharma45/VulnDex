/** Workflows deployment settings shared by Studio and the scripts. */

/** Environment partition for definitions and instances. Must match the Studio plugin's tag. */
export const WORKFLOW_TAG = 'production'

/** Workflow instances live next to the content, in the same dataset. */
export const workflowResource = (projectId: string, dataset: string) =>
  ({type: 'dataset', id: `${projectId}.${dataset}`}) as const

/**
 * Reader model every runtime sharing this workflow resource understands.
 * A required `subject` needs model 10 (see the Workflows upgrade guide).
 */
export const EXPECTED_MIN_READER_MODEL = 10
