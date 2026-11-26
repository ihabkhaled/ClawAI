import {
  LIVE_COUNCIL_DEFAULT_CHAIN,
  LIVE_MODEL_CHAIN_EDITORS,
  LIVE_MODEL_CURRENT_GROUP_KEY,
  LIVE_MODEL_STYLE_BY_CONNECTOR,
} from '@/constants/live-model-chain.constants';
import { LiveModelChainKind } from '@/enums/live-model-chain.enum';
import type { LiveModelChainDirection } from '@/enums/live-model-chain.enum';
import type { GroupedModels, ModelPickerGroup, ModelPickerOption } from '@/types/component.types';
import type { LiveModelChains, LiveModelRef, LivePolicyConfig } from '@/types/live-admin.types';
import {
  decodeModelValue,
  encodeModelValue,
  groupedModelsToPickerGroups,
} from '@/utilities/model-selector.utility';

/** The picker value of a stored model: the chat picker's `provider::model`. */
export function liveModelRefValue(ref: LiveModelRef): string {
  return encodeModelValue(ref.connector, ref.model);
}

/** A picked chat model as the policy's `{connector, model, style}`; null when Live cannot call it. */
export function liveModelRefFromValue(value: string | null): LiveModelRef | null {
  const decoded = value === null ? null : decodeModelValue(value);
  const style = decoded === null ? undefined : LIVE_MODEL_STYLE_BY_CONNECTOR[decoded.provider];
  if (decoded === null || style === undefined) {
    return null;
  }
  return { connector: decoded.provider, model: decoded.model, style };
}

export function liveIsSupportedConnector(connector: string): boolean {
  return LIVE_MODEL_STYLE_BY_CONNECTOR[connector] !== undefined;
}

/** The three chains of a stored version; one without a council gets the server's default agent. */
export function liveModelChainsFromConfig(config: LivePolicyConfig): LiveModelChains {
  return {
    [LiveModelChainKind.SUMMARY]: config.summaryModelChain.map((ref) => ({ ...ref })),
    [LiveModelChainKind.VISION]: config.visionModelChain.map((ref) => ({ ...ref })),
    [LiveModelChainKind.COUNCIL]: (config.councilModelChain ?? LIVE_COUNCIL_DEFAULT_CHAIN).map(
      (ref) => ({ ...ref }),
    ),
  };
}

function editorFor(kind: LiveModelChainKind): { min: number; max: number } {
  return LIVE_MODEL_CHAIN_EDITORS.find((editor) => editor.kind === kind) ?? { min: 1, max: 1 };
}

/** The first chain whose length the server would refuse, else null. */
export function liveInvalidModelChain(chains: LiveModelChains): LiveModelChainKind | null {
  for (const editor of LIVE_MODEL_CHAIN_EDITORS) {
    const length = chains[editor.kind].length;
    if (length < editor.min || length > editor.max) {
      return editor.kind;
    }
  }
  return null;
}

export function liveModelChainSet(
  chain: LiveModelRef[],
  index: number,
  ref: LiveModelRef,
): LiveModelRef[] {
  return chain.map((current, position) => (position === index ? ref : current));
}

/** Swaps a row with its neighbour; a move past either end changes nothing. */
export function liveModelChainMove(
  chain: LiveModelRef[],
  index: number,
  direction: LiveModelChainDirection,
): LiveModelRef[] {
  const target = index + direction;
  const from = chain[index];
  const to = chain[target];
  if (from === undefined || to === undefined) {
    return chain;
  }
  const next = [...chain];
  next[index] = to;
  next[target] = from;
  return next;
}

/** Removes a row, never below the chain's minimum. */
export function liveModelChainRemove(
  kind: LiveModelChainKind,
  chain: LiveModelRef[],
  index: number,
): LiveModelRef[] {
  if (chain.length <= editorFor(kind).min) {
    return chain;
  }
  return chain.filter((_ref, position) => position !== index);
}

/** Adds a row (a copy of the last one, for the admin to change), never above the maximum. */
export function liveModelChainAdd(kind: LiveModelChainKind, chain: LiveModelRef[]): LiveModelRef[] {
  const last = chain.at(-1) ?? LIVE_COUNCIL_DEFAULT_CHAIN[0];
  if (chain.length >= editorFor(kind).max || last === undefined) {
    return chain;
  }
  return [...chain, { ...last }];
}

function withLiveSupport(option: ModelPickerOption, unsupportedLabel: string): ModelPickerOption {
  const provider = decodeModelValue(option.value)?.provider ?? '';
  const supported = liveIsSupportedConnector(provider);
  // The platform pays for Live, so the admin's own plan never locks a model; only the provider can.
  return { ...option, isLocked: !supported, lockedLabel: supported ? undefined : unsupportedLabel };
}

/**
 * The chat picker's catalogue for the Live chains: every provider stays visible, the ones
 * claw-live-service cannot call are disabled with `unsupportedLabel`, and a stored model the
 * catalogue no longer lists is kept selectable under `currentLabel`.
 */
export function liveModelPickerGroups(
  groupedModels: GroupedModels[],
  chains: LiveModelChains | null,
  unsupportedLabel: string,
  currentLabel: string,
): ModelPickerGroup[] {
  const groups = groupedModelsToPickerGroups(groupedModels).map((group) => ({
    ...group,
    options: group.options.map((option) => withLiveSupport(option, unsupportedLabel)),
  }));
  const known = new Set(groups.flatMap((group) => group.options.map((option) => option.value)));
  const missing = new Map<string, ModelPickerOption>();
  for (const ref of chains === null ? [] : Object.values(chains).flat()) {
    const value = liveModelRefValue(ref);
    if (!known.has(value) && !missing.has(value)) {
      missing.set(value, withLiveSupport({ value, label: ref.model }, unsupportedLabel));
    }
  }
  if (missing.size === 0) {
    return groups;
  }
  const current = { key: LIVE_MODEL_CURRENT_GROUP_KEY, label: currentLabel };
  return [{ ...current, options: [...missing.values()] }, ...groups];
}
