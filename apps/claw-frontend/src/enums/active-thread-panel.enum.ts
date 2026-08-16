// The chat-thread header's three dialogs (Compare Models, Judge & Referee,
// Thread Settings) are mutually exclusive: at most one is open at a time.
export enum ActiveThreadPanel {
  COMPARE = 'compare',
  QUALITY = 'quality',
  SETTINGS = 'settings',
}
