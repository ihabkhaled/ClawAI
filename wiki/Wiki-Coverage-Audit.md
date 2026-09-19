# Wiki Coverage Audit

This page proves the exhaustive repository-file indexing coverage against the current `main` recursive Git tree.

| Inventory category | Tracked files |
| --- | --- |
| Governance and AI knowledge | 328 |
| Root files | 29 |
| Tooling and infrastructure | 175 |
| Agent CLI | 53 |
| Backend services | 4201 |
| Frontend | 2933 |
| Documentation | 582 |
| Shared packages | 338 |

## Result

- Total tracked blob files: **8639**
- Files assigned to an inventory: **8639**
- Uncovered files: **0**
- Multiply-categorized files: **0**

**PASS: every tracked monorepo file is represented by one exhaustive Wiki inventory category.**

The Coding Agent is a Git submodule rather than a blob subtree in this repository, so its standalone repository is audited separately in [[Coding Agent Repository Inventory|Coding-Agent-Repository-Inventory]].
