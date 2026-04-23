import type { ChatMessage, ResearchRun } from '@/types';

export function getResearchRunFromMessage(message: ChatMessage): ResearchRun | null {
  const metadata = message.metadata;
  if (metadata === null || typeof metadata !== 'object') {
    return null;
  }

  const research = metadata['research'];
  if (research === null || typeof research !== 'object') {
    return null;
  }

  const run = research as Record<string, unknown>;
  const bundle = run['bundle'];
  const trace = run['trace'];
  if (bundle === null || typeof bundle !== 'object' || !Array.isArray(trace)) {
    return null;
  }
  const bundleRecord = bundle as Record<string, unknown>;
  const providerSelection =
    bundleRecord['providerSelection'] !== null &&
    typeof bundleRecord['providerSelection'] === 'object'
      ? (bundleRecord['providerSelection'] as Record<string, unknown>)
      : {};

  if (typeof run['id'] !== 'string' && typeof run['runId'] !== 'string') {
    return null;
  }

  return {
    id: typeof run['id'] === 'string' ? run['id'] : (run['runId'] as string),
    userId: typeof run['userId'] === 'string' ? run['userId'] : 'unknown',
    requestedModel: typeof run['requestedModel'] === 'string' ? run['requestedModel'] : null,
    requestedProvider:
      typeof run['requestedProvider'] === 'string' ? run['requestedProvider'] : null,
    workflow: typeof run['workflow'] === 'string' ? run['workflow'] : 'unknown',
    intent: typeof run['intent'] === 'string' ? run['intent'] : message.content,
    status: typeof run['status'] === 'string' ? run['status'] : 'COMPLETED',
    bundle: {
      ...bundleRecord,
      providerSelection: {
        providerId:
          typeof providerSelection['providerId'] === 'string'
            ? providerSelection['providerId']
            : null,
        providerName:
          typeof providerSelection['providerName'] === 'string'
            ? providerSelection['providerName']
            : null,
        providerKind:
          typeof providerSelection['providerKind'] === 'string'
            ? providerSelection['providerKind']
            : null,
        selectionMode: providerSelection['selectionMode'] === 'explicit' ? 'explicit' : 'auto',
        fallbackUsed: providerSelection['fallbackUsed'] === true,
        attemptedProviders: Array.isArray(providerSelection['attemptedProviders'])
          ? providerSelection['attemptedProviders'].filter(
              (value): value is string => typeof value === 'string',
            )
          : [],
      },
    } as ResearchRun['bundle'],
    trace: trace as ResearchRun['trace'],
    errorMessage: typeof run['errorMessage'] === 'string' ? run['errorMessage'] : null,
    startedAt: typeof run['startedAt'] === 'string' ? run['startedAt'] : message.createdAt,
    completedAt: typeof run['completedAt'] === 'string' ? run['completedAt'] : null,
  };
}
