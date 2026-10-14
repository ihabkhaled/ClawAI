/** JSON reply an author must return; keys stay English whatever the article language. */
export const AUTHOR_REPLY_SHAPE =
  '{"markdown": string, "citations": [{"evidenceId": string, "url": string}]}';

export const AUTHOR_REPLY_EXAMPLE =
  '{"markdown":"# Title\\n\\nA claim [abc123].","citations":[{"evidenceId":"abc123","url":"https://example.com/a"}]}';
