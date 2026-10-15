/** The text to show for a suggestion: all of it, or its first `limit` characters with an ellipsis. */
export function clampSuggestionText(
  text: string,
  limit: number,
  expanded: boolean,
): { text: string; isLong: boolean } {
  const isLong = text.length > limit;
  if (!isLong || expanded) {
    return { text, isLong };
  }
  let end = limit;
  // Never cut a surrogate pair in half.
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) {
    end -= 1;
  }
  return { text: `${text.slice(0, end).trimEnd()}…`, isLong };
}
