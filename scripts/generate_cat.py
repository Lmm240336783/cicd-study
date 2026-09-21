#!/usr/bin/env python3
"""
Generate a cat image via an OpenAI-compatible image endpoint.

Default gateway: https://api.psydo.top
Default output: output/imagegen/cat.png
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


DEFAULT_PROMPT = (
    "A cute fluffy cat sitting by a sunlit window, photorealistic, detailed fur, "
    "soft natural light, cozy home background, no text, no watermark"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a cat image with an OpenAI-compatible image API."
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("OPENAI_API_KEY", ""),
        help="API key. Defaults to OPENAI_API_KEY.",
    )
    parser.add_argument(
        "--base-url",
        default="https://api.psydo.top",
        help="Gateway base URL. Defaults to https://api.psydo.top.",
    )
    parser.add_argument(
        "--model",
        default="gpt-image-2",
        help="Image model to use. Defaults to gpt-image-2.",
    )
    parser.add_argument(
        "--prompt",
        default=DEFAULT_PROMPT,
        help="Prompt text for the generated cat image.",
    )
    parser.add_argument(
        "--size",
        default="1024x1024",
        help="Image size, for example 1024x1024.",
    )
    parser.add_argument(
        "--quality",
        default="high",
        help="Image quality, for example low, medium, high, or auto.",
    )
    parser.add_argument(
        "--out",
        default="output/imagegen/cat.png",
        help="Where to write the final image.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=180,
        help="HTTP timeout in seconds. Defaults to 180.",
    )
    return parser.parse_args()


def build_endpoint(base_url: str) -> str:
    return f"{base_url.rstrip('/')}/images/generations"


def post_json(url: str, api_key: str, payload: dict[str, object], timeout: int) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Image API request failed: {exc.code} {details}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Image API connection failed: {exc.reason}") from exc


def download_file(url: str, target: Path, timeout: int) -> None:
    request = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        target.write_bytes(response.read())


def save_image(result: dict, out_path: Path, timeout: int) -> None:
    data = result.get("data")
    if not isinstance(data, list) or not data:
        raise RuntimeError(f"Unexpected response payload: {json.dumps(result, ensure_ascii=False)}")

    first = data[0]
    if not isinstance(first, dict):
        raise RuntimeError(f"Unexpected image item: {first!r}")

    image_b64 = first.get("b64_json")
    image_url = first.get("url")

    out_path.parent.mkdir(parents=True, exist_ok=True)

    if isinstance(image_b64, str) and image_b64:
        out_path.write_bytes(base64.b64decode(image_b64))
        return

    if isinstance(image_url, str) and image_url:
        download_file(image_url, out_path, timeout=timeout)
        return

    raise RuntimeError(f"Response did not include b64_json or url: {json.dumps(first, ensure_ascii=False)}")


def main() -> int:
    args = parse_args()

    if not args.api_key:
        print("Missing API key. Set OPENAI_API_KEY or pass --api-key.", file=sys.stderr)
        return 1

    out_path = Path(args.out).expanduser()
    endpoint = build_endpoint(args.base_url)
    payload = {
        "model": args.model,
        "prompt": args.prompt,
        "size": args.size,
        "quality": args.quality,
    }

    result = post_json(endpoint, args.api_key, payload, timeout=args.timeout)
    save_image(result, out_path, timeout=args.timeout)
    print(f"Saved image to {out_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
