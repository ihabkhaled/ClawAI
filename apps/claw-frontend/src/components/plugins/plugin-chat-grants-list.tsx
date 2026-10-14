'use client';

import { Button } from '@/components/ui/button';
import { usePluginChatGrants } from '@/hooks/plugins/use-plugin-chat-grants';
import { useTranslation } from '@/lib/i18n';

/**
 * "Allow for this chat" grants, with a Revoke button each. They are the in-chat half of what the
 * Installed page shows for "Always allow". Renders nothing when there are none.
 */
export function PluginChatGrantsList(): React.ReactElement | null {
  const { t } = useTranslation();
  const { grants, revoke, isRevoking, revokeFailed } = usePluginChatGrants();
  if (grants.length === 0) {
    return null;
  }
  return (
    <section
      aria-label={t('pluginConsent.grants.title')}
      data-testid="plugin-chat-grants"
      className="flex flex-col gap-2 rounded-lg border p-3"
    >
      <h3 className="text-sm font-medium">{t('pluginConsent.grants.title')}</h3>
      <p className="text-muted-foreground text-xs">{t('pluginConsent.grants.hint')}</p>
      <ul className="divide-y">
        {grants.map((grant) => (
          <li key={grant.id} className="flex flex-wrap items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm break-words">
                <span className="font-medium">{grant.pluginSlug}</span>{' '}
                <code className="text-muted-foreground text-xs" dir="ltr">
                  {grant.toolName}
                </code>
              </p>
              <p className="text-muted-foreground text-xs">
                {t('pluginConsent.grants.expires', {
                  value: new Date(grant.expiresAt).toLocaleString(),
                })}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isRevoking}
              onClick={() => revoke(grant.id)}
            >
              {t('pluginConsent.grants.revoke')}
            </Button>
          </li>
        ))}
      </ul>
      {revokeFailed ? (
        <p role="alert" className="text-destructive text-xs">
          {t('pluginConsent.grants.revokeError')}
        </p>
      ) : null}
    </section>
  );
}
