import { AdapterFailureKind } from '../../../common/enums/adapter-failure-kind.enum';
import { AdapterError } from '../errors/adapter.error';
import { PAGE_HTML_TYPES, PAGE_TEXT_TYPES } from '../constants/web-fetch.constants';
import { htmlToText } from './html-to-text.utility';

/** The readable text of a fetched page, by content type; anything that is not text is refused. */
export function extractPageText(status: number, contentType: string, body: string): string {
  if (status < 200 || status >= 300) {
    throw new AdapterError(
      AdapterFailureKind.UNAVAILABLE,
      `The page answered with HTTP ${String(status)}`,
    );
  }
  const type = (contentType.split(';')[0] ?? '').trim().toLowerCase();
  if (PAGE_HTML_TYPES.includes(type)) return htmlToText(body);
  if (type === '' || PAGE_TEXT_TYPES.includes(type) || type.startsWith('text/')) return body.trim();
  throw new AdapterError(
    AdapterFailureKind.UNAVAILABLE,
    'That page is not text, so it cannot be read',
  );
}
