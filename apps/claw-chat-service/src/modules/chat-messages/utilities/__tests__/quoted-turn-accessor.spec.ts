import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ADR-130 enforcement. A manager that hands the user's request to a model
 * must read it through `latestUserTurnText`, or a quote-only turn ("explain
 * this" with nothing typed) reaches that model as an empty string. The
 * judge, critic, image and file prompts all did exactly that before the
 * accessor existed.
 *
 * Detecting what the USER typed ("continue", "remember this", edit intent) is
 * a different question and lives in services/ or reads `.content` without the
 * optional chain — neither matches this pattern.
 */
const MANAGERS_DIR = join(__dirname, '..', '..', 'managers');
const RAW_LAST_USER_READ = /\blastUser(?:Msg|Message)?\?\.content\b/;

describe('managers read the latest user turn through latestUserTurnText', () => {
  const managerFiles = readdirSync(MANAGERS_DIR).filter((name) => name.endsWith('.manager.ts'));

  it('finds the managers to check', () => {
    expect(managerFiles.length).toBeGreaterThan(10);
  });

  it.each(managerFiles)('%s does not read the last user content raw', (name) => {
    const source = readFileSync(join(MANAGERS_DIR, name), 'utf8');

    expect(source).not.toMatch(RAW_LAST_USER_READ);
  });
});
