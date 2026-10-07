// Publication ids are cuids. A query-string value is user input and ends up in API paths,
// so anything that is not shaped like an id (for example `../x`) is dropped.
const PUBLICATION_ID_PATTERN = /^[a-z0-9]{10,40}$/u;

export function parsePublicationIdParam(value: string | null): string {
  return value !== null && PUBLICATION_ID_PATTERN.test(value) ? value : '';
}
