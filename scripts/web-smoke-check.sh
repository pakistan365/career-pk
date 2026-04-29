#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/3] Checking that local asset/page links in HTML files resolve..."
python - <<'PY'
from pathlib import Path
from html.parser import HTMLParser
import sys

class RefParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        attr = {"link": "href", "script": "src", "img": "src", "a": "href"}.get(tag)
        if attr and attrs.get(attr):
            self.refs.append((tag, attrs[attr]))

root = Path('.')
html_files = sorted(root.glob('*.html'))
missing = []

for html_file in html_files:
    parser = RefParser()
    parser.feed(html_file.read_text(encoding='utf-8', errors='ignore'))

    for tag, value in parser.refs:
        if value.startswith(("http://", "https://", "mailto:", "tel:", "#", "javascript:")):
            continue
        target = value.split('?')[0].split('#')[0]
        if not target:
            continue
        target_path = (html_file.parent / target)
        if not target_path.exists():
            missing.append((html_file.name, tag, target))

if missing:
    print("Missing local links/assets detected:")
    for item in missing:
        print(f" - file={item[0]} tag={item[1]} target={item[2]}")
    sys.exit(1)

print(f"Checked {len(html_files)} HTML pages; all local links/assets resolved.")
PY

echo "[2/3] Checking JavaScript syntax for frontend and API scripts..."
for pattern in js/*.js api/*.js service-worker.js; do
  for file in $pattern; do
    [ -e "$file" ] || continue
    node --check "$file" >/dev/null
  done
done
echo "JavaScript syntax check passed."

echo "[3/3] Verifying JSON config files parse..."
python - <<'PY'
import json
from pathlib import Path

for config_file in [Path('manifest.json'), Path('vercel.json')]:
    with config_file.open('r', encoding='utf-8') as f:
        json.load(f)
print('JSON config validation passed for manifest.json and vercel.json.')
PY

echo "✅ Web smoke checks completed successfully."
