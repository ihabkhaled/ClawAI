import { JiraAdapter } from '../jira.adapter';

global.fetch = jest.fn();

const RESOURCES_RESPONSE = [{ id: 'site-1', url: 'https://claw.atlassian.net' }];

describe('JiraAdapter.executeWriteAction — CREATE_TICKET and its aliases', () => {
  let adapter: JiraAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new JiraAdapter();
  });

  const mockSiteLookupThen = (issueResponse: unknown, ok = true, status = 200): void => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => RESOURCES_RESPONSE })
      .mockResolvedValueOnce({ ok, status, json: async () => issueResponse });
  };

  it.each(['CREATE_TICKET', 'CREATE_JIRA_FROM_FIGMA', 'CREATE_USER_STORY_FROM_FIGMA'])(
    'creates an issue for %s using the same generic issue-creation path',
    async (actionType) => {
      mockSiteLookupThen({ id: '10001', key: 'CLAW-1', self: 'ignored' });

      const result = await adapter.executeWriteAction('token', actionType, {
        projectKey: 'CLAW',
        summary: 'A new story',
        issueType: 'Story',
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('CLAW-1');
      expect(result.url).toBe('https://claw.atlassian.net/browse/CLAW-1');

      const issueCall = (global.fetch as jest.Mock).mock.calls[1];
      const body = JSON.parse(issueCall[1].body) as {
        fields: { issuetype: { name: string } };
      };
      expect(body.fields.issuetype.name).toBe('Story');
    },
  );

  it('surfaces a Jira API error response for CREATE_USER_STORY_FROM_FIGMA', async () => {
    mockSiteLookupThen({}, false, 400);

    const result = await adapter.executeWriteAction('token', 'CREATE_USER_STORY_FROM_FIGMA', {
      projectKey: 'CLAW',
      summary: 'Broken',
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('HTTP 400');
  });
});
