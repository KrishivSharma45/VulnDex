import {useClient} from '@sanity/sdk-react'
import {useState} from 'react'

import {AGENT_URL} from './config'

type AgentResult = {cveId: string; nickname: string; cvssScore: number; rarity: string; stage?: string; redrafted: boolean}

/**
 * Asks the draft-card agent to draft a card. The agent runs server-side in the
 * VulnDex app (it holds the robot token); we send the signed-in user's token so
 * the endpoint can check they're a project member. The new card then shows up
 * on the board through the live query, not through this response.
 */
export function DraftForm() {
  const client = useClient({apiVersion: '2026-05-15'})
  const [cveId, setCveId] = useState('')
  const [nickname, setNickname] = useState('')
  const [state, setState] = useState<{busy: boolean; message?: string; error?: boolean}>({busy: false})

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState({busy: true, message: `agent: fetching ${cveId.trim().toUpperCase()} from NVD…`})
    try {
      const token = client.config().token
      const res = await fetch(`${AGENT_URL}/api/agent/draft-card`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
        body: JSON.stringify({cveId: cveId.trim(), nickname: nickname.trim() || undefined}),
      })
      const body = (await res.json().catch(() => ({}))) as Partial<AgentResult> & {error?: string}
      if (!res.ok) throw new Error(body.error ?? `Agent returned ${res.status}`)
      setState({
        busy: false,
        message: `✓ ${body.redrafted ? 'redrafted' : 'drafted'} ${body.nickname} (${body.cveId}) · CVSS ${body.cvssScore} · ${body.rarity}. It lands in Draft.`,
      })
      setCveId('')
      setNickname('')
    } catch (err) {
      const message =
        err instanceof TypeError
          ? `Can't reach the agent at ${AGENT_URL}. Is the VulnDex app running (npm run dev)?`
          : err instanceof Error
            ? err.message
            : String(err)
      setState({busy: false, message, error: true})
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-white/5 bg-panel/80 p-4">
      <label htmlFor="cve" className="font-mono text-xs text-zinc-500">
        <span className="text-terminal">$</span> draft-card
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="cve"
          required
          pattern="[Cc][Vv][Ee]-\d{4}-\d{4,}"
          title="CVE-YYYY-NNNN"
          placeholder="CVE-2024-3400"
          value={cveId}
          onChange={(e) => setCveId(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-ink px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-terminal/60 focus:outline-none"
        />
        <input
          aria-label="Nickname (optional)"
          placeholder="nickname (optional)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="rounded-lg border border-white/10 bg-ink px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-terminal/60 focus:outline-none sm:w-56"
        />
        <button
          type="submit"
          disabled={state.busy}
          className="rounded-lg bg-terminal px-4 py-2 font-mono text-sm font-semibold text-ink hover:bg-terminal/85 disabled:opacity-50"
        >
          {state.busy ? 'drafting…' : 'draft new card'}
        </button>
      </div>
      {state.message ? (
        <p role="status" className={`mt-2 font-mono text-xs ${state.error ? 'text-red-400' : 'text-zinc-400'}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
