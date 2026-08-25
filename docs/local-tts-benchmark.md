# Local TTS Benchmark

Measured on 2026-08-25 using `cpu-cache.lesson.md` and the repository's locked environment.

## Machine and runtime

- GPU: NVIDIA GeForce RTX 4060 Laptop GPU, 8,188 MiB
- NVIDIA driver: 596.36
- PyTorch: 2.11.0+cu128
- CUDA runtime: 12.8
- Qwen compute: CUDA (`cuda:0`), BF16, PyTorch SDPA
- FlashAttention 2: not installed
- Input SHA-256: `22598DF517C692A811EA1A833AC99F0E4289629AE0B41135EB21E443D7721FEF`
- Input size: 32,202 bytes
- Cleaned TTS text: 31,234 characters
- Language: English

## Capped sample results

The initial runs are intentionally short. Kokoro used the first 1,908 cleaned characters. Qwen used the same
first 663 cleaned characters for both model sizes so each test completed within five minutes.

| Model                         |        Text | Chunks | Wall time |   Audio | Wall/audio |    Throughput | Observed VRAM |
| ----------------------------- | ----------: | -----: | --------: | ------: | ---------: | ------------: | ------------: |
| Kokoro 82M, `af_heart`        | 1,908 chars |      7 |    12.4 s | 135.9 s |      0.091 | 153.9 chars/s |  1.77-1.81 GB |
| Qwen 0.6B CustomVoice, `Ryan` |   663 chars |      1 |   141.7 s |  51.6 s |      2.745 |  4.68 chars/s |  2.72-2.85 GB |
| Qwen 1.7B CustomVoice, `Ryan` |   663 chars |      1 |   148.4 s |  50.3 s |      2.950 |  4.47 chars/s |  4.62-4.77 GB |

Sample WAVs:

- `audio-generator/output/benchmark-subset/cpu-cache-kokoro-sample/cpu-cache-kokoro-sample.wav`
- `audio-generator/output/benchmark-subset/cpu-cache-qwen-0.6b-sample/cpu-cache-qwen-0.6b-sample.wav`
- `audio-generator/output/benchmark-subset/cpu-cache-qwen-1.7b-sample/cpu-cache-qwen-1.7b-sample.wav`

The Qwen 1.7B sample used the instruction: `Read clearly and naturally at an even pace.` The 0.6B model does
not support voice instructions.

## Full lesson estimate

These estimates scale the measured sample by cleaned character count. TTS generation is not perfectly linear,
so allow roughly 15% either way for punctuation, sentence length, warm-up, and sampling variance.

| Model      | Estimated generation wait | Estimated audio duration |     Practical range |
| ---------- | ------------------------: | -----------------------: | ------------------: |
| Kokoro 82M |                    3m 23s |                  37m 04s |   about 3-4 minutes |
| Qwen 0.6B  |                    1h 51m |                  40m 31s | about 1h 35m-2h 10m |
| Qwen 1.7B  |                    1h 57m |                  39m 31s | about 1h 40m-2h 15m |

A complete Kokoro run was also performed. It produced 36m37s of audio at:

`audio-generator/output/benchmark-kokoro/cpu-cache.lesson/cpu-cache.lesson.wav`

That result closely matches the sample-based 37m04s duration estimate.

## Hardware observations

- Kokoro used CUDA at roughly 50-52% sampled GPU utilization and about 1.8 GB VRAM.
- Qwen 0.6B batch size 1 sampled roughly 28-38% utilization with under 3 GB VRAM for the capped run.
- Qwen 1.7B batch size 1 sampled roughly 25-26% utilization with under 4.8 GB VRAM.
- An experimental Qwen batch size 2 reached about 5.0 GB VRAM but did not demonstrate a clear wall-time gain
  during the aborted long run. Batch size 1 remains the safe default for this 8 GB laptop GPU.
- Qwen is compute-active on CUDA but generates slower than real time on this machine. Low average utilization
  does not mean it fell back to CPU; autoregressive generation has sequential work that does not saturate the GPU.

## Recommendation

Use Kokoro when generation turnaround matters: this lesson can be ready in a few minutes. Use Qwen when its
voice quality or 1.7B instruction control is worth an approximately two-hour offline generation. For Qwen,
launch the full lesson as an unattended or overnight job and keep `QWEN_TTS_BATCH_SIZE=1` unless a future
benchmark proves a larger value is faster and stable.

The committed output WAVs are intentionally excluded from Git. This report records their local paths and the
input hash so future measurements can be compared against the same source text.
