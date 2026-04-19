# Audiofier TTS

Local text-to-speech tooling with a Python audio-generation service and a TanStack Start web app.

## Project layout

```text
audio-api/            Python audio-generation API and CLI
  lessons/            Source markdown or text lessons
  output/             Generated audio, one folder per lesson
  src/                Python implementation
  tests/              Python regression tests
  package.json        Turborepo scripts for the Python service
  audio.py            CLI entrypoint
  server.py           HTTP server entrypoint
  tts.cmd             Windows CLI launcher
  server.cmd          Windows server launcher
web/                  TanStack Start UI and server functions
storage/              Local lesson markdowns and generated audio metadata
  markdowns/          Audio group and chapter source files
  generated/          Generated audio output, ignored by Git
package.json          Root npm workspace and Turborepo commands
turbo.json            Shared task configuration
```

## What this project does

- Reads a `.md` or `.txt` lesson
- Cleans markdown into speech-friendly text
- Splits long lessons into safe chunks for Kokoro
- Produces a merged `.wav`
- Converts the result to `.mp3` by default
- Stores each lesson in its own output folder

## Setup

Use Node through nvm and npm for this repository. The root `package.json` and `package-lock.json` are the source of truth for JavaScript dependencies.

Install JavaScript dependencies from the repository root:

```bash
npm install
```

The Python service lives in `audio-api/` and uses a disposable local virtual environment at:

```text
audio-api/.venv
```

Do not copy this folder between machines or repo locations. If the repo moves, delete `audio-api/.venv` and recreate it.

The shortest setup path from the repository root is:

```bash
npm run setup:audio
```

That command creates `audio-api/.venv` when it is missing and installs `audio-api/requirements.txt`.

### Git Bash Setup

From the repository root:

```bash
npm install
npm run setup:audio
npm run dev
```

To recreate a broken or moved Python venv in Git Bash:

```bash
rm -rf audio-api/.venv
npm run setup:audio
```

Manual Git Bash setup is also fine:

```bash
cd audio-api
py -3.12 -m venv .venv
source .venv/Scripts/activate
python -m pip install -r requirements.txt
deactivate
cd ..
```

### PowerShell Setup

From the repository root:

```powershell
npm install
npm run setup:audio
npm run dev
```

To recreate a broken or moved Python venv in PowerShell:

```powershell
Remove-Item -LiteralPath .\audio-api\.venv -Recurse -Force
npm run setup:audio
```

Manual PowerShell setup is also fine:

```powershell
cd .\audio-api
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
deactivate
cd ..
```

If the `py` launcher cannot find Python, use the installed executable directly:

```powershell
cd .\audio-api
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
deactivate
cd ..
```

When opening the repository root in VS Code, select the Python interpreter at:

```text
audio-api\.venv\Scripts\python.exe
```

The root `pyrightconfig.json` also points Pylance at `audio-api/.venv` and `audio-api/src`.

For MP3 output, install FFmpeg and either:

- add `ffmpeg.exe` to `PATH`, or
- keep it in a common location like `C:\Users\<you>\Downloads\ffmpeg\bin\ffmpeg.exe`, or
- pass `--ffmpeg-path "C:\path\to\ffmpeg.exe"`

## Workspace Commands

Run both local services through Turborepo from the repository root:

```powershell
npm run dev
```

That starts the Python audio service and the TanStack Start app in one terminal. You can still run each side separately:

```powershell
npm run dev:audio
npm run dev:web
```

Check the workspace before committing:

```powershell
npm run typecheck
npm run test
npm run build
```

`typecheck` compiles the Python files and checks the web app. `test` runs the Python regression tests. `build` runs the web production build and the Python compile check.

## Lesson Storage

The web app owns the lesson library. It stores audio groups and chapter markdowns under:

```text
storage/markdowns/groups/
```

Each group has a `group.json` file and chapter files:

```text
storage/markdowns/groups/my-book/
  group.json
  chapters/
    introduction.json
    introduction.md
```

Generated audio is written under:

```text
storage/generated/groups/
```

That folder is ignored by Git so large WAV and MP3 files do not get committed. Markdown source files are not ignored, so you can decide per change whether lesson content belongs in the repository.

The TanStack server functions handle create, edit, delete, and generation requests. The Python API is only responsible for turning supplied text into audio.

The web UI is split into pages:

```text
/groups                                      list audio groups
/groups/new                                  create a group
/groups/:groupId                             list lessons in a group
/groups/:groupId/edit                        update a group
/groups/:groupId/lessons/new                 create a lesson
/groups/:groupId/lessons/:chapterId          view and generate a lesson
/groups/:groupId/lessons/:chapterId/edit     update a lesson
```

Group and lesson forms use TanStack Form with Zod schemas. Lesson previews render markdown with `marked` and sanitize the generated HTML before it is inserted into the page.

## Usage

Use the shell-neutral npm script from the repository root:

```bash
npm run generate -w audiofier-audio-api -- ./lessons/fundamentals.md
```

For a quick local test, use the included sample lesson:

```bash
npm run generate:sample -w audiofier-audio-api
```

PowerShell and cmd can also use the Windows launcher:

```powershell
.\audio-api\tts.cmd .\lessons\fundamentals.md
```

For a quick local test, use the included sample lesson:

```powershell
.\audio-api\tts.cmd .\lessons\sample.md --wav-only
```

Relative lesson paths are resolved from your current terminal directory first. If that file does not exist, the app falls back to the `audio-api/` folder, so `.\audio-api\tts.cmd lessons\sample.md --wav-only` works from the repo root. Relative output folders are created under `audio-api/` by default.

That single command now creates both:

- `output/fundamentals/fundamentals.wav`
- `output/fundamentals/fundamentals.mp3`

Run the Python script directly in PowerShell:

```powershell
.\audio-api\.venv\Scripts\python.exe .\audio-api\audio.py .\audio-api\lessons\fundamentals.md
```

Generate only WAV:

```bash
npm run generate -w audiofier-audio-api -- ./lessons/fundamentals.md --wav-only
```

Keep intermediate chunk files:

```bash
npm run generate -w audiofier-audio-api -- ./lessons/fundamentals.md --keep-chunks
```

Change voice and speed:

```bash
npm run generate -w audiofier-audio-api -- ./lessons/fundamentals.md --voice af_bella --speed 0.96
```

## HTTP server

Run the isolated audio generator service:

```bash
npm run dev:audio
```

PowerShell and cmd can also use the Windows launcher:

```powershell
.\audio-api\server.cmd
```

By default it listens only on your machine:

```text
http://127.0.0.1:8765
```

Check that the service is alive:

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

Generate from an existing lesson file:

```powershell
$body = @{
  inputPath = "lessons/sample.md"
  wavOnly = $true
} | ConvertTo-Json

Invoke-RestMethod http://127.0.0.1:8765/generate -Method Post -ContentType "application/json" -Body $body
```

Generate from raw text, which is what the web app sends to the Python service through the TanStack BFF:

```powershell
$body = @{
  text = "# Web Lesson`n`nThis lesson came from an HTTP request."
  stem = "web-lesson"
  suffix = ".md"
  wavOnly = $true
} | ConvertTo-Json

Invoke-RestMethod http://127.0.0.1:8765/generate -Method Post -ContentType "application/json" -Body $body
```

## Web app

The TanStack Start app lives in `web/`. Its server functions call the Python audio service.

From the repository root, start both services together:

```powershell
npm run dev
```

Open `http://localhost:3000`.

Or start the Python server first:

```powershell
.\audio-api\server.cmd
```

In a second terminal:

```powershell
cd .\web
npm run dev
```

If the audio service uses another URL, set `AUDIO_API_URL` before starting the web app:

```powershell
$env:AUDIO_API_URL = "http://127.0.0.1:8765"
npm run dev
```

## Outputs

By default files are written into a lesson folder:

- `output/fundamentals/fundamentals.wav`
- `output/fundamentals/fundamentals.mp3` by default
- `output/fundamentals/chunks/...` if `--keep-chunks` is enabled

If you use `--output-dir custom-output`, the result becomes:

- `custom-output/fundamentals/fundamentals.wav`

## Main options

```text
input                 Path to a .md or .txt file
--output-dir          Base folder for generated lesson folders
--voice               Kokoro voice, for example af_heart
--speed               Speech speed, for example 0.95 or 1.05
--lang-code           Kokoro language code
--repo-id             Model repo id
--max-chars           Max chars per chunk before extra splitting
--pause-ms            Silence between chunks in milliseconds
--keep-chunks         Save individual chunk wav files
--mp3                 Kept for compatibility; MP3 is already generated by default
--wav-only            Skip MP3 conversion and save only the WAV file
--ffmpeg-path         Full path to ffmpeg.exe if not in PATH or Downloads
--mp3-bitrate         MP3 bitrate, for example 96k or 128k
```

## Notes

- The script strips common markdown formatting so lessons sound cleaner when read aloud.
- The first run can be slower because the model and voice assets may need to download or warm up.
- English defaults are set for the current lesson examples: `lang_code=a`, `voice=af_heart`.
- `tts.ps1` is included too, but some Windows machines block PowerShell scripts by default. `tts.cmd` is the safer launcher.
