#!/usr/bin/env python3
# Vendored from the owner's akinator-ai plugin (MIT, see ../LICENSE). Edits are allowed in
# this repository; list every divergence in ../SKILL.md "Divergences from upstream".
"""The cheapest way to gain context - a ranked reading list under a token budget.

Pure file reads. No subprocess, no clock, no network. One pass over knowledge
directories only (docs/, rules/, memory/, context/, .ai/, root *.md); code,
node_modules, .git, binaries and files over 256KB are never read. The parsed
index is cached at `.ai/local/akinator-context-index.json` keyed by (path, size,
mtime_ns), so a second call re-reads only changed files. A cache that cannot
be read or written (read-only filesystem) silently degrades to no cache.

Usage (from the repository root; `<skill>` is this skill's own folder):
    python <skill>/scripts/akinator_context.py pack --for "task text" [--paths p ...] [--budget 3000] [--json]
    python <skill>/scripts/akinator_context.py owners --paths p1 p2
    python <skill>/scripts/akinator_context.py stale --today YYYY-MM-DD [--days 90]
    python <skill>/scripts/akinator_context.py budget
    python <skill>/scripts/akinator_context.py --root path/to/repo <cmd>

Exit codes:
    0  success (an empty result is still success)
    2  the tool could not run (root is not a directory, bad --today)

Estimated tokens = len(text) // 4. Output is sorted and deterministic; ties
break by path. Whatever the budget leaves out is listed, never silently cut.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import sys
from pathlib import Path

KNOWLEDGE_DIRS = ("docs", "rules", "memory", "context", ".ai")
SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build",
    ".next", "target", "vendor", ".pytest_cache", ".mypy_cache", ".tox", "cache",
}
MAX_BYTES = 256 * 1024
CACHE_REL = ".ai/local/akinator-context-index.json"
BRIEF = ".ai/BRIEF.md"
CACHE_VERSION = 1

HEADING = re.compile(r"^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$")
WORD = re.compile(r"[a-z0-9][a-z0-9_-]{2,}")
PATHLIKE = re.compile(r"[A-Za-z0-9_.@-]+(?:/[A-Za-z0-9_.@-]+)+/?")
VERIFIED = re.compile(r"Last verified:\s*(\d{4}-\d{2}-\d{2})")
STOP = {
    "the", "and", "for", "with", "that", "this", "from", "into", "are", "not",
    "add", "fix", "make", "use", "all", "any", "new", "change", "update",
}


def est_tokens(text: str) -> int:
    return len(text) // 4


def _read(path: Path) -> str:
    """The only file reader - tests monkeypatch it to count reads."""
    return path.read_text(encoding="utf-8", errors="replace")


# --------------------------------------------------------------------------
# Index
# --------------------------------------------------------------------------

def _summary(lines: list[str]) -> str:
    fenced = False
    for ln in lines:
        s = ln.strip()
        if s.startswith("```") or s.startswith("~~~"):
            fenced = not fenced
            continue
        if fenced or not s or s.startswith(("#", "<!--", "|", "- ", "* ", ">", "---")):
            continue
        return s[:160]
    return ""


def _parse(rel: str, text: str, size: int, mtime_ns: int) -> dict:
    lines = text.splitlines()
    heads: list[str] = []
    fenced = False
    scope: list[str] = []
    in_scope = False
    for ln in lines:
        if ln.lstrip().startswith(("```", "~~~")):
            fenced = not fenced
            continue
        if fenced:
            if in_scope:
                scope.append(ln)
            continue
        m = HEADING.match(ln)
        if m:
            heads.append(m.group(2))
            in_scope = m.group(2).strip().lower() == "applies to"
            continue
        if in_scope:
            scope.append(ln)
    low = text.lower()
    words = sorted(set(WORD.findall(low)))[:800]
    mentions = sorted(set(t.lower() for t in PATHLIKE.findall(text)))[:300]
    ver = VERIFIED.search(text)
    return {
        "path": rel, "size": size, "mtime_ns": mtime_ns,
        "h1": heads[0] if heads else "", "heads": heads[1:40],
        "summary": _summary(lines), "tokens": est_tokens(text),
        "words": words, "mentions": mentions,
        "scope": " ".join(scope).lower()[:800],
        "verified": ver.group(1) if ver else "",
    }


def _walk(root: Path):
    for d in KNOWLEDGE_DIRS:
        base = root / d
        if not base.is_dir():
            continue
        for cur, dirs, files in os.walk(base):
            dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS)
            for f in sorted(files):
                if f.endswith(".md"):
                    yield Path(cur) / f
    for f in sorted(os.listdir(root)):
        if f.endswith(".md") and (root / f).is_file():
            yield root / f


def _load_cache(root: Path) -> dict:
    try:
        data = json.loads((root / CACHE_REL).read_text(encoding="utf-8"))
        if data.get("v") == CACHE_VERSION:
            return data.get("entries", {})
    except (OSError, ValueError, AttributeError):
        pass
    return {}


def _save_cache(root: Path, entries: dict) -> None:
    try:
        cdir = (root / CACHE_REL).parent
        cdir.mkdir(parents=True, exist_ok=True)
        gi = cdir / ".gitignore"
        if not gi.exists():
            gi.write_text("*\n", encoding="utf-8")
        (root / CACHE_REL).write_text(
            json.dumps({"v": CACHE_VERSION, "entries": entries}, sort_keys=True),
            encoding="utf-8")
    except OSError:
        pass


def build_index(root: Path) -> list[dict]:
    cached = _load_cache(root)
    out: dict[str, dict] = {}
    for p in _walk(root):
        rel = p.relative_to(root).as_posix()
        if rel in out:
            continue
        try:
            st = p.stat()
        except OSError:
            continue
        if st.st_size > MAX_BYTES:
            continue
        c = cached.get(rel)
        if c and c.get("size") == st.st_size and c.get("mtime_ns") == st.st_mtime_ns:
            out[rel] = c
            continue
        try:
            text = _read(p)
        except OSError:
            continue
        out[rel] = _parse(rel, text, st.st_size, st.st_mtime_ns)
    if out != cached:
        _save_cache(root, out)
    return [out[k] for k in sorted(out)]


# --------------------------------------------------------------------------
# pack
# --------------------------------------------------------------------------

def _norm(p: str) -> str:
    return p.replace("\\", "/").strip("./").lower() if p.startswith(("./", ".\\")) else p.replace("\\", "/").lower()


def _parents(p: str) -> list[str]:
    parts = p.split("/")
    return ["/".join(parts[:i]) for i in range(len(parts) - 1, 1, -1)]


def _mentions(e: dict, paths: list[str]) -> bool:
    for p in paths:
        keys = [p] + _parents(p)
        for t in e["mentions"]:
            t = t.rstrip("/")
            if any(t == k or t.startswith(k + "/") or k.startswith(t + "/") for k in keys):
                return True
    return False


def _scope_hits(e: dict, paths: list[str]) -> bool:
    sc = e["scope"]
    if not sc:
        return False
    for p in paths:
        for k in [p] + _parents(p):
            if k in sc:
                return True
    return False


def score(e: dict, words: list[str], paths: list[str]) -> tuple[float, list[str]]:
    sc = 0.0
    why: list[str] = []
    title = (e["path"] + " " + e["h1"]).lower()
    heads = " ".join(e["heads"]).lower()
    body = set(e["words"])
    body_hits = 0
    for w in words:
        if w in title:
            sc += 3
            why.append(w)
        elif w in heads:
            sc += 1.5
            why.append(w)
        elif w in body:
            body_hits += 1
            why.append(w + "~")
    sc += min(body_hits, 4) * 0.5
    low = e["path"].lower()
    if body_hits and ("requirement" in low or "drift" in low):
        sc += 2
    if paths and _mentions(e, paths):
        sc += 4
        why.append("mentions-path")
    if paths and low.startswith("rules/") and _scope_hits(e, paths):
        sc += 3
        why.append("rule-scope")
    return sc, why


def pack(root: Path, task: str, paths: list[str], budget: int) -> dict:
    idx = build_index(root)
    words = sorted({w for w in WORD.findall(task.lower()) if w not in STOP})
    paths = [_norm(p) for p in paths]
    picks: list[dict] = []
    used = 0
    brief = next((e for e in idx if e["path"] == BRIEF), None)
    if brief:
        t = min(brief["tokens"], max(budget // 2, 1))
        picks.append({"path": BRIEF, "tokens": t, "why": ["always first"
                      + (" (headline sections only)" if t < brief["tokens"] else "")],
                      "summary": brief["summary"]})
        used += t
    ranked = []
    for e in idx:
        if e["path"] == BRIEF:
            continue
        s, why = score(e, words, paths)
        if s > 0:
            ranked.append((-s, -e["mtime_ns"], e["path"], e, why))
    ranked.sort(key=lambda r: r[:3])
    omitted: list[dict] = []
    for _, _, _, e, why in ranked:
        if used + e["tokens"] > budget:
            omitted.append({"path": e["path"], "tokens": e["tokens"]})
            continue
        used += e["tokens"]
        picks.append({"path": e["path"], "tokens": e["tokens"], "why": why,
                      "summary": e["summary"]})
    return {"budget": budget, "used": used, "picks": picks, "omitted": omitted}


def _print_pack(r: dict) -> None:
    print(f"reading list: {r['used']}/{r['budget']} est tokens, {len(r['picks'])} pages")
    for p in r["picks"]:
        print(f"{p['path']}  ~{p['tokens']}t  why: {', '.join(p['why'])}")
        if p["summary"]:
            print(f"    {p['summary']}")
    if r["omitted"]:
        print(f"left out ({len(r['omitted'])}, over budget):")
        for o in r["omitted"]:
            print(f"  {o['path']}  ~{o['tokens']}t")
    else:
        print("left out: none")


# --------------------------------------------------------------------------
# owners / stale / budget
# --------------------------------------------------------------------------

def _kind(path: str) -> str:
    low = path.lower()
    if low.startswith("rules/"):
        return "rule"
    if "/adr/" in low:
        return "adr"
    if "requirement" in low:
        return "requirement"
    if "librar" in low:
        return "library"
    if "/wiki/" in low:
        return "wiki"
    return "doc"


def _imports(root: Path, p: str) -> set[str]:
    f = root / p
    if f.suffix not in {".py", ".js", ".ts", ".tsx", ".jsx", ".mjs"} or not f.is_file():
        return set()
    try:
        with open(f, encoding="utf-8", errors="replace") as fh:
            head = fh.read(8192)
    except OSError:
        return set()
    names = re.findall(r"^\s*(?:from|import)\s+([A-Za-z0-9_@.-]+)", head, re.M)
    names += re.findall(r"""from\s+['"]([^'"./][^'"]*)['"]|require\(['"]([^'"./][^'"]*)['"]\)""", head)
    flat: set[str] = set()
    for n in names:
        for s in (n if isinstance(n, tuple) else (n,)):
            if s:
                flat.add(s.split(".")[0].split("/")[0].lower())
    return flat


def owners(root: Path, paths: list[str]) -> list[dict]:
    idx = build_index(root)
    paths = [_norm(p) for p in paths]
    imps: set[str] = set()
    for p in paths:
        imps |= _imports(root, p)
    found = []
    for e in idx:
        kind = _kind(e["path"])
        why = None
        if kind == "rule" and _scope_hits(e, paths):
            why = "rule scope"
        elif _mentions(e, paths):
            why = "mentions path"
        elif kind == "library" and Path(e["path"]).stem.lower() in imps:
            why = "library import"
        if why:
            found.append({"path": e["path"], "kind": kind, "why": why,
                          "decision": e["summary"] or e["h1"]})
    found.sort(key=lambda r: (r["kind"], r["path"]))
    return found


def stale(root: Path, today: datetime.date, days: int) -> list[tuple[str, str, int]]:
    out = []
    for e in build_index(root):
        if not e["verified"]:
            continue
        try:
            d = datetime.date.fromisoformat(e["verified"])
        except ValueError:
            continue
        age = (today - d).days
        if age > days:
            out.append((e["path"], e["verified"], age))
    return sorted(out)


def budget_report(root: Path) -> list[tuple[str, int]]:
    idx = build_index(root)
    rows: list[tuple[str, int]] = []
    by = {e["path"]: e["tokens"] for e in idx}
    for label, path in (("BRIEF", BRIEF), ("wiki index", "docs/wiki/index.md"),
                        ("rules index", "rules/README.md")):
        rows.append((f"{label} ({path})", by.get(path, 0)))
    tops: dict[str, int] = {}
    for e in idx:
        top = e["path"].split("/")[0] if "/" in e["path"] else "(root *.md)"
        tops[top] = tops.get(top, 0) + e["tokens"]
    for k in sorted(tops):
        rows.append((f"dir {k}", tops[k]))
    rows.append(("full read of everything indexed", sum(by.values())))
    return rows


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--root", default=".")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("pack")
    p.add_argument("--for", dest="task", required=True)
    p.add_argument("--paths", nargs="*", default=[])
    p.add_argument("--budget", type=int, default=3000)
    p.add_argument("--json", action="store_true")
    o = sub.add_parser("owners")
    o.add_argument("--paths", nargs="+", required=True)
    s = sub.add_parser("stale")
    s.add_argument("--today", required=True)
    s.add_argument("--days", type=int, default=90)
    sub.add_parser("budget")
    a = ap.parse_args(argv)
    root = Path(a.root)
    if not root.is_dir():
        print(f"error: {root} is not a directory", file=sys.stderr)
        return 2
    if a.cmd == "pack":
        r = pack(root, a.task, a.paths, a.budget)
        if a.json:
            print(json.dumps(r, indent=2, sort_keys=True))
        else:
            _print_pack(r)
    elif a.cmd == "owners":
        rows = owners(root, a.paths)
        if not rows:
            print("no governing documents found")
        for r in rows:
            print(f"[{r['kind']}] {r['path']}  ({r['why']})\n    {r['decision']}")
    elif a.cmd == "stale":
        try:
            today = datetime.date.fromisoformat(a.today)
        except ValueError:
            print("error: --today must be YYYY-MM-DD", file=sys.stderr)
            return 2
        rows = stale(root, today, a.days)
        if not rows:
            print(f"no page verified more than {a.days} days ago")
        for path, d, age in rows:
            print(f"{path}  last verified {d} ({age} days)")
    else:
        for label, t in budget_report(root):
            print(f"{t:>8}  {label}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
