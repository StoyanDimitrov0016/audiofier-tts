# Local development

## Requirements

- Node 24 and npm 12, selected through FNM using `.nvmrc`
- uv with CPython 3.12
- FFmpeg 9 for MP3 output
- SoX 14.4 for Qwen TTS
- An NVIDIA driver compatible with the locked CUDA 12.8 PyTorch wheels

Install or repair global tools with `.\scripts\setup-machine.ps1`, restart the terminal, then run:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
npm run setup
npm run doctor
```

The committed `package-lock.json` and `audio-generator/uv.lock` are the dependency sources of truth.
The Python environment is `audio-generator/.venv`; recreate it with `npm run setup:audio` instead of
copying it between machines.

## Runtime commands

```powershell
npm run dev          # web and audio service
npm run dev:web      # web only
npm run dev:audio    # audio service only
npm run check        # format, lint, types, tests, build
```

The audio service defaults to `http://127.0.0.1:8765`. Override the web app target with
`AUDIO_GENERATOR_URL`.

## Local model assets

Models and caches live in the ignored `.local-tts-ai` directory:

```text
.local-tts-ai/
  models/kokoro-82m/
  models/qwen3-tts-0-6b-custom/
  models/qwen3-tts-1-7b-custom/
  cache/huggingface/
  cache/torch/
```

Download them from the repository root:

```powershell
uv run --project audio-generator --frozen hf download hexgrad/Kokoro-82M --local-dir ".local-tts-ai\models\kokoro-82m"
uv run --project audio-generator --frozen hf download Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice --local-dir ".local-tts-ai\models\qwen3-tts-0-6b-custom"
uv run --project audio-generator --frozen hf download Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice --local-dir ".local-tts-ai\models\qwen3-tts-1-7b-custom"
```

Model paths can be overridden with `KOKORO_MODEL_PATH`, `QWEN_TTS_0_6B_MODEL_PATH`, and
`QWEN_TTS_1_7B_MODEL_PATH`. `QWEN_TTS_BATCH_SIZE` defaults to `1` because larger batches did not improve
this laptop's Qwen throughput.

FFmpeg is normally resolved from `PATH`; use `FFMPEG_PATH` when Winget has installed it but the current
terminal has not refreshed its path.

## Storage

- `storage/markdowns/groups/`: local lesson sources
- `storage/generated/`: application-generated output
- `storage/audio/`: direct local audio output
- `audio-generator/output/`: CLI and benchmark scratch output

Generated directories retain tracked `.gitkeep` files where the empty layout is significant.
