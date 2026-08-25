from __future__ import annotations

import argparse
import json
import platform
import statistics
import subprocess
import threading
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import psutil

from services.generation import DEFAULT_VOICE, GenerationOptions, generate_audio

GPU_QUERY = "utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,clocks.current.graphics"


@dataclass(frozen=True)
class TelemetrySample:
    elapsed_seconds: float
    system_cpu_percent: float
    process_cpu_percent: float
    process_rss_mib: float
    system_memory_percent: float
    gpu_utilization_percent: float | None
    gpu_memory_used_mib: float | None
    gpu_temperature_c: float | None
    gpu_power_w: float | None
    gpu_clock_mhz: float | None


def _nvidia_sample() -> list[float] | None:
    try:
        completed = subprocess.run(
            [
                "nvidia-smi",
                f"--query-gpu={GPU_QUERY}",
                "--format=csv,noheader,nounits",
                "--id=0",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError, ValueError):
        return None
    return [float(value.strip()) for value in completed.stdout.strip().split(",")]


def _hardware() -> dict[str, Any]:
    import torch

    gpu = _nvidia_sample()
    return {
        "os": platform.platform(),
        "cpu": platform.processor(),
        "physical_cpu_cores": psutil.cpu_count(logical=False),
        "logical_cpu_cores": psutil.cpu_count(logical=True),
        "memory_gib": round(psutil.virtual_memory().total / 1024**3, 2),
        "python": platform.python_version(),
        "pytorch": torch.__version__,
        "cuda_runtime": torch.version.cuda,
        "cuda_available": torch.cuda.is_available(),
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "gpu_memory_total_mib": gpu[2] if gpu is not None else None,
    }


class TelemetryMonitor:
    def __init__(self, interval_seconds: float) -> None:
        self._interval_seconds = interval_seconds
        self._stop = threading.Event()
        self._started = 0.0
        self._samples: list[TelemetrySample] = []
        self._thread = threading.Thread(target=self._run, name="tts-benchmark-monitor", daemon=True)

    @property
    def samples(self) -> list[TelemetrySample]:
        return list(self._samples)

    def start(self) -> None:
        process = psutil.Process()
        psutil.cpu_percent(interval=None)
        process.cpu_percent(interval=None)
        self._started = time.perf_counter()
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._thread.join()

    def _run(self) -> None:
        process = psutil.Process()
        while not self._stop.wait(self._interval_seconds):
            with process.oneshot():
                process_cpu = process.cpu_percent(interval=None)
                rss_mib = process.memory_info().rss / 1024**2
            gpu = _nvidia_sample()
            self._samples.append(
                TelemetrySample(
                    elapsed_seconds=round(time.perf_counter() - self._started, 3),
                    system_cpu_percent=psutil.cpu_percent(interval=None),
                    process_cpu_percent=process_cpu,
                    process_rss_mib=round(rss_mib, 2),
                    system_memory_percent=psutil.virtual_memory().percent,
                    gpu_utilization_percent=gpu[0] if gpu is not None else None,
                    gpu_memory_used_mib=gpu[1] if gpu is not None else None,
                    gpu_temperature_c=gpu[3] if gpu is not None else None,
                    gpu_power_w=gpu[4] if gpu is not None else None,
                    gpu_clock_mhz=gpu[5] if gpu is not None else None,
                )
            )


def _metric_summary(samples: list[TelemetrySample], field: str) -> dict[str, float] | None:
    values = [float(value) for sample in samples if (value := getattr(sample, field)) is not None]
    if not values:
        return None
    return {
        "mean": round(statistics.fmean(values), 2),
        "maximum": round(max(values), 2),
    }


def run_benchmark(args: argparse.Namespace) -> dict[str, Any]:
    input_path = args.input.resolve()
    output_dir = args.output_dir.resolve()
    monitor = TelemetryMonitor(args.sample_interval)
    options = GenerationOptions(
        output_dir=output_dir,
        model_id=args.model,
        voice=args.voice,
        instruct=args.instruct,
        wav_only=True,
    )

    started = time.perf_counter()
    monitor.start()
    try:
        result = generate_audio(input_path, options)
    finally:
        monitor.stop()
    elapsed = time.perf_counter() - started
    samples = monitor.samples
    per_thousand = elapsed / result.cleaned_character_count * 1000
    return {
        "schema_version": 1,
        "input": {
            "path": str(input_path),
            "raw_characters": len(input_path.read_text(encoding="utf-8")),
            "cleaned_characters": result.cleaned_character_count,
        },
        "model": {
            "id": result.model_id,
            "voice": result.voice,
            "source": result.model_source,
            "instruct": result.instruct,
        },
        "result": {
            "wall_seconds": round(elapsed, 3),
            "seconds_per_1000_characters": round(per_thousand, 3),
            "minutes_per_1000_characters": round(per_thousand / 60, 3),
            "audio_seconds": round(result.duration_seconds, 3),
            "real_time_factor": round(elapsed / result.duration_seconds, 3),
            "chunks": result.chunk_count,
            "wav_path": str(result.wav_path),
        },
        "telemetry": {
            "sample_interval_seconds": args.sample_interval,
            "sample_count": len(samples),
            "system_cpu_percent": _metric_summary(samples, "system_cpu_percent"),
            "process_cpu_percent": _metric_summary(samples, "process_cpu_percent"),
            "process_rss_mib": _metric_summary(samples, "process_rss_mib"),
            "system_memory_percent": _metric_summary(samples, "system_memory_percent"),
            "gpu_utilization_percent": _metric_summary(samples, "gpu_utilization_percent"),
            "gpu_memory_used_mib": _metric_summary(samples, "gpu_memory_used_mib"),
            "gpu_temperature_c": _metric_summary(samples, "gpu_temperature_c"),
            "gpu_power_w": _metric_summary(samples, "gpu_power_w"),
            "gpu_clock_mhz": _metric_summary(samples, "gpu_clock_mhz"),
            "samples": [asdict(sample) for sample in samples],
        },
        "hardware": _hardware(),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark one Audiofier TTS model with CPU/GPU telemetry.")
    parser.add_argument("input", type=Path)
    parser.add_argument("--model", required=True, choices=["kokoro", "qwen-0.6b-custom", "qwen-1.7b-custom"])
    parser.add_argument("--voice", default=DEFAULT_VOICE)
    parser.add_argument("--instruct")
    parser.add_argument("--output-dir", type=Path, default=Path("output/benchmark"))
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--sample-interval", type=float, default=1.0)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = run_benchmark(args)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"report": str(args.report.resolve()), **report["result"]}, indent=2))


if __name__ == "__main__":
    main()
