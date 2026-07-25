import type { Locale } from '@/enums/locale.enum';
import type { Theme } from '@/enums/theme.enum';
import type { LocaleConfig } from '@/types/i18n.types';
import type { MarketingModelFamily, MarketingPlanTier } from '@/types/subscription-marketing.types';

export type UseMarketingLocaleSwitcherReturn = {
  locale: Locale;
  options: ReadonlyArray<LocaleConfig>;
  handleLocaleChange: (locale: Locale) => void;
};

export type UseMarketingThemeToggleReturn = {
  theme: Theme;
  handleCycleTheme: () => void;
};

export type MarketingNavLink = {
  labelKey: string;
  href: string;
};

export type UseMarketingMobileMenuReturn = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  close: () => void;
};

export type MarketingMobileMenuProps = {
  navLinks: ReadonlyArray<MarketingNavLink>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: () => void;
};

export type MarketingFooterLinkGroup = {
  headingKey: string;
  links: ReadonlyArray<{ label: string; href: string }>;
};

export type MarketingSocialLink = {
  platform: string;
  href: string;
  labelKey: string;
};

export type HomeHeroProps = {
  lastReviewed: string;
};

// Header shared by every dedicated marketing page. Keeps the six topic pages
// visually identical without each one re-implementing a title block.
export type MarketingPageHeroProps = {
  titleKey: string;
  subtitleKey: string;
  /// Rendered under the subtitle when present, e.g. 'Reviewed 2026-07-25'.
  lastReviewed?: string;
};

export type MarketingPlanTierCardProps = {
  tier: MarketingPlanTier;
  /// Yearly pricing selected. Cards render the matching price and cadence.
  isYearly: boolean;
};

export type MarketingModelFamilyCardProps = {
  family: MarketingModelFamily;
};

export type MarketingPricingSectionProps = {
  /// Trims the table to the headline tiers on the home page; the pricing page
  /// renders all seven.
  compact?: boolean;
};

// Monthly/yearly switch behind the pricing table. React state may not live in
// a .tsx in this codebase, so the toggle is a hook and the section is pure
// render composition over this return value.
export type UsePricingToggleReturn = {
  isYearly: boolean;
  selectMonthly: () => void;
  selectYearly: () => void;
};
