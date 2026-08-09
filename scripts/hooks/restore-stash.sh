#!/usr/bin/env sh
# Restore work a git hook parked, without ever stranding it.
#
# usage: sh scripts/hooks/restore-stash.sh <stash-ref> <label>
#
# The pre-commit and pre-push hooks hide uncommitted work so their generators
# and affected-workspace walkers judge the committed tree instead of whatever
# happens to be lying around. Restoring that work used to be a bare
# `git stash pop`, which is all-or-nothing: if ANY single path in the tree
# changed while the checks ran, the pop aborts and every other file in the
# stash is silently left behind. That is not hypothetical — it stranded
# thirty-six files twice in ten minutes, and the repository still carries older
# orphaned `pre-push-verify-*` entries from the same failure.
#
# Two things routinely dirty the tree mid-hook and neither is under the hook's
# control: an editor flushing an open buffer after git rewrites the file
# underneath it, and a build regenerating a tracked artifact such as
# apps/claw-frontend/next-env.d.ts.
#
# So the restore degrades instead of aborting: take the fast path when it
# works, and otherwise put back every path that is still pristine and name the
# few that are not. Blocking a push is a nuisance; losing a developer's
# uncommitted work to a hook is not.
STASH_REF="$1"
LABEL="${2:-parked work}"

if [ -z "$STASH_REF" ]; then
  echo "→ WARNING: restore-stash.sh called without a stash ref; recover '$LABEL' with 'git stash list'"
  exit 0
fi

# Refuse to pop somebody else's entry. A concurrent commit in another terminal
# can push a new stash on top, and popping that one would apply the wrong work.
CURRENT_STASH=$(git rev-parse -q --verify refs/stash 2>/dev/null || true)
if [ "$CURRENT_STASH" != "$STASH_REF" ]; then
  echo "→ WARNING: stash order changed; recover $STASH_REF ('$LABEL') without popping another stash"
  exit 0
fi

if git stash pop --quiet 2>/dev/null; then
  exit 0
fi

echo "→ '$LABEL' could not be restored in one step; restoring every file that is still clean"

BLOCKED=""

# Tracked changes. A path is safe to restore only when it is pristine in BOTH
# the worktree and the index: pristine in the worktree means nothing written
# during the hook is about to be overwritten, and pristine in the index means
# the `git reset` below cannot unstage something the author deliberately staged
# (pre-commit parks with --keep-index, so staged content is already correct and
# needs no restoring).
for path in $(git stash show --name-only "$STASH_REF" 2>/dev/null); do
  if git diff --quiet -- "$path" 2>/dev/null && git diff --quiet --cached -- "$path" 2>/dev/null; then
    # checkout writes the index too; reset returns the entry to HEAD so the
    # file lands back exactly as it was — modified, unstaged.
    if git checkout "$STASH_REF" -- "$path" 2>/dev/null; then
      git reset --quiet -- "$path" 2>/dev/null || true
    else
      BLOCKED="$BLOCKED
    $path"
    fi
  else
    BLOCKED="$BLOCKED
    $path"
  fi
done

# Untracked files live in the stash's third parent and never appear in
# `git stash show`. Only restore ones the tree does not already have, so a file
# recreated during the hook is never clobbered.
if git rev-parse -q --verify "$STASH_REF^3" >/dev/null 2>&1; then
  for path in $(git show --name-only --pretty=format: "$STASH_REF^3" 2>/dev/null); do
    if [ -n "$path" ] && [ ! -e "$path" ]; then
      if git checkout "$STASH_REF^3" -- "$path" 2>/dev/null; then
        git reset --quiet -- "$path" 2>/dev/null || true
      else
        BLOCKED="$BLOCKED
    $path"
      fi
    fi
  done
fi

if [ -n "$BLOCKED" ]; then
  echo "→ these paths changed while the hook ran and were left exactly as they are:$BLOCKED"
fi

# The entry is deliberately kept. Everything restorable is already back in the
# tree; what remains in the stash is the reconciliation the author has to make.
echo "→ '$LABEL' is still in the stash ($STASH_REF) — inspect with 'git stash show -p stash@{0}'"
exit 0
