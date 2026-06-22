import argparse
import statistics
import time

import httpx


def percentile(values: list[float], pct: float) -> float:
    ordered = sorted(values)
    index = min(len(ordered) - 1, round((pct / 100) * (len(ordered) - 1)))
    return round(ordered[index], 2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark the inference traffic simulation API.")
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--token", default="dev-token")
    parser.add_argument("--requests", type=int, default=250)
    parser.add_argument("--batch-size", type=int, default=10)
    args = parser.parse_args()

    headers = {"Authorization": f"Bearer {args.token}"}
    latencies: list[float] = []
    failures = 0
    sent = 0
    start = time.perf_counter()
    with httpx.Client(base_url=args.url, timeout=30.0, headers=headers) as client:
        while sent < args.requests:
            count = min(args.batch_size, args.requests - sent)
            before = time.perf_counter()
            response = client.post(f"/api/traffic/simulate?count={count}")
            response.raise_for_status()
            elapsed_ms = (time.perf_counter() - before) * 1000
            data = response.json()
            latencies.extend([elapsed_ms / count] * count)
            failures += data["failures"]
            sent += count

    total_seconds = time.perf_counter() - start
    print("Inference Ops benchmark")
    print(f"requests={sent} failures={failures} elapsed_seconds={total_seconds:.2f}")
    print(f"client_avg_ms={statistics.mean(latencies):.2f}")
    print(f"client_p50_ms={percentile(latencies, 50):.2f}")
    print(f"client_p95_ms={percentile(latencies, 95):.2f}")
    print(f"client_p99_ms={percentile(latencies, 99):.2f}")


if __name__ == "__main__":
    main()
