/**
 * POST /api/agent/draft-card: lets Card Forge trigger the draft-card agent.
 *
 * The App SDK app can't hold the agent's robot token (anything it bundles is
 * public), so it sends the signed-in user's own Sanity token instead. This
 * route checks that token belongs to a member of the project, then runs the
 * same agent flow as `npm run draft-card` with the server-side robot token.
 * The card is still drafted by the agent, and still can't be published by it.
 */
import {NextResponse, type NextRequest} from 'next/server'

import {apiVersion, projectId} from '@/sanity/env'
import {AgentRefusedError, CVE_ID, draftCard} from '../../../../../scripts/lib/draftCard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Card Forge's dev origin; add the deployed app's origin here when it exists.
const ALLOWED_ORIGINS = (process.env.CARD_FORGE_ORIGINS ?? 'http://localhost:3333').split(',').map((o) => o.trim())

function cors(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return ALLOWED_ORIGINS.includes(origin)
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        Vary: 'Origin',
      }
    : {}
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {status: 204, headers: cors(req)})
}

/** The caller must be a member of this project (any role). */
async function projectMember(token: string): Promise<{id: string; name?: string} | null> {
  const res = await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/users/me`, {
    headers: {Authorization: `Bearer ${token}`},
    cache: 'no-store',
  })
  if (!res.ok) return null
  const me = (await res.json()) as {id?: string; name?: string; roles?: {name: string}[]}
  return me.id && me.roles?.length ? {id: me.id, name: me.name} : null
}

export async function POST(req: NextRequest) {
  const headers = cors(req)
  const json = (body: unknown, status = 200) => NextResponse.json(body, {status, headers})

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const caller = token ? await projectMember(token) : null
  if (!caller) return json({error: 'Sign in to Sanity as a member of this project to run the agent.'}, 401)

  const body = (await req.json().catch(() => ({}))) as {cveId?: string; nickname?: string}
  const cveId = body.cveId?.trim() ?? ''
  if (!CVE_ID.test(cveId)) return json({error: 'Enter a CVE ID like CVE-2024-3400.'}, 400)

  try {
    const result = await draftCard({cveId, nickname: body.nickname})
    console.log(`[agent] ${caller.name ?? caller.id} requested ${result.cveId} → ${result.stage ?? 'draft'}`)
    return json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return json({error: message}, err instanceof AgentRefusedError ? 409 : 502)
  }
}
