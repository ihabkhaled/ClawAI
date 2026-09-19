import { describe, expect, it } from 'vitest';

import {
  EXPORT_MAX_CONTENT_CHARS,
  GENERATE_MAX_CONTENT_CHARS,
  GENERATE_MAX_PROMPT_CHARS,
} from '../../../modules/file-generation/constants/file-asset.constants';
import { JSON_BODY_LIMIT_BYTES, MAX_JSON_BYTES_PER_CHAR } from '../http.constants';

// A DTO bound the transport cannot carry is a lie: the request fails in
// body-parser before validation ever runs. Express's 100kb default did exactly
// that to every file and export over ~100k characters.
describe('JSON_BODY_LIMIT_BYTES', () => {
  it('holds the largest internal generate request at the worst bytes per character', () => {
    const worst =
      (GENERATE_MAX_PROMPT_CHARS + GENERATE_MAX_CONTENT_CHARS) * MAX_JSON_BYTES_PER_CHAR;
    expect(worst).toBeLessThan(JSON_BODY_LIMIT_BYTES);
  });

  it('holds the largest answer export at the worst bytes per character', () => {
    expect(EXPORT_MAX_CONTENT_CHARS * MAX_JSON_BYTES_PER_CHAR).toBeLessThan(JSON_BODY_LIMIT_BYTES);
  });

  // The bound that makes a character cost six bytes.
  it('counts a control character as a six-byte escape', () => {
    expect(JSON.stringify(String.fromCharCode(1)).length - 2).toBe(MAX_JSON_BYTES_PER_CHAR);
  });
});
