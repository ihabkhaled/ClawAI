import { BusinessException } from '../errors/business.exception';

/**
 * Why a page could not be read, in words a person (and the answering model) can
 * act on.
 *
 * A `BusinessException` extends `HttpException`, whose `.message` is the
 * generic string "Business Exception" — so a warning built from `error.message`
 * said "Could not crawl <url>: Business Exception" and hid that the site itself
 * had answered 404. The reason travels in `details.message` (the fetch layer
 * puts the HTTP status or network error there), or failing that in the error
 * code.
 */
export function describeFetchFailure(error: unknown): string {
  if (error instanceof BusinessException) {
    const reason = error.details?.['message'];
    return typeof reason === 'string' && reason.length > 0 ? reason : error.code;
  }
  return error instanceof Error ? error.message : 'Unknown error';
}
