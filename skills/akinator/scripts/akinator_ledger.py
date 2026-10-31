#!/usr/bin/env python3
# Vendored from the owner's akinator-ai plugin (MIT, see ../LICENSE). Edits are allowed in
# this repository; list every divergence in ../SKILL.md "Divergences from upstream".
"""The Akinator ledger - what happened, so the next session does not rediscover it.

Six kinds of record, all committed to the repository:

    failure      a thing that broke, fingerprinted so recurrence can be counted
    question     something asked and answered, so it is never asked twice
    decision     a choice between real alternatives, and what it cost
    surprise     non-obvious behavior, and the symptom that misled
    requirement  what the product must do - current, changed, missing or dropped
    drift        a business, product or scope fact that moved: before, after, why

The last two exist because the most expensive thing a session can get wrong is
not a stack trace - it is building yesterday's requirement, or re-deriving a
business rule that quietly changed. Neither is visible in a diff.

A gitignored local cache would defeat the entire purpose: a new clone, a new
teammate or a fresh CI agent would get nothing. The ledger is committed.

**Redaction is not optional and cannot be added later.** Failure records carry
error text, and error text carries tokens, connection strings and customer
identifiers. Every record passes `redact()` before it is written. A ledger that
leaks a credential into git history is worse than no ledger.

Usage:
    python skills/akinator/scripts/akinator_ledger.py add failure --title "..." [--field k=v ...]
    python skills/akinator/scripts/akinator_ledger.py add question --title "..." --field answer="..."
    python skills/akinator/scripts/akinator_ledger.py add requirement --title "..." --field statement="..." --field status=missing --field source="..."
    python skills/akinator/scripts/akinator_ledger.py add drift --title "..." --field area=pricing --field before="..." --field after="..." --field why="..."
    python skills/akinator/scripts/akinator_ledger.py occurred <fingerprint> [--source git]
    python skills/akinator/scripts/akinator_ledger.py list [--type requirement] [--recurring]
    python skills/akinator/scripts/akinator_ledger.py show <id>
    python skills/akinator/scripts/akinator_ledger.py verify

Exit codes:
    0  success; for `verify`, every record is well-formed
    1  a record is malformed, or the requested id does not exist
    2  the ledger could not run
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Iterable, Sequence

LEDGER_DIR = ".ai/ledger"
TYPES = ("failure", "question", "decision", "surprise", "requirement", "drift")

# Rendered in place of a required field that was not supplied. Honest in the
# document - "not recorded" beats silently omitting the section - but it must
# never satisfy `verify()`. A placeholder that makes an incomplete record look
# complete to the checker is the fake-compliance pattern this plugin exists to
# catch, and it was doing exactly that inside the ledger until a test caught it.
MISSING = "_not recorded_"

# Required fields per type. A record missing one is malformed, because the
# missing field is always the one that made the record worth writing.
REQUIRED: dict[str, tuple[str, ...]] = {
    "failure": ("symptom", "trigger", "root_cause", "fix"),
    "question": ("asked", "answer", "answered_by"),
    "decision": ("what", "alternatives", "why"),
    "surprise": ("behavior", "misleading_symptom", "why"),
    # Optional: priority, acceptance, owner.
    "requirement": ("statement", "status", "source"),
    # Optional: impact, decided_by.
    "drift": ("area", "before", "after", "why"),
}

# The only statuses a requirement may carry, in the order a session must read
# them: what is missing blocks work, what changed invalidates work already done,
# what is current is the contract, and what was dropped must not be rebuilt. A
# free-text status would let "done-ish" in, and a status nobody can sort on is
# a status nobody reads - so anything else makes the record malformed.
REQUIREMENT_STATUSES = ("missing", "changed", "current", "dropped")

# Examples, not a closed set: drift is wherever a fact moved, and a closed list
# would push real drift into the wrong bucket rather than keep it out.
DRIFT_AREAS = (
    "architecture", "business", "pricing", "product", "requirement", "scope",
)


def status_problem(record: "Record") -> str | None:
    """Why a requirement's status is unusable, or None when it is fine."""
    if record.kind != "requirement":
        return None
    status = record.fields.get("status", "").strip()
    if not status or status == MISSING:
        return None  # reported as a missing required field, not twice
    if status not in REQUIREMENT_STATUSES:
        return (
            f"invalid status '{status}' - expected one of: "
            f"{' | '.join(REQUIREMENT_STATUSES)}"
        )
    return None


# --------------------------------------------------------------------------
# Redaction - runs before every write, no exceptions
# --------------------------------------------------------------------------

# Ordered most-specific first: a JWT would otherwise be caught by the generic
# high-entropy rule and reported as the wrong kind.
SECRET_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("private-key", re.compile(
        r"-----BEGIN[A-Z ]*PRIVATE KEY-----.*?-----END[A-Z ]*PRIVATE KEY-----",
        re.DOTALL)),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")),
    ("aws-key", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("github-token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{16,}\b")),
    ("slack-token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b")),
    ("openai-key", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b")),
    ("connection-string", re.compile(
        r"\b[a-z][a-z0-9+.-]*://[^\s:/@]+:[^\s:/@]+@[^\s]+")),
    ("bearer", re.compile(r"(?i)\b(?:bearer|authorization:\s*bearer)\s+[A-Za-z0-9._~+/=-]{16,}")),
    ("assigned-secret", re.compile(
        r"(?i)\b([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|APIKEY|API_KEY)[A-Z0-9_]*)"
        r"\s*[:=]\s*[\"']?([^\s\"']{8,})[\"']?")),
    # Last resort: a long unbroken high-entropy run that none of the above named.
    ("high-entropy", re.compile(r"\b(?=[A-Za-z0-9+/_-]*\d)(?=[A-Za-z0-9+/_-]*[A-Za-z])"
                                r"[A-Za-z0-9+/_-]{40,}={0,2}\b")),
)


def env_values(repo: Path) -> list[str]:
    """Every value assigned in any .env file - these are secrets by definition."""
    out: list[str] = []
    for path in sorted(repo.glob(".env*")):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            value = line.split("=", 1)[1].strip().strip("\"'")
            # Short values are words, not secrets, and redacting them would
            # shred the prose.
            if len(value) >= 8:
                out.append(value)
    return sorted(set(out), key=len, reverse=True)


def redact(text: str, extra: Sequence[str] = ()) -> str:
    """Replace anything that looks like a credential.

    Runs before every write. The cost of a false positive is an unreadable word
    in a failure record; the cost of a false negative is a credential in git
    history forever. The asymmetry decides the tuning: redact aggressively.
    """
    for value in extra:
        if value:
            text = text.replace(value, "[redacted:env]")
    for kind, pattern in SECRET_PATTERNS:
        if kind == "assigned-secret":
            text = pattern.sub(lambda m: f"{m.group(1)}=[redacted:{kind}]", text)
        else:
            text = pattern.sub(f"[redacted:{kind}]", text)
    return text


# --------------------------------------------------------------------------
# Fingerprinting
# --------------------------------------------------------------------------

# Everything that differs between two instances of the same failure and must be
# normalized away before hashing.
NOISE = (
    (re.compile(r"\b[0-9a-f]{7,40}\b"), "<hash>"),
    (re.compile(r"\b\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}:\d{2})?\b"), "<date>"),
    (re.compile(r":\d+:\d+\b"), ":<pos>"),
    (re.compile(r":\d+\b"), ":<line>"),
    (re.compile(r"\b\d+(\.\d+)?(ms|s|m|h)\b"), "<duration>"),
    (re.compile(r"0x[0-9a-fA-F]+"), "<addr>"),
    (re.compile(r"[A-Za-z]:\\[^\s\"']+|/[^\s\"']{6,}"), "<path>"),
    (re.compile(r"\b\d{3,}\b"), "<n>"),
)


def normalize(text: str) -> str:
    text = text.strip().lower()
    for pattern, replacement in NOISE:
        text = pattern.sub(replacement, text)
    return re.sub(r"\s+", " ", text).strip()


def fingerprint(error_class: str, module: str, operation: str) -> str:
    """A stable id for 'the same failure', deliberately coarse.

    Raw error text never matches twice - paths, line numbers, ids and timings
    all differ. Too coarse and everything collides. The tuning strategy is
    start coarse and split on a reported collision, so the discriminator is
    learned from real data rather than guessed up front.
    """
    parts = [normalize(error_class), normalize(module), normalize(operation)]
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:12]
    slug = re.sub(r"[^a-z0-9]+", "-", normalize(error_class))[:40].strip("-")
    return f"{slug or 'unknown'}-{digest}"


# --------------------------------------------------------------------------
# Records
# --------------------------------------------------------------------------

@dataclass
class Record:
    kind: str
    id: str
    title: str
    fields: dict[str, str] = field(default_factory=dict)
    occurrences: list[str] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)

    @property
    def rel(self) -> str:
        return f"{LEDGER_DIR}/{self.kind}/{self.id}.md"

    def render(self) -> str:
        meta = {
            "kind": self.kind,
            "id": self.id,
            "title": self.title,
        }
        if self.occurrences:
            meta["occurrences"] = self.occurrences
        if self.sources:
            meta["sources"] = sorted(set(self.sources))

        lines = ["---"]
        for key, value in meta.items():
            if isinstance(value, list):
                lines.append(f"{key}:")
                lines.extend(f"  - {v}" for v in value)
            else:
                lines.append(f"{key}: {value}")
        lines.append("---")
        lines.append("")
        lines.append(f"# {self.title}")
        lines.append("")
        if self.occurrences:
            lines.append(
                f"**Seen {len(self.occurrences)} time(s):** "
                + ", ".join(self.occurrences)
            )
            lines.append("")
        for key in REQUIRED.get(self.kind, ()):
            lines.append(f"## {key.replace('_', ' ').title()}")
            lines.append("")
            lines.append(self.fields.get(key, MISSING))
            lines.append("")
        for key, value in sorted(self.fields.items()):
            if key in REQUIRED.get(self.kind, ()):
                continue
            lines.append(f"## {key.replace('_', ' ').title()}")
            lines.append("")
            lines.append(value)
            lines.append("")
        return "\n".join(lines)


FRONTMATTER = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)


def parse(path: Path) -> Record:
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER.match(text)
    if not match:
        raise ValueError(f"{path}: no frontmatter")

    meta: dict[str, object] = {}
    key = None
    for line in match.group(1).splitlines():
        if line.startswith("  - ") and key:
            meta.setdefault(key, [])
            if isinstance(meta[key], list):
                meta[key].append(line[4:].strip())
        elif ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()
            meta[key] = value if value else []

    fields: dict[str, str] = {}
    body = text[match.end():]
    for section in re.split(r"^## ", body, flags=re.MULTILINE)[1:]:
        head, _, rest = section.partition("\n")
        fields[head.strip().lower().replace(" ", "_")] = rest.strip()

    return Record(
        kind=str(meta.get("kind", "")),
        id=str(meta.get("id", "")),
        title=str(meta.get("title", "")),
        fields=fields,
        occurrences=list(meta.get("occurrences", []) or []),
        sources=list(meta.get("sources", []) or []),
    )


# --------------------------------------------------------------------------
# Store
# --------------------------------------------------------------------------

class Ledger:
    def __init__(self, repo: Path) -> None:
        self.repo = repo
        self.root = repo / LEDGER_DIR
        self._env = env_values(repo)

    def path_for(self, kind: str, record_id: str) -> Path:
        return self.root / kind / f"{record_id}.md"

    def all(self, kind: str | None = None) -> list[Record]:
        out: list[Record] = []
        for sub in sorted(TYPES if kind is None else [kind]):
            directory = self.root / sub
            if not directory.is_dir():
                continue
            for path in sorted(directory.glob("*.md")):
                out.append(parse(path))
        return out

    def write(self, record: Record) -> Path:
        """Write a record. Redaction happens HERE, so no caller can skip it."""
        record.title = redact(record.title, self._env)
        record.fields = {k: redact(v, self._env) for k, v in record.fields.items()}

        path = self.path_for(record.kind, record.id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(record.render(), encoding="utf-8", newline="\n")
        return path

    def occurred(
        self, record_id: str, when: str, source: str, note: str = ""
    ) -> Record | None:
        """Record another sighting of an existing failure.

        An occurrence is `date (source)` plus an optional note, and dedup is on
        that whole entry - not on the date. Deduping by date alone was wrong in
        the obvious case: a failure that recurs twice in one session is two
        events, and collapsing them means it never reaches the threshold. The
        entry is still specific enough that re-running a git or CI miner over
        the same history cannot double-count.
        """
        entry = f"{when} ({source})" + (f" - {note}" if note else "")
        for record in self.all("failure"):
            if record.id != record_id:
                continue
            if entry not in record.occurrences:
                record.occurrences.append(entry)
            record.sources.append(source)
            self.write(record)
            return record
        return None

    def recurring(self, threshold: int = 2) -> list[Record]:
        """Failures at or past the threshold - the ones that should become rules."""
        return [r for r in self.all("failure") if len(r.occurrences) >= threshold]

    def verify(self) -> list[str]:
        problems: list[str] = []
        for sub in TYPES:
            directory = self.root / sub
            if not directory.is_dir():
                continue
            for path in sorted(directory.glob("*.md")):
                try:
                    record = parse(path)
                except ValueError as exc:
                    problems.append(str(exc))
                    continue
                rel = path.relative_to(self.repo).as_posix()
                if record.kind != sub:
                    problems.append(f"{rel}: kind '{record.kind}' != directory '{sub}'")
                if record.id != path.stem:
                    problems.append(f"{rel}: id '{record.id}' != filename")
                for required in REQUIRED[sub]:
                    value = record.fields.get(required, "").strip()
                    if not value or value == MISSING:
                        problems.append(f"{rel}: missing required field '{required}'")
                if sub == "failure" and not record.occurrences:
                    problems.append(f"{rel}: a failure with no occurrences")
                problem = status_problem(record)
                if problem:
                    problems.append(f"{rel}: {problem}")
        return problems


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def _fields(pairs: Iterable[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for pair in pairs:
        key, _, value = pair.partition("=")
        if not _:
            raise SystemExit(f"--field expects key=value, got: {pair}")
        out[key.strip()] = value
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="akinator_ledger")
    parser.add_argument("--root", default=".")
    sub = parser.add_subparsers(dest="command", required=True)

    add = sub.add_parser("add", help="write a new record")
    add.add_argument("kind", choices=TYPES)
    add.add_argument("--title", required=True)
    add.add_argument("--id", default="")
    add.add_argument("--field", action="append", default=[])
    add.add_argument("--date", default="")
    add.add_argument("--source", default="self-report")

    occ = sub.add_parser("occurred", help="record another sighting")
    occ.add_argument("id")
    occ.add_argument("--date", default="")
    occ.add_argument("--source", default="self-report")
    occ.add_argument("--note", default="", help="what distinguished this sighting")

    lst = sub.add_parser("list")
    lst.add_argument("--type", choices=TYPES, default=None)
    lst.add_argument("--recurring", action="store_true")
    lst.add_argument("--json", action="store_true", dest="as_json")

    show = sub.add_parser("show")
    show.add_argument("id")

    sub.add_parser("verify")

    args = parser.parse_args(argv)
    repo = Path(args.root).resolve()
    ledger = Ledger(repo)
    today = date.today().isoformat()

    if args.command == "add":
        fields = _fields(args.field)
        missing = [f for f in REQUIRED[args.kind] if f not in fields]
        if missing:
            print(
                f"a {args.kind} record requires: {', '.join(REQUIRED[args.kind])}\n"
                f"missing: {', '.join(missing)}",
                file=sys.stderr,
            )
            return 1
        if args.kind == "requirement":
            problem = status_problem(Record(kind="requirement", id="", title="",
                                            fields=fields))
            if problem:
                print(f"a requirement record has an {problem}", file=sys.stderr)
                return 1

        record_id = args.id
        if not record_id:
            if args.kind == "failure":
                record_id = fingerprint(
                    args.title, fields.get("module", ""), fields.get("operation", "")
                )
            else:
                record_id = re.sub(r"[^a-z0-9]+", "-", args.title.lower())[:60].strip("-")

        record = Record(
            kind=args.kind, id=record_id, title=args.title, fields=fields,
            occurrences=(
                [f"{args.date or today} ({args.source})"]
                if args.kind == "failure" else []
            ),
            sources=[args.source] if args.kind == "failure" else [],
        )
        path = ledger.write(record)
        print(f"wrote {path.relative_to(repo).as_posix()}")
        return 0

    if args.command == "occurred":
        record = ledger.occurred(
            args.id, args.date or today, args.source, args.note
        )
        if record is None:
            print(f"no failure with id: {args.id}", file=sys.stderr)
            return 1
        count = len(record.occurrences)
        print(f"{record.id}: {count} occurrence(s)")
        if count >= 2:
            print(
                "\nThis has now happened more than once. Stop and ask whether it "
                "should become a rule, a skill, or neither - and record the "
                "answer either way, so it is not re-asked."
            )
        return 0

    if args.command == "list":
        records = ledger.recurring() if args.recurring else ledger.all(args.type)
        if args.as_json:
            print(json.dumps(
                [{"kind": r.kind, "id": r.id, "title": r.title,
                  "occurrences": r.occurrences, "sources": r.sources}
                 for r in records], indent=2, sort_keys=True))
        else:
            for r in records:
                seen = f" x{len(r.occurrences)}" if r.occurrences else ""
                print(f"{r.kind:11} {r.id:52}{seen}  {r.title[:60]}")
            print(f"\n{len(records)} record(s)")
        return 0

    if args.command == "show":
        for record in ledger.all():
            if record.id == args.id:
                print(ledger.path_for(record.kind, record.id)
                      .read_text(encoding="utf-8"))
                return 0
        print(f"no record with id: {args.id}", file=sys.stderr)
        return 1

    if args.command == "verify":
        problems = ledger.verify()
        for problem in problems:
            print(problem)
        if problems:
            print(f"\n{len(problems)} malformed record(s)")
            return 1
        print(f"{len(ledger.all())} record(s), all well-formed")
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
