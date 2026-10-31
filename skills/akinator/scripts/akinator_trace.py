#!/usr/bin/env python3
# Vendored from the owner's akinator-ai plugin (MIT, see ../LICENSE). Edits are allowed in
# this repository; list every divergence in ../SKILL.md "Divergences from upstream".
"""Every changed path is traced - no change lands without its knowledge.

A diff that touches `src/billing.py` and nothing that explains it is a change
the next reader has to reverse-engineer. This tool reads the diff and answers
one question per path: where is this written down?

It never judges whether prose is good - only whether the change is accounted
for. A path is **accounted for** when any one of these holds:

1. It is itself a knowledge artifact or a generated file: documentation, rules,
   memory, context, the `.ai/` folder, the wiki, routers, README, CHANGELOG,
   templates, the generated portable pack.
2. It is named inside a **change record that is part of the same diff** - by
   its exact repo-relative path, by its parent directory with a trailing slash,
   or by a glob on a line of its own. A record that already existed before the
   change explains nothing about it, which is why the record must be in the
   diff. Records are `docs/changes/*.md`, `CHANGELOG.md`, and ledger records
   under `.ai/ledger/`.
3. A change record in the diff states, on one line, exactly

       knowledge delta: none, because <reason of at least 10 characters>

   and lists the path in the `- path` bullets directly under that line. The
   line covers only what it lists; an unlisted path is not covered, and a
   reason shorter than 10 characters covers nothing.

Optional `.ai/config.json`: `{"trace": {"ignore": ["vendor/**", "*.lock"]}}`
exempts matching paths (glob, `*` crosses `/`).

This is never wired into a git hook (rules/05); run it in CI or at the end of
a batch. Deterministic: sorted output, no clock, no absolute paths. Standard
library only, Windows and Linux.

Usage (from the repository root; `<skill>` is this skill's own folder):
    python <skill>/scripts/akinator_trace.py plan   [--base REF] [--json]
    python <skill>/scripts/akinator_trace.py check  [--base REF] [--json]
    python <skill>/scripts/akinator_trace.py record --title T [--base REF] [--date D]
    python <skill>/scripts/akinator_trace.py --root path/to/repo check

Without --base the changed set is the working tree (`git status`, untracked
files included). With --base it is `git diff REF...HEAD`.

Exit codes:
    0  success (`check`: every changed path accounted for, or nothing changed)
    1  `check` found unaccounted paths
    2  the tool could not run (not a git repo, bad ref, record already exists)
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import re
import subprocess
import sys
from pathlib import Path

NONE_BECAUSE = re.compile(
    r"^\s*(?:[-*]\s+)?knowledge delta:\s*none,\s*because\s+(?P<reason>.*?)\s*$",
    re.IGNORECASE,
)
MIN_REASON = 10
BULLET = re.compile(r"^\s*[-*]\s+(?P<item>.+?)\s*$")
TOKEN = re.compile(r"[A-Za-z0-9_./*\-\[\]@+~]+")

KNOWLEDGE_PREFIXES = (
    "docs/", "rules/", "memory/", "context/", ".ai/", ".agents/",
    "templates/", ".cursor/",
)
KNOWLEDGE_NAMES = {
    "readme.md", "changelog.md", "claude.md", "agents.md", "codex.md",
    "gemini.md", ".cursorrules", ".windsurfrules", "copilot-instructions.md",
    "conventions.md", "contributing.md",
}

MANIFESTS = {
    "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "pyproject.toml", "poetry.lock", "uv.lock", "pipfile", "pipfile.lock",
    "setup.py", "setup.cfg", "go.mod", "go.sum", "cargo.toml", "cargo.lock",
    "gemfile", "gemfile.lock", "composer.json", "composer.lock", "pom.xml",
    "build.gradle", "build.gradle.kts", "packages.config", "bun.lockb",
}
SOURCE_EXT = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".go", ".rs", ".java",
    ".kt", ".cs", ".rb", ".php", ".c", ".h", ".cpp", ".hpp", ".swift", ".vue",
    ".svelte", ".sh", ".ps1", ".css", ".scss", ".html",
}
SRC = ["change record", "docs/wiki/architecture or docs/wiki/product"]


def classify(path: str) -> list[str]:
    """The knowledge homes a changed path implicates (first matching row wins)."""
    low = path.lower()
    name = low.rsplit("/", 1)[-1]
    parts = low.split("/")
    ext = "." + name.rsplit(".", 1)[-1] if "." in name else ""
    if low.startswith("rules/"):
        return ["rules/README.md index"]
    if low.startswith("docs/"):
        return ["docs index"]
    if low.startswith("skills/") or low.startswith("agents/"):
        return ["docs/skills.md"]
    if (
        "migrations" in parts or "migration" in parts or "prisma" in parts
        or ext in (".sql", ".prisma") or "schema" in name
    ):
        return ["docs/wiki/architecture", "docs/wiki/infra", "docs/wiki/data"]
    if name in MANIFESTS or (name.startswith("requirements") and ext == ".txt"):
        return ["docs/wiki/libraries", "docs/wiki/stack"]
    if (
        name == "dockerfile" or name.startswith("dockerfile.")
        or name.startswith("docker-compose") or name.startswith("compose.")
        or low.startswith(".github/workflows/") or low.startswith(".gitlab-ci")
        or ext in (".tf", ".tfvars") or "terraform" in parts
        or "k8s" in parts or "kubernetes" in parts or "helm" in parts
    ):
        return ["docs/wiki/infra"]
    if (
        "tests" in parts or "test" in parts or "__tests__" in parts
        or name.startswith("test_") or ".test." in name or ".spec." in name
        or name.endswith("_test.go")
    ):
        return ["docs/wiki/testing"]
    if name.startswith(".env") or "config" in parts or "config" in name:
        return ["docs/wiki/infra", "docs/wiki/security"]
    if ext in SOURCE_EXT:
        return list(SRC)
    return ["change record"]


def is_knowledge(path: str) -> bool:
    low = path.lower()
    return low.startswith(KNOWLEDGE_PREFIXES) or low.rsplit("/", 1)[-1] in KNOWLEDGE_NAMES


def is_change_record(path: str) -> bool:
    low = path.lower()
    if low == "changelog.md":
        return True
    if low.startswith("docs/changes/") and low.endswith(".md"):
        return True
    return low.startswith(".ai/ledger/") and low.endswith(".md")


class TraceError(Exception):
    """The tool could not run - becomes exit code 2."""


def _git(root: Path, *args: str) -> bytes:
    try:
        proc = subprocess.run(
            ["git", *args], cwd=root, capture_output=True, check=False,
        )
    except OSError as exc:
        raise TraceError(f"git is not available: {exc}") from exc
    if proc.returncode != 0:
        msg = proc.stderr.decode("utf-8", "replace").strip()
        raise TraceError(f"git {' '.join(args[:2])} failed: {msg}")
    return proc.stdout


def changed_paths(root: Path, base: str | None) -> list[tuple[str, str]]:
    """Sorted (status, path) pairs. Status is a single letter, `D` = deleted."""
    if not root.is_dir():
        raise TraceError(f"not a directory: {root}")
    try:
        _git(root, "rev-parse", "--git-dir")
    except TraceError as exc:
        raise TraceError(f"not a git repository: {root} ({exc})") from exc
    out: dict[str, str] = {}
    if base:
        try:
            _git(root, "rev-parse", "--verify", "--quiet", f"{base}^{{commit}}")
        except TraceError as exc:
            raise TraceError(f"bad base ref: {base}") from exc
        raw = _git(root, "diff", "--name-status", "-z", f"{base}...HEAD")
        fields = raw.decode("utf-8", "replace").split("\0")
        i = 0
        while i < len(fields) and fields[i]:
            status = fields[i][0]
            if status in "RC":
                out[fields[i + 2]] = "A"
                if status == "R":
                    out[fields[i + 1]] = "D"
                i += 3
            else:
                out[fields[i + 1]] = status
                i += 2
    else:
        raw = _git(root, "status", "--porcelain", "-z", "-uall")
        fields = raw.decode("utf-8", "replace").split("\0")
        i = 0
        while i < len(fields) and fields[i]:
            code, path = fields[i][:2], fields[i][3:]
            letter = "D" if "D" in code else "A" if code.strip() in ("??", "A") else "M"
            if "R" in code:
                i += 1
                out[fields[i]] = "D"
                letter = "A"
            out[path] = letter
            i += 1
    return sorted((s, p) for p, s in out.items())


def load_ignores(root: Path) -> list[str]:
    cfg = root / ".ai" / "config.json"
    if not cfg.is_file():
        return []
    try:
        data = json.loads(cfg.read_text(encoding="utf-8"))
        globs = data.get("trace", {}).get("ignore", [])
    except (ValueError, AttributeError):
        return []
    return [g for g in globs if isinstance(g, str)]


def _norm(token: str) -> str:
    token = token.strip().strip("`'\"").rstrip(".,:;)")
    return token[2:] if token.startswith("./") else token


def _matches(item: str, path: str) -> bool:
    if not item:
        return False
    if item == path:
        return True
    if "*" in item:
        return fnmatch.fnmatchcase(path, item)
    return item.endswith("/") and path.startswith(item)


def _mentions(text: str, path: str) -> bool:
    return any(_matches(_norm(t), path) for t in TOKEN.findall(text))


def _records(root: Path, changed: list[tuple[str, str]]) -> list[tuple[str, str]]:
    out = []
    for status, path in changed:
        if status != "D" and is_change_record(path) and (root / path).is_file():
            out.append((path, (root / path).read_text(encoding="utf-8", errors="replace")))
    return out


def _none_blocks(text: str) -> tuple[list[str], str]:
    """Split a record into (items covered by valid none-because lines, the rest).

    The bullets under any `knowledge delta: none, because` line are not
    mentions: a short-reason line must not cover its bullets by the back door.
    """
    items: list[str] = []
    rest: list[str] = []
    lines = text.splitlines()
    skip: set[int] = set()
    for idx, line in enumerate(lines):
        m = NONE_BECAUSE.match(line)
        if not m:
            continue
        skip.add(idx)
        valid = len(m.group("reason")) >= MIN_REASON
        j = idx + 1
        while j < len(lines) and not lines[j].strip():
            j += 1
        while j < len(lines):
            b = BULLET.match(lines[j])
            if not b or NONE_BECAUSE.match(lines[j]):
                break
            skip.add(j)
            if valid:
                items.append(_norm(b.group("item")))
            j += 1
    rest = [ln for k, ln in enumerate(lines) if k not in skip]
    return items, "\n".join(rest)


def check_paths(root: Path, changed: list[tuple[str, str]]) -> list[dict]:
    """Every unaccounted path with the homes it implicates."""
    ignores = load_ignores(root)
    records = _records(root, changed)
    covered: list[str] = []
    scrubbed: list[str] = []
    for _, text in records:
        items, rest = _none_blocks(text)
        covered.extend(items)
        scrubbed.append(rest)
    unaccounted = []
    for _, path in changed:
        if is_knowledge(path) or any(fnmatch.fnmatchcase(path, g) for g in ignores):
            continue
        if any(_mentions(text, path) for text in scrubbed):
            continue
        if any(_matches(c, path) for c in covered):
            continue
        unaccounted.append({"path": path, "homes": classify(path)})
    return unaccounted


def _plan_rows(changed: list[tuple[str, str]]) -> list[dict]:
    return [
        {"path": p, "status": s, "homes": classify(p), "knowledge": is_knowledge(p)}
        for s, p in changed
    ]


def cmd_plan(root: Path, args: argparse.Namespace) -> int:
    rows = _plan_rows(changed_paths(root, args.base))
    if args.json:
        print(json.dumps({"changed": rows}, indent=2, sort_keys=True))
        return 0
    if not rows:
        print("No changed paths.")
    for r in rows:
        tag = " (knowledge artifact)" if r["knowledge"] else ""
        print(f"{r['status']} {r['path']}{tag}\n    -> {'; '.join(r['homes'])}")
    return 0


def cmd_check(root: Path, args: argparse.Namespace) -> int:
    changed = changed_paths(root, args.base)
    bad = check_paths(root, changed)
    if args.json:
        print(json.dumps({"changed": len(changed), "unaccounted": bad}, indent=2, sort_keys=True))
    elif not bad:
        print(f"OK - {len(changed)} changed path(s), all accounted for.")
    else:
        print(f"{len(bad)} changed path(s) not traced to any change record:")
        for b in bad:
            print(f"  {b['path']}\n    home: {'; '.join(b['homes'])}")
        print(
            "Name each path (or its directory/glob) in a docs/changes/ record in "
            "this diff, or list it under a line `knowledge delta: none, because "
            "<reason>`."
        )
    return 1 if bad else 0


def _slug(title: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return s or "change"


def cmd_record(root: Path, args: argparse.Namespace) -> int:
    changed = changed_paths(root, args.base)
    name = f"{args.date}-{_slug(args.title)}" if args.date else _slug(args.title)
    target = root / "docs" / "changes" / f"{name}.md"
    if target.exists():
        raise TraceError(f"refusing to overwrite existing record: docs/changes/{name}.md")
    files = "\n".join(f"- `{p}` ({s})" for s, p in changed) or "- none"
    tpl = root / "templates" / "change-record.md"
    if tpl.is_file():
        body = tpl.read_text(encoding="utf-8")
        body = re.sub(r"^# .*$", lambda _m: f"# Change - {args.title}", body, count=1, flags=re.M)
        if args.date:
            body = re.sub(
                r"^(- \*\*When:\*\*).*$", lambda m: f"{m.group(1)} {args.date}",
                body, count=1, flags=re.M,
            )
        body = body.replace("## Before", f"## Files\n\n{files}\n\n## Before", 1)
    else:
        gap = "_Unknown - ask the owner and record the answer._"
        body = (
            f"# Change - {args.title}\n\n## Files\n\n{files}\n\n"
            f"## Before\n\n{gap}\n\n## Change\n\n{gap}\n\n"
            f"## Now\n\n{gap}\n\n## Why\n\n{gap}\n"
        )
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body, encoding="utf-8", newline="\n")
    print(f"Wrote docs/changes/{name}.md")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Trace every changed path to its knowledge home.")
    parser.add_argument("--root", default=".", help="repository root (default: .)")
    sub = parser.add_subparsers(dest="cmd", required=True)
    for name in ("plan", "check", "record"):
        p = sub.add_parser(name)
        p.add_argument("--base", default=None, help="compare REF...HEAD instead of the working tree")
        if name == "record":
            p.add_argument("--title", required=True)
            p.add_argument("--date", default=None)
        else:
            p.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    root = Path(args.root)
    try:
        return {"plan": cmd_plan, "check": cmd_check, "record": cmd_record}[args.cmd](root, args)
    except TraceError as exc:
        print(f"akinator_trace: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
