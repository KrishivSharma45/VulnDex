/** Must match the VulnDex project, its workflow deployment, and the agent endpoint. */

export const PROJECT_ID = 'il427idr'
export const DATASET = 'production'

/** Workflow definition and deployment tag (see src/workflows in the VulnDex app). */
export const CARD_REVIEW = 'card-review'
export const WORKFLOW_TAG = 'production'

/**
 * The VulnDex Next.js app, which hosts the draft-card agent endpoint.
 * Not a secret: SANITY_APP_* values are bundled into the browser build.
 */
export const AGENT_URL = process.env.SANITY_APP_AGENT_URL ?? 'http://localhost:3000'
