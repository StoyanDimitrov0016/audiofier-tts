from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"

if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from infrastructure.local_runtime import configure_local_runtime

configure_local_runtime()

import uvicorn


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the local Audiofier TTS FastAPI service.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind. Defaults to local-only.")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on.")
    parser.add_argument("--output-dir", default="output", help="Base folder for generated audio output.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    from app import create_app
    from infrastructure.settings import AudioApiSettings

    api_app = create_app(
        AudioApiSettings(
            host=args.host,
            port=args.port,
            output_dir=args.output_dir,
        )
    )
    uvicorn.run(api_app, host=args.host, port=args.port)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        raise SystemExit(130) from None
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
