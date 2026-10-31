#!/usr/bin/env python3
# Vendored from the owner's akinator-ai plugin (MIT, see ../LICENSE). Edits are allowed in
# this repository; list every divergence in ../SKILL.md "Divergences from upstream".
"""Sensitive data: know what must not be exposed, document it, never leak it.

Three commands, all cheap (one `git ls-files`, one pass, no network):

  register [--write|--check] [--page P]  the SENSITIVE DATA REGISTER, a generated
                                         block of NAMES and LOCATIONS, never values
  scan [--json]                          actual leaked secrets in tracked files;
                                         prints `path:line  kind  fingerprint`
  guard --stdin | guard FILE...          pre-check text about to be written into
                                         docs, ledger or memory

A fingerprint is the first four characters, an ellipsis and sha256[:8] - enough
to recognise a finding, never enough to use it.

Allow a known-safe finding with `.ai/config.json`:
  {"sensitive": {"allow": ["path-glob:kind"]}}
or put `akinator:allow-secret` on the line.

Exit codes: 0 clean / up to date, 1 findings or drift, 2 the tool could not run.
"""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import extract_libraries as el  # noqa: E402  (generated-block merge conventions)

BEGIN, END, GAP = el.BEGIN, el.END, el.GAP
DEFAULT_PAGE = "docs/wiki/security/sensitive-data.md"
REGENERATE = "python <skill>/scripts/akinator_sensitive.py register --write"
ALLOW_MARKER = "akinator:allow-secret"
MAX_BYTES = 512 * 1024
MAX_LISTED = 40
SKIP_DIRS = frozenset({".git", "node_modules", ".venv", "venv", "__pycache__", "dist",
                       "build", "target", ".next", ".tox", ".mypy_cache", ".pytest_cache",
                       "vendor", ".gradle", ".idea"})
SKIP_NAMES = frozenset({"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock",
                        "Cargo.lock", "Gemfile.lock", "composer.lock", "go.sum", "uv.lock",
                        "Pipfile.lock"})
SKIP_SUFFIXES = (".min.js", ".min.css", ".map", ".lock")

# --------------------------------------------------------------------------
# Detectors (data, so a new shape is one line plus one test)
# --------------------------------------------------------------------------

PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("private-key", re.compile(r"-----BEGIN (?:[A-Z]+ )*PRIVATE KEY(?: BLOCK)?-----")),
    ("aws-key-id", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("github-token", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})")),
    ("slack-token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}")),
    ("stripe-live-key", re.compile(r"\b[sr]k_live_[A-Za-z0-9]{16,}")),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}")),
    ("url-credentials",
     re.compile(r"\b[a-z][a-z0-9+.-]*://([^\s:/@\"'<>]+):([^\s:/@\"'<>]{4,})@[^\s\"'<>]+")),
)
ASSIGNED = re.compile(
    r"(?i)\b([A-Za-z0-9_.-]*(?:secret|token|passw(?:or)?d|api[_-]?key|private[_-]?key|credential)"
    r"[A-Za-z0-9_.-]*)[\"']?\s*[:=]\s*([\"']?)([^\s\"']{12,})\2")
PLACEHOLDER = re.compile(
    r"(?i)(?:example|changeme|change_me|placeholder|your[_-]|xxxx|<|>|\$|\{|\}|\(|\)|,|;|dummy|"
    r"sample|redacted|\*\*\*|password|username|localhost|todo|secret$)")

SECRET_FILE_NAMES = ("*.pem", "*.key", "*.p12", "*.pfx", "id_rsa", "id_dsa", "id_ecdsa",
                     "id_ed25519", "credentials.json", "service-account*.json",
                     "*.tfstate", "*.tfstate.backup", ".env", ".env.*")
ENV_TEMPLATE = re.compile(r"(?i)\.(?:example|sample|template|dist|defaults?)$")
ENV_NAME = re.compile(
    r"[A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|PRIVATE|DSN|"
    r"CONNECTION_STRING|AUTH)[A-Z0-9_]*")
ENV_CONTEXT = re.compile(
    r"(?:^|[\s\"'-])(?:export\s+)?([A-Z][A-Z0-9_]+)\s*[=:]"
    r"|secrets\.([A-Z][A-Z0-9_]+)|\$\{?([A-Z][A-Z0-9_]+)")

# term -> class. Matched as whole snake_case words of a field name.
FIELD_CLASSES: dict[str, str] = {}
for _cls, _terms in {
    "credential": ("password", "passwd", "password_hash", "pwd", "token", "secret", "api_key",
                   "apikey", "private_key", "access_token", "refresh_token", "otp", "pin"),
    "PII": ("email", "phone", "mobile", "ssn", "dob", "birthdate", "birth_date", "address",
            "passport", "ip_address", "first_name", "last_name", "full_name", "national_id",
            "tax_id", "license_number", "gender"),
    "financial": ("card", "card_number", "cvv", "cvc", "iban", "account_number",
                  "routing_number", "salary", "swift"),
    "health": ("diagnosis", "medical", "patient", "prescription", "blood_type", "allergy"),
}.items():
    for _t in _terms:
        FIELD_CLASSES[_t] = _cls
FIELD_DECL = re.compile(
    r"^\s*(?:(?:public|private|protected|readonly|final|var|val|let|const|string|int|String)\s+)*"
    r"[\"`']?([A-Za-z_]\w*)[\"`']?\s*(?::|=|\s+[A-Za-z\[(])")
SCHEMA_EXT = (".sql", ".prisma", ".graphql", ".gql", ".dbml")
CODE_EXT = (".py", ".ts", ".tsx", ".js", ".jsx", ".java", ".kt", ".cs", ".rb", ".go", ".php",
            ".rs", ".swift", ".scala")
SCHEMA_PATH = re.compile(
    r"(?i)(?:^|/)(?:models?|schemas?|migrations?|entit(?:y|ies)|dtos?)(?:/|\.|_)")
SCHEMA_MARKER = re.compile(
    r"@dataclass|BaseModel|models\.Model|\bColumn\(|@Entity|mongoose\.Schema|sqlalchemy|"
    r"CREATE TABLE")
LOG_CALL = re.compile(
    r"(?i)\b(?:logger|logging|log|console|slog|fmt)\s*\.\s*\w+\s*\(|\bprint(?:ln|f)?\s*\(|"
    r"\blog\w*\s*\(")

HANDLING = (
    ("credential", "never log, never commit, encrypt at rest, redact in ledger, rotate on exposure"),
    ("PII", "never log in clear, never commit real values, encrypt at rest, redact in ledger, "
            "delete on request"),
    ("financial", "never log, never commit, encrypt at rest, redact in ledger, tokenise where "
                  "possible"),
    ("health", "never log, never commit, encrypt at rest, redact in ledger, restrict access"),
)


def fingerprint(value: str) -> str:
    return f"{value[:4]}\u2026{hashlib.sha256(value.encode('utf-8')).hexdigest()[:8]}"


def entropy(value: str) -> float:
    return -sum(c / len(value) * math.log2(c / len(value))
                for c in (value.count(ch) for ch in set(value)))


def detect_line(line: str) -> list[tuple[str, str]]:
    """(kind, matched text) for every secret shape on one line."""
    if ALLOW_MARKER in line:
        return []
    found: list[tuple[str, str]] = []
    for kind, pattern in PATTERNS:
        for m in pattern.finditer(line):
            if kind == "url-credentials" and (
                    PLACEHOLDER.search(m.group(1)) or PLACEHOLDER.search(m.group(2))):
                continue
            found.append((kind, m.group(0)))
    for m in ASSIGNED.finditer(line):
        value = m.group(3)
        if (PLACEHOLDER.search(value) or not re.search(r"\d", value)
                or not re.search(r"[A-Za-z]", value) or entropy(value) < 3.2):
            continue
        if any(value in v or v in value for _, v in found):
            continue
        found.append(("high-entropy-assignment", value))
    return found


def detect_text(text: str) -> list[tuple[int, str, str]]:
    return [(n, kind, val) for n, line in enumerate(text.splitlines(), 1)
            for kind, val in detect_line(line)]


# --------------------------------------------------------------------------
# File discovery - one git call, os.walk only when there is no git
# --------------------------------------------------------------------------

class Tree:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.git = False
        self.tracked: set[str] = set()
        self.files: list[str] = []
        try:
            out = subprocess.run(
                ["git", "-C", str(root), "ls-files", "-z", "-t", "-c", "-o",
                 "--exclude-standard"],
                capture_output=True, check=True, timeout=60).stdout.decode("utf-8", "replace")
            self.git = True
            seen: set[str] = set()
            for entry in out.split("\0"):
                if len(entry) > 2:
                    path = entry[2:]
                    if entry[0] == "H":
                        self.tracked.add(path)
                    if path not in seen:
                        seen.add(path)
                        self.files.append(path)
        except (OSError, subprocess.SubprocessError):
            self.files = self.walk()
        self.files = [f for f in self.files if (root / f).is_file()]

    def walk(self, only: tuple[str, ...] = ()) -> list[str]:
        out: list[str] = []
        for base, dirs, names in os.walk(self.root):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for name in names:
                if only and not any(fnmatch.fnmatch(name, p) for p in only):
                    continue
                out.append(Path(base, name).relative_to(self.root).as_posix())
        return out

    def readable(self, rel: str) -> str | None:
        name = rel.rsplit("/", 1)[-1]
        if name in SKIP_NAMES or rel.endswith(SKIP_SUFFIXES):
            return None
        path = self.root / rel
        try:
            if path.stat().st_size > MAX_BYTES:
                return None
            data = path.read_bytes()
        except OSError:
            return None
        if b"\0" in data[:4096]:
            return None
        return data.decode("utf-8", errors="replace")


def is_secret_file(rel: str) -> bool:
    name = rel.rsplit("/", 1)[-1]
    if name.startswith(".env") and ENV_TEMPLATE.search(name):
        return False
    return any(fnmatch.fnmatch(name, p) for p in SECRET_FILE_NAMES)


# --------------------------------------------------------------------------
# scan / guard
# --------------------------------------------------------------------------

def allow_rules(root: Path) -> list[tuple[str, str]]:
    try:
        data = json.loads((root / ".ai" / "config.json").read_text(encoding="utf-8"))
        rules = data.get("sensitive", {}).get("allow", [])
    except (OSError, ValueError, AttributeError):
        return []
    out = []
    for rule in rules if isinstance(rules, list) else []:
        if isinstance(rule, str) and ":" in rule:
            glob, kind = rule.rsplit(":", 1)
            out.append((glob, kind))
    return out


def scan(root: Path) -> list[dict[str, object]]:
    tree = Tree(root)
    allow = allow_rules(root)
    hits: list[dict[str, object]] = []
    for rel in tree.files:
        text = tree.readable(rel)
        if text is None:
            continue
        for line_no, kind, value in detect_text(text):
            if any(fnmatch.fnmatch(rel, g) and k in (kind, "*") for g, k in allow):
                continue
            hits.append({"path": rel, "line": line_no, "kind": kind,
                         "fingerprint": fingerprint(value)})
    return hits


def cmd_scan(root: Path, as_json: bool) -> int:
    hits = scan(root)
    if as_json:
        print(json.dumps(hits, indent=2))
    else:
        for h in hits:
            print(f"{h['path']}:{h['line']}  {h['kind']}  {h['fingerprint']}")
        if hits:
            print(f"{len(hits)} possible secret(s). Remove, rotate, then allow only if "
                  f"safe ({ALLOW_MARKER}).", file=sys.stderr)
        else:
            print("no secrets found in tracked files.")
    return 1 if hits else 0


def cmd_guard(files: list[str], use_stdin: bool) -> int:
    sources: list[tuple[str, str]] = []
    if use_stdin:
        sources.append(("<stdin>", sys.stdin.read()))
    for f in files:
        try:
            sources.append((f, Path(f).read_text(encoding="utf-8", errors="replace")))
        except OSError as exc:
            print(f"cannot read {f}: {exc.strerror}", file=sys.stderr)
            return 2
    bad = 0
    for name, text in sources:
        for line_no, kind, value in detect_text(text):
            print(f"{name}:{line_no}  {kind}  {fingerprint(value)}")
            bad += 1
    if bad:
        print("refusing: redact before writing to docs, ledger or memory.", file=sys.stderr)
    return 1 if bad else 0


# --------------------------------------------------------------------------
# register
# --------------------------------------------------------------------------

def _snake(name: str) -> str:
    spaced = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", name).lower()
    return re.sub(r"[^a-z0-9]+", "_", spaced).strip("_")


def field_class(name: str) -> str | None:
    if name.isupper() or name[:1].isupper():
        return None  # constants and class names are not fields
    words = _snake(name).split("_")
    for i in range(len(words)):
        for j in range(len(words), i, -1):
            cls = FIELD_CLASSES.get("_".join(words[i:j]))
            if cls:
                return cls
    return None


def _env_source(rel: str) -> bool:
    name = rel.rsplit("/", 1)[-1].lower()
    return (name in (".env.example", ".env.sample", ".env.template", ".env.dist")
            or (name.startswith("docker-compose") and name.endswith((".yml", ".yaml")))
            or (rel.startswith(".github/workflows/") and name.endswith((".yml", ".yaml")))
            or (name.startswith("readme") and name.endswith(".md")))


def collect(root: Path) -> dict[str, object]:
    tree = Tree(root)
    env: dict[str, set[str]] = {}
    fields: list[tuple[str, int, str, str]] = []
    logs: list[tuple[str, int]] = []
    for rel in tree.files:
        lower = rel.lower()
        want_env = _env_source(rel)
        schema_ext = lower.endswith(SCHEMA_EXT)
        code = lower.endswith(CODE_EXT)
        if not (want_env or schema_ext or code):
            continue
        text = tree.readable(rel)
        if text is None:
            continue
        schema = schema_ext or (code and bool(SCHEMA_PATH.search(rel) or SCHEMA_MARKER.search(text)))
        for n, line in enumerate(text.splitlines(), 1):
            if want_env:
                for m in ENV_CONTEXT.finditer(line):
                    name = next(g for g in m.groups() if g)
                    if ENV_NAME.fullmatch(name):
                        env.setdefault(name, set()).add(rel)
            if schema:
                m = FIELD_DECL.match(line)
                cls = field_class(m.group(1)) if m else None
                if m and cls:
                    fields.append((rel, n, m.group(1), cls))
            if code and LOG_CALL.search(line):
                if any(field_class(w) for w in re.findall(r"[A-Za-z_]\w*", line)):
                    logs.append((rel, n))
    listed = set(tree.files)
    on_disk = tree.walk(only=SECRET_FILE_NAMES) if tree.git else []
    secret_files: dict[str, tuple[bool, str]] = {}
    for rel in sorted({f for f in tree.files + on_disk if is_secret_file(f)}):
        ignored = "unknown" if not tree.git else ("yes" if rel not in listed else "no")
        secret_files[rel] = (rel in tree.tracked, ignored)
    return {"env": env, "files": secret_files, "fields": fields, "logs": logs}


def _cap(rows: list[str]) -> list[str]:
    extra = [f"- ... and {len(rows) - MAX_LISTED} more"] if len(rows) > MAX_LISTED else []
    return rows[:MAX_LISTED] + extra


def render_block(data: dict[str, object]) -> str:
    env: dict[str, set[str]] = data["env"]  # type: ignore[assignment]
    files: dict[str, tuple[bool, str]] = data["files"]  # type: ignore[assignment]
    fields: list[tuple[str, int, str, str]] = data["fields"]  # type: ignore[assignment]
    logs: list[tuple[str, int]] = data["logs"]  # type: ignore[assignment]
    out = [BEGIN, "", "## Sensitive data register", "",
           "Names and locations only - this page never holds a value.", "",
           "### Secret-bearing environment variables", ""]
    out += _cap([f"- `{n}` - declared in {', '.join(f'`{p}`' for p in sorted(env[n]))}"
                 for n in sorted(env)]) or ["- none declared."]
    out += ["", "### Secret-bearing files", ""]
    if files:
        out += ["| File | Tracked | Gitignored | Severity |", "|---|---|---|---|"]
        out += _cap([f"| `{p}` | {'yes' if t else 'no'} | {g} | {'HIGH' if t else 'ok'} |"
                     for p, (t, g) in files.items()])
    else:
        out.append("- none present.")
    out += ["", "### PII-ish and credential fields in schemas", ""]
    out += _cap([f"- `{p}:{n}` `{name}` - {cls}" for p, n, name, cls in fields]) \
        or ["- none found."]
    out += ["", "### Logging that mentions those fields", ""]
    out += _cap([f"- `{p}:{n}`" for p, n in logs]) or ["- none found."]
    out += ["", "### Handling rules", "", "| Class | Default handling |", "|---|---|"]
    out += [f"| {c} | {h} |" for c, h in HANDLING]
    out += ["", f"Regenerate with: `{REGENERATE}`.", END]
    return "\n".join(out)


def render_new_page(block: str) -> str:
    parts = ["# Sensitive data", "", block, ""]
    for section in ("Who rotates each secret and how", "Where secrets live in production",
                    "Who to tell after an exposure"):
        parts += [f"## {section}", "", f"{section}: {GAP}", ""]
    return "\n".join(parts)


def cmd_register(root: Path, page: str, write: bool, check: bool) -> int:
    block = render_block(collect(root))
    path = root / page
    current = el._read(path)
    try:
        desired = el.merge(current, "Sensitive data", block, render_new_page(block))
    except el.BrokenBlock as exc:
        print(f"broken generated block - fix by hand: {page}: {exc}", file=sys.stderr)
        return 2
    same = el._same(current, desired)
    if write:
        if same:
            print(f"{page} already up to date")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(desired.encode("utf-8"))
            print(f"{'updated' if current is not None else 'created'} {page}")
        return 0
    if check:
        if same:
            print(f"{page} matches the tree.")
            return 0
        print(f"{'stale' if current is not None else 'missing'}: {page}\nFix with: {REGENERATE}")
        return 1
    print(block)
    return 0


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(prog="akinator_sensitive")
    parser.add_argument("--root", default=".")
    sub = parser.add_subparsers(dest="cmd", required=True)
    reg = sub.add_parser("register")
    mode = reg.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    reg.add_argument("--page", default=DEFAULT_PAGE)
    sc = sub.add_parser("scan")
    sc.add_argument("--json", action="store_true")
    gd = sub.add_parser("guard")
    gd.add_argument("--stdin", action="store_true")
    gd.add_argument("files", nargs="*")
    args = parser.parse_args(argv)
    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"not a directory: {args.root}", file=sys.stderr)
        return 2
    if args.cmd == "register":
        return cmd_register(root, args.page, args.write, args.check)
    if args.cmd == "scan":
        return cmd_scan(root, args.json)
    if not args.stdin and not args.files:
        print("guard needs --stdin or files", file=sys.stderr)
        return 2
    return cmd_guard(args.files, args.stdin)


if __name__ == "__main__":
    raise SystemExit(main())
