# Benchmark machine

Measured on August 25, 2026 in Sofia, Bulgaria.

| Component        | Specification                                                 |
| ---------------- | ------------------------------------------------------------- |
| Laptop           | Acer Nitro AN515-58                                           |
| Operating system | Windows 11, build 26200                                       |
| CPU              | 12th Gen Intel Core i7-12650H, 10 physical / 16 logical cores |
| Memory           | 31.69 GiB                                                     |
| GPU              | NVIDIA GeForce RTX 4060 Laptop GPU, 8,188 MiB VRAM            |
| NVIDIA driver    | 596.36                                                        |
| Python           | CPython 3.12.14, managed by uv                                |
| PyTorch          | 2.11.0+cu128                                                  |
| CUDA runtime     | 12.8                                                          |
| Node / npm       | Node 24.19.0 / npm 12.0.2                                     |
| uv               | 0.12.5                                                        |
| FFmpeg           | 9.0, installed through Winget                                 |

The laptop was connected to power. No attempt was made to claim laboratory isolation; background Windows
activity is represented in the system CPU samples. `nvidia-smi` sampled the first NVIDIA GPU.

## Observed utilization

| Model     | System CPU mean / max | GPU mean / max | Peak VRAM | Peak GPU temperature | Peak GPU power |
| --------- | --------------------: | -------------: | --------: | -------------------: | -------------: |
| Kokoro    |       20.88% / 54.10% |   29.30% / 97% | 1,961 MiB |                 63°C |         54.79W |
| Qwen 0.6B |       21.33% / 43.50% |  36.60% / 100% | 4,051 MiB |                 77°C |         89.32W |
| Qwen 1.7B |       22.26% / 44.60% |  36.10% / 100% | 6,048 MiB |                 78°C |         98.46W |

Means include model loading, orchestration, and WAV writing, so they are intentionally lower than
synthesis-only peaks. Raw one-second samples are retained in `runs/`.
