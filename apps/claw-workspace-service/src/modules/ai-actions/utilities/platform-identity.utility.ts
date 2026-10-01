import { WORKSPACE_PLATFORM_IDENTITY_LINES } from '../constants/platform-identity.constants';

/** The hidden identity block for one workspace one-shot call. */
export function buildWorkspaceIdentityBlock(): string {
  return WORKSPACE_PLATFORM_IDENTITY_LINES.join('\n');
}

/** A system prompt with the hidden identity block appended after the task. */
export function withPlatformIdentity(systemPrompt: string): string {
  return `${systemPrompt}\n\n${buildWorkspaceIdentityBlock()}`;
}
