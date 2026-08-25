# Local TTS benchmarks

These results and reference audio files were generated locally on the machine described in
[machine.md](machine.md). They are a baseline for comparing future model adapters, not a universal model
ranking.

## Fixed run

All models received the same [1,600-character English fixture](input/1,600-chars-tts-benchmark.md). Each
run started in a separate Python process, used batch size 1, generated WAV without MP3 conversion inside
the timed interval, and sampled CPU/GPU telemetry once per second. Times include model loading, text
preparation, synthesis, chunk merging, and WAV writing.

| Model                 | Voice/instruction                 | Wall time |    Audio | Minutes/1,000 chars | Real-time factor |
| --------------------- | --------------------------------- | --------: | -------: | ------------------: | ---------------: |
| Kokoro                | `af_heart`                        |    10.62s | 1m58.33s |           **0.111** |            0.090 |
| Qwen 0.6B CustomVoice | `Ryan`                            |  6m20.11s | 2m33.58s |           **3.959** |            2.475 |
| Qwen 1.7B CustomVoice | `Ryan`; clear, natural, even pace |  7m23.09s | 2m53.98s |           **4.616** |            2.547 |

Reference audio:

- [Kokoro](audio/2026-08-25-kokoro.mp3)
- [Qwen 0.6B](audio/2026-08-25-qwen-0.6b.mp3)
- [Qwen 1.7B](audio/2026-08-25-qwen-1.7b.mp3)

Raw telemetry:

- [Kokoro run](runs/2026-08-25-kokoro.json)
- [Qwen 0.6B run](runs/2026-08-25-qwen-0.6b.json)
- [Qwen 1.7B run](runs/2026-08-25-qwen-1.7b.json)

## Interpretation and assumptions

The normalized estimate is `wall seconds / cleaned characters * 1,000`. For text of comparable English
prose, estimate cold generation time as:

- Kokoro: about **0.11 minute per 1,000 characters**.
- Qwen 0.6B: about **3.96 minutes per 1,000 characters**.
- Qwen 1.7B: about **4.62 minutes per 1,000 characters**.

For planning, add roughly 15–25% headroom because pronunciation difficulty, punctuation, output length,
thermal state, other laptop workloads, and Qwen sampling variation affect runtime. This gives practical
ranges of 4.0–5.0 and 4.6–5.8 minutes per 1,000 characters for the two Qwen models. Extrapolation is most
credible for similarly structured English prose and becomes less reliable for very short input, where
model loading dominates, or much longer runs, where thermals matter.

The Qwen runs crossed the production 1,200-character boundary and therefore used two inference calls.
Kokoro used five semantic chunks. Qwen used CUDA BF16 with PyTorch SDPA because a compatible Windows
`flash-attn` wheel was not installed. MP3 conversion happened after timing and does not affect results.

## Reproduce one run

```powershell
npm run benchmark -w audiofier-audio-generator -- `
  ..\benchmarks\input\1,600-chars-tts-benchmark.md `
  --model qwen-0.6b-custom `
  --voice Ryan `
  --output-dir output\benchmark `
  --report ..\benchmarks\runs\local-qwen-0.6b.json
```

Use `--model kokoro --voice af_heart` for Kokoro. Qwen 1.7B also accepts `--instruct`.
