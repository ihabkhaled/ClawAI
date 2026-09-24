import { ExternalLink } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import type { ConnectorPresetLinksProps } from '@/types';

/** The preset's register/apiKeys/pricing/docs links, each opening in a new tab. */
export function ConnectorPresetLinks({ preset }: ConnectorPresetLinksProps): React.ReactElement {
  const { t } = useTranslation();
  const links: Array<{ key: string; href: string; label: string }> = [
    { key: 'register', href: preset.links.register, label: t('connectors.linkRegister') },
    { key: 'apiKeys', href: preset.links.apiKeys, label: t('connectors.linkApiKeys') },
    { key: 'pricing', href: preset.links.pricing, label: t('connectors.linkPricing') },
    { key: 'docs', href: preset.links.docs, label: t('connectors.linkDocs') },
  ];

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
        >
          {link.label}
          <ExternalLink className="h-3 w-3" />
        </a>
      ))}
    </div>
  );
}
