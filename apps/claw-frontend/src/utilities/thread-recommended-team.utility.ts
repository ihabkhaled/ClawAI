import { THREAD_FALLBACKS_PER_ROLE } from '@/constants/thread-publication.constants';
import { ThreadModelAvailability } from '@/enums/thread-model-availability.enum';
import type { ModelPickerGroup, ModelSelection } from '@/types';
import type {
  ThreadModelAvailabilityIndex,
  ThreadModelRef,
  ThreadRecommendedTeam,
  ThreadRecommendedTeamResponse,
} from '@/types/thread-recommended-team.types';
import { decodeModelValue } from '@/utilities/model-selector.utility';
import type { ThreadGenerationRequest } from '@/utilities/thread-generation-request.utility';

function refKey({ provider, model }: ThreadModelRef): string {
  return `${provider}::${model}`;
}

/** The recommended team as five seats in request order: three authors, Judge, Critic. */
function seatsOf(team: ThreadRecommendedTeam) {
  return [...team.authors, team.judge, team.critic];
}

export function toAvailabilityIndex(
  recommendation: ThreadRecommendedTeamResponse | undefined,
): ThreadModelAvailabilityIndex {
  return new Map((recommendation?.models ?? []).map((entry) => [refKey(entry), entry.status]));
}

/** What the service said about a model; a model it did not list counts as available (the start preflight still decides). */
export function availabilityOf(
  index: ThreadModelAvailabilityIndex,
  model: ThreadModelRef,
): ThreadModelAvailability {
  return index.get(refKey(model)) ?? ThreadModelAvailability.Available;
}

/** A degraded model can still be picked by hand (the picker warns); every other reason blocks it. */
export function isSelectableAvailability(status: ThreadModelAvailability): boolean {
  return (
    status === ThreadModelAvailability.Available || status === ThreadModelAvailability.Degraded
  );
}

export function usableModels(
  models: ModelSelection[],
  index: ThreadModelAvailabilityIndex,
): ModelSelection[] {
  return models.filter(
    (model) => availabilityOf(index, model) === ThreadModelAvailability.Available,
  );
}

/**
 * The five picker selections for the recommended team, found in the models the picker offers.
 * Null when the team is missing or any seat is not in the picker list (then the caller ranks
 * the usable models itself).
 */
export function teamToSelections(
  team: ThreadRecommendedTeam | null | undefined,
  available: ModelSelection[],
): ModelSelection[] | null {
  if (!team) {
    return null;
  }
  const seats = seatsOf(team);
  const found = seats.flatMap((seat) => {
    const match = available.find((model) => refKey(model) === refKey(seat));
    return match ? [match] : [];
  });
  return found.length === seats.length ? found : null;
}

export function isRecommendedSelection(
  team: ThreadRecommendedTeam | null | undefined,
  selected: ModelSelection[],
): boolean {
  if (!team) {
    return false;
  }
  const seats = seatsOf(team);
  return (
    seats.length === selected.length &&
    seats.every((seat, index) => selected[index] && refKey(seat) === refKey(selected[index]))
  );
}

function distinctRefs(refs: ThreadModelRef[]): ThreadModelRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => !seen.has(refKey(ref)) && seen.add(refKey(ref)));
}

/**
 * Backups per role on a provider other than the role's own (the service refuses the same
 * provider). An untouched recommended seat keeps the backups the service chose for it; any other
 * seat takes the ranked usable models.
 */
export function withSeatFallbacks(
  request: ThreadGenerationRequest,
  selected: ModelSelection[],
  team: ThreadRecommendedTeam | null | undefined,
  usablePool: ModelSelection[],
): ThreadGenerationRequest {
  const seats = team ? seatsOf(team) : [];
  const roles = [...request.authors, request.judge, request.critic];
  const [a1, a2, a3, judge, critic] = roles.map((role, index) => {
    const seat = seats[index];
    const own = selected[index];
    const isUntouched = seat !== undefined && own !== undefined && refKey(seat) === refKey(own);
    const candidates: ThreadModelRef[] = isUntouched
      ? [...seat.fallbacks, ...usablePool]
      : usablePool;
    const fallbacks = distinctRefs(candidates)
      .filter((ref) => ref.provider !== role.provider)
      .slice(0, THREAD_FALLBACKS_PER_ROLE)
      .map(({ provider, model }) => ({ provider, model }));
    return { ...role, fallbacks };
  });
  if (!a1 || !a2 || !a3 || !judge || !critic) {
    return request;
  }
  return { ...request, authors: [a1, a2, a3], judge, critic };
}

/**
 * Marks every option the account cannot use with its reason, so the picker shows why instead of
 * letting the owner pick a model the start would refuse.
 */
export function annotateGroupsWithReasons(
  groups: ModelPickerGroup[],
  index: ThreadModelAvailabilityIndex,
  reasonFor: (status: ThreadModelAvailability) => string,
): ModelPickerGroup[] {
  return groups.map((group) => ({
    ...group,
    options: group.options.map((option) => {
      const ref = decodeModelValue(option.value);
      const status = ref ? availabilityOf(index, ref) : ThreadModelAvailability.Available;
      return status === ThreadModelAvailability.Available
        ? option
        : { ...option, label: `${option.label} (${reasonFor(status)})` };
    }),
  }));
}

/** Which sentence under the team heading fits: the recommended team, an edited one, or none. */
export function threadTeamSummaryKey(hasTeam: boolean, isRecommendedSelected: boolean): string {
  if (!hasTeam) {
    return 'chat.threadTeam.none';
  }
  return isRecommendedSelected ? 'chat.threadTeam.summary' : 'chat.threadTeam.customised';
}
