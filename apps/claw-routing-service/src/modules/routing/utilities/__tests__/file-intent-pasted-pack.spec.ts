import { detectImageGenerationSignals } from '@claw/shared-utilities';
import { detectFileIntent } from '../file-intent.utility';

const PACK = [
  '# MYONCARE QA CONTEXT PACK',
  '',
  '## IMPORTANT — CONTEXT ONLY',
  '',
  'This text is a **context pack for an AI assistant**.',
  '',
  'DO NOT generate an image, diagram, document, attachment, or visual from this text.',
  '',
  'DO NOT treat this text as a request to create anything.',
  '',
  ...Array.from(
    { length: 400 },
    (_, i) =>
      `## ${String(i)}. Export rules\n\nThe PDF export and the DOCX report are generated nightly; create a CSV file for audits.\n`,
  ),
].join('\n');

describe('routing never turns a pasted context pack into a generation (owner bug 10)', () => {
  it('a 45K+ pack with file words in its body is not a file request', () => {
    expect(PACK.length).toBeGreaterThan(40_000);
    expect(detectFileIntent(PACK).isFileRequest).toBe(false);
  });

  it('the same pack is not an image request', () => {
    expect(detectImageGenerationSignals(PACK).matched).toBe(false);
  });

  it('"save this as context" + pack is neither', () => {
    const message = `Save this as context:\n\n${PACK}`;
    expect(detectFileIntent(message).isFileRequest).toBe(false);
    expect(detectImageGenerationSignals(message).matched).toBe(false);
  });

  it('a negated file request is not a file request', () => {
    expect(detectFileIntent('Do not create a PDF file, just answer in chat.').isFileRequest).toBe(
      false,
    );
  });

  it('an explicit request before a pasted body still produces the file', () => {
    expect(detectFileIntent(`Export this as a PDF file:\n\n${PACK}`).isFileRequest).toBe(true);
  });

  it('a plain file request is unchanged', () => {
    expect(detectFileIntent('Create a PDF report about sleep hygiene').isFileRequest).toBe(true);
  });
});
