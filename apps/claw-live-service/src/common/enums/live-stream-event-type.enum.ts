/** SSE event names on GET /api/v1/live/sessions/:id/stream (architecture doc section 9). */
export enum LiveStreamEventType {
  CAPTION = 'caption',
  CAPTION_TRANSLATION = 'caption_translation',
  CARD = 'card',
  CARD_VERSION = 'card_version',
  HIGHLIGHT = 'highlight',
  STATUS = 'status',
  USAGE = 'usage',
}
