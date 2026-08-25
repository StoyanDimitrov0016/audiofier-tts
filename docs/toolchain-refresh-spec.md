# Toolchain Refresh Specification

Temporary implementation checklist for the reproducible local toolchain migration.

## Repository and dependency state

- [x] Create a dedicated branch from `main`.
- [x] Convert the Python workspace to a uv-managed project.
- [x] Declare the supported Python version and commit a universal `uv.lock`.
- [x] Replace custom venv/pip orchestration with deterministic `uv sync` and `uv run` commands.
- [x] Resolve and lock current compatible Python dependencies, including the CUDA-specific PyTorch source.
- [x] Align the Node, npm, FNM, and package-lock contracts.
- [x] Recreate stale Node and Python dependency environments from their lockfiles.

## Runtime assets and native tools

- [x] Verify Kokoro and Qwen model layouts against runtime expectations.
- [x] Remove only confirmed redundant model assets and stale environments.
- [x] Consolidate FFmpeg and SoX discovery around installed tools with explicit diagnostics.
- [x] Remove obsolete path-search and undocumented machine-specific fallbacks.

## Deterministic quality checks

- [x] Add a toolchain/environment diagnostic command.
- [x] Make formatting, linting, typechecking, tests, and builds run through locked tools.
- [x] Correct storage ignore rules and local-output conventions.
- [x] Update setup, model, and troubleshooting documentation.
- [x] Run format checks, lint, typecheck, tests, build, dependency integrity checks, and runtime smoke checks.
- [x] Confirm the final working tree contains only intended repository changes.

## Compatibility decisions

- Python stays on the latest 3.12 patch because the native CUDA/TTS stack is fully supported there.
- TypeScript stays on 6.0.3 because the current `typescript-eslint` release supports TypeScript below 6.1;
  TypeScript 7 would make linting an unsupported combination.
- The NVIDIA 596.36 WHQL driver was already current and successfully runs the locked CUDA 12.8 PyTorch build.
- Ollama remains an optional machine tool; the installed language models do not replace the dedicated TTS models.
