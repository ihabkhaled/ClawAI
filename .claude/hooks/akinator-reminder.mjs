// UserPromptSubmit hook: prints a short reminder that goes into the model's context on every prompt.
// Display-only: no network, no file access, never returns a permission decision, always exits 0.
// Rule: rules/65-akinator-runs-on-every-change.md. Decision: docs/13-adr/adr-207-*.md.
const lines = [
  'AKINATOR RUNS ON EVERY CHANGE, NO COMMAND NEEDED (rules/65): ask, resolve, audit, plan, implement, document, skillify, rule, contextify, memoize, index+sync, verify. Procedure: skills/akinator/SKILL.md.',
  'DECLARE THE KNOWLEDGE DELTA BY PATH, OR WRITE "knowledge delta: none, because <reason>". DOCS MOVE WITH CODE (rules/63).',
  'A NEW FLAGSHIP, CORE OR BIG FEATURE SHIPS ITS PUBLIC MARKETING PAGE IN THE SAME CHANGE (rules/66).',
];
process.stdout.write(`${lines.join('\n')}\n`);
process.exit(0);
