#!/usr/bin/env python3
# Vendored from the owner's akinator-ai plugin (MIT, see ../LICENSE). Edits are allowed in
# this repository; list every divergence in ../SKILL.md "Divergences from upstream".
"""Scope a pass to what actually changed, and budget the questions.

Stage 7 of the v2 pipeline, and the one that decides whether the other six get
used. If a full pass costs the same on a typo as on a release, people stop
running it - and that is how this discipline dies in every repository where it
dies.

**"Everything" means every station, not every file.** The stations are not
skipped; they are *scoped*. On a comment typo most of them have nothing to do
and the batch records `knowledge delta: none, because ...` in one line. On a
migration, ops and business wake up and the pass is long. The command is the
same either way; the work is not.

Two budgets, both enforced, because both have a hard human limit:

    token budget      the brief's cap - see skills/akinator/scripts/build_brief.py
    interrupt budget  at most N questions per session, batched and ranked

The owner asked for MANY questions every prompt (ADR 0010): the default budget
is 15, asked as ONE grouped message, ranked, each with a recommended default so
"go with recommendations" is always a valid answer. The budget still exists -
it is what keeps fifteen questions one message instead of fifteen interruptions -
and a repository can lower it in .ai/config.json.

Usage:
    python skills/akinator/scripts/akinator_scope.py plan [--against HEAD]
    python skills/akinator/scripts/akinator_scope.py questions [--limit 5]

Exit codes:
    0  scoped successfully
    2  the tool could not run
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import akinator_ledger as led  # noqa: E402

DEFAULT_INTERRUPT_BUDGET = 15
CONFIG = ".ai/config.json"


# --------------------------------------------------------------------------
# What changed
# --------------------------------------------------------------------------

def changed_paths(repo: Path, against: str = "HEAD") -> list[str]:
    """Paths touched relative to a ref, including untracked files.

    Untracked matter: a brand-new rule that has never been committed is exactly
    the kind of change a pass must not treat as absent.
    """
    out: set[str] = set()
    for args in (
        ["diff", "--name-only", against],
        ["diff", "--name-only", "--cached", against],
        ["ls-files", "--others", "--exclude-standard"],
    ):
        try:
            result = subprocess.run(
                ["git", *args], cwd=str(repo), capture_output=True,
                text=True, timeout=30,
            )
        except (OSError, subprocess.TimeoutExpired):
            continue
        if result.returncode == 0:
            out.update(
                line.strip().replace("\\", "/")
                for line in result.stdout.splitlines() if line.strip()
            )
    return sorted(out)


# --------------------------------------------------------------------------
# Which stations the change wakes up
# --------------------------------------------------------------------------

@dataclass(frozen=True)
class Station:
    name: str
    skill: str
    why: str
    globs: tuple[str, ...] = ()
    always: bool = False


# Ordered as the loop runs. `always` stations are never scoped away - RESOLVE
# because a pass that skips it is guessing, and the librarian because small
# batches are exactly where the delta gets dropped.
STATIONS: tuple[Station, ...] = (
    Station("RESOLVE", "akinator", "always - a pass that skips it is guessing",
            always=True),
    Station("AUDIT", "akinator-audit", "something is claimed to already exist",
            globs=("*",)),
    Station("PLAN", "akinator-plan", "more than one file or one step",
            globs=("*",)),
    Station("DOCUMENT", "akinator-document-change",
            "the why, the when-not-to, the consequence", globs=("*",)),
    Station("SKILLIFY", "akinator-skillify", "a procedure that will recur",
            globs=("scripts/*", "*.sh", "*.ps1", "Makefile", "*/Dockerfile")),
    Station("RULE", "akinator-rule-forge", "a new constraint",
            globs=("rules/*",)),
    Station("CONTEXTIFY", "akinator-contextify", "a structural fact moved",
            globs=("context/*", "package.json", "pyproject.toml", "go.mod",
                   "Cargo.toml", "requirements.txt", "*/package.json")),
    Station("BUSINESS", "akinator-business-map",
            "money, quotas, entitlements, pricing",
            globs=("docs/business/*", "*billing*", "*quota*", "*pricing*",
                   "*payment*", "*entitle*", "*refund*", "*subscription*")),
    Station("PRODUCT", "akinator-product-map", "user-visible behavior changed",
            globs=("docs/product/*", "*/routes/*", "*/pages/*",
                   "*/components/*", "*/handlers/*", "*/controllers/*")),
    Station("OPS", "akinator-ops-map",
            "deploy, migrate, restart, rebuild, recover",
            globs=("*/migrations/*", "*migration*", "Dockerfile*",
                   "docker-compose*", "*.tf", "*/k8s/*", ".github/workflows/*",
                   "docs/ops/*", "*lock*")),
    Station("MEMOIZE", "akinator-memoize", "a durable fact or surprise",
            globs=("*",)),
    Station("INDEX+SYNC", "akinator-index-sync",
            "an artifact was created, moved or deleted",
            globs=("rules/*", "skills/*", "docs/*", "context/*", "memory/*")),
    Station("VERIFY", "akinator-gate-economy", "gate once, scoped",
            always=True),
)

# Changes with no knowledge consequence. The pass still runs every station; the
# stations simply find nothing, and the batch says so in one line.
TRIVIAL = ("*.lock", "*.png", "*.jpg", "*.svg", "*.ico", ".gitignore",
           ".gitattributes")


def _matches(path: str, globs: tuple[str, ...]) -> bool:
    return any(fnmatch.fnmatch(path, g) or fnmatch.fnmatch(f"/{path}", f"*{g}")
               for g in globs)


@dataclass
class Scope:
    changed: list[str]
    woken: list[Station] = field(default_factory=list)
    quiet: list[Station] = field(default_factory=list)
    trivial: bool = False


def scope(repo: Path, against: str = "HEAD") -> Scope:
    changed = [p for p in changed_paths(repo, against)]
    substantive = [p for p in changed if not _matches(p, TRIVIAL)]

    result = Scope(changed=changed, trivial=bool(changed) and not substantive)
    for station in STATIONS:
        if station.always or (substantive and _matches_any(substantive, station)):
            result.woken.append(station)
        else:
            result.quiet.append(station)
    return result


def _matches_any(paths: list[str], station: Station) -> bool:
    return any(_matches(path, station.globs) for path in paths)


# --------------------------------------------------------------------------
# The interrupt budget
# --------------------------------------------------------------------------

def interrupt_budget(repo: Path) -> int:
    path = repo / CONFIG
    if path.is_file():
        try:
            return int(json.loads(path.read_text(encoding="utf-8"))
                       .get("interrupt_budget", DEFAULT_INTERRUPT_BUDGET))
        except (json.JSONDecodeError, OSError, ValueError):
            pass
    return DEFAULT_INTERRUPT_BUDGET


@dataclass
class Question:
    text: str
    why: str
    score: float
    source: str


def pending_questions(repo: Path) -> list[Question]:
    """Everything a pass might ask, ranked. Only the top N get asked.

    Ranking, highest first:
      - money, permissions, deletion and public contracts, where guessing is
        prohibited outright
      - a failure at the threshold with no recorded decision
      - open questions carried from earlier sessions
    """
    out: list[Question] = []
    ledger = led.Ledger(repo)

    for record in ledger.recurring(2):
        decided = (repo / f"{led.LEDGER_DIR}/decision/distil-{record.id}.md")
        if decided.is_file():
            continue
        out.append(Question(
            text=f"'{record.title}' has happened {len(record.occurrences)} times."
                 " Rule, skill, or neither?",
            why="a pattern with no recorded decision will recur unchecked",
            score=0.9 + 0.02 * len(record.occurrences),
            source=f"{led.LEDGER_DIR}/failure/{record.id}.md",
        ))

    for record in ledger.all("question"):
        answer = record.fields.get("answer", "").strip()
        if answer and answer != led.MISSING:
            continue
        out.append(Question(
            text=record.title,
            why="carried from an earlier session, still unanswered",
            score=0.6,
            source=f"{led.LEDGER_DIR}/question/{record.id}.md",
        ))

    return sorted(out, key=lambda q: (-q.score, q.text))


def batched(repo: Path, limit: int | None = None) -> tuple[list[Question], list[Question]]:
    """(ask now, defer). One grouped ask; the rest wait for the next session."""
    budget = limit if limit is not None else interrupt_budget(repo)
    ranked = pending_questions(repo)
    return ranked[:budget], ranked[budget:]


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="akinator_scope")
    parser.add_argument("--root", default=".")
    sub = parser.add_subparsers(dest="command", required=True)

    plan = sub.add_parser("plan", help="which stations this change wakes")
    plan.add_argument("--against", default="HEAD")

    questions = sub.add_parser("questions", help="the batched ask")
    questions.add_argument("--limit", type=int, default=None)

    args = parser.parse_args(argv)
    repo = Path(args.root).resolve()

    if args.command == "plan":
        result = scope(repo, args.against)
        if not result.changed:
            print(f"nothing changed against {args.against}.")
            print("Every station still applies to whatever you do next - this "
                  "reports the scope, it does not grant an exemption.")
            return 0

        print(f"{len(result.changed)} path(s) changed against {args.against}\n")
        if result.trivial:
            print("All changes are trivial (lockfiles, images, ignore files).")
            print("Run every station anyway; they will find nothing, and the "
                  "batch records `knowledge delta: none, because ...` in a "
                  "line.\n")

        print("AWAKE - these stations have work:")
        for station in result.woken:
            print(f"  {station.name:<11} {station.skill:<26} {station.why}")

        print("\nQUIET - nothing matched, so they will find nothing:")
        for station in result.quiet:
            print(f"  {station.name:<11} {station.skill}")

        print(
            "\n'Everything' means every station, not every file. A quiet "
            "station is still run; it simply has nothing to record, and the "
            "batch says so."
        )
        return 0

    if args.command == "questions":
        ask, defer = batched(repo, args.limit)
        budget = args.limit if args.limit is not None else interrupt_budget(repo)

        if not ask and not defer:
            print("nothing to ask.")
            return 0

        print(f"ASK NOW - {len(ask)} of {len(ask) + len(defer)}, "
              f"budget {budget}. Ask them in ONE grouped message:\n")
        for index, question in enumerate(ask, 1):
            print(f"  {index}. {question.text}")
            print(f"     why: {question.why}")
            print(f"     see: {question.source}\n")

        if defer:
            print(f"DEFERRED - {len(defer)}, carried to the next session:\n")
            for question in defer:
                print(f"  - {question.text}")
            print(
                "\nTwenty questions in one session means zero answers by "
                "session three. The interrupt budget is as real as the token "
                "budget."
            )
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
