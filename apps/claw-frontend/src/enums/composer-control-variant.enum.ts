// Visual variants for the chat composer's inline controls (ModelSelector,
// FileAttachmentPicker). Mirrors the EmptyStateVariant pattern.
// - Default: the historical wide trigger (icon + label, full pill width).
// - Compact: 32px square icon-only button used by the mobile composer's
//   stacked two-row layout (spec §2.4). Pass `showLabel` to render the label
//   alongside the icon at slightly wider breakpoints.
export enum ComposerControlVariant {
  Default = 'default',
  Compact = 'compact',
}
