# Knowledge ranking algorithm

Deterministic lexical/structural retrieval:

- **Task terms:** lowercased tokens of length > 2, de-duplicated.
- **Score:** count of task terms found in a candidate's text (name, models,
  patterns, doc body).
- **Boosts:** explicit `--service`/`--event`/`--route` pin the result; the
  matching task pack adds a boost to its dimension.
- **Ties:** broken by stable `cmp` (code-unit order) for reproducibility.

No external AI provider is required. Optional semantic retrieval may be added
behind a feature flag later, but deterministic retrieval stays canonical.
