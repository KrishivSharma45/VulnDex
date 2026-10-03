# Card Forge

Curator dashboard for VulnDex, built with the Sanity App SDK (`@sanity/sdk-react`)
and Sanity Workflows (`@sanity/workflow-sdk`). It runs inside the Sanity Dashboard,
separate from Studio.

- **Live kanban** of `cveCard`s: Draft | Verified | Published | Rejected.
  `useQuery` subscribes to the Live Content API, so changes from Studio, the
  agent and the workflow worker appear without a refresh.
- **Tiles:** nickname, CVE ID, CVSS, rarity colour, and who moved the card
  last (from the card's `reviewLog`).
- **Review actions** (verify, publish, reject with reason) go through the
  `card-review` workflow engine with your Dashboard token. Same transitions,
  same `administrator` gate, same audit trail as Studio. The agent's Editor
  token can't fire them.
- **Stats bar:** total, per-rarity counts, pending review, average CVSS of
  the published deck.
- **Draft new card** calls the VulnDex app's `/api/agent/draft-card`, which
  runs the same agent as `npm run draft-card` (server-side, robot token).

## Run locally

Three processes, from the repo root:

```bash
npm run dev                 # VulnDex site + agent endpoint on :3000
npm run workflow:worker     # applies review actions to cards
cd card-forge && npm run dev   # Card Forge on :3333
```

Then open the URL `sanity dev` prints:
`https://www.sanity.io/@olfg8l2pc?dev=http://localhost:3333`. The Dashboard
loads the local app in an iframe and passes it your session; look for
**Card Forge** in the sidebar.

One-time setup: add `http://localhost:3333` (Allow credentials) under
sanity.io/manage → project → API → CORS origins. Avoid Safari in dev (known
App SDK limitation with local apps in the Dashboard).

## Deploy

```bash
cd card-forge && npx sanity deploy
```

Needs an org admin or Developer role. Deploying also needs the agent endpoint
hosted somewhere reachable (set `SANITY_APP_AGENT_URL` at build time and
`CARD_FORGE_ORIGINS` on the VulnDex server), plus the workflow worker running
as a Sanity Function rather than a local process.
