import 'server-only'
import {createClient} from 'next-sanity'

import {apiVersion, dataset, projectId} from '../env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  // Server-only: lets the frontend read non-public content if the dataset is private.
  token: process.env.SANITY_API_READ_TOKEN,
  perspective: 'published',
})
