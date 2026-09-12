// RTF plain-text extraction.
//
// An RTF file is ASCII, so decoding it as UTF-8 "works" and produces something
// that looks like text — which is why this format was never noticed as broken.
// What the model actually received was the control-word soup around the prose:
// `{\rtf1\ansi\deff0{\fonttbl{\f0 Times;}}\f0\fs24 Hello}`. This strips the
// markup and leaves the sentence.
//
// Deliberately a small reader rather than a dependency: RTF is a dead format we
// accept for compatibility, and only its visible text matters here.

import { Logger } from '@nestjs/common';

const logger = new Logger('RtfParserUtility');

// Groups whose entire contents are metadata, never body text. Keeping them
// would put font names and colour tables into the model's prompt.
const DISCARDED_DESTINATIONS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'pict',
  'object',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'datastore',
  'generator',
  'listtable',
  'listoverridetable',
  'rsidtbl',
  'xmlnstbl',
]);

// The RTF spec caps a control word at 32 letters; anything longer is malformed.
const MAX_CONTROL_WORD_LENGTH = 32;
// Enough for any real parameter, and a bound on an attacker-supplied run.
const MAX_CONTROL_PARAMETER_DIGITS = 10;

// Control words that stand for a character rather than a formatting change.
const LITERAL_CONTROL_WORDS = new Map<string, string>([
  ['par', '\n'],
  ['line', '\n'],
  ['sect', '\n\n'],
  ['page', '\n\n'],
  ['tab', '\t'],
  ['cell', '\t'],
  ['row', '\n'],
  ['emdash', '—'],
  ['endash', '–'],
  ['lquote', '‘'],
  ['rquote', '’'],
  ['ldblquote', '“'],
  ['rdblquote', '”'],
  ['bullet', '•'],
  ['nbsp', ' '],
]);

export function extractTextFromRtf(buffer: Buffer): string {
  const rtf = buffer.toString('latin1');
  logger.debug(`extractTextFromRtf: parsing RTF — bufferSize=${String(buffer.length)}`);

  const out: string[] = [];
  // One entry per open brace. `skip` marks a group whose text is metadata.
  const stack: { skip: boolean }[] = [{ skip: false }];
  let index = 0;

  const top = (): { skip: boolean } => stack.at(-1) ?? { skip: false };

  while (index < rtf.length) {
    const char = rtf.at(index);

    if (char === '{') {
      stack.push({ skip: top().skip });
      index += 1;
      continue;
    }

    if (char === '}') {
      if (stack.length > 1) {
        stack.pop();
      }
      index += 1;
      continue;
    }

    if (char === '\\') {
      index = consumeControl(rtf, index, stack, out);
      continue;
    }

    if (char === '\r' || char === '\n') {
      // A raw newline in the source is layout, not content; `\par` is the break.
      index += 1;
      continue;
    }

    if (!top().skip && char !== undefined) {
      out.push(char);
    }
    index += 1;
  }

  const text = collapseBlankLines(out.join(''));
  logger.debug(`extractTextFromRtf: extracted ${String(text.length)} chars`);
  return text;
}

function consumeControl(
  rtf: string,
  start: number,
  stack: { skip: boolean }[],
  out: string[],
): number {
  const skipping = (stack.at(-1) ?? { skip: false }).skip;
  const next = rtf.at(start + 1);

  if (next === undefined) {
    return start + 1;
  }

  // \\ \{ \} are escaped literals.
  if (next === '\\' || next === '{' || next === '}') {
    if (!skipping) {
      out.push(next);
    }
    return start + 2;
  }

  // \'xx is a single byte in the current code page.
  if (next === "'") {
    const hex = rtf.slice(start + 2, start + 4);
    if (/^[0-9a-fA-F]{2}$/.test(hex)) {
      if (!skipping) {
        out.push(String.fromCodePoint(Number.parseInt(hex, 16)));
      }
      return start + 4;
    }
    return start + 2;
  }

  // \* introduces an extension destination that readers may ignore wholesale.
  if (next === '*') {
    const frame = stack.at(-1);
    if (frame) {
      frame.skip = true;
    }
    return start + 2;
  }

  const control = readControlWord(rtf, start);
  if (!control) {
    return start + 2;
  }
  const { word, parameter, length } = control;

  if (DISCARDED_DESTINATIONS.has(word.toLowerCase())) {
    const frame = stack.at(-1);
    if (frame) {
      frame.skip = true;
    }
    return start + length;
  }

  // \uN is a Unicode code point followed by a code-page fallback character that
  // must be swallowed, or the text shows every accented letter twice.
  if (word === 'u' && parameter !== undefined) {
    if (!skipping) {
      const code = Number.parseInt(parameter, 10);
      out.push(String.fromCodePoint(code < 0 ? code + 0x1_00_00 : code));
    }
    return skipFallbackCharacter(rtf, start + length);
  }

  const literal = LITERAL_CONTROL_WORDS.get(word);
  if (literal !== undefined && !skipping) {
    out.push(literal);
  }

  return start + length;
}

/**
 * Reads a control word, its optional signed integer parameter, and the single
 * optional space that terminates it.
 *
 * Scanned by hand rather than matched with one regular expression. The natural
 * pattern puts an optional numeric group next to an optional space, and that
 * shape backtracks — on a file an attacker uploads, which is the wrong place to
 * be clever. The loops here are bounded and the character tests fixed-width.
 */
function readControlWord(
  rtf: string,
  start: number,
): { word: string; parameter: string | undefined; length: number } | null {
  let cursor = start + 1;
  const wordStart = cursor;
  while (cursor - wordStart < MAX_CONTROL_WORD_LENGTH && isAsciiLetter(rtf.at(cursor))) {
    cursor += 1;
  }
  if (cursor === wordStart) {
    return null;
  }
  const word = rtf.slice(wordStart, cursor);

  const parameterStart = cursor;
  if (rtf.at(cursor) === '-') {
    cursor += 1;
  }
  const digitsStart = cursor;
  while (cursor - digitsStart < MAX_CONTROL_PARAMETER_DIGITS && isAsciiDigit(rtf.at(cursor))) {
    cursor += 1;
  }
  // A lone minus sign with no digits after it is not a parameter.
  const parameter = cursor > digitsStart ? rtf.slice(parameterStart, cursor) : undefined;
  if (parameter === undefined) {
    cursor = parameterStart;
  }

  // Exactly one space may terminate a control word, and it belongs to the
  // control rather than to the text.
  if (rtf.at(cursor) === ' ') {
    cursor += 1;
  }

  return { word, parameter, length: cursor - start };
}

function isAsciiLetter(char: string | undefined): boolean {
  if (char === undefined) {
    return false;
  }
  const code = char.codePointAt(0) ?? 0;
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isAsciiDigit(char: string | undefined): boolean {
  if (char === undefined) {
    return false;
  }
  const code = char.codePointAt(0) ?? 0;
  return code >= 48 && code <= 57;
}

function skipFallbackCharacter(rtf: string, from: number): number {
  if (rtf.startsWith("\\'", from)) {
    return from + 4;
  }
  return rtf.at(from) === undefined ? from : from + 1;
}

function collapseBlankLines(text: string): string {
  return text
    .replaceAll(/[ \t]+\n/g, '\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
}
