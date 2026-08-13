export type AdSenseConfig = {
  // The AdSense client id in `ca-pub-XXXXXXXXXXXXXXXX` form (browser-visible).
  clientId: string | null;
  // Whether the client id is present AND well-formed.
  isConfigured: boolean;
  // Whether real ad requests may be made (manual units only render when true).
  servingEnabled: boolean;
  // Whether the verification script may load in the marketing layout for
  // AdSense review, even while servingEnabled is false and no units render.
  reviewMode: boolean;
};

export type AdUnitProps = {
  // The `data-ad-slot` id from the AdSense dashboard for this placement.
  // `null` means the slot is unconfigured and nothing renders.
  slot: string | null;
  // Reserved height (px) so the slot occupies space before the ad loads,
  // preventing layout shift (CLS). Width is fluid via the responsive format.
  reservedHeight: number;
  // Path the unit is rendering on — used by the eligibility resolver.
  pathname: string;
  // Trusted, SERVER-derived eligibility for a dynamic page.
  //
  // Set this for content whose ad-eligibility cannot be known from the URL — a
  // public shared chat, for instance, where `/share/chat/<anything>` matches the
  // route but only an approved, sufficiently long, non-flagged snapshot may carry
  // advertising. When present it REPLACES the path lookup entirely; `false` and
  // `undefined` both mean no ad, so an unresolved eligibility fails closed.
  serverEligibility?: boolean;
  className?: string;
  // Accessible label for the ad container, localised by the caller.
  label: string;
};

export type MarketingAdUnitProps = {
  slot: string | null;
  pathname: string;
  className?: string;
};

// Validated `data-ad-slot` ids, one per placement. `null` when the corresponding
// environment variable is unset or malformed — the unit then renders nothing
// rather than requesting an ad against a bad slot.
export type AdSenseSlots = {
  home: string | null;
  content: string | null;
  sharedChatTop: string | null;
  sharedChatInline: string | null;
  sharedChatBottom: string | null;
};
