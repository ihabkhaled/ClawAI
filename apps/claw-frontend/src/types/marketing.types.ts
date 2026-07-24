import type { Locale } from '@/enums/locale.enum';
import type { Theme } from '@/enums/theme.enum';
import type { LocaleConfig } from '@/types/i18n.types';

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
