// NEXT_PUBLIC_* vars must be referenced literally so Next.js can inline them in client bundles.
export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'Missing env: NEXT_PUBLIC_SANITY_PROJECT_ID',
)

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing env: NEXT_PUBLIC_SANITY_DATASET',
)

export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-05-15'

function assertValue<T>(value: T | undefined, errorMessage: string): T {
  if (value === undefined || value === '') {
    throw new Error(errorMessage)
  }
  return value
}
