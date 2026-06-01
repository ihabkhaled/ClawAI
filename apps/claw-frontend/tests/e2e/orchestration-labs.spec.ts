import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

// ─── Test config overrides ───────────────────────────────────────────
// We talk through nginx at https://claw.local because that is the only
// origin where admin permissions, RBAC, and SSE wiring work the way
// production does. Self-signed mkcert leaf cert => ignoreHTTPSErrors.
test.use({
  baseURL: 'https://claw.local',
  ignoreHTTPSErrors: true,
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@claw.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ClawAdmin123!';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../../../qa');
// Orchestration pipelines fan out across multiple LLM calls; even on
// small local models a full Consensus / Best-of-N / Pipeline run can
// run for 2–4 minutes. We give each lab page a generous wall-clock
// budget so we time-out the test only when the BE is truly hung.
const ORCHESTRATION_RESULT_TIMEOUT_MS = 240_000;
const DETERMINISTIC_PROMPT = 'Reply with the literal word PASS only. No punctuation.';
// Smallest installed local model preferences — we pick the first one
// whose dropdown label matches any of these substrings before falling
// back to the truly first entry in the model selector. This keeps the
// orchestration tests fast and bounded even though they fan out across
// multiple LLM calls.
const PREFERRED_MODEL_HINTS: readonly string[] = [
  'qwen2.5-coder:0.5b',
  'llama3.2:1b',
  'qwen2.5-coder:1.5b',
  'qwen3:1.7b',
  'smollm',
];

type OrchestrationRoute = {
  slug: string;
  path: string;
  // Pre-built case-insensitive regex over a literal segment of the page
  // heading (taken from en.ts). Keeping these as literal regex pinned at
  // module scope avoids a dynamic `new RegExp(...)` call inside the test.
  headingRegex: RegExp;
};

const ROUTES: OrchestrationRoute[] = [
  { slug: 'consensus', path: '/chat/consensus', headingRegex: /Consensus/i },
  { slug: 'escalation', path: '/chat/escalation', headingRegex: /Escalation/i },
  { slug: 'repair', path: '/chat/repair', headingRegex: /Repair/i },
  { slug: 'decompose', path: '/chat/decompose', headingRegex: /Decompos/i },
  { slug: 'best-of-n', path: '/chat/best-of-n', headingRegex: /Best-of-N/i },
  { slug: 'verify', path: '/chat/verify', headingRegex: /Verifier/i },
  { slug: 'pipeline', path: '/chat/pipeline', headingRegex: /Pipeline/i },
  { slug: 'cost-ensemble', path: '/chat/cost-ensemble', headingRegex: /Cost/i },
  { slug: 'role-pack', path: '/chat/role-pack', headingRegex: /Role/i },
];

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: /^password$/i }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /^(sign in|login)$/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20_000 });
}

async function selectFirstAvailableModel(page: Page): Promise<string> {
  // The single-model picker is rendered by OrchestrationSingleModelSelect with
  // id="orchestration-single-model-select" on the SelectTrigger.
  const trigger = page.locator('#orchestration-single-model-select');
  await expect(trigger, 'Single-model select trigger should be in the DOM').toBeVisible({
    timeout: 15_000,
  });

  // Wait until the trigger reports as enabled. Disabled === models loading
  // or list is empty.
  await expect(trigger).toBeEnabled({ timeout: 20_000 });

  await trigger.click();

  // Radix portals the listbox to body, so we scope to role=option globally.
  const options = page.getByRole('option');
  const count = await options.count();
  if (count === 0) {
    throw new Error(
      'Single-model select is empty — no local Ollama models are exposed to the orchestration shell. ' +
        'Ensure at least one local-ollama model is installed before running this spec.',
    );
  }

  // Prefer a known-small model so the orchestration pipeline finishes
  // within the test budget. Walk the dropdown looking for a label that
  // contains any of the PREFERRED_MODEL_HINTS substrings; if none of
  // them are installed, fall back to the very first option.
  for (const hint of PREFERRED_MODEL_HINTS) {
    const matching = options.filter({ hasText: hint }).first();
    if ((await matching.count()) > 0) {
      const label = (await matching.textContent())?.trim() ?? hint;
      await matching.click();
      return label;
    }
  }

  const first = options.first();
  const label = (await first.textContent())?.trim() ?? '<unknown>';
  await first.click();
  return label;
}

async function fillPromptAndSubmit(page: Page, currentSlug: string): Promise<Locator> {
  const prompt = page.locator('#orchestration-prompt');
  await expect(prompt).toBeVisible();
  await prompt.fill(DETERMINISTIC_PROMPT);

  // The submit button lives at the bottom of the input Card. The shell
  // renders it with an explicit `type="button"` attribute (see
  // OrchestrationPageShell). Multi-model picker rows are bare <button>
  // tags without a type attribute, so we narrow to type="button" to
  // identify the submit specifically.
  const promptSection = page
    .locator('section')
    .filter({ has: page.locator('#orchestration-prompt') })
    .first();
  const submitButton = promptSection.locator('button[type="button"]').last();

  // Pages whose shell `isSubmitDisabled` gate is permissive (only
  // requires lead model + prompt) but whose BE-level minimum demands
  // a multi-model fleet (Consensus, Best-of-N, Cost Ensemble) need at
  // least one extra row ticked in the parallel-model picker. We always
  // try to tick one picker row here when one is available — it is a
  // safe no-op on pages that don't have the picker.
  await tickFirstExtraPickerRow(page, promptSection, currentSlug);

  // Pages whose `isSubmitDisabled` gate is strict (multi-model min,
  // sub-task count, etc.) may still need additional ticks. Loop until
  // submit is enabled or we exhaust the candidates.
  await waitForSubmitEnabledWithCheckboxes(page, promptSection);

  await expect(submitButton).toBeEnabled({ timeout: 15_000 });
  await submitButton.click();
  // Give the controller hook one tick to flip into the pending state so
  // the subsequent `waitForOutcome` can race on submit re-enable.
  await page.waitForTimeout(200);
  return submitButton;
}

async function tickFirstExtraPickerRow(
  page: Page,
  promptSection: Locator,
  currentSlug: string,
): Promise<void> {
  // Pages that need an extra multi-model row ticked. Consensus and
  // Best-of-N have hard 2-model BE minimums. Cost Ensemble lets a
  // single-model run pass. Others (Repair, Decompose, Verify,
  // Pipeline, Escalation, Role Pack) do not surface a multi-model
  // fleet picker at all.
  const SLUGS_NEEDING_EXTRA_MODEL = new Set(['consensus', 'best-of-n', 'cost-ensemble']);
  if (!SLUGS_NEEDING_EXTRA_MODEL.has(currentSlug)) {
    return;
  }

  // The parallel-model-selector renders inside the prompt section as a
  // bordered list of <button> rows with no type attribute. We look for
  // the first such button AFTER the model-select trigger (index 0) and
  // BEFORE the submit (last index). Pick a small model name as a safe
  // pick — anything that satisfies fleet>=2 works.
  const allButtons = promptSection.locator('button');
  const total = await allButtons.count();
  for (let i = 1; i < total - 1; i += 1) {
    const candidate = allButtons.nth(i);
    const typeAttr = await candidate.getAttribute('type').catch(() => null);
    if (typeAttr === 'button') {
      continue;
    }
    const candidateRole = await candidate.getAttribute('role').catch(() => null);
    if (candidateRole === 'combobox') {
      continue;
    }
    if (!(await candidate.isEnabled().catch(() => false))) {
      continue;
    }
    await candidate.click({ force: true });
    await page.waitForTimeout(300);
    return;
  }
}

async function waitForSubmitEnabledWithCheckboxes(
  page: Page,
  promptSection: Locator,
): Promise<void> {
  // The submit button always has `type="button"`. Sub-picker buttons
  // (ParallelModelSelector rows, etc.) do not.
  const submitCandidate = promptSection.locator('button[type="button"]').last();

  // Try up to 6 rounds of toggling extra options. Some orchestration
  // labs (Consensus, Best-of-N, Cost Ensemble, Role Pack) require
  // ticking multi-model rows; others (Repair, Decompose, Verify) have
  // additional checkbox/select fields. We tick anything that looks
  // tickable but is not the model-select trigger and not the submit
  // button.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await submitCandidate.isEnabled().catch(() => false)) {
      return;
    }

    // 1. Native <input type="checkbox">.
    const nativeCheckboxes = page.locator('input[type="checkbox"]:not(:checked)');
    if ((await nativeCheckboxes.count()) > 0) {
      await nativeCheckboxes.first().click({ force: true });
      await page.waitForTimeout(250);
      continue;
    }

    // 2. Radix [role="checkbox"] state="unchecked".
    const radixCheckboxes = page.locator(
      '[role="checkbox"][aria-checked="false"], [role="checkbox"][data-state="unchecked"]',
    );
    if ((await radixCheckboxes.count()) > 0) {
      await radixCheckboxes.first().click({ force: true });
      await page.waitForTimeout(250);
      continue;
    }

    // 3. ParallelModelSelector renders bare <button> rows whose text
    //    is the model display name. We iterate ALL buttons in the
    //    input section, skip the model-select trigger and the submit
    //    button, and click the first one that looks like an option.
    const allButtons = promptSection.locator('button');
    const total = await allButtons.count();
    let clicked = false;
    for (let i = 0; i < total; i += 1) {
      const candidate = allButtons.nth(i);
      const elementId = await candidate.getAttribute('id').catch(() => null);
      if (elementId === 'orchestration-single-model-select') {
        continue;
      }
      const typeAttr = await candidate.getAttribute('type').catch(() => null);
      if (typeAttr === 'button') {
        // This is the submit (orchestration shell forces type="button").
        // Skip — only the multi-model picker rows have no type.
        continue;
      }
      const candidateRole = await candidate.getAttribute('role').catch(() => null);
      if (candidateRole === 'combobox') {
        continue;
      }
      if (await candidate.isEnabled().catch(() => false)) {
        await candidate.click({ force: true });
        clicked = true;
        await page.waitForTimeout(300);
        break;
      }
    }
    if (!clicked) {
      return;
    }
  }
}

async function waitForOutcome(
  page: Page,
  submitButton: Locator,
): Promise<'result' | 'error' | 'timeout'> {
  // The orchestration shell places its error alert INSIDE the output
  // section (`<section aria-live="polite">`). Global toasters live in a
  // separate Sonner region that also exposes role=alert, so we MUST
  // scope to the output column to avoid false positives.
  //
  // We treat a run as resolved when EITHER an error alert appears OR
  // the submit button stops being disabled (`isPending` flips back to
  // false in the controller hook). The output column's `aria-live`
  // region can contain progress messages with the literal substring
  // "PASS" / "Passed" while the run is still in flight, so we must
  // wait for the pending flag to clear before we look at it.
  const outputSection = page.locator('section[aria-live="polite"]').first();
  const errorAlert = outputSection.getByRole('alert').first();

  try {
    await Promise.race([
      errorAlert.waitFor({ state: 'visible', timeout: ORCHESTRATION_RESULT_TIMEOUT_MS }),
      // The submit button is disabled while `isPending` is true. As
      // soon as the controller hook flips back to idle, it becomes
      // enabled again — that's our terminal signal.
      expect(submitButton).toBeEnabled({ timeout: ORCHESTRATION_RESULT_TIMEOUT_MS }),
    ]);
  } catch {
    return 'timeout';
  }

  // Re-check error alert visibility — Promise.race might have resolved
  // on the submit-enabled branch while an error rendered moments after.
  await page.waitForTimeout(500);
  if (await errorAlert.isVisible().catch(() => false)) {
    return 'error';
  }
  return 'result';
}

test.describe('Orchestration lab sweep', () => {
  // Per-test wall budget = login (≈10 s) + page load (≈5 s) + setup
  // (≈10 s) + orchestration result wait (240 s) + screenshot (≈2 s)
  // ≈ 270 s. We round up to 300 s for headroom.
  test.describe.configure({ timeout: 300_000 });

  for (const route of ROUTES) {
    test(`${route.slug}: renders, submits, and produces an outcome`, async ({ page }) => {
      await login(page);
      await page.goto(route.path);

      // 1. Heading visible.
      const heading = page.getByRole('heading').filter({ hasText: route.headingRegex }).first();
      await expect(
        heading,
        `Page heading matching ${route.headingRegex} must be visible on ${route.path}`,
      ).toBeVisible({ timeout: 20_000 });

      // 2. Single-model selector exists.
      const trigger: Locator = page.locator('#orchestration-single-model-select');
      await expect(trigger, 'Single-model select must exist').toBeAttached({ timeout: 15_000 });

      // 3. Pick first available model.
      const chosen = await selectFirstAvailableModel(page);
      test.info().annotations.push({ type: 'model', description: chosen });

      // 4. Fill prompt + click submit.
      const submitButton = await fillPromptAndSubmit(page, route.slug);

      // 5. Wait for outcome.
      const outcome = await waitForOutcome(page, submitButton);

      // 6. Screenshot regardless of outcome (use full page).
      const screenshotPath = path.join(SCREENSHOT_DIR, `orchestration-${route.slug}-final.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      test.info().attachments.push({
        name: `${route.slug}-final.png`,
        path: screenshotPath,
        contentType: 'image/png',
      });

      // 7. Assert outcome.
      if (outcome === 'timeout') {
        throw new Error(
          `Route ${route.path} did not render a result or error within ${ORCHESTRATION_RESULT_TIMEOUT_MS}ms`,
        );
      }
      if (outcome === 'error') {
        const errText =
          (
            await page
              .locator('section[aria-live="polite"]')
              .first()
              .getByRole('alert')
              .first()
              .textContent()
          )?.trim() ?? '<empty>';
        throw new Error(`Route ${route.path} surfaced an error alert: ${errText}`);
      }

      // Outcome === 'result'. Verify the literal PASS text rendered.
      const responseText = (
        await page.locator('section[aria-live="polite"]').first().textContent()
      )?.toUpperCase();
      expect(
        responseText,
        `Response on ${route.path} should contain the literal word PASS`,
      ).toMatch(/PASS/);
    });
  }
});
