#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

PATCH_VERSION = "0.6.25.2-community2tg11workspace16fix1"
CSS_NAME = "workspace16-fixed1.css"
JS_NAME = "workspace16-fixed1.js"


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: patch.py /path/to/index.html", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"index.html not found: {path}", file=sys.stderr)
        return 2

    text = path.read_text(encoding="utf-8")

    # Remove only this patch and the rejected WORKSPACE16 layer. WORKSPACE15 and
    # every older confirmed module stay untouched.
    patterns = [
        r"\s*<link[^>]+(?:workspace16-fixes|workspace16-fixed1)\.css[^>]*>\s*",
        r"\s*<script[^>]+(?:workspace16-fixes|workspace16-fixed1)\.js[^>]*>\s*</script>\s*",
    ]
    for pattern in patterns:
        text = re.sub(pattern, "\n", text, flags=re.I)

    css = f'  <link rel="stylesheet" href="/{CSS_NAME}?v={PATCH_VERSION}">\n'
    js = f'  <script defer src="/{JS_NAME}?v={PATCH_VERSION}"></script>\n'

    if re.search(r"</head>", text, flags=re.I):
        text = re.sub(r"</head>", css + "</head>", text, count=1, flags=re.I)
    else:
        text = css + text

    if re.search(r"</body>", text, flags=re.I):
        text = re.sub(r"</body>", js + "</body>", text, count=1, flags=re.I)
    else:
        text += "\n" + js

    path.write_text(text, encoding="utf-8")
    print(f"WORKSPACE16-FIX1 patch prepared: {PATCH_VERSION}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
