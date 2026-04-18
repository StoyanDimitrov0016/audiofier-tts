import type { FormEvent } from 'react'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import type { GenerateAudioResult } from '../lib/audio-types'
import { generateAudio, getAudioHealth } from '../server/audio-api'

type ServiceState = 'checking' | 'online' | 'offline'

const starterText = `# Sample Lesson

This is a short lesson generated from the TanStack Start interface.

The React app sends this text to a server function, and the server function calls the Python audio API.`

export const Route = createFileRoute('/')({
  loader: async () => {
    try {
      const health = await getAudioHealth()
      return {
        serviceState: 'online' as ServiceState,
        serviceLabel: `${health.service} at ${health.outputDir}`,
      }
    } catch (error) {
      return {
        serviceState: 'offline' as ServiceState,
        serviceLabel: error instanceof Error ? error.message : 'Audio API is offline.',
      }
    }
  },
  component: AudioWorkbench,
})

function AudioWorkbench() {
  const loaderData = Route.useLoaderData()
  const [title, setTitle] = useState('tanstack-start-sample')
  const [text, setText] = useState(starterText)
  const [voice, setVoice] = useState('af_heart')
  const [speed, setSpeed] = useState(1)
  const [wavOnly, setWavOnly] = useState(true)
  const [serviceState, setServiceState] = useState<ServiceState>(loaderData.serviceState)
  const [serviceLabel, setServiceLabel] = useState(loaderData.serviceLabel)
  const [result, setResult] = useState<GenerateAudioResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  async function checkService() {
    setServiceState('checking')
    setError(null)

    try {
      const health = await getAudioHealth()
      setServiceState('online')
      setServiceLabel(`${health.service} at ${health.outputDir}`)
    } catch (caught) {
      setServiceState('offline')
      setServiceLabel(caught instanceof Error ? caught.message : 'Audio API is offline.')
    }
  }

  async function submitGeneration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const generated = await generateAudio({
        data: {
          text,
          stem: title,
          suffix: '.md',
          voice,
          speed,
          wavOnly,
        },
      })
      setResult(generated)
      setServiceState('online')
      setServiceLabel('audiofier-tts generated audio')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Audio generation failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Audiofier</p>
            <h1>Lesson Audio Workbench</h1>
          </div>
          <div className={`service-pill service-pill-${serviceState}`}>
            <span>{serviceState}</span>
            <button type="button" onClick={checkService}>
              Check
            </button>
          </div>
        </header>

        <p className="service-note">{serviceLabel}</p>

        <form className="editor-grid" onSubmit={submitGeneration}>
          <section className="editor-panel" aria-label="Lesson editor">
            <label>
              Lesson name
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="lesson-name"
              />
            </label>

            <label>
              Lesson text
              <textarea value={text} onChange={(event) => setText(event.target.value)} />
            </label>
          </section>

          <aside className="control-panel" aria-label="Audio settings">
            <label>
              Voice
              <input value={voice} onChange={(event) => setVoice(event.target.value)} />
            </label>

            <label>
              Speed
              <input
                type="number"
                min="0.5"
                max="2"
                step="0.05"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={wavOnly}
                onChange={(event) => setWavOnly(event.target.checked)}
              />
              WAV only
            </label>

            <button className="primary-action" type="submit" disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate audio'}
            </button>

            {error ? <p className="status-text error-text">{error}</p> : null}

            {result ? (
              <div className="result-box">
                <p>Generated {result.formattedDuration}</p>
                <dl>
                  <div>
                    <dt>WAV</dt>
                    <dd>{result.wavPath}</dd>
                  </div>
                  <div>
                    <dt>Chunks</dt>
                    <dd>{result.chunkCount}</dd>
                  </div>
                  <div>
                    <dt>Characters</dt>
                    <dd>{result.cleanedCharacterCount}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </aside>
        </form>
      </section>
    </main>
  )
}
