#!/usr/bin/env python3
# Vendored from the owner's akinator-ai plugin (MIT, see ../LICENSE). Edits are allowed in
# this repository; list every divergence in ../SKILL.md "Divergences from upstream".
"""Generate the library wiki - one page per declared dependency.

The stack map answers "what do we depend on". It cannot answer the questions an
agent actually gets stuck on: **why this library over the alternative**, **how
this codebase uses it**, **what it did to us**, and **what an upgrade will
break**. Those need a home per library, and a home is only useful if the facts
around it never rot.

So each page is split in two:

    # <library>
    <!-- akinator:generated:begin -->
      facts: ecosystem, versions, kind, declaring manifests, the files that
      import it, the decision and failure records that name it
    <!-- akinator:generated:end -->
    ## Why this library              <- curated, written once by a person
    ## How we use it                 <- curated
    ## Pitfalls and incidents        <- curated
    ## Upgrade and security notes    <- curated

The generated block is rewritten on every run. Everything outside it is
preserved byte for byte - the curated sections are created only when a page is
new, and each starts as the gap marker

    _Unknown - ask the owner and record the answer._

which is an honest gap, not filler: other tools count it and turn it into a
question for the owner. A page whose dependency disappears from every manifest
is never deleted (it may hold the only record of why the library was dropped);
its block says so and the index lists it as "no longer declared - review or
delete".

Usage detection is import-based and per ecosystem - Python `import`/`from`,
JavaScript/TypeScript `import ... from`, `require()` and `import()`, Go import
paths by prefix, Rust `use`/`extern crate`/`crate::path` - so `react` never
matches an import of `react-dom`. An ecosystem without a dedicated detector
falls back to a word-bounded match inside import/require/use lines. Source
files over 2 MB are skipped as generated bundles.

Travels into host repositories: run it from the host repository root.
Standard library only; deterministic (sorted, no clock, no absolute paths).

Usage:
    python <skill>/scripts/extract_libraries.py [root]            # dry run, exit 1 if anything would change
    python <skill>/scripts/extract_libraries.py [root] --write    # write pages and index
    python <skill>/scripts/extract_libraries.py [root] --check    # exit 1 on any drift
    python <skill>/scripts/extract_libraries.py [root] --dir docs/wiki/libraries

Exit codes:
    0  pages and index match the tree (or --write succeeded)
    1  drift detected (dry run or --check)
    2  the tool could not run, or a page has a broken generated block
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import extract_stack as es  # noqa: E402

DEFAULT_DIR = "docs/wiki/libraries"
INDEX_NAME = "README.md"
BEGIN = "<!-- akinator:generated:begin -->"
END = "<!-- akinator:generated:end -->"
GAP = "_Unknown - ask the owner and record the answer._"
REGENERATE = "python <skill>/scripts/extract_libraries.py --write"
CURATED_SECTIONS = (
    "Why this library",
    "How we use it",
    "Pitfalls and incidents",
    "Upgrade and security notes",
)
MAX_LISTED = 25
MAX_SOURCE_BYTES = 2_000_000
SKIP_DIRS = frozenset(es.SKIP_DIRS) | {".git"}

# Source extensions scanned for usage, and the ecosystem whose detector reads
# them. Extensions mapped to None only feed the fallback detector.
SOURCE_EXTENSIONS: dict[str, str | None] = {
    ".py": "python", ".pyi": "python",
    ".js": "npm", ".jsx": "npm", ".mjs": "npm", ".cjs": "npm",
    ".ts": "npm", ".tsx": "npm",
    ".go": "go",
    ".rs": "rust",
    ".java": None, ".kt": None, ".rb": None, ".php": None, ".cs": None,
    ".swift": None, ".scala": None,
}
DETECTED = frozenset(e for e in SOURCE_EXTENSIONS.values() if e)

# Distributions whose import name is not derivable from the distribution name.
# Heuristic, not exhaustive: a miss shows as "used in 0 files", never as a
# false hit.
PY_IMPORT_ALIASES: dict[str, tuple[str, ...]] = {
    "attrs": ("attr", "attrs"),
    "beautifulsoup4": ("bs4",),
    "grpcio": ("grpc",),
    "mysqlclient": ("mysqldb",),
    "opencv-python": ("cv2",),
    "opencv-python-headless": ("cv2",),
    "pillow": ("pil",),
    "protobuf": ("google.protobuf",),
    "psycopg2-binary": ("psycopg2",),
    "pycryptodome": ("crypto",),
    "pyjwt": ("jwt",),
    "pyserial": ("serial",),
    "pyyaml": ("yaml",),
    "pyzmq": ("zmq",),
    "scikit-learn": ("sklearn",),
    "setuptools": ("setuptools", "pkg_resources"),
}

PY_IMPORT = re.compile(r"^[ \t]*import[ \t]+([^\n#;]+)", re.MULTILINE)
PY_FROM = re.compile(r"^[ \t]*from[ \t]+([\w.]+)[ \t]+import\b", re.MULTILINE)
JS_SPECIFIER = re.compile(
    r"(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['\"])([^'\"\n]+)\1"
)
GO_BLOCK = re.compile(r"^[ \t]*import\s*\((.*?)\)", re.MULTILINE | re.DOTALL)
GO_SINGLE = re.compile(r"^[ \t]*import\s+(?:[\w.]+\s+)?\"([^\"]+)\"", re.MULTILINE)
GO_PATH = re.compile(r"\"([^\"]+)\"")
RS_CRATE = re.compile(
    r"^[ \t]*(?:#\[[^\]\n]*\][ \t]*)*extern[ \t]+crate[ \t]+(\w+)"
    r"|^[ \t]*(?:pub(?:\([^)\n]*\))?[ \t]+)?use[ \t]+(?:::)?(\w+)"
    r"|(?<![\w:])(\w+)::",
    re.MULTILINE,
)
IMPORT_LINE = re.compile(
    r"^[ \t]*(?:@?import|from|use|using|require(?:_once)?|include(?:_once)?|"
    r"extern[ \t]+crate)\b.*$|^.*\brequire[ \t]*\(.*$",
    re.MULTILINE,
)
H1 = re.compile(r"^#[ \t]+([^\r\n]+?)[ \t]*\r?$", re.MULTILINE)


# --------------------------------------------------------------------------
# Dependencies, grouped one per page
# --------------------------------------------------------------------------

@dataclass
class Library:
    ecosystem: str
    name: str
    declarations: list[tuple[str, str, str]] = field(default_factory=list)
    used_in: list[str] = field(default_factory=list)
    knowledge: list[str] = field(default_factory=list)

    @property
    def versions(self) -> list[str]:
        return sorted({v for v, _k, _m in self.declarations})

    @property
    def kinds(self) -> list[str]:
        return sorted({k for _v, k, _m in self.declarations})

    @property
    def manifests(self) -> list[str]:
        return sorted({m for _v, _k, m in self.declarations})


def _canonical(ecosystem: str, name: str) -> str:
    """Python distribution names compare PEP 503-normalized; others exactly."""
    if ecosystem == "python":
        return re.sub(r"[-_.]+", "-", name).lower()
    return name


def libraries(repo: Path) -> list[Library]:
    """Every declared dependency, one entry per (ecosystem, name)."""
    grouped: dict[tuple[str, str], Library] = {}
    for ecosystem, entries in es.discover(repo).items():
        for name, version, kind, manifest in entries:
            key = (ecosystem, _canonical(ecosystem, name))
            lib = grouped.get(key)
            if lib is None:
                lib = grouped[key] = Library(ecosystem, name)
            lib.name = min(lib.name, name)
            lib.declarations.append((version, kind, manifest))
    return [grouped[k] for k in sorted(grouped)]


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9._-]", "-", name.lower().replace("/", "-").replace("@", "-"))
    return slug.lstrip("-.") or "library"


def assign_slugs(libs: list[Library]) -> dict[tuple[str, str], str]:
    """A unique, filesystem-safe page name per library.

    The same name in two ecosystems takes the ecosystem as a suffix; two names
    in one ecosystem that slug alike (`@a/b` next to `a-b`) take a counter, and
    the name that already is its slug keeps the plain one. `readme` and `index`
    are reserved: on a case-insensitive filesystem they would overwrite the
    index.
    """
    base = {(l.ecosystem, l.name): slugify(l.name) for l in libs}
    ecosystems: dict[str, set[str]] = {}
    for (ecosystem, _name), slug in base.items():
        ecosystems.setdefault(slug, set()).add(ecosystem)
    out: dict[tuple[str, str], str] = {}
    taken: set[str] = set()
    order = sorted(base, key=lambda k: (base[k], base[k] != k[1].lower(), k))
    for key in order:
        slug = base[key]
        if len(ecosystems[slug]) > 1 or slug in ("readme", "index"):
            slug = f"{slug}-{key[0]}"
        candidate, n = slug, 2
        while candidate in taken:
            candidate, n = f"{slug}-{n}", n + 1
        taken.add(candidate)
        out[key] = candidate
    return out


# --------------------------------------------------------------------------
# Usage detection - one detector per ecosystem, a fallback for the rest
# --------------------------------------------------------------------------

def _python_modules(text: str) -> set[str]:
    out: set[str] = set()
    for clause in PY_IMPORT.findall(text):
        for part in clause.strip().strip("()").split(","):
            module = part.strip().split()[0] if part.strip() else ""
            if module:
                out.add(module.lower())
    for module in PY_FROM.findall(text):
        if not module.startswith("."):
            out.add(module.lower())
    return out


def _npm_packages(text: str) -> set[str]:
    out: set[str] = set()
    for _quote, spec in JS_SPECIFIER.findall(text):
        if spec.startswith((".", "/")) or ":" in spec:
            continue  # relative, absolute, node:, data:, http:
        parts = spec.split("/")
        out.add("/".join(parts[:2]) if spec.startswith("@") else parts[0])
    return out


def _go_imports(text: str) -> set[str]:
    out = set(GO_SINGLE.findall(text))
    for block in GO_BLOCK.findall(text):
        out.update(GO_PATH.findall(block))
    return out


def _rust_crates(text: str) -> set[str]:
    return {next(g for g in groups if g) for groups in RS_CRATE.findall(text)}


def _python_candidates(name: str) -> set[str]:
    lowered = name.lower()
    out = {lowered.replace("-", "_"), lowered.replace("-", ".")}
    if lowered.startswith("python-"):
        out.add(lowered[len("python-"):].replace("-", "_"))
    out.update(PY_IMPORT_ALIASES.get(_canonical("python", name), ()))
    return out


def _word(name: str) -> re.Pattern[str]:
    return re.compile(rf"(?<![\w-]){re.escape(name)}(?![\w-])", re.IGNORECASE)


@dataclass
class SourceIndex:
    """What every scanned source file imports, read once."""

    python: dict[str, set[str]] = field(default_factory=dict)
    npm: dict[str, set[str]] = field(default_factory=dict)
    go: dict[str, set[str]] = field(default_factory=dict)
    rust: dict[str, set[str]] = field(default_factory=dict)
    lines: dict[str, list[str]] = field(default_factory=dict)


def source_files(repo: Path) -> list[Path]:
    out: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(repo):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for name in sorted(filenames):
            if Path(name).suffix.lower() in SOURCE_EXTENSIONS:
                out.append(Path(dirpath) / name)
    return sorted(out)


def scan(repo: Path) -> SourceIndex:
    index = SourceIndex()
    readers = {"python": _python_modules, "npm": _npm_packages,
               "go": _go_imports, "rust": _rust_crates}
    for path in source_files(repo):
        try:
            if path.stat().st_size > MAX_SOURCE_BYTES:
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        rel = path.relative_to(repo).as_posix()
        ecosystem = SOURCE_EXTENSIONS[path.suffix.lower()]
        if ecosystem:
            getattr(index, ecosystem)[rel] = readers[ecosystem](text)
        index.lines[rel] = IMPORT_LINE.findall(text)
    return index


def usage(lib: Library, index: SourceIndex) -> list[str]:
    """Repo-relative files that import this library, sorted."""
    if lib.ecosystem == "python":
        candidates = _python_candidates(lib.name)
        hits = [rel for rel, mods in index.python.items()
                if any(m == c or m.startswith(c + ".") for m in mods for c in candidates)]
    elif lib.ecosystem == "npm":
        hits = [rel for rel, pkgs in index.npm.items() if lib.name in pkgs]
    elif lib.ecosystem == "go":
        hits = [rel for rel, paths in index.go.items()
                if any(p == lib.name or p.startswith(lib.name + "/") for p in paths)]
    elif lib.ecosystem == "rust":
        crate = lib.name.replace("-", "_")
        hits = [rel for rel, crates in index.rust.items() if crate in crates]
    else:
        patterns = [_word(lib.name), _word(lib.name.replace("-", "_"))]
        hits = [rel for rel, lines in index.lines.items()
                if any(p.search(line) for line in lines for p in patterns)]
    return sorted(set(hits))


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------

def _code(values: list[str]) -> str:
    return ", ".join(f"`{v}`" for v in values) if values else "-"


def render_block(lib: Library) -> str:
    lines = [
        BEGIN,
        "<!-- Facts extracted from the manifests and the source tree. This block",
        "     is rewritten on every run; write outside it. -->",
        f"- **Ecosystem:** {lib.ecosystem}",
    ]
    if len(lib.versions) == 1:
        lines.append(f"- **Version:** `{lib.versions[0]}`")
    else:
        lines.append("- **Versions:** " + ", ".join(
            f"`{v}` in `{m}`" for v, _k, m in sorted(
                lib.declarations, key=lambda d: (d[2], d[0], d[1]))
        ))
    lines += [
        f"- **Kind:** {', '.join(lib.kinds)}",
        f"- **Declared in:** {_code(lib.manifests)}",
    ]
    count = len(lib.used_in)
    if count == 0:
        lines.append("- **Used in:** 0 files - no import found. It may be a CLI, a "
                     "type package, a plugin loaded by configuration, or unused.")
    else:
        lines.append(f"- **Used in:** {count} file{'s' if count != 1 else ''}")
        lines += [f"  - `{p}`" for p in lib.used_in[:MAX_LISTED]]
        if count > MAX_LISTED:
            lines.append(f"  - ... and {count - MAX_LISTED} more")
    lines += [
        "- **Decisions and incidents:** "
        + (_code(lib.knowledge) if lib.knowledge else "none recorded"),
        f"- Regenerate with: `{REGENERATE}`",
        END,
    ]
    return "\n".join(lines)


def render_orphan_block() -> str:
    return "\n".join([
        BEGIN,
        "- **Status:** no longer declared in any manifest - review or delete this "
        "page. If the library was dropped on purpose, record why before deleting.",
        f"- Regenerate with: `{REGENERATE}`",
        END,
    ])


def render_new_page(title: str, block: str) -> str:
    parts = [f"# {title}", "", block, ""]
    for section in CURATED_SECTIONS:
        parts += [f"## {section}", "", GAP, ""]
    return "\n".join(parts)


def render_index_block(libs: list[Library], slugs: dict[tuple[str, str], str],
                       orphans: list[tuple[str, str]]) -> str:
    lines = [
        BEGIN,
        "<!-- Rewritten on every run; write outside this block. -->",
        "One page per declared dependency. Each page opens with generated facts -",
        "versions, manifests, the files that import it - followed by curated",
        "sections for why we chose it, how we use it, what it did to us and what an",
        "upgrade needs. A section still holding the gap marker is an open question",
        "for the owner - ask, then record the answer in place of the marker.",
        "",
    ]
    if libs:
        lines += [
            f"## Libraries ({len(libs)})",
            "",
            "| Library | Ecosystem | Version | Kind | Used in | Page |",
            "|---|---|---|---|---|---|",
        ]
        for lib in libs:
            slug = slugs[(lib.ecosystem, lib.name)]
            used = len(lib.used_in)
            lines.append(
                f"| {_escape(lib.name)} | {lib.ecosystem} | {_escape(_code(lib.versions))} | "
                f"{_escape(', '.join(lib.kinds))} | {used} file{'s' if used != 1 else ''} | "
                f"[{slug}.md]({slug}.md) |"
            )
    else:
        manifests = ", ".join(sorted(es.READERS))
        lines += [
            "## Libraries (0)",
            "",
            "_No dependency is declared in any manifest this tool reads "
            f"({manifests}). If that is complete, this repository is "
            "standard-library only - itself a fact worth knowing: a new "
            "dependency should arrive with the decision that chose it._",
        ]
    if orphans:
        lines += [
            "",
            f"## Pages without a declared dependency ({len(orphans)})",
            "",
        ]
        lines += [f"- [{_escape(title)}]({slug}.md) - no longer declared - review or delete"
                  for slug, title in orphans]
    lines += [
        "",
        f"Regenerate with: `{REGENERATE}` - when a dependency is added, removed",
        "or repinned, or when imports move.",
        END,
    ]
    return "\n".join(lines)


def _escape(text: str) -> str:
    return text.replace("|", "\\|")


# --------------------------------------------------------------------------
# Merging - only the generated block ever changes
# --------------------------------------------------------------------------

class BrokenBlock(Exception):
    """A begin marker with no end marker: the tool will not guess the boundary."""


def merge(existing: str | None, title: str, block: str,
          new_file: str | None = None) -> str:
    """The file with its generated block replaced, everything else untouched.

    A new file is `new_file` (or the title and block). An existing file with no
    markers gets the block inserted after its first H1 line, or at the top.
    """
    if existing is None:
        return new_file if new_file is not None else f"# {title}\n\n{block}\n"
    crlf = "\r\n" in existing
    if crlf:
        block = block.replace("\n", "\r\n")
    nl = "\r\n" if crlf else "\n"
    start = existing.find(BEGIN)
    if start != -1:
        stop = existing.find(END, start)
        if stop == -1:
            raise BrokenBlock(f"'{BEGIN}' has no matching '{END}'")
        return existing[:start] + block + existing[stop + len(END):]
    heading = H1.search(existing)
    if heading:
        eol = existing.find("\n", heading.start())
        at = len(existing) if eol == -1 else eol + 1
        head = existing[:at] if eol != -1 else existing + nl
        return head + nl + block + nl + existing[at:]
    return block + nl + nl + existing


def _same(current: str | None, desired: str) -> bool:
    return current is not None and current.replace("\r\n", "\n") == desired.replace("\r\n", "\n")


def _read(path: Path) -> str | None:
    if not path.is_file():
        return None
    return path.read_bytes().decode("utf-8", errors="replace")


def plan(repo: Path, directory: str = DEFAULT_DIR) -> tuple[dict[Path, str], list[str]]:
    """(path -> desired content for every file that should change, errors)."""
    libs = libraries(repo)
    index = scan(repo)
    for lib in libs:
        lib.used_in = usage(lib, index)
        lib.knowledge = es.knowledge_for(repo, lib.name)
    slugs = assign_slugs(libs)
    base = repo / directory

    wanted: dict[Path, tuple[str, str, str | None]] = {}
    for lib in libs:
        block = render_block(lib)
        wanted[base / f"{slugs[(lib.ecosystem, lib.name)]}.md"] = (
            lib.name, block, render_new_page(lib.name, block))

    orphans: list[tuple[str, str]] = []
    if base.is_dir():
        current = set(slugs.values())
        for page in sorted(base.glob("*.md")):
            if page.name.lower() == INDEX_NAME.lower() or page.stem in current:
                continue
            text = _read(page) or ""
            heading = H1.search(text)
            orphans.append((page.stem, heading.group(1) if heading else page.stem))
            if BEGIN in text:
                wanted[page] = (page.stem, render_orphan_block(), None)

    index_block = render_index_block(libs, slugs, orphans)
    wanted[base / INDEX_NAME] = ("Libraries", index_block,
                                 f"# Libraries\n\n{index_block}\n")

    changes: dict[Path, str] = {}
    errors: list[str] = []
    for path in sorted(wanted):
        title, block, new_file = wanted[path]
        current = _read(path)
        try:
            desired = merge(current, title, block, new_file)
        except BrokenBlock as exc:
            errors.append(f"{_rel(repo, path)}: {exc}")
            continue
        if not _same(current, desired):
            changes[path] = desired
    return changes, errors


def _rel(repo: Path, path: Path) -> str:
    try:
        return path.relative_to(repo).as_posix()
    except ValueError:
        return path.as_posix()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="extract_libraries")
    parser.add_argument("root", nargs="?", default=".")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    parser.add_argument("--dir", default=DEFAULT_DIR,
                        help=f"page directory, relative to root (default {DEFAULT_DIR})")
    args = parser.parse_args(argv)

    repo = Path(args.root).resolve()
    if not repo.is_dir():
        print(f"not a directory: {args.root}", file=sys.stderr)
        return 2

    changes, errors = plan(repo, args.dir)
    for error in errors:
        print(f"broken generated block - fix by hand: {error}", file=sys.stderr)

    if args.write:
        for path, content in sorted(changes.items()):
            existed = path.is_file()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content.encode("utf-8"))
            print(f"{'updated' if existed else 'created'} {_rel(repo, path)}")
        if not changes:
            print(f"{args.dir} already up to date")
        return 2 if errors else 0

    for path in sorted(changes):
        verb = "stale" if path.is_file() else "missing"
        print(f"{verb}: {_rel(repo, path)}")
    if not changes and not errors:
        print(f"{args.dir} matches the tree.")
        return 0
    if changes:
        print(f"Fix with: {REGENERATE}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
