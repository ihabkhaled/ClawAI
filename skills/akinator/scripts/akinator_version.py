#!/usr/bin/env python3
# Vendored from the owner's akinator-ai plugin (MIT, see ../LICENSE). Edits are allowed in
# this repository; list every divergence in ../SKILL.md "Divergences from upstream".
"""Version discipline: every shipped change bumps the version, everywhere at once.

    akinator_version.py [--root .] show
    akinator_version.py [--root .] check [--base REF]
    akinator_version.py [--root .] next  [--base REF]
    akinator_version.py [--root .] bump major|minor|patch --date YYYY-MM-DD
    akinator_version.py [--root .] set X.Y.Z

Manifests (whichever exist): the Claude Code plugin manifest and marketplace
entry, the Codex plugin manifest, package.json, pyproject.toml, VERSION.

`check` exits 1 when the manifests disagree. With `--base REF` it also exits 1
when a shipped path changed since REF but the version is not strictly greater
than it was at REF, or the changelog has no heading for the current version.
Shipped globs default to the plugin's runtime surface and can be overridden in
`.ai/config.json` under `version.shipped`.

`bump` rewrites only the version strings, preserving formatting and line
endings, and inserts a changelog skeleton when the heading is absent. It takes
its date from `--date` and refuses without it: this tool reads no clock.

Exit codes: 0 ok, 1 findings, 2 usage error or unknown ref. Stdlib only.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

MANIFESTS = (
    (".claude-plugin/plugin.json", "json"),
    (".claude-plugin/marketplace.json", "json"),
    (".codex-plugin/plugin.json", "json"),
    ("package.json", "json"),
    ("pyproject.toml", "toml"),
    ("VERSION", "plain"),
)

DEFAULT_SHIPPED = (
    "skills/**", "agents/**", "hooks/**", "install.sh", "install.ps1",
    "templates/**", ".claude-plugin/**", ".codex-plugin/**", ".agents/**",
)

SEMVER = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$")
JSON_VERSION = re.compile(r'"version"\s*:\s*"([^"]*)"')
TOML_VERSION = re.compile(r'^(version\s*=\s*")([^"]*)(")', re.MULTILINE)


class UsageError(Exception):
    pass


# --- semver ------------------------------------------------------------------

def parse_semver(text: str) -> tuple:
    match = SEMVER.match(text.strip())
    if not match:
        raise UsageError(f"not a semantic version: {text!r}")
    major, minor, patch, pre = match.groups()
    # A release outranks its own prerelease, so the prerelease sorts lower.
    return (int(major), int(minor), int(patch), 1 if pre is None else 0, pre or "")


def bump_version(current: str, level: str) -> str:
    major, minor, patch = parse_semver(current)[:3]
    if level == "major":
        return f"{major + 1}.0.0"
    if level == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


# --- reading manifests ---------------------------------------------------------

def read_version(kind: str, text: str) -> str | None:
    """The version a manifest's text declares, or None when it declares none."""
    if kind == "plain":
        value = text.strip()
        return value or None
    if kind == "toml":
        match = TOML_VERSION.search(text)
        return match.group(2) if match else None
    try:
        data = json.loads(text)
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    if isinstance(data.get("version"), str):
        return data["version"]
    for plugin in data.get("plugins") or []:
        if isinstance(plugin, dict) and isinstance(plugin.get("version"), str):
            return plugin["version"]
    return None


def manifests(root: Path) -> list[tuple[str, str, str | None]]:
    found = []
    for rel, kind in MANIFESTS:
        path = root / rel
        if path.is_file():
            found.append((rel, kind, read_version(kind, path.read_text("utf-8"))))
    return found


def current_version(root: Path) -> tuple[str | None, list[tuple[str, str, str | None]]]:
    found = manifests(root)
    values = {v for _, _, v in found if v}
    return (values.pop() if len(values) == 1 else None), found


# --- git -----------------------------------------------------------------------

def git(root: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=False
    )
    if proc.returncode != 0:
        raise UsageError(proc.stderr.strip() or f"git {' '.join(args)} failed")
    return proc.stdout


def require_ref(root: Path, ref: str) -> None:
    try:
        git(root, "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}")
    except UsageError:
        raise UsageError(f"unknown ref: {ref}") from None


def changed(root: Path, ref: str) -> list[tuple[str, str, str | None]]:
    """(status, path, old_path) for every change since ref, working tree included."""
    out = git(root, "diff", "--name-status", "-M", ref)
    rows: list[tuple[str, str, str | None]] = []
    for line in out.splitlines():
        parts = line.split("\t")
        status = parts[0][0]
        if status == "R" and len(parts) >= 3:
            rows.append(("R", parts[2], parts[1]))
        elif len(parts) >= 2:
            rows.append((status, parts[-1], None))
    seen = {path for _, path, _ in rows}
    for path in git(root, "ls-files", "--others", "--exclude-standard").splitlines():
        if path and path not in seen:
            rows.append(("A", path, None))
    return rows


def base_version(root: Path, ref: str) -> str | None:
    values = set()
    for rel, kind in MANIFESTS:
        try:
            text = git(root, "show", f"{ref}:{rel}")
        except UsageError:
            continue
        value = read_version(kind, text)
        if value:
            values.add(value)
    return max(values, key=parse_semver) if values else None


# --- shipped paths -------------------------------------------------------------

def glob_to_regex(glob: str) -> re.Pattern:
    out = []
    i = 0
    while i < len(glob):
        if glob.startswith("**", i):
            out.append(".*")
            i += 2
        elif glob[i] == "*":
            out.append("[^/]*")
            i += 1
        else:
            out.append(re.escape(glob[i]))
            i += 1
    return re.compile("^" + "".join(out) + "$")


def shipped_globs(root: Path) -> list[str]:
    config = root / ".ai" / "config.json"
    if config.is_file():
        try:
            data = json.loads(config.read_text("utf-8"))
            custom = (data.get("version") or {}).get("shipped")
            if isinstance(custom, list) and custom:
                return [str(item) for item in custom]
        except (ValueError, AttributeError):
            pass
    return list(DEFAULT_SHIPPED)


def is_shipped(path: str, patterns: list[re.Pattern]) -> bool:
    return any(p.match(path) for p in patterns)


# --- classification ------------------------------------------------------------

ENTRY_POINTS = re.compile(
    r"^(skills/[^/]+/SKILL\.md|hooks/hooks\.json|install\.sh|install\.ps1"
    r"|skills/[^/]+/scripts/[^/]+\.py|hooks/[^/]+\.sh)$"
)
REMOVAL_IS_MAJOR = re.compile(r"^(skills/[^/]+/SKILL\.md|hooks/hooks\.json|install\.sh|install\.ps1)$")
NEW_SURFACE = re.compile(
    r"^(skills/[^/]+/scripts/[^/]+|skills/[^/]+/references/[^/]+|rules/\d[^/]*\.md"
    r"|hooks/[^/]+|agents/[^/]+|templates/[^/]+\.md)$"
)


def classify(rows: list[tuple[str, str, str | None]], patterns: list[re.Pattern]) -> tuple[str, list[str]]:
    level = "none"
    order = {"none": 0, "patch": 1, "minor": 2, "major": 3}
    why: list[str] = []

    def raise_to(new: str, reason: str) -> None:
        nonlocal level
        why.append(f"{new}: {reason}")
        if order[new] > order[level]:
            level = new

    for status, path, old in rows:
        if status == "R" and old and ENTRY_POINTS.match(old):
            raise_to("major", f"renamed public entry point {old} -> {path}")
        elif status == "D" and REMOVAL_IS_MAJOR.match(path):
            raise_to("major", f"removed public entry point {path}")
        elif status in "AD" and NEW_SURFACE.match(path):
            verb = "new" if status == "A" else "removed"
            raise_to("minor", f"{verb} {path}")
        elif is_shipped(path, patterns) or (old and is_shipped(old, patterns)):
            raise_to("patch", f"changed {path}")
    return level, why


# --- changelog -----------------------------------------------------------------

def changelog_has(root: Path, version: str) -> bool:
    path = root / "CHANGELOG.md"
    if not path.is_file():
        return False
    pattern = re.compile(r"^## \[" + re.escape(version) + r"\]", re.MULTILINE)
    return bool(pattern.search(path.read_text("utf-8")))


def insert_changelog(root: Path, version: str, date: str) -> bool:
    """Insert a skeleton heading unless one exists. Returns True if it wrote."""
    path = root / "CHANGELOG.md"
    if not path.is_file() or changelog_has(root, version):
        return False
    raw = path.read_bytes().decode("utf-8")
    nl = "\r\n" if "\r\n" in raw else "\n"
    skeleton = nl.join([
        f"## [{version}] - {date}",
        "",
        "Summarize the change in one paragraph, then list it below.",
        "",
        "### Added",
        "",
        "### Changed",
        "",
        "### Fixed",
        "",
        "",
    ])
    match = re.search(r"^## \[", raw, re.MULTILINE)
    if match:
        raw = raw[: match.start()] + skeleton + raw[match.start():]
    else:
        raw = raw.rstrip("\r\n") + nl + nl + skeleton
    path.write_bytes(raw.encode("utf-8"))
    return True


# --- writing -------------------------------------------------------------------

def write_version(root: Path, rel: str, kind: str, old: str, new: str) -> None:
    path = root / rel
    raw = path.read_bytes().decode("utf-8")
    if kind == "plain":
        body = raw.rstrip("\r\n")
        raw = new + raw[len(body):]
    elif kind == "toml":
        raw = TOML_VERSION.sub(lambda m: m.group(1) + new + m.group(3), raw, count=1)
    else:
        def swap(match: re.Match) -> str:
            return match.group(0).replace(f'"{old}"', f'"{new}"') if match.group(1) == old else match.group(0)
        raw = JSON_VERSION.sub(swap, raw)
    path.write_bytes(raw.encode("utf-8"))


def apply_version(root: Path, new: str) -> None:
    for rel, kind, old in manifests(root):
        if old and old != new:
            write_version(root, rel, kind, old, new)


# --- commands ------------------------------------------------------------------

def cmd_show(root: Path, args: argparse.Namespace) -> int:
    found = manifests(root)
    if not found:
        print("no version manifests found")
        return 1
    for rel, _, version in found:
        print(f"{rel}  {version or '(none)'}")
    return 0


def cmd_check(root: Path, args: argparse.Namespace) -> int:
    version, found = current_version(root)
    problems: list[str] = []
    values = {v for _, _, v in found if v}
    if not found:
        problems.append("no version manifests found")
    elif len(values) != 1:
        listing = ", ".join(f"{rel}={v or 'none'}" for rel, _, v in found)
        problems.append(f"manifests disagree: {listing}")
    if args.base and not problems:
        require_ref(root, args.base)
        patterns = [glob_to_regex(g) for g in shipped_globs(root)]
        rows = changed(root, args.base)
        touched = [p for _, p, o in rows if is_shipped(p, patterns) or (o and is_shipped(o, patterns))]
        old = base_version(root, args.base)
        if touched:
            if old is not None and parse_semver(version) <= parse_semver(old):
                problems.append(
                    f"{len(touched)} shipped path(s) changed since {args.base} "
                    f"(first: {touched[0]}) but the version is {version}, not greater than {old}"
                )
            if not changelog_has(root, version):
                problems.append(f"the changelog has no '## [{version}]' heading")
    if problems:
        for problem in problems:
            print(f"FAIL {problem}")
        return 1
    print(f"ok version {version}")
    return 0


def cmd_next(root: Path, args: argparse.Namespace) -> int:
    version, _ = current_version(root)
    if version is None:
        print("FAIL manifests disagree or are missing; run `check`")
        return 1
    base = args.base or "HEAD"
    require_ref(root, base)
    patterns = [glob_to_regex(g) for g in shipped_globs(root)]
    level, why = classify(changed(root, base), patterns)
    if level == "none":
        print(f"none: no shipped path changed since {base}; stay at {version}")
        return 0
    print(f"{level}: {version} -> {bump_version(version, level)}")
    for reason in why:
        print(f"  {reason}")
    return 0


def cmd_bump(root: Path, args: argparse.Namespace) -> int:
    if not args.date or not re.match(r"^\d{4}-\d{2}-\d{2}$", args.date):
        raise UsageError("bump needs --date YYYY-MM-DD (this tool reads no clock)")
    version, found = current_version(root)
    if version is None:
        print("FAIL manifests disagree or are missing; run `check` and `set` first")
        return 1
    new = bump_version(version, args.level)
    apply_version(root, new)
    insert_changelog(root, new, args.date)
    print(new)
    return 0


def cmd_set(root: Path, args: argparse.Namespace) -> int:
    parse_semver(args.version)
    if not manifests(root):
        print("FAIL no version manifests found")
        return 1
    apply_version(root, args.version)
    print(args.version)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Version discipline for shipped changes.")
    parser.add_argument("--root", default=".")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("show")
    for name in ("check", "next"):
        p = sub.add_parser(name)
        p.add_argument("--base", default=None)
    p = sub.add_parser("bump")
    p.add_argument("level", choices=["major", "minor", "patch"])
    p.add_argument("--date", default=None)
    p = sub.add_parser("set")
    p.add_argument("version")
    try:
        args = parser.parse_args(argv)
    except SystemExit as exc:
        return 2 if exc.code else 0
    root = Path(args.root).resolve()
    handlers = {"show": cmd_show, "check": cmd_check, "next": cmd_next, "bump": cmd_bump, "set": cmd_set}
    try:
        return handlers[args.command](root, args)
    except UsageError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
