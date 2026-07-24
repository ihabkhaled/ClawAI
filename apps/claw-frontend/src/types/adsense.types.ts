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
  slot: string;
  // Reserved height (px) so the slot occupies space before the ad loads,
  // preventing layout shift (CLS). Width is fluid via the responsive format.
  reservedHeight: number;
  // Path the unit is rendering on — used by the eligibility resolver.
  pathname: string;
  className?: string;
};
