/** Fills `{name}` placeholders in a tour string. An unknown placeholder is left as written. */
export function interpolateTourText(
  text: string,
  params: Readonly<Record<string, string>>,
): string {
  return text.replaceAll(/\{(\w+)\}/gu, (match, key: string) => params[key] ?? match);
}
