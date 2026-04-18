import { createServerFn } from '@tanstack/react-start'

import type {
  AudioApiError,
  AudioHealth,
  GenerateAudioInput,
  GenerateAudioResult,
} from '../lib/audio-types'

const DEFAULT_AUDIO_API_URL = 'http://127.0.0.1:8765'

function getAudioApiUrl() {
  return process.env.AUDIO_API_URL ?? DEFAULT_AUDIO_API_URL
}

function validateGenerateInput(input: unknown): GenerateAudioInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Generation input must be an object.')
  }

  const data = input as Partial<GenerateAudioInput>

  if (!data.text || typeof data.text !== 'string') {
    throw new Error('Lesson text is required.')
  }

  if (!data.stem || typeof data.stem !== 'string') {
    throw new Error('Lesson name is required.')
  }

  if (data.suffix !== '.md' && data.suffix !== '.txt') {
    throw new Error('Suffix must be .md or .txt.')
  }

  if (!data.voice || typeof data.voice !== 'string') {
    throw new Error('Voice is required.')
  }

  if (typeof data.speed !== 'number' || Number.isNaN(data.speed) || data.speed <= 0) {
    throw new Error('Speed must be greater than 0.')
  }

  if (typeof data.wavOnly !== 'boolean') {
    throw new Error('wavOnly must be a boolean.')
  }

  return {
    text: data.text,
    stem: data.stem,
    suffix: data.suffix,
    voice: data.voice,
    speed: data.speed,
    wavOnly: data.wavOnly,
  }
}

async function readAudioResponse<T extends object>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | AudioApiError

  if (!response.ok || ('ok' in payload && payload.ok === false)) {
    const message = 'error' in payload ? payload.error : `Audio API returned ${response.status}`
    throw new Error(message)
  }

  return payload as T
}

export const getAudioHealth = createServerFn({ method: 'GET' }).handler(async () => {
  const response = await fetch(`${getAudioApiUrl()}/health`)
  return readAudioResponse<AudioHealth>(response)
})

export const generateAudio = createServerFn({ method: 'POST' })
  .inputValidator(validateGenerateInput)
  .handler(async ({ data }) => {
    const response = await fetch(`${getAudioApiUrl()}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    return readAudioResponse<GenerateAudioResult>(response)
  })
