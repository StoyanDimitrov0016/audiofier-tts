# Audiofier TTS

Audiofier turns Markdown lessons into local speech. It combines a TanStack Start web app with a Python
audio service and supports Kokoro plus two Qwen CustomVoice models.

## Start

Requirements: Node 24 through FNM, npm 12, uv, Python 3.12, and FFmpeg. NVIDIA CUDA is strongly
recommended for Qwen.

```powershell
.\scripts\setup-machine.ps1
npm run setup
npm run doctor
npm run dev
```

Open `http://localhost:3000`. The local audio API runs at `http://127.0.0.1:8765` and publishes its
OpenAPI UI at `http://127.0.0.1:8765/docs`.

Generate directly from the command line:

```powershell
npm run generate -w audiofier-audio-generator -- .\audio-generator\lessons\sample.md --wav-only
```

Run the complete deterministic check:

```powershell
npm run check
```

## Documentation

- [Local setup and commands](docs/local-development.md)
- [Audio-generator architecture and model extension guide](docs/audio-generator-architecture.md)
- [Writing Markdown for speech](docs/writing-for-tts.md)
- [Local model benchmark results](benchmarks/README.md)
- [Toolchain refresh record](docs/toolchain-refresh-spec.md)

Source lessons and generated media stay local. Model weights, caches, environments, and generated audio
are ignored unless a benchmark artifact is explicitly versioned under `benchmarks/`.
