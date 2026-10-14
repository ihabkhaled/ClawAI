/** The slice of a keyboard event the shortcut needs. */
type ShortcutEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  nativeEvent?: { isComposing?: boolean };
  preventDefault: () => void;
};

/**
 * Ctrl+Enter (Cmd+Enter on a Mac) sends the text box it is pressed in. Ignored while an input
 * method is still composing, so confirming a Japanese or Chinese candidate never posts.
 */
export function submitOnShortcut(event: ShortcutEvent, submit: () => void): void {
  if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) {
    return;
  }
  if (event.nativeEvent?.isComposing === true) {
    return;
  }
  event.preventDefault();
  submit();
}
