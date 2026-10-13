import { CHAT_COMPOSER_INPUT_ID } from '@/constants/context-save.constants';

/**
 * Hands keyboard focus back to the chat composer, e.g. when a dialog that was
 * opened without a trigger closes. Returns false when there is no composer on
 * the page (a lab, a closed thread), so the caller can leave focus alone.
 */
export function focusChatComposer(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const element = document.getElementById(CHAT_COMPOSER_INPUT_ID);
  if (!(element instanceof HTMLElement) || element.hasAttribute('disabled')) {
    return false;
  }
  element.focus();
  return true;
}
