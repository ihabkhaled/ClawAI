// How a user's display currency is decided.
//
// AUTO re-detects on every visit, so a user who moves country sees the new
// country's currency without touching a setting. MANUAL freezes the choice: a
// VPN, a business trip or a mis-resolved IP must never overrule someone who has
// said what they want to see.
export enum CurrencyPreferenceMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}
