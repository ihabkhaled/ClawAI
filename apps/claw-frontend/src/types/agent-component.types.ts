import type { TerminalCommand } from './agent.types';
import type { CapabilityInvocation } from './capability.types';
import type { TranslateFunction } from './i18n.types';

export type AgentActivityEntryProps = {
  t: TranslateFunction;
  invocation: CapabilityInvocation;
};

export type CapabilityCardProps = {
  t: TranslateFunction;
  invocation: CapabilityInvocation;
  isApproving: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
};

export type TerminalOutputBlockProps = {
  command: TerminalCommand;
};
