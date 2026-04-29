#!/usr/bin/env python3
"""Homepage verification helper for CareerPK.

Checks:
1) Production HTTP status for homepage and key assets.
2) Local viewport runtime checks (desktop/tablet/mobile) using Playwright.
"""
from __future__ import annotations
import json
import subprocess
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

URLS = [
    "https://careerhub.pk/",
    "https://careerhub.pk/css/style.css",
    "https://careerhub.pk/js/app.js",
]


def head_status(url: str) -> str:
    req = Request(url, method="HEAD")
    try:
        with urlopen(req, timeout=20) as r:
            return str(r.status)
    except HTTPError as e:
        return f"HTTPError:{e.code}"
    except URLError as e:
        return f"URLError:{e.reason}"


def main() -> int:
    results = {"production": {}, "local": []}
    for u in URLS:
        results["production"][u] = head_status(u)

    # local runtime check via playwright if installed
    try:
        from playwright.sync_api import sync_playwright  # type: ignore
    except Exception:
        print(json.dumps(results, indent=2))
        return 0

    server = subprocess.Popen(["python", "-m", "http.server", "4173"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            for name, vp in [("desktop", {"width": 1366, "height": 768}), ("tablet", {"width": 820, "height": 1180}), ("mobile", {"width": 390, "height": 844})]:
                c = browser.new_context(viewport=vp)
                page = c.new_page()
                resp = page.goto("http://127.0.0.1:4173/index.html", wait_until="networkidle", timeout=90000)
                page.wait_for_timeout(1500)
                item = {"viewport": name, "status": resp.status if resp else None, "grids": {}}
                for grid in ["#scholarshipsGrid", "#jobsGrid"]:
                    el = page.query_selector(grid)
                    if not el:
                        item["grids"][grid] = {"present": False}
                        continue
                    before = page.evaluate("(e)=>e.scrollLeft", el)
                    item["grids"][grid] = {
                        "present": True,
                        "class": page.evaluate("(e)=>e.className", el),
                        "scroll_left": before,
                    }
                results["local"].append(item)
                c.close()
            browser.close()
    finally:
        server.terminate()

    out = Path("qa_verification_results.json")
    out.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
