# Akinator Resource Guard

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: before starting anything heavy - a build, a test suite, a container rebuild, a long-running process - and at the end of every task. Checks CPU and memory pressure, reduces your own load rather than the developer's, and leaves the machine as you found it.

Development happens on a machine someone else is also using - often the machine
of the person you are working for, with their editor, their browser, their
containers and their other work running on it.

Two rules: **reduce your own load, never theirs. Leave the machine as you found
it.**

## Cost doctrine - tokens and processes are resources too

- **Context pack before reading**: `python skills/akinator/scripts/akinator_context.py
pack --for "<task>" [--budget 3000]` returns a ranked reading list with zero
  subprocesses, cached in `.ai/cache`. `budget` shows the numbers.
- **Never glob-read the tree.** Read what the pack, `owners` and the brief name.
- Use the caches; do not recompute what a generated page already holds.
- No heavy processes for a question a tool answers from files.
- Default: about 3000 tokens of reading before the first edit; exceed it only
  for a stated reason.
- The tools are the cheap path: stdlib, no network, no daemons.

## When to use

- Before starting any build, test suite, container rebuild or long-running
  process.
- When a command times out, hangs or is unexpectedly slow - saturation is a more
  common cause than a real bug, and it is the cheaper hypothesis to test.
- At the end of every task, always.

## When NOT to use

- Before quick, cheap commands. Checking pressure before `git status` is its own
  kind of waste.

## Procedure

### 1. Check pressure before heavy work

Read CPU and memory before starting. Portable enough approximations:

```bash
# Linux / macOS
uptime                      # load average
free -m 2>/dev/null || vm_stat   # memory
ps aux --sort=-%cpu | head -15   # top consumers
```

```powershell
# Windows
Get-CimInstance Win32_Processor | Select-Object LoadPercentage
Get-CimInstance Win32_OperatingSystem |
  Select-Object FreePhysicalMemory, TotalVisibleMemorySize
Get-Process | Sort-Object CPU -Descending | Select-Object -First 15
```

If the machine is comfortable, proceed. If it is saturated, go to step 2.

### 2. If it is saturated, find out whose fault it is

Identify the top consumers and determine which of them **you** started in this
session: watchers you launched, dev servers, scratch containers, background test
runs, an earlier build that never exited.

- **Yours** - stop them. A watcher you started three tasks ago and forgot is the
  most common cause of a saturated machine during agent work.
- **Not yours** - leave them alone. The developer's editor, their browser, their
  containers, their other agent session and their unrelated builds are not yours
  to kill. Never kill a process or container you did not start.

If the machine is saturated and none of it is yours, **wait or ask** - do not add
load on top, and do not silently proceed into a run that will time out and be
misread as a failure.

### 3. Serialize your own heavy work

- One long job at a time.
- Never run parallel test suites.
- Never race a build against a suite.
- Background long jobs and judge them by real exit codes, not by summaries.

Parallelism is for independent services during a rebuild, where the procedure
says so (`akinator-ops-map`) - not for stacking your own gates.

### 4. Prefer the cheap operation

- `restart` over rebuild for code-only changes.
- Scoped tests over the full suite (`akinator-gate-economy`).
- Incremental builds over clean ones, unless a dependency or schema change makes
  the cache a liar.

### 5. Clean up - always

At the end of the task, the machine is as you found it:

- No orphaned watchers, dev servers or background jobs you started.
- No scratch containers, images or volumes you created for a one-off.
- No half-finished installs, no partially applied migrations on a shared
  database, no leftover lock files.
- Temporary files in the scratch directory, not in the user's project tree.

Verify rather than assume: list your background jobs and containers and confirm
they are gone.

## Failure modes and pitfalls

- **Killing the developer's processes.** The single worst failure available at
  this station. Their editor, browser, containers and other sessions are off
  limits, however much CPU they are using.
- **Adding load to a saturated machine** and then debugging the resulting timeout
  as if it were a code failure.
- **Forgetting your own watcher** from an earlier task, then blaming the machine.
- **Leaving containers running** at the end of a task. They survive the session
  and quietly consume memory for days.
- **Parallelizing your own gates** to "save time" - on a loaded machine this is
  slower, and flakier.
- **Cleaning up by assumption.** "It should have exited" is not verification.

## Definition of done

- [ ] Pressure was checked before heavy work.
- [ ] If saturated, only processes you started were stopped; none of the
      developer's were touched.
- [ ] Your heavy work ran serially, judged by exit codes.
- [ ] No watchers, dev servers, containers, images or volumes you started are
      still running.
- [ ] Temporary files are in the scratch directory, not the project tree.
- [ ] Cleanup was verified by listing, not assumed.
