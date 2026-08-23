import {
  FEEDBACK_ALLOWED_LINK_PROTOCOLS,
  FEEDBACK_MAX_CONTENT_LENGTH,
} from '@claw/shared-constants';

import {
  FEEDBACK_DANGEROUS_URL_SCHEMES,
  FEEDBACK_HTML_ENTITY_REPLACEMENTS,
  FEEDBACK_MAX_DECODE_PASSES,
} from '../constants/feedback-sanitizer.constants';

// THE authoritative sanitizer. Anything the client does is convenience only —
// feedback content is hostile input and is cleaned here before it is stored.
//
// Feedback is stored and rendered as Markdown through react-markdown WITHOUT
// rehype-raw, so raw HTML is already inert on render. Stripping it here as well
// means a ticket can never carry markup to any other consumer either.

// Removes every C0/C1 control character except newline and tab, by code point,
// so no control byte is ever embedded in this source file. A NUL reaching
// Postgres is an unhandled 500, not a validation error.
function stripControlCharacters(value: string): string {
  let output = '';
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    const isAllowedWhitespace = character === '\n' || character === '\t';
    const isControl = code < 32 || (code >= 127 && code <= 159);
    if (isAllowedWhitespace || !isControl) {
      output += character;
    }
  }
  return output;
}

// Decodes percent- and entity-encoded forms repeatedly so an obfuscated
// `java&#115;cript:` or `java%73cript:` is judged on what it actually resolves
// to. Used for the DECISION only — the stored text keeps the author's spelling.
function fullyDecode(target: string): string {
  let current = target.trim();
  let previous = '';
  let passes = 0;

  while (passes < FEEDBACK_MAX_DECODE_PASSES && current !== previous) {
    previous = current;
    try {
      current = decodeURIComponent(current);
    } catch {
      // A malformed percent-escape simply ends the decode loop.
    }
    current = current.replaceAll(/&#x([0-9A-Fa-f]+);?/gi, (_match: string, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    );
    current = current.replaceAll(/&#(\d+);?/g, (_match: string, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    );
    current = current.replaceAll(
      /&([a-zA-Z0-9]+);?/g,
      (entityMatch: string, entityName: string) =>
        FEEDBACK_HTML_ENTITY_REPLACEMENTS[entityName.toLowerCase()] ?? entityMatch,
    );
    passes += 1;
  }

  return current;
}

function isSafeLinkTarget(target: string): boolean {
  const decoded = fullyDecode(target);
  const collapsed = stripControlCharacters(decoded).replaceAll(/\s/g, '').toLowerCase();

  if (FEEDBACK_DANGEROUS_URL_SCHEMES.some((scheme) => collapsed.startsWith(scheme))) {
    return false;
  }

  try {
    const url = new URL(decoded);
    return (FEEDBACK_ALLOWED_LINK_PROTOCOLS as readonly string[]).includes(url.protocol);
  } catch {
    // Not absolute. A relative path is fine; anything carrying a scheme-like
    // prefix before the first slash is not.
    const colon = collapsed.indexOf(':');
    const slash = collapsed.indexOf('/');
    return colon === -1 || (slash !== -1 && slash < colon);
  }
}

export function sanitizeFeedbackMarkdown(input: string): string {
  if (input.length === 0) {
    return '';
  }

  let result = stripControlCharacters(input.normalize('NFC'));

  // Drop HTML comments first so a comment cannot hide a tag from the tag pass.
  result = result.replaceAll(/<!--[\s\S]*?-->/g, '');
  result = result.replaceAll(/<[^>]*>/g, '');

  // Any Markdown link or image whose target is not provably safe collapses to
  // its visible text, so the payload is gone but the author's words survive.
  result = result.replaceAll(
    /(!?)\[([^\]]*)\]\(([^)]+)\)/g,
    (match: string, _bang: string, text: string, target: string) =>
      isSafeLinkTarget(target) ? match : text,
  );

  return result.slice(0, FEEDBACK_MAX_CONTENT_LENGTH);
}

export function toSearchText(markdown: string): string {
  return markdown
    .replaceAll(/```[\s\S]*?```/g, ' ')
    .replaceAll(/^#{1,6}\s+/gm, '')
    .replaceAll(/(\*\*|__)(.*?)\1/g, '$2')
    .replaceAll(/(\*|_)(.*?)\1/g, '$2')
    .replaceAll(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replaceAll(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replaceAll(/`([^`]+)`/g, '$1')
    .replaceAll(/^\s*>\s+/gm, '')
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
