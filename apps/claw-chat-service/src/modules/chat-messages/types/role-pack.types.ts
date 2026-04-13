export type RolePack = 'coding-team' | 'research-team' | 'marketing-team' | 'legal-team';

export type RoleMember = {
  role: string;
  instruction: string;
  model: string;
};

export type RoleMemberResult = {
  role: string;
  model: string;
  output: string;
  latencyMs: number;
};

export type RolePackResponse = {
  messageId: string;
  threadId: string;
};
