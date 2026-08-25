# Audio-generator architecture

The Python workspace separates orchestration, model adapters, infrastructure, repositories, and HTTP/CLI
delivery. Both the API and CLI ultimately use the same registered model contract.

```text
API or CLI
  -> generation/audio service orchestration
    -> text preparation and model-owned chunk policy
      -> TtsModel registry
        -> KokoroModel -> Kokoro runtime
        -> QwenCustomModel -> Qwen runtime
      -> audio transform and repository
```

## Model contract

Every backend implements `TtsModel` and exposes a `TtsModelDescriptor`. The descriptor owns catalog data
and chunking behavior: model ID, default voice, instruction support, maximum and minimum chunk sizes, and
whether adjacent semantic chunks should be packed. The adapter validates model-specific options and
returns a model-neutral `SynthesisOutput` containing wave arrays, sample rate, and resolved model source.

Generation orchestration does not branch on model IDs. It asks the registry for a model, applies that
model's descriptor, calls `synthesize`, and passes the neutral result to shared output services.

## Adding a model

1. Create an adapter in `src/tts_models` that implements `TtsModel`.
2. Define its descriptor and model-specific option validation.
3. Keep SDK/model-loading details behind the adapter or a dedicated infrastructure module.
4. Register one instance in `TtsModelRegistry`.
5. Add voices to `VoiceRepository` if the UI should expose them.
6. Add adapter contract tests using a fake runtime; do not load model weights in unit tests.
7. Run `npm run check` and the fixed-input benchmark before comparing throughput.

New Kokoro-like models should require no changes to the API, CLI, text preparation, audio merge, or output
repository. If a new backend needs a fundamentally different request shape, extend the model contract with
a model-neutral capability rather than adding model-ID conditionals to orchestration.

## Boundaries

- `domain`: stable data contracts with no framework or model SDK dependency.
- `tts_models`: adapters and model-specific policy.
- `services`: use-case orchestration and transformations.
- `infrastructure`: CUDA/model SDK loading, paths, environment, and external tools.
- `repositories`: file persistence and voice catalog data.
- `api`: FastAPI transport only.

Heavy imports remain lazy so catalog and health endpoints do not load PyTorch or model weights.
