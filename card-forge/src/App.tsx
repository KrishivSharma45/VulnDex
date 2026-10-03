import {SanityApp, type SanityConfig} from '@sanity/sdk-react'
import {Suspense} from 'react'

import {Board} from './Board'
import {DATASET, PROJECT_ID} from './config'
import './App.css'

const config: SanityConfig[] = [{projectId: PROJECT_ID, dataset: DATASET}]

const Loading = () => <p className="p-6 font-mono text-sm text-zinc-500">connecting to the content lake…</p>

export default function App() {
  return (
    <div className="bg-grid min-h-screen">
      <SanityApp config={config} fallback={<Loading />}>
        <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-6">
          <header className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-mono text-xs text-zinc-600">
                <span className="text-terminal">&gt;_</span> vulndex / curator
              </p>
              <h1 className="text-3xl font-black tracking-tight text-zinc-50">Card Forge</h1>
            </div>
            <p className="font-mono text-[11px] text-zinc-500">
              live · agent drafts, humans verify &amp; publish
            </p>
          </header>
          <Suspense fallback={<Loading />}>
            <Board />
          </Suspense>
        </main>
      </SanityApp>
    </div>
  )
}
