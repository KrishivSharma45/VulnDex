import {actionRendering, errorMessage, type ActionEvaluation, type Engine} from '@sanity/workflow-engine'
import {useDocumentWorkflows, useWorkflowSession} from '@sanity/workflow-sdk'
import {useState} from 'react'

import {CARD_REVIEW} from './config'
import {cardGdr, useEngine} from './engine'

/**
 * Workflow actions for one card. Everything here goes through the workflow
 * engine with the signed-in user's token, the same transitions Studio uses:
 * the engine decides which actions this user may fire (verify / publish /
 * reject need the administrator role; the agent's Editor token never gets them).
 */
export function ReviewPanel({cardId}: {cardId: string}) {
  const engine = useEngine()
  const {instances, loading, unreadable, error} = useDocumentWorkflows({engine, document: cardGdr(cardId)})
  const instance = instances?.find((i) => i.definition === CARD_REVIEW)

  if (error || unreadable.length) return <Note tone="error">Workflow state could not be read.</Note>
  if (loading) return <Note>loading workflow…</Note>
  if (!instance) return <Note>No active review. Seeded cards and finished reviews have no open actions.</Note>
  return <SessionActions engine={engine} instanceId={instance._id} />
}

function SessionActions({engine, instanceId}: {engine: Engine; instanceId: string}) {
  const session = useWorkflowSession({engine, instanceId})
  const [failure, setFailure] = useState<string>()
  const [busy, setBusy] = useState<string>()

  if (session.invalid) return <Note tone="error">Unreadable workflow instance: {session.invalid.reason}</Note>
  if (session.error) return <Note tone="error">Could not load workflow: {errorMessage(session.error)}</Note>
  if (session.evaluationError) return <Note tone="error">Could not evaluate workflow: {errorMessage(session.evaluationError)}</Note>
  if (!session.ready || !session.evaluation) return <Note>loading workflow…</Note>

  const stage = session.evaluation.currentStage
  const fire = async (activity: string, action: string, params?: Record<string, unknown>) => {
    setFailure(undefined)
    setBusy(action)
    try {
      await session.fireAction({activity, action, params})
    } catch (err) {
      setFailure(errorMessage(err))
    } finally {
      setBusy(undefined)
    }
  }

  const buttons = stage.activities.flatMap((a) =>
    a.actions
      .filter((act) => actionRendering(act) === 'button')
      .map((act) => ({activity: a.activity.name, act})),
  )

  return (
    <div className="space-y-2">
      <p className="font-mono text-[11px] text-zinc-500">
        stage: <span className="text-zinc-300">{stage.stage.title ?? stage.stage.name}</span>
      </p>
      {buttons.length ? (
        buttons.map(({activity, act}) =>
          act.action.name === 'reject' ? (
            <RejectAction key={act.action.name} action={act} busy={busy === 'reject'} onFire={(reason) => fire(activity, 'reject', {reason})} />
          ) : (
            <button
              key={act.action.name}
              type="button"
              disabled={!act.allowed || !!busy}
              title={act.allowed ? act.action.description : 'Not allowed right now'}
              onClick={() => fire(activity, act.action.name)}
              className="w-full rounded-md bg-terminal/90 px-3 py-1.5 font-mono text-xs font-semibold text-ink hover:bg-terminal disabled:opacity-40"
            >
              {busy === act.action.name ? '…' : `▸ ${act.action.title ?? act.action.name}`}
            </button>
          ),
        )
      ) : (
        <Note>Waiting on the workflow, or your role can&apos;t act here (reviews need the administrator role).</Note>
      )}
      {failure ? <Note tone="error">{failure}</Note> : null}
    </div>
  )
}

function RejectAction({action, busy, onFire}: {action: ActionEvaluation; busy: boolean; onFire: (reason: string) => void}) {
  const [reason, setReason] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (reason.trim()) onFire(reason.trim())
      }}
      className="space-y-1.5"
    >
      <textarea
        aria-label="Rejection reason"
        required
        rows={2}
        placeholder="reason for rejecting…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-ink px-2 py-1.5 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-red-400/60 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!action.allowed || busy || !reason.trim()}
        className="w-full rounded-md border border-red-400/50 px-3 py-1.5 font-mono text-xs text-red-300 hover:bg-red-400/10 disabled:opacity-40"
      >
        {busy ? '…' : `✕ ${action.action.title ?? 'Reject'}`}
      </button>
    </form>
  )
}

function Note({children, tone}: {children: React.ReactNode; tone?: 'error'}) {
  return <p className={`font-mono text-[11px] leading-relaxed ${tone === 'error' ? 'text-red-400' : 'text-zinc-500'}`}>{children}</p>
}
