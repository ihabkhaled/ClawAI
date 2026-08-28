/**
 * Identifies the state of a transcript, so a conclusion can be scoped to the
 * run that produced it.
 *
 * `useThreadDetail` suppresses its "resume waiting" recovery once a run ends,
 * to stop the spinner re-arming itself between DONE arriving and the answer
 * being refetched. Recording that suppression as a plain boolean made it
 * permanent for the whole thread: a later run started by anything that does not
 * announce itself — editing a prompt re-runs the thread from it — found the
 * recovery already disabled, so the page never subscribed or polled and the
 * answer appeared only after a refresh.
 *
 * The length is part of the signature and not an afterthought: editing a prompt
 * deletes every answer below it, so the count is what changes when a rewritten
 * question replaces an answered one whose id it keeps.
 */
export function buildTranscriptSignature(
  messageCount: number,
  lastMessageId: string | null,
): string {
  return `${String(messageCount)}:${lastMessageId ?? ''}`;
}
