from __future__ import annotations

import argparse
import pathlib
import re
import sys


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


MOJIBAKE_PATTERNS = [
    "锟斤拷",
    "\ufffd",
    "Ã",
    "Â",
    "Ð",
    "Ñ",
    "æ",
    "è",
    "ç",
]

CJK_RE = re.compile(r"[\u3400-\u9fff]")
SUSPICIOUS_Q_RE = re.compile(r"[\u3400-\u9fff][^\n]{0,20}\?{2,}|\?{2,}[^\n]{0,20}[\u3400-\u9fff]")


def check_file(path: pathlib.Path) -> list[str]:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        return [f"{path}: cannot decode as UTF-8: {exc}"]

    issues: list[str] = []
    for pattern in MOJIBAKE_PATTERNS:
        if pattern in text:
            issues.append(f"{path}: suspicious mojibake marker {pattern!r}")

    if SUSPICIOUS_Q_RE.search(text):
        issues.append(f"{path}: suspicious repeated '?' near CJK text")

    if CJK_RE.search(text) and text.count("?") > max(20, len(text) // 120):
        issues.append(f"{path}: unusually many '?' characters in CJK file")

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Check UTF-8 text files for common mojibake risks.")
    parser.add_argument("files", nargs="+", help="Files to check")
    args = parser.parse_args()

    issues: list[str] = []
    for file_name in args.files:
        path = pathlib.Path(file_name)
        if path.is_file():
            issues.extend(check_file(path))
        else:
            issues.append(f"{path}: not a file")

    if issues:
        print("\n".join(issues))
        return 1

    print("encoding check passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
