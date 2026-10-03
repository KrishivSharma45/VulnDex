import {createClient} from '@sanity/client'
import {ENGINE_API_VERSION, createEngine, type EffectHandler} from '@sanity/workflow-engine'

import {WORKFLOW_TAG, workflowResource} from '../../src/workflows/config'

export function env() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim()
  if (!projectId || !dataset) throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET')
  if (!token) throw new Error('Missing SANITY_API_WRITE_TOKEN in .env.local')
  return {projectId, dataset, token}
}

export function contentClient() {
  const {projectId, dataset, token} = env()
  return createClient({projectId, dataset, token, apiVersion: '2026-05-15', useCdn: false})
}

/**
 * Workflow engine for scripts. Every move is attributed to the token's actor;
 * `executionContext` labels which script made it in the audit trail.
 */
export function workflowEngine(executionId: string, effectHandlers?: Record<string, EffectHandler>) {
  const {projectId, dataset, token} = env()
  const client = createClient({projectId, dataset, token, apiVersion: ENGINE_API_VERSION, useCdn: false})
  return createEngine({
    client,
    tag: WORKFLOW_TAG,
    workflowResource: workflowResource(projectId, dataset),
    executionContext: {kind: effectHandlers ? 'drainer' : 'script', id: executionId},
    ...(effectHandlers ? {effects: {handlers: effectHandlers}} : {}),
  })
}
