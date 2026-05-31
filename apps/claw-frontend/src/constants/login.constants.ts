import { Globe, Shield, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// localStorage key used to remember the user's email on the login page when
// "Remember me" is checked. We deliberately do NOT persist the password —
// that's the browser's Credential Management API's job.
export const REMEMBERED_EMAIL_STORAGE_KEY = 'claw.auth.rememberedEmail';

// Three brand-side feature highlights rendered on the desktop split-layout
// branding column. Each entry pairs a resolved lucide icon component with
// i18n key chains so locale files own the copy. Icons are resolved here
// (not in the .tsx) to keep the branding panel pure render.
export type LoginFeatureHighlight = {
  icon: LucideIcon;
  titleKey: 'auth.feature1Title' | 'auth.feature2Title' | 'auth.feature3Title';
  descriptionKey: 'auth.feature1Desc' | 'auth.feature2Desc' | 'auth.feature3Desc';
};

export const LOGIN_FEATURE_HIGHLIGHTS: LoginFeatureHighlight[] = [
  {
    icon: Zap,
    titleKey: 'auth.feature1Title',
    descriptionKey: 'auth.feature1Desc',
  },
  {
    icon: Shield,
    titleKey: 'auth.feature2Title',
    descriptionKey: 'auth.feature2Desc',
  },
  {
    icon: Globe,
    titleKey: 'auth.feature3Title',
    descriptionKey: 'auth.feature3Desc',
  },
];
