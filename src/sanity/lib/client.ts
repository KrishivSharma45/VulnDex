import 'server-only'
import {createClient, type QueryParams} from 'next-sanity'

import {apiVersion, dataset, projectId} from '../env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Next's data cache (revalidate below) already caches queries; stacking the Sanity CDN
  // on top can serve stale results (e.g. an empty list cached before seeding).
  useCdn: false,
  // Server-only: lets the frontend read non-public content if the dataset is private.
  token: process.env.SANITY_API_READ_TOKEN,
  perspective: 'published',
})

/** Cached fetch; pages pick up Studio edits within `revalidate` seconds. */
export function sanityFetch<T>(query: string, params: QueryParams = {}, revalidate = 60) {
  return client.fetch<T>(query, params, {next: {revalidate, tags: ['sanity']}})
}
