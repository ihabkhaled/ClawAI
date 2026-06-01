import { ROLE_PACK_STAGE_IDS, ROLE_PACK_STAGE_LABEL_KEYS } from '@/constants/role-pack.constants';
import { OrchestrationStageStatus } from '@/enums/orchestration-stage-status.enum';
import { StreamEventType } from '@/enums/stream-event-type.enum';
import type { StreamEvent } from '@/types/chat.types';
import type { TranslateFunction } from '@/types/i18n.types';
import type { OrchestrationStage } from '@/types/orchestration.types';

// Build the three baseline role-pack stages in their default state.
// `submitState` controls the first row — the page transitions it to
// ACTIVE on submit, then DONE once the SSE connection opens.
//
// `t` is provided by the caller so this utility stays render-free and
// independent of the React context.
export function buildInitialRolePackStages(t: TranslateFunction): OrchestrationStage[] {
  return [
    {
      id: ROLE_PACK_STAGE_IDS.Submitting,
      label: t(ROLE_PACK_STAGE_LABEL_KEYS[ROLE_PACK_STAGE_IDS.Submitting]),
      status: OrchestrationStageStatus.Pending,
    },
    {
      id: ROLE_PACK_STAGE_IDS.RunningRoles,
      label: t(ROLE_PACK_STAGE_LABEL_KEYS[ROLE_PACK_STAGE_IDS.RunningRoles]),
      status: OrchestrationStageStatus.Pending,
    },
    {
      id: ROLE_PACK_STAGE_IDS.Synthesizing,
      label: t(ROLE_PACK_STAGE_LABEL_KEYS[ROLE_PACK_STAGE_IDS.Synthesizing]),
      status: OrchestrationStageStatus.Pending,
    },
  ];
}

// Apply a single SSE event to the existing stage list. Returns a NEW
// array (immutable update) so React sees a fresh reference. The mapping
// is intentionally narrow:
//   - REQUEST_ACCEPTED / ROUTER_STARTED / ROUTER_COMPLETED → submitting done
//   - PROVIDER_SELECTED / MODEL_PROGRESS / RESPONSE_STREAMING → running-roles
//   - JUDGE_EVALUATING                                     → synthesizing
//   - DONE                                                 → all done
//   - ERROR                                                → current active row failed
// Unknown event types pass through unchanged so we do not over-react.
export function applyStreamEventToRolePackStages(
  current: OrchestrationStage[],
  event: StreamEvent,
): OrchestrationStage[] {
  if (current.length === 0) {
    return current;
  }
  if (event.type === StreamEventType.REQUEST_ACCEPTED) {
    return setStatuses(current, {
      [ROLE_PACK_STAGE_IDS.Submitting]: OrchestrationStageStatus.Active,
    });
  }
  if (
    event.type === StreamEventType.ROUTER_STARTED ||
    event.type === StreamEventType.ROUTER_COMPLETED
  ) {
    return setStatuses(current, {
      [ROLE_PACK_STAGE_IDS.Submitting]: OrchestrationStageStatus.Done,
      [ROLE_PACK_STAGE_IDS.RunningRoles]: OrchestrationStageStatus.Active,
    });
  }
  if (
    event.type === StreamEventType.PROVIDER_SELECTED ||
    event.type === StreamEventType.MODEL_PROGRESS ||
    event.type === StreamEventType.RESPONSE_STREAMING
  ) {
    return setStatuses(
      current,
      {
        [ROLE_PACK_STAGE_IDS.Submitting]: OrchestrationStageStatus.Done,
        [ROLE_PACK_STAGE_IDS.RunningRoles]: OrchestrationStageStatus.Active,
      },
      event.actorName ?? event.model ?? null,
    );
  }
  if (event.type === StreamEventType.JUDGE_EVALUATING) {
    return setStatuses(current, {
      [ROLE_PACK_STAGE_IDS.Submitting]: OrchestrationStageStatus.Done,
      [ROLE_PACK_STAGE_IDS.RunningRoles]: OrchestrationStageStatus.Done,
      [ROLE_PACK_STAGE_IDS.Synthesizing]: OrchestrationStageStatus.Active,
    });
  }
  if (event.type === StreamEventType.DONE) {
    return current.map((stage) => ({ ...stage, status: OrchestrationStageStatus.Done }));
  }
  if (event.type === StreamEventType.ERROR) {
    return current.map((stage) => {
      if (stage.status === OrchestrationStageStatus.Active) {
        return { ...stage, status: OrchestrationStageStatus.Failed };
      }
      return stage;
    });
  }
  return current;
}

// Internal helper: returns a new list where the listed stage IDs receive
// the new status. Optionally stamps an actorName on every Active stage
// so the timeline pill reads "running-roles · phi3:mini" while a model
// streams.
function setStatuses(
  current: OrchestrationStage[],
  patches: Partial<Record<string, OrchestrationStageStatus>>,
  activeActorName: string | null = null,
): OrchestrationStage[] {
  return current.map((stage) => {
    const nextStatus = patches[stage.id];
    if (nextStatus === undefined) {
      return stage;
    }
    if (nextStatus === OrchestrationStageStatus.Active && activeActorName !== null) {
      return { ...stage, status: nextStatus, actorName: activeActorName };
    }
    return { ...stage, status: nextStatus };
  });
}
