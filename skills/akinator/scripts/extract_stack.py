#!/usr/bin/env python3
# Vendored from the owner's akinator-ai plugin (MIT, see ../LICENSE). Edits are allowed in
# this repository; list every divergence in ../SKILL.md "Divergences from upstream".
"""Generate the stack map - dependencies and modules, extracted from the tree.

Stage 4 of the v2 pipeline, the part that replaces a document per library.

**Why there is no doc per library.** A page saying "we use axios for HTTP"
restates `package.json`. It fails the delete-the-derivable test in
`skills/everything/references/akinator-anti-gaming.md`, it rots the moment a version moves, and
at a hundred libraries it buries the handful of pages that carry real knowledge.

    value  ~=  rediscovery_cost  x  recurrence_probability  x  blast_radius

A library's identity scores near zero on the first factor - the library has
documentation. What scores high is **why this one over the alternative** and
**what it did to us at 3am**. Those are an ADR and a ledger failure record, not
a generated page.

So: **one generated map replaces N generated documents.** Facts about the tree
are extracted here; prose is spent only where a choice or a scar exists. The map
links to whichever ADR or failure record covers a dependency, so the reader lands
on the knowledge rather than on a restatement.

Stack-agnostic by construction: every manifest reader is a small function, and a
new ecosystem is a new reader rather than a new document convention.

Deterministic: sorted iteration, no clock, no absolute paths.

Usage:
    python skills/everything/scripts/extract_stack.py            # dry run
    python skills/everything/scripts/extract_stack.py --write    # write the map
    python skills/everything/scripts/extract_stack.py --check    # exit 1 if drifted
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tomllib
from pathlib import Path

GENERATOR = "skills/everything/scripts/extract_stack.py"
TARGET = "context/stack.md"

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build",
    ".next", "target", "vendor", ".pytest_cache", "evals",
}


# --------------------------------------------------------------------------
# Manifest readers - one per ecosystem, so a new stack is a new function
# --------------------------------------------------------------------------

def _read_package_json(path: Path) -> list[tuple[str, str, str]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except (json.JSONDecodeError, OSError):
        return []
    out: list[tuple[str, str, str]] = []
    for section, kind in (("dependencies", "runtime"),
                          ("devDependencies", "dev"),
                          ("peerDependencies", "peer")):
        for name, version in sorted((data.get(section) or {}).items()):
            out.append((name, str(version), kind))
    return out


def _read_pyproject(path: Path) -> list[tuple[str, str, str]]:
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8", errors="replace"))
    except (tomllib.TOMLDecodeError, OSError):
        return []
    out: list[tuple[str, str, str]] = []
    project = data.get("project") or {}
    for spec in project.get("dependencies") or []:
        name = re.split(r"[<>=!~\[ ]", str(spec), maxsplit=1)[0]
        out.append((name, str(spec)[len(name):].strip() or "*", "runtime"))
    for group, specs in (project.get("optional-dependencies") or {}).items():
        for spec in specs:
            name = re.split(r"[<>=!~\[ ]", str(spec), maxsplit=1)[0]
            out.append((name, str(spec)[len(name):].strip() or "*", group))
    return sorted(out)


def _read_requirements(path: Path) -> list[tuple[str, str, str]]:
    out: list[tuple[str, str, str]] = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.split("#", 1)[0].strip()
        if not line or line.startswith("-"):
            continue
        name = re.split(r"[<>=!~\[ ]", line, maxsplit=1)[0]
        out.append((name, line[len(name):].strip() or "*", "runtime"))
    return sorted(out)


def _read_cargo(path: Path) -> list[tuple[str, str, str]]:
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8", errors="replace"))
    except (tomllib.TOMLDecodeError, OSError):
        return []
    out: list[tuple[str, str, str]] = []
    for section, kind in (("dependencies", "runtime"),
                          ("dev-dependencies", "dev")):
        for name, spec in sorted((data.get(section) or {}).items()):
            version = spec if isinstance(spec, str) else spec.get("version", "*")
            out.append((name, str(version), kind))
    return out


def _read_gomod(path: Path) -> list[tuple[str, str, str]]:
    out: list[tuple[str, str, str]] = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        match = re.match(r"\s*([\w./-]+)\s+(v[\w.+-]+)", line)
        if match and not line.strip().startswith(("module", "go ", "//")):
            out.append((match.group(1), match.group(2), "runtime"))
    return sorted(set(out))


READERS = {
    "package.json": ("npm", _read_package_json),
    "pyproject.toml": ("python", _read_pyproject),
    "requirements.txt": ("python", _read_requirements),
    "Cargo.toml": ("rust", _read_cargo),
    "go.mod": ("go", _read_gomod),
}


def discover(repo: Path) -> dict[str, list[tuple[str, str, str, str]]]:
    """(ecosystem) -> [(name, version, kind, manifest)] across the whole tree."""
    found: dict[str, list[tuple[str, str, str, str]]] = {}
    for path in sorted(repo.rglob("*")):
        if not path.is_file() or path.name not in READERS:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        ecosystem, reader = READERS[path.name]
        rel = path.relative_to(repo).as_posix()
        for name, version, kind in reader(path):
            found.setdefault(ecosystem, []).append((name, version, kind, rel))
    return {k: sorted(set(v)) for k, v in sorted(found.items())}


# --------------------------------------------------------------------------
# Linking a dependency to the knowledge that is actually worth reading
# --------------------------------------------------------------------------

def knowledge_for(repo: Path, name: str) -> list[str]:
    """ADRs and failure records that mention this dependency by name.

    This is what makes the map worth more than `package.json`: the row does not
    describe the library, it points at the decision to use it and the scar it
    left.
    """
    out: list[str] = []
    token = re.compile(rf"(?<![\w-]){re.escape(name)}(?![\w-])", re.IGNORECASE)
    for directory in ("docs/adr", ".ai/ledger/failure", ".ai/ledger/decision"):
        base = repo / directory
        if not base.is_dir():
            continue
        for path in sorted(base.glob("*.md")):
            if path.name.lower() in ("readme.md", "index.md"):
                continue
            if token.search(path.read_text(encoding="utf-8", errors="replace")):
                out.append(path.relative_to(repo).as_posix())
    return out


def modules(repo: Path) -> list[tuple[str, str]]:
    """Directories that look like a module or service, and their manifest."""
    out: list[tuple[str, str]] = []
    for path in sorted(repo.rglob("*")):
        if not path.is_file() or path.name not in READERS:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        directory = path.parent
        if directory == repo:
            continue
        out.append((directory.relative_to(repo).as_posix(),
                    path.relative_to(repo).as_posix()))
    return sorted(set(out))


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------

def render(repo: Path) -> str:
    stacks = discover(repo)
    mods = modules(repo)

    lines = [
        "<!--",
        "GENERATED FILE - DO NOT EDIT BY HAND.",
        f"Generated by `{GENERATOR}`. Edit the extractor, then regenerate with:",
        f"    python {GENERATOR} --write",
        "-->",
        "",
        "# Stack map",
        "",
        "Every dependency and module this repository declares, extracted from its",
        "manifests.",
        "",
        "## Scope",
        "",
        "- **Covers:** what is depended on, at which version, declared where, and",
        "  which decision record or failure record mentions it.",
        "- **Does not cover:** what a library *is* or how to use it - the library",
        "  has documentation, and restating it here would fail the",
        "  delete-the-derivable test. What is worth writing is **why this one over",
        "  the alternative** (an ADR) and **what it did to us** (a failure record).",
        "  This map links to those.",
        "",
        "## Why one map instead of a document per library",
        "",
        "```",
        "value  ~=  rediscovery_cost  x  recurrence_probability  x  blast_radius",
        "```",
        "",
        "A library's identity scores near zero on the first factor. At a hundred",
        "libraries, a page each buries the handful that carry real knowledge - so",
        "the facts are generated here and the prose budget goes to decisions and",
        "scars.",
        "",
    ]

    if not stacks:
        lines += [
            "## Dependencies",
            "",
            "_No dependency manifest found. This repository declares none - its",
            "scripts and tests are standard-library only, which is itself a",
            "decision worth knowing._",
            "",
        ]
    else:
        for ecosystem, entries in stacks.items():
            lines += [f"## Dependencies - {ecosystem} ({len(entries)})", ""]
            lines += ["| Package | Version | Kind | Declared in | Knowledge |",
                      "|---|---|---|---|---|"]
            for name, version, kind, manifest in entries:
                links = knowledge_for(repo, name)
                knowledge = ", ".join(f"`{p}`" for p in links) if links else "-"
                lines.append(
                    f"| `{name}` | `{version}` | {kind} | `{manifest}` | {knowledge} |"
                )
            lines.append("")

    lines += [f"## Modules ({len(mods)})", ""]
    if mods:
        lines += ["| Module | Manifest |", "|---|---|"]
        lines += [f"| `{directory}` | `{manifest}` |" for directory, manifest in mods]
    else:
        lines.append("_No sub-module manifests - this is a single-tree repository._")
    lines.append("")

    lines += [
        "## Regenerate when",
        "",
        f"- Extractor: `{GENERATOR}`",
        f"- Regenerate with: `python {GENERATOR} --write`",
        f"- Drift check: `python {GENERATOR} --check` in CI.",
        "- Regenerate when: a dependency is added, removed or repinned, or a",
        "  module gains a manifest.",
        "",
        "## Related",
        "",
        "- Docs: `docs/adr/README.md` - why a dependency was chosen over its",
        "  alternatives",
        "- Docs: `docs/ledger.md` - what a dependency did to us",
        "- Skills: `akinator-contextify` - generated beats written",
        "",
    ]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="extract_stack")
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)

    repo = Path(args.root).resolve()
    if not repo.is_dir():
        print(f"not a directory: {repo}", file=sys.stderr)
        return 2

    desired = render(repo)
    target = repo / TARGET
    current = target.read_text(encoding="utf-8") if target.is_file() else None

    if args.write:
        if current == desired:
            print(f"{TARGET} already up to date")
            return 0
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(desired, encoding="utf-8", newline="\n")
        print(f"wrote {TARGET}")
        return 0

    if current == desired:
        print(f"{TARGET} matches the tree.")
        return 0

    print(f"{TARGET} is drifted." if current else f"{TARGET} is missing.")
    print(f"Fix with: python {GENERATOR} --write")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
