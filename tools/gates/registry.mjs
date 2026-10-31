// The single gate registry (ADR-202). EVERY job in .github/workflows/*.yml and
// every blocking step of the policy job is claimed by exactly one entry here,
// together with where the same rule is enforced on the developer machine and
// what repairs it automatically. tools/__tests__/gate-registry.test.mjs fails
// when a CI job has no entry, when an entry points at a file or a hook line
// that does not exist, or when an entry has neither an auto-fix nor a stated
// reason it needs a human. Adding a CI gate without a local story is therefore
// impossible, which is how local and CI are kept from drifting apart.
//
// Fields
//   id        stable name
//   what      what the gate checks
//   ci        [{ workflow, job, step? }] claimed CI jobs / steps (may be empty for hook-only gates)
//   advisory  true when the release does not depend on it (still must go green)
//   local     { point, via, invokes } where point is pre-commit | commit-msg | pre-push;
//             `via` is the file that calls `invokes` (a hook or a hook script);
//             or { point: 'ci-only', reason } for a gate that needs CI infrastructure
//   failable  can a normal commit/push produce a state that fails it?
//             'no' | 'yes-fixed-automatically' | 'yes-needs-judgment' | 'external-state'
//   autofix   { kind: 'auto' | 'scaffold' | 'none', how } — auto: the hook repairs and stages it;
//             scaffold: the hook creates the skeleton only; none: judgment (see `human`)
//   human     why a human/agent must decide (required unless kind is 'auto')

const CI = 'ci.yml';
const OS = 'ai-native-os.yml';

export const GATES = [
  {
    id: 'lint-staged-format-lint',
    what: 'ESLint (--max-warnings 0) then Prettier on every staged file, strictly in sequence (one lint-staged glob)',
    ci: [{ workflow: CI, job: 'static' }],
    local: { point: 'pre-commit', via: '.husky/pre-commit', invokes: 'lint-staged' },
    failable: 'yes-fixed-automatically',
    autofix: {
      kind: 'auto',
      how: 'eslint --fix then prettier --write; results are re-staged by lint-staged',
    },
  },
  {
    id: 'typecheck',
    what: 'tsc/tsgo typecheck of every workspace the change affects',
    ci: [],
    local: {
      point: 'pre-commit',
      via: 'tools/gates/pre-commit.mjs',
      invokes: "runGate('typecheck'",
    },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'a type error is a code defect; only the author can resolve it',
  },
  {
    id: 'unit-tests',
    what: 'Vitest/Jest of the changed workspaces (sharded, with coverage in CI)',
    ci: [{ workflow: CI, job: 'test' }],
    local: { point: 'pre-push', via: 'tools/gates/pre-push.mjs', invokes: "['test'" },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'a failing test is a defect or a stale expectation; deciding which is judgment',
  },
  {
    id: 'coverage-floor',
    what: 'merged shard coverage must meet the enforced floor of each workspace',
    ci: [{ workflow: CI, job: 'coverage-merge' }],
    local: {
      point: 'ci-only',
      reason:
        'needs every shard of the suite with coverage on; too slow for a hook, and the floor only rises',
    },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human:
      'covering new code needs tests that assert behaviour; raising floors is done by raise-floors after a green CI run',
  },
  {
    id: 'changed-lines-coverage',
    what: 'lines changed in a pull request must be covered at the recorded percentage',
    ci: [{ workflow: CI, job: 'changed-lines-coverage' }],
    local: {
      point: 'ci-only',
      reason: 'pull-request-only comparison over merged lcov from all shards',
    },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'the missing tests have to be written',
  },
  {
    id: 'runtime-v2-security-coverage',
    what: 'Runtime V2 security-critical files keep their coverage floor (chat-service)',
    ci: [{ workflow: CI, job: 'runtime-v2-coverage' }],
    local: { point: 'pre-push', via: 'tools/gates/pre-push.mjs', invokes: "['test'" },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'needs tests',
  },
  {
    id: 'runtime-v2-redis',
    what: 'Runtime V2 Lua scripts execute against a real Redis 7',
    ci: [{ workflow: CI, job: 'runtime-v2-redis' }],
    local: { point: 'ci-only', reason: 'needs a Redis 7 service container' },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'a Lua/Redis behaviour defect',
  },
  {
    id: 'build',
    what: 'production build of the changed workspaces',
    ci: [{ workflow: CI, job: 'build' }],
    local: { point: 'pre-push', via: 'tools/gates/pre-push.mjs', invokes: "['build'" },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'a build break is a code defect',
  },
  {
    id: 'format-ratchet',
    what: 'no new or modified Prettier violation; legacy debt only shrinks',
    ci: [{ workflow: CI, job: 'policy', step: 'Formatting ratchet' }],
    advisory: true,
    local: { point: 'pre-commit', via: 'tools/gates/autosync.mjs', invokes: 'syncFormatBaseline' },
    failable: 'yes-fixed-automatically',
    autofix: {
      kind: 'auto',
      how: 'prettier --write on staged files; dead baseline entries pruned and staged',
    },
  },
  {
    id: 'coverage-thresholds-ratchet',
    what: 'declared coverage thresholds and floors never go down',
    ci: [{ workflow: CI, job: 'policy', step: 'Coverage thresholds only go up' }],
    advisory: true,
    local: { point: 'pre-commit', via: 'tools/gates/autosync.mjs', invokes: 'syncCoverageTable' },
    failable: 'yes-fixed-automatically',
    autofix: {
      kind: 'auto',
      how: 'thresholds.mjs sync records the declared values when a vitest config is staged',
    },
  },
  {
    id: 'lint-warning-baseline',
    what: 'the ESLint warning baseline only shrinks',
    ci: [{ workflow: CI, job: 'policy', step: 'Lint warning baseline only shrinks' }],
    advisory: true,
    local: { point: 'pre-commit', via: 'tools/gates/autosync.mjs', invokes: 'syncLintBaseline' },
    failable: 'yes-fixed-automatically',
    autofix: {
      kind: 'auto',
      how: 'entries for staged (proven clean) and deleted files are pruned and staged',
    },
  },
  {
    id: 'npm-audit',
    what: 'no unreviewed high/critical advisory in production dependencies',
    ci: [
      {
        workflow: CI,
        job: 'policy',
        step: 'Production dependency audit (high/critical, reviewed allowlist)',
      },
    ],
    advisory: true,
    local: { point: 'pre-commit', via: 'tools/gates/autosync.mjs', invokes: 'audit-fix.mjs' },
    failable: 'external-state',
    autofix: {
      kind: 'auto',
      how: 'audit-fix.mjs pins the patched release (overrides), regenerates and verifies the lockfile; pre-push commits it; the daily workflow does the same on main',
    },
    human:
      'only when NO patched release exists: a reviewer writes the allowlist entry (reason, reviewedBy, expiry)',
  },
  {
    id: 'actionlint',
    what: 'workflow YAML is valid (pinned actionlint release and checksum)',
    ci: [{ workflow: CI, job: 'policy', step: 'actionlint (pinned release, pinned checksum)' }],
    advisory: true,
    local: {
      point: 'ci-only',
      reason:
        'actionlint is a Go binary that developer machines do not carry; pinned action SHAs are bumped by Dependabot PRs',
    },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human:
      'workflow logic errors need an author; version/checksum pins are maintained by Dependabot',
  },
  {
    id: 'secret-scan',
    what: 'gitleaks over the staged diff (local) and every commit the push adds (CI)',
    ci: [{ workflow: CI, job: 'secrets' }],
    local: {
      point: 'pre-commit',
      via: '.husky/pre-commit',
      invokes: 'tools/gates/secret-scan.mjs',
    },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'a secret must be rotated and removed by a person; it is never auto-redacted',
  },
  {
    id: 'codeql',
    what: 'CodeQL javascript-typescript, fail on any finding not accepted in codeql-accepted.json',
    ci: [{ workflow: CI, job: 'codeql' }],
    local: { point: 'ci-only', reason: 'needs the CodeQL engine and database' },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'a finding is a security decision (fix or reviewed acceptance)',
  },
  {
    id: 'image-scan',
    what: 'Dockerfile misconfiguration and image vulnerability scan',
    ci: [{ workflow: CI, job: 'image-scan' }],
    local: { point: 'ci-only', reason: 'needs Docker build and the scanner database' },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'base-image or Dockerfile decisions',
  },
  {
    id: 'submodule-integrity',
    what: 'the recorded coding-agent submodule pointer exists on its remote',
    ci: [{ workflow: CI, job: 'submodule-integrity' }],
    local: {
      point: 'ci-only',
      reason: "needs the submodule remote; the push order (submodule first) is the author's",
    },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'push the submodule commit before the pointer',
  },
  {
    id: 'ci-infrastructure',
    what: 'affected-matrix detection, install, shared-package build and the final CI success aggregator (no rule of its own)',
    ci: [
      { workflow: CI, job: 'changes' },
      { workflow: CI, job: 'setup' },
      { workflow: CI, job: 'ci-success' },
      { workflow: OS, job: 'changes' },
    ],
    local: { point: 'pre-push', via: 'tools/gates/pre-push.mjs', invokes: 'computeAffected' },
    failable: 'no',
    autofix: {
      kind: 'auto',
      how: 'same affected computation locally; shared packages are rebuilt by the hooks',
    },
  },
  {
    id: 'knowledge-freshness',
    what: 'generated .ai layer, workspace AGENTS.md, count fragments and inventory snapshot equal a fresh generation',
    ci: [{ workflow: OS, job: 'knowledge-freshness' }],
    local: { point: 'pre-commit', via: 'tools/affected/index.mjs', invokes: 'build.mjs' },
    failable: 'yes-fixed-automatically',
    autofix: {
      kind: 'auto',
      how: 'pre-commit regenerates and stages every derived file incl. count-fragment docs; pre-push regenerates and commits the rest as chore(knowledge)',
    },
  },
  {
    id: 'knowledge-integrity',
    what: 'links, docs checks, no hook bypass, contradictions, docs:impact per commit, knowledge coverage',
    ci: [{ workflow: OS, job: 'knowledge-integrity' }],
    local: {
      point: 'commit-msg',
      via: '.husky/commit-msg',
      invokes: 'tools/knowledge/docs-impact.mjs',
    },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human:
      'the Docs: trailer must truthfully say which doc changed (rule 63); counts and links are regenerated, prose is not',
  },
  {
    id: 'commitlint',
    what: 'conventional commit subject (type, scope, case, length)',
    ci: [],
    local: { point: 'commit-msg', via: '.husky/commit-msg', invokes: 'commitlint' },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'the message describes the change; only its author can word it',
  },
  {
    id: 'qa-evidence',
    what: 'every feat/fix/perf product commit has a valid docs/qa-evidence record in the range',
    ci: [{ workflow: OS, job: 'qa-evidence' }],
    local: { point: 'pre-push', via: 'tools/gates/pre-push.mjs', invokes: 'qaEvidenceProblem' },
    failable: 'yes-needs-judgment',
    autofix: {
      kind: 'scaffold',
      how: 'pre-push writes the unfilled skeleton and names the file; it never writes PASS (rule 60)',
    },
    human: 'the lanes must actually be walked; evidence is never fabricated',
  },
  {
    id: 'tooling-tests',
    what: 'node:test suites for audit, knowledge, affected and gates tooling',
    ci: [{ workflow: OS, job: 'tooling-tests' }],
    local: { point: 'pre-push', via: 'tools/gates/pre-push.mjs', invokes: 'runRootChecks' },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'a failing tooling test is a defect',
  },
  {
    id: 'architecture-rules',
    what: 'ESLint architecture rule tests',
    ci: [{ workflow: OS, job: 'architecture-rules' }],
    local: { point: 'pre-push', via: 'tools/gates/pre-push.mjs', invokes: 'runRootChecks' },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'a rule regression is a defect',
  },
  {
    id: 'deploy-rehearsal',
    what: 'end-to-end deploy script rehearsal when deploy paths change',
    ci: [{ workflow: OS, job: 'deploy-rehearsal' }],
    local: {
      point: 'ci-only',
      reason:
        'needs a Linux shell and takes minutes; runs via npm run knowledge:test:rehearsal on demand',
    },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'a deploy-script defect',
  },
  {
    id: 'lighthouse',
    what: 'Lighthouse performance/accessibility/SEO budgets on the built frontend',
    ci: [
      { workflow: 'lighthouse.yml', job: 'build' },
      { workflow: 'lighthouse.yml', job: 'audit' },
      { workflow: 'lighthouse.yml', job: 'lighthouse' },
    ],
    advisory: true,
    local: { point: 'ci-only', reason: 'needs a browser against the built app' },
    failable: 'yes-needs-judgment',
    autofix: { kind: 'none', how: '' },
    human: 'page weight/markup regressions need a design decision',
  },
  {
    id: 'dependency-remediation',
    what: 'scheduled production-advisory remediation so main never sits red on external state',
    ci: [{ workflow: 'dependency-remediation.yml', job: 'remediate' }],
    local: { point: 'pre-push', via: 'tools/gates/self-heal.mjs', invokes: 'audit-fix.mjs' },
    failable: 'external-state',
    autofix: { kind: 'auto', how: 'daily cron runs audit-fix.mjs and pushes a chore(deps) commit' },
  },
  {
    id: 'delivery-workflows',
    what: 'release, deploy, wiki publish and platform detection workflows: delivery, not gates (release depends only on ci-success)',
    ci: [
      { workflow: 'release.yml', job: 'release' },
      { workflow: 'release.yml', job: 'deploy' },
      { workflow: 'deploy-production.yml', job: 'deploy' },
      { workflow: 'publish-wiki.yml', job: 'publish' },
      { workflow: 'claw-sh-gpu-detection.yml', job: 'detection-linux' },
      { workflow: 'claw-sh-gpu-detection.yml', job: 'detection-macos' },
    ],
    local: {
      point: 'ci-only',
      reason:
        'run after merge; the version, notes and wiki are derived by CI so nothing for a commit to forget',
    },
    failable: 'no',
    autofix: {
      kind: 'auto',
      how: 'version bump, release notes and wiki pages are generated in CI, never hand-maintained',
    },
  },
];
