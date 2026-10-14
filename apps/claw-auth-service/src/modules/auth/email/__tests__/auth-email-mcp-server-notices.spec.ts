import { UserNotificationKind } from '@claw/shared-types';

import { UserLanguagePreference } from '../../../../generated/prisma';
import { NOTIFICATION_EMAIL_KIND } from '../../../notifications/constants/notifications.constants';
import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import { renderAuthEmail } from '../utilities/auth-email-render.utility';

const LOCALES = Object.values(UserLanguagePreference);
const KINDS = [AuthEmailKind.MCP_SERVER_APPROVED, AuthEmailKind.MCP_SERVER_REJECTED];
const ACTION_URL = 'https://claw.local/plugins/servers';

function render(kind: AuthEmailKind, locale: UserLanguagePreference, value: string | null) {
  return renderAuthEmail({
    kind,
    locale,
    recipientName: 'Ada',
    value,
    expiry: null,
    actionUrl: ACTION_URL,
    siteUrl: 'https://claw.local',
  });
}

describe('MCP server decision emails: wiring', () => {
  it('maps both notification kinds to their own email', () => {
    expect(NOTIFICATION_EMAIL_KIND[UserNotificationKind.MCP_SERVER_APPROVED]).toBe(
      AuthEmailKind.MCP_SERVER_APPROVED,
    );
    expect(NOTIFICATION_EMAIL_KIND[UserNotificationKind.MCP_SERVER_REJECTED]).toBe(
      AuthEmailKind.MCP_SERVER_REJECTED,
    );
  });

  it('covers all 13 locales', () => {
    expect(LOCALES).toHaveLength(13);
  });
});

describe.each(LOCALES)('MCP server decision emails in %s', (locale) => {
  it.each(KINDS)(
    '%s renders with the link, the server name and no leftover placeholder',
    (kind) => {
      const message = render(kind, locale, 'My tracker');

      expect(message.subject.trim().length).toBeGreaterThan(0);
      expect(message.text).toContain(ACTION_URL);
      expect(message.text).toContain('My tracker');
      expect(message.text).not.toContain('{value}');
      expect(message.html).not.toContain('{value}');
    },
  );

  it('escapes a hostile server name so it cannot inject markup', () => {
    const message = render(AuthEmailKind.MCP_SERVER_REJECTED, locale, '<script>alert(1)</script>');

    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
  });
});
