import type { JiraTicketMetadata } from '../types/jira.types';

export function extractJiraMetadata(metadata: Record<string, unknown>): JiraTicketMetadata {
  const labels = Array.isArray(metadata['labels']) ? (metadata['labels'] as string[]) : [];
  const storyPointsRaw = metadata['storyPoints'] ?? metadata['story_points'];
  const storyPoints = typeof storyPointsRaw === 'number' ? storyPointsRaw : null;

  return {
    issueType: typeof metadata['issueType'] === 'string' ? metadata['issueType'] : 'Task',
    status: typeof metadata['status'] === 'string' ? metadata['status'] : '',
    priority: typeof metadata['priority'] === 'string' ? metadata['priority'] : 'Medium',
    assignee: typeof metadata['assignee'] === 'string' ? metadata['assignee'] : null,
    reporter: typeof metadata['reporter'] === 'string' ? metadata['reporter'] : null,
    project: typeof metadata['project'] === 'string' ? metadata['project'] : '',
    projectKey: typeof metadata['projectKey'] === 'string' ? metadata['projectKey'] : '',
    labels,
    storyPoints,
    sprint: typeof metadata['sprint'] === 'string' ? metadata['sprint'] : null,
    dueDate: typeof metadata['dueDate'] === 'string' ? metadata['dueDate'] : null,
  };
}
