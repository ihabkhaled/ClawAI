/**
 * Opens an empty tab now, to be pointed somewhere later.
 *
 * It must run synchronously inside the click handler: a tab opened after an
 * `await` is not a user gesture any more, and popup blockers refuse it. The
 * caller navigates the returned tab once its async work is done, or closes it.
 *
 * `opener` is cleared so the new page cannot reach back into this one through
 * `window.opener`. Returns null when the browser refused to open a tab.
 */
export function openDetachedTab(): Window | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const tab = window.open('about:blank', '_blank');
  if (tab !== null) {
    tab.opener = null;
  }
  return tab;
}
