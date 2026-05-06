from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def resolve_output_dir(value: str, project_root: Path = PROJECT_ROOT) -> Path:
    path = Path(value).expanduser()
    if path.is_absolute():
        return path
    return (project_root / path).resolve()


def resolve_cli_input_path(value: str, project_root: Path = PROJECT_ROOT) -> Path:
    path = Path(value).expanduser()
    if path.is_absolute():
        return path

    caller_relative = path.resolve()
    if caller_relative.exists():
        return caller_relative

    return (project_root / path).resolve()
