# How context resolution works

```bash
npm run knowledge:context -- --task="<task>" [--service=x] [--event=y] [--route=/z] [--files=a,b] [--max-tokens=6000]
```

1. The task is tokenized and classified into a task pack (`tools/knowledge/classify-task.mjs`).
2. Workspaces, events, permissions, env vars, routes, rules and skills are ranked
   by lexical/structural overlap with the task terms (deterministic — no external AI).
3. A compact bundle is written to `.ai/local/current-context.{json,md}` (gitignored).

The output links to files; it never inlines them. Read `.ai/local/current-context.md`,
then open the cited sources. ADR: [adr-057](../13-adr/adr-057-deterministic-context-resolver.md).
