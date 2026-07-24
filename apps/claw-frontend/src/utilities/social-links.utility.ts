import type { MarketingSocialLink } from '@/types';

// Social links are opt-in via env config — never fabricated. A platform
// with no configured URL is simply omitted from the footer rather than
// linking to a placeholder or unconfigured account.
export function getConfiguredSocialLinks(): MarketingSocialLink[] {
  const candidates: Array<{ platform: string; url: string | undefined; labelKey: string }> = [
    {
      platform: 'x',
      url: process.env['NEXT_PUBLIC_SOCIAL_X_URL'],
      labelKey: 'marketing.footer.socialX',
    },
    {
      platform: 'linkedin',
      url: process.env['NEXT_PUBLIC_SOCIAL_LINKEDIN_URL'],
      labelKey: 'marketing.footer.socialLinkedin',
    },
    {
      platform: 'discord',
      url: process.env['NEXT_PUBLIC_SOCIAL_DISCORD_URL'],
      labelKey: 'marketing.footer.socialDiscord',
    },
  ];

  return candidates
    .filter((candidate): candidate is { platform: string; url: string; labelKey: string } =>
      Boolean(candidate.url),
    )
    .map((candidate) => ({
      platform: candidate.platform,
      href: candidate.url,
      labelKey: candidate.labelKey,
    }));
}
