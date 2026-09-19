import {
  CONTROL_CHARS,
  DEFAULT_FILE_TITLE,
  DEFAULT_FILENAME_BASE,
  DOT_RUN,
  EXECUTABLE_SEGMENT,
  FILE_DESCRIPTION_MAX_CHARS,
  FILE_TITLE_MAX_CHARS,
  FILENAME_BASE_MAX_CHARS,
  MARKDOWN_CONTENT_FORMATS,
  PROMPT_TITLE_MAX_WORDS,
  REQUEST_FILLER_WORDS,
  TITLE_FILE_EXTENSION,
  UNSAFE_FILENAME_CHARS,
} from '../constants/file-asset.constants';
import { BlockKind } from '../enums/document-node.enum';
import type { FileIdentity } from '../types/file-generation.types';
import { inlineText, parseMarkdownDocument } from './markdown-document.utility';

/**
 * What a model-written file is called and what it holds (F3c, ADR-109).
 *
 * The file writer is asked to open with a `#` title, so the name is the AI's
 * own. That costs no extra model call. Without a heading the title comes from
 * the request, minus the filler ("make me an Excel spreadsheet listing 5
 * fruits" → "Listing 5 fruits"). The description is the first paragraph.
 * Files used to be called `generated-1789839832198.xlsx`.
 */
export function deriveFileIdentity(content: string, prompt: string, format: string): FileIdentity {
  const blocks = MARKDOWN_CONTENT_FORMATS.includes(format) ? parseMarkdownDocument(content) : [];
  const heading = blocks.find((block) => block.kind === BlockKind.HEADING);
  const headingText = heading?.kind === BlockKind.HEADING ? inlineText(heading.content) : '';
  const paragraph = blocks.find((block) => block.kind === BlockKind.PARAGRAPH);
  const description =
    paragraph?.kind === BlockKind.PARAGRAPH
      ? clip(plain(inlineText(paragraph.content)), FILE_DESCRIPTION_MAX_CHARS)
      : '';
  const title =
    clip(humanTitle(plain(headingText)), FILE_TITLE_MAX_CHARS) ||
    titleFromPrompt(prompt) ||
    DEFAULT_FILE_TITLE;
  return {
    title,
    description: description.length > 0 ? description : null,
    filenameBase: filenameBase(title),
  };
}

/**
 * A filename in any script: letters of every language stay, and only what no
 * file system accepts is removed (path separators, `:*?"<>|`, control
 * characters). It is sent as RFC 5987 `filename*`, beside an ASCII fallback.
 */
export function filenameBase(title: string): string {
  const base = title
    .replaceAll(UNSAFE_FILENAME_CHARS, ' ')
    .replaceAll(DOT_RUN, ' ')
    .replaceAll(EXECUTABLE_SEGMENT, ' $1')
    .replaceAll(/\s+/gu, ' ')
    .trim()
    .replaceAll(/^[. ]+|[. ]+$/gu, '')
    .slice(0, FILENAME_BASE_MAX_CHARS)
    .trim();
  return base.length > 0 ? base : DEFAULT_FILENAME_BASE;
}

/**
 * A title a user typed (an export), made safe to store and show: control
 * characters and line breaks become spaces, a trailing ".pdf" goes, and it is
 * clipped. A raw title such as 'a"; filename=x
X-Injected: 1' used to be
 * stored as the filename and failed the upload with a 422 (F5 pentest).
 */
export function cleanTitle(text: string): string {
  return clip(humanTitle(plain(text)), FILE_TITLE_MAX_CHARS);
}

/** The request's first meaningful words, as a title. */
export function titleFromPrompt(prompt: string): string {
  const words = plain(prompt)
    .split(' ')
    .filter((word) => word.length > 0);
  const start = words.findIndex(
    (word) => !REQUEST_FILLER_WORDS.includes(word.toLowerCase().replaceAll(/[^\p{L}\p{N}]/gu, '')),
  );
  if (start < 0) {
    return '';
  }
  const title = words
    .slice(start, start + PROMPT_TITLE_MAX_WORDS)
    .join(' ')
    .replaceAll(/[.,;:!?]+$/gu, '');
  return clip(title.charAt(0).toLocaleUpperCase() + title.slice(1), FILE_TITLE_MAX_CHARS);
}

/**
 * A title, not a filename. Asked to "name the file", a model wrote
 * "Backend_Engineer_Onboarding_Checklist.pdf", and the download became
 * "….pdf.pdf". The extension goes, and so do the underscores of a title with no spaces.
 */
export function humanTitle(text: string): string {
  const bare = text.replace(TITLE_FILE_EXTENSION, '').trim();
  return bare.includes(' ') ? bare : bare.replaceAll(/_+/gu, ' ').trim();
}

function plain(text: string): string {
  return text.replaceAll(CONTROL_CHARS, ' ').replaceAll(/\s+/gu, ' ').trim();
}

/** At most `max` characters, cut at a word boundary with an ellipsis. */
function clip(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
