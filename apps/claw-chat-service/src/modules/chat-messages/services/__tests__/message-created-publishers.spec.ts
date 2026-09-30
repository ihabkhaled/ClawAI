import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Rule 46 §1 / ADR-132 enforcement: every chat-service path that publishes
 * `message.created` must carry the plan's `modelAccessMode` (and therefore
 * have resolved entitlements, which only `assertCanSendMessage` returns).
 * Routing treats a missing mode as "restricted to nothing", and the paths
 * that forgot it — regenerate, then edit-and-rerun — were found one at a time.
 * A new re-run path (continue, lane retry, send-to-lab) fails here until it
 * does the same.
 */
const SERVICES_DIR = join(__dirname, '..');
const PUBLISH = /publish(?:Confirmed)?\(EventPattern\.MESSAGE_CREATED,/g;
const PUBLISH_WINDOW = 1_600;

/**
 * Deliberate exceptions, each with its reason. Runtime V2 is the coding-agent
 * runtime: it resolves its own `allowedModels` through
 * `RuntimeV2RoutingSelection` and omits the mode, which routing reads as
 * restricted (fail-closed, never wider). Recorded in rule 46 §1.
 */
const ALLOWED_WITHOUT_ACCESS_MODE = new Set(['runtime-v2-run.service.ts']);

describe('every message.created publisher carries the plan access mode', () => {
  const files = readdirSync(SERVICES_DIR).filter((name) => name.endsWith('.service.ts'));
  const publishers = files.flatMap((name) => {
    const source = readFileSync(join(SERVICES_DIR, name), 'utf8');
    return [...source.matchAll(PUBLISH)].map((match) => ({
      name,
      window: source.slice(match.index, match.index + PUBLISH_WINDOW),
    }));
  });

  it('finds the known publishers', () => {
    expect(publishers.length).toBeGreaterThanOrEqual(4);
  });

  it.each(publishers.filter((entry) => !ALLOWED_WITHOUT_ACCESS_MODE.has(entry.name)))(
    '$name publishes modelAccessMode with message.created',
    ({ window }) => {
      expect(window).toMatch(/modelAccessMode/);
    },
  );
});
