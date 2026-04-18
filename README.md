# Audiofier TTS

Local text-to-speech tooling with a Python audio-generation service and a TanStack Start web app.

## Project layout

```text
audio-api/            Python audio-generation API and CLI
  lessons/            Source markdown or text lessons
  output/             Generated audio, one folder per lesson
  src/                Python implementation
  tests/              Python regression tests
  audio.py            CLI entrypoint
  server.py           HTTP server entrypoint
  tts.cmd             Windows CLI launcher
  server.cmd          Windows server launcher
web/                  TanStack Start UI and server functions
```

## What this project does

- Reads a `.md` or `.txt` lesson
- Cleans markdown into speech-friendly text
- Splits long lessons into safe chunks for Kokoro
- Produces a merged `.wav`
- Converts the result to `.mp3` by default
- Stores each lesson in its own output folder

## Setup

The Python service lives in `audio-api/`.

Create and activate a virtual environment:

```powershell
cd .\audio-api
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If the `py` launcher cannot find Python, use the installed executable directly:

```powershell
cd .\audio-api
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
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

## Usage

Use the Windows launcher:

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

Run the Python script directly:

```powershell
.\audio-api\.venv\Scripts\python.exe .\audio-api\audio.py .\audio-api\lessons\fundamentals.md
```

Generate only WAV:

```powershell
.\audio-api\tts.cmd .\lessons\fundamentals.md --wav-only
```

Keep intermediate chunk files:

```powershell
.\audio-api\tts.cmd .\lessons\fundamentals.md --keep-chunks
```

Change voice and speed:

```powershell
.\audio-api\tts.cmd .\lessons\fundamentals.md --voice af_bella --speed 0.96
```

## HTTP server

Run the isolated audio generator service:

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

Generate from raw text, which is the path the future web app can use:

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

The TanStack Start app lives in `web/`. Its server functions call the Python audio service, so start the Python server first:

```powershell
.\audio-api\server.cmd
```

In a second terminal:

```powershell
cd .\web
npm run dev
```

Open `http://localhost:3000`.

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
