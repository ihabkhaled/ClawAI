/**
 * A message that COMMANDS a page to be fetched: it opens with the verb.
 *
 * Deliberately anchored to the start of the message (after "please" / "can you" /
 * "run"), so "give me a curl command for this" — a question ABOUT curl — never
 * triggers a fetch, while "crawl https://…" and "curl https://…" do. A pasted
 * terminal line ("user@host % curl https://…") counts too, because that is the
 * user handing over exactly the request to run.
 */
export const EXPLICIT_FETCH_COMMAND_PATTERNS: readonly RegExp[] = [
  /^\s*(?:please\s+|can you\s+|could you\s+|kindly\s+)?(?:run\s+)?(?:crawl|curl|wget|fetch|scrape|open|visit|read|browse)\b/i,
  /(?:^|[%$#>]\s*)(?:curl|wget)\s+(?:-\S+\s+)*(?:https?:\/\/|www\.)/im,
];
