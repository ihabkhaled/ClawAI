import { WorkspaceProvider } from '../enums/workspace-provider.enum';

export const SOURCE_CONTROL_PROVIDERS: WorkspaceProvider[] = [
  WorkspaceProvider.GITHUB,
  WorkspaceProvider.GITLAB,
  WorkspaceProvider.BITBUCKET,
];

export const PR_STATE_COLORS: Record<string, string> = {
  merged: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  closed: 'bg-muted text-muted-foreground border-border',
};
