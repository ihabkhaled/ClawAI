# Research-engine eval (golden set)

Measures whether `researchMode: 'AUTO'` researches when it should and stays quiet when it should not:
decision (yes/no), depth (rounds), citations `[n]`, expected stable facts, and latency.
336 cases, 26 languages/dialects, 21 categories, in `cases/<category>.json`.

Env (same as the rest of qa-lab): `QA_LAB_BASE`, `QA_LAB_EMAIL`, `QA_LAB_PASSWORD`.
Only PAYG-exempt OLLAMA/LLAMACPP models run (`--model`, default `gpt-oss:20b`).

```
node scripts/qa-lab/research-eval/run-eval.mjs --dry-run                       # validate, count, no network
node scripts/qa-lab/research-eval/run-eval.mjs --limit 20 --concurrency 2      # 20-case smoke, spread over categories
node scripts/qa-lab/research-eval/run-eval.mjs --concurrency 3                 # full run
node scripts/qa-lab/research-eval/run-eval.mjs --lang ar-EG --category weather # one slice (--keep-threads to inspect)
```

Results go to `scripts/qa-lab/results/RESEARCH-EVAL-<timestamp>/` (`results.jsonl`, `summary.md`), or `--out <dir>`.
`results/` is git-ignored (`scripts/qa-lab/.gitignore`). No access tokens are written.
Case rule: `mustMention` only for facts that never change.
