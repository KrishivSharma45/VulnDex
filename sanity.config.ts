'use client'

/**
 * Sanity Studio config, mounted at /studio via src/app/studio/[[...tool]]/page.tsx
 */
import {visionTool} from '@sanity/vision'
import {workflowDefaultDocumentNode, workflowStudioPlugin} from '@sanity/workflow-studio-plugin'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {apiVersion, dataset, projectId} from './src/sanity/env'
import {schemaTypes} from './src/sanity/schemaTypes'
import {CARD_REVIEW} from './src/workflows/cardReview'
import {WORKFLOW_TAG} from './src/workflows/config'

export default defineConfig({
  name: 'vulndex',
  title: 'VulnDex',
  basePath: '/studio',
  projectId,
  dataset,
  schema: {types: schemaTypes},
  plugins: [
    // Adds the workflow strip and a "Workflows" view to each document.
    structureTool({defaultDocumentNode: workflowDefaultDocumentNode()}),
    // Card review pipeline: draft → verified → published (see src/workflows/cardReview.ts).
    workflowStudioPlugin({
      tag: WORKFLOW_TAG,
      mappings: [{docType: 'cveCard', definition: CARD_REVIEW, label: 'Card review'}],
    }),
    visionTool({defaultApiVersion: apiVersion}),
  ],
})
