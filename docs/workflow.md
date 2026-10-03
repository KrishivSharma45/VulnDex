# Card review workflow

VulnDex cards move through a review pipeline built on **Sanity Workflows**
(early access, `@sanity/workflow-*` 0.36.0). An agent drafts a card; a human
verifies and publishes it, or rejects it back to draft with a reason. The agent
and the human go through the same workflow transitions; the transitions decide
who is allowed to do what.

```
draft ──verify──▶ verified ──publish──▶ published
  ▲  └─reject─┐      │
  └───────────┴──reject (with reason)
```

| Piece | File |
| --- | --- |
| Workflow definition | `src/workflows/cardReview.ts` |
| Deploy (programmatic `sanity-workflows deploy`) | `scripts/workflow-deploy.ts`, `sanity.workflow.ts` |
| Agent: drafts a card from NVD and starts the workflow | `scripts/draft-card.ts`, `scripts/lib/cardWriter.ts` |
| Runtime: drains effects to update the card | `scripts/workflow-worker.ts`, `scripts/lib/cardSync.ts` |
| Studio UI (workflow strip, Workflows view, actions) | `sanity.config.ts` (`@sanity/workflow-studio-plugin`) |

## How it works

1. **Agent:** `npm run draft-card CVE-2023-4966 -- --nickname "Citrix Bleed"`
   fetches the CVE from NVD API 2.0, writes the story and patch info from
   NVD fields (CWE, vector, score, CISA KEV entry, fixed versions, vendor
   advisory), writes the `cveCard` with `status: "draft"`, and calls
   `engine.startInstance()` on the `card-review` definition. The instance
   starts in `draft`.
2. **Human, in Studio:** the card shows the Workflows strip. In `draft`, the
   reviewer can **Mark verified** or **Reject with reason**. In `verified`,
   they can **Publish** or **Reject with reason**. Each action records the
   reviewer in an `actor` field (`verifiedBy`, `publishedBy`, `rejectedBy`).
3. **Runtime:** each human action queues an effect (`mark-verified`,
   `mark-published`, `mark-rejected`). `npm run workflow:worker` drains them:
   it sets the card's `status` and `rejectionReason`, and mirrors the
   instance's audit trail into the card's `reviewLog` (who, when, through
   which surface, and why). Transitions wait for their effect
   (`$effectStatus['mark-published'] == 'done'`), so the workflow only
   reaches `published` once the card actually is.
4. **Public site:** unchanged. GROQ only returns `status == "published"`.

## Who can do what

The engine resolves the actor from the calling token. The agent runs on a
robot token with the **Editor** role (`vulndex-seed (Robot)`). Verify,
publish and reject declare `roles: ['administrator']`, so:

- The agent can create cards and start reviews.
- The agent can't verify, publish or reject. Tested: with the agent token,
  `evaluate()` reports `allowed=false` for both actions, and `fireAction(verify)`
  throws `ActionDisabledError: Action "fact-check:verify" is not allowed`.
- A project administrator (you, in Studio) can do all three.

`$actor.kind` can't make this distinction: new history entries stamp every
token as `person`. Roles are the field that separates the agent from a human.

## What is and isn't enforced

This is the honest part. From Sanity's
[Actors, tokens, and what's actually enforced](https://www.sanity.io/docs/workflows/actors-and-enforcement):

| Mechanism | Evaluated by | Stops a determined client |
| --- | --- | --- |
| Engine verdicts (action `roles`, filters) | The engine, in the caller's process | No |
| Guards | The engine (the Content Lake doesn't evaluate them yet) | No, not today |
| Dataset access control / custom roles | The Content Lake | Yes |

So the role gate stops the agent **as long as it goes through the engine**,
which `draft-card` always does. It is not a security boundary: the same
Editor token could patch `status: "published"` directly with a raw
mutation. Making that impossible needs one of:

- **A custom role** for the agent that can't write `status == "published"`
  (custom roles with document filters are an Enterprise feature), or
- **Lake-enforced guards**, which Sanity hasn't shipped yet.

The Contributor role (drafts only, can't publish) looks like a fit, but it
would also block the engine's own instance writes, which run on the
caller's token. The docs call out exactly this failure mode: it would leave
the agent unable to start or advance its own workflow.

## What isn't production-ready yet

- **The runtime is a local poller.** Workflows is a library, not a service:
  nothing drains effects unless you run something. Here that's
  `npm run workflow:worker` on a laptop. In production it should be a
  Sanity Function (document function on instance changes calling
  `drainEffects`), per [Run Workflows with Sanity Functions](https://www.sanity.io/docs/workflows/sanity-functions).
  Until then, Studio actions update the workflow immediately but the card's
  `status` only changes while the worker runs.
- **The Workflows CLI isn't installed as a dependency.** `@sanity/workflow-cli`
  pulls `@sanity/workflow-blueprint`, which needs TypeScript 6+; this app is on
  TypeScript 5.9. `npm run workflow:deploy` uses `engine.deployDefinitions()`,
  the documented programmatic equivalent. `npx @sanity/workflow-cli` still
  works with `sanity.workflow.ts` for inspecting instances.
- **The agent's writing is templated, not an LLM.** Every sentence comes from
  an NVD field, so nothing is invented and the reviewer can check it line by
  line. Swapping in Sanity Agent Actions or an LLM is a change to
  `scripts/lib/cardWriter.ts` only.

## Differences from the fallback (document actions + status field)

The fallback would have been custom Studio document actions that patch a
`status` field and append to a history array. What real Workflows adds:

- **The process is data.** Stages, transitions and gates live in a deployed,
  versioned definition (`production.card-review.v1`). Each instance pins the
  version it started under, so changing the process later doesn't rewrite
  reviews in flight.
- **One gate for every surface.** Studio, the agent script, the CLI and the
  MCP server all call the same engine, which evaluates the same `roles`. With
  document actions, the rule lives in Studio UI code and a script would need
  its own copy.
- **An audit trail you didn't write.** Every start, action and transition is
  recorded on the instance with actor, time and execution context. The
  card's `reviewLog` is a mirror of that, not a second source of truth.
- **The same honest limit.** Both approaches are advisory unless dataset
  access control backs them. Workflows says so explicitly.

## Runbook

```bash
npm run workflow:deploy -- --check   # validate the definition
npm run workflow:deploy              # deploy card-review
npm run draft-card CVE-2023-4966 -- --nickname "Citrix Bleed"
npm run workflow:worker              # keep running while reviewing in Studio
```

Workflow documents use dotted IDs (`production.card-review.v1`,
`production.wf-instance.…`), so they stay private even though the dataset is
public.
