'use client'

/**
 * Sanity Studio config, mounted at /studio via src/app/studio/[[...tool]]/page.tsx
 */
import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {apiVersion, dataset, projectId} from './src/sanity/env'
import {schemaTypes} from './src/sanity/schemaTypes'

export default defineConfig({
  name: 'vulndex',
  title: 'VulnDex',
  basePath: '/studio',
  projectId,
  dataset,
  schema: {types: schemaTypes},
  plugins: [structureTool(), visionTool({defaultApiVersion: apiVersion})],
})
