import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A structural regression guard for ADR-118's 2026-09-24 update (rule 41
 * item 15).
 *
 * The 7 lab modes (repair, decompose, best-of-n, cost-ensemble, verifier,
 * pipeline, role-pack) each call `ResearchEnricherManager.enrichForOrchestration`
 * once, then must hand the result to `ChatContextGatewayManager.build()` as
 * `researchEvidenceInstruction` — the one field routed through
 * `injectResearchEvidenceIntoContext`, which sets
 * `AssembledContext.researchGroundingInjected` and makes
 * `ContextAssemblyManager.hasResearchGrounding()` fire the final-user-turn
 * reminder. `ChatContextGatewayManager.__tests__` proves the gateway side of
 * this once, for every caller; this test proves the 7 callers did not drift
 * back to the pre-fix shape (`personaInstruction: enrichment.systemPrompt`),
 * which type-checks and compiles cleanly — it merges the evidence text in
 * exactly as before, but silently drops the grounding flag, exactly the
 * defect this whole ADR is about.
 *
 * A behavioural (constructor-mocked) test per manager would also catch this,
 * but each of these 7 managers takes 6-9 constructor dependencies spanning
 * repositories, stream services and multiple other managers — mocking all of
 * them 7 times to prove one `build()` call site uses the right field name is
 * far more fragile than reading the source, and the gateway-level spec above
 * already proves the runtime behaviour once evidence reaches `build()`.
 */
const MANAGERS_DIR = join(__dirname, '..');

const LAB_MODES = [
  'answer-repair.manager.ts',
  'task-decomposition.manager.ts',
  'best-of-n.manager.ts',
  'cost-ensemble.manager.ts',
  'verifier.manager.ts',
  'pipeline.manager.ts',
  'role-pack.manager.ts',
] as const;

describe('lab-mode research evidence wiring', () => {
  it.each(LAB_MODES)('%s enriches with research and calls enrichForOrchestration', (file) => {
    const source = readFileSync(join(MANAGERS_DIR, file), 'utf8');
    expect(source).toContain('enrichForOrchestration');
  });

  it.each(LAB_MODES)(
    '%s passes the enrichment result as researchEvidenceInstruction, not personaInstruction',
    (file) => {
      const source = readFileSync(join(MANAGERS_DIR, file), 'utf8');

      expect(source).toContain('researchEvidenceInstruction: enrichment.systemPrompt');
      // The pre-fix shape merged evidence in via the generic persona field,
      // which never sets `researchGroundingInjected`. If this ever
      // reappears, the final-user-turn reminder silently stops firing again.
      expect(source).not.toContain('personaInstruction: enrichment.systemPrompt');
    },
  );
});
