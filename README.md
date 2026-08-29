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

The web app persists collections, lessons, Markdown, and generated-audio metadata in PostgreSQL.
Copy `.env.example` to the repository-root `.env`, adjust `DATABASE_URL`, then initialize the schema.
The web app, migration scripts, importer, and Drizzle Kit all read this same file:

```powershell
npm run db:migrate
```

For an existing local PostgreSQL/pgAdmin installation, point `DATABASE_URL` at that database. As an
optional isolated alternative, the repository includes a PostgreSQL 17 Docker image on port `5434`:

```powershell
npm run db:start
npm run db:migrate
```

To import lessons previously stored under the filesystem repository after migrating the database:

```powershell
npm run db:import
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

Generated media stays on disk while its metadata is stored in PostgreSQL. Model weights, caches,
environments, and generated audio are ignored unless a benchmark artifact is explicitly versioned
under `benchmarks/`.
