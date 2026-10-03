# Developer validation

Command output and lane evidence are recorded in
`../../qa-evidence/2026-10-03-runtime-managed-connector-providers.md`.

- Connector-service: typecheck/build passed; 49 test files, 730 tests passed;
  lint 0 errors and 16 warnings.
- Routing-service: typecheck/build passed; 117 test files, 1,783 tests passed;
  lint 0 errors and 136 warnings.
- Frontend: typecheck/build passed; three provider/locale test files, 76 tests
  passed; lint 0 errors and 12 warnings.
- Prettier check passed for every changed TS/TSX file. The frontend's full-tree
  formatter reports 3,491 pre-existing files; service format scripts pass
  single-quoted globs literally on Windows. Neither is used to claim the scoped
  changed-file formatting result.
- Both Prisma schemas validate. Migrations were up to date in the main checkout;
  clean-install/upgrade validation remains open. The isolated worktree has no DB
  URL, so its status retry could not connect.
- `knowledge:verify`, `knowledge:check`, `audit:check`, and QA evidence check
  passed after regeneration.

Open: non-admin and paid/FREE RBAC, Lighthouse/accessibility/performance, live
NIM chat, clean-install/upgrade migration checks, and GitHub CI.
