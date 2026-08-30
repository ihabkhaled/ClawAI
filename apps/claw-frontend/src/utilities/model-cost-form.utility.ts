import { CostClass } from '@/enums/router-models.enum';
import type { TranslateFunction } from '@/types/i18n.types';
import type {
  ModelCostCatalogRow,
  ModelCostFormErrors,
  ModelCostFormState,
  PublishModelCostRequest,
} from '@/types/model-cost.types';
import {
  dollarsPerMillionToMicroUsd,
  isValidRateInput,
  microUsdToRateInput,
} from '@/utilities/model-cost.utility';

/**
 * Prefills the edit dialog from the row's RESOLVED rates.
 *
 * A fallback row is prefilled with the fallback's numbers on purpose: they are
 * what the wallet is charging right now, so they are the honest starting point
 * for the operator to correct — and a blank form would invite publishing a
 * half-remembered rate instead of adjusting a known one.
 */
export function buildModelCostFormState(row: ModelCostCatalogRow | null): ModelCostFormState {
  return {
    inputDollarsPerMillion: microUsdToRateInput(row?.inputPerMillionMicroUsd ?? null),
    outputDollarsPerMillion: microUsdToRateInput(row?.outputPerMillionMicroUsd ?? null),
    cachedInputDollarsPerMillion: microUsdToRateInput(row?.cachedInputPerMillionMicroUsd ?? null),
    costClass: toCostClass(row?.costClass),
  };
}

/**
 * The catalogue sends `costClass` as a plain string because it comes from the
 * shared rate contract, not from this app's enum. An unrecognised value falls
 * back to STANDARD rather than being trusted into a Select that would then
 * render an empty trigger.
 */
export function toCostClass(value: string | undefined): CostClass {
  const known = Object.values(CostClass).find((member) => member === value);
  return known ?? CostClass.STANDARD;
}

export function resolveModelCostFormErrors(
  state: ModelCostFormState,
  t: TranslateFunction,
): ModelCostFormErrors {
  const inputInvalid = !isValidRateInput(state.inputDollarsPerMillion);
  const outputInvalid = !isValidRateInput(state.outputDollarsPerMillion);
  // A price with only one side is not a price: cost cannot be bounded from
  // input alone, so the publish DTO rejects a half-filled pair. Enforced here
  // as well, next to the field, rather than as an unattached 400.
  const inputEmpty = state.inputDollarsPerMillion.trim() === '';
  const outputEmpty = state.outputDollarsPerMillion.trim() === '';
  const halfPriced = inputEmpty !== outputEmpty;
  return {
    inputDollarsPerMillion: resolveRateError(inputInvalid, halfPriced, t),
    outputDollarsPerMillion: resolveRateError(outputInvalid, halfPriced, t),
    cachedInputDollarsPerMillion: isValidRateInput(state.cachedInputDollarsPerMillion)
      ? null
      : t('adminModelCosts.form.invalidRate'),
  };
}

function resolveRateError(
  isInvalid: boolean,
  isHalfPriced: boolean,
  t: TranslateFunction,
): string | null {
  if (isInvalid) {
    return t('adminModelCosts.form.invalidRate');
  }
  return isHalfPriced ? t('adminModelCosts.form.pairRequired') : null;
}

export function isModelCostFormValid(errors: ModelCostFormErrors): boolean {
  return (
    errors.inputDollarsPerMillion === null &&
    errors.outputDollarsPerMillion === null &&
    errors.cachedInputDollarsPerMillion === null
  );
}

export function buildPublishModelCostRequest(
  row: ModelCostCatalogRow | null,
  state: ModelCostFormState,
  t: TranslateFunction,
): PublishModelCostRequest | null {
  if (row === null || !isModelCostFormValid(resolveModelCostFormErrors(state, t))) {
    return null;
  }
  return {
    provider: row.provider,
    modelKey: row.modelKey,
    inputPerMillionMicroUsd: dollarsPerMillionToMicroUsd(state.inputDollarsPerMillion),
    outputPerMillionMicroUsd: dollarsPerMillionToMicroUsd(state.outputDollarsPerMillion),
    cachedInputPerMillionMicroUsd: dollarsPerMillionToMicroUsd(state.cachedInputDollarsPerMillion),
    costClass: state.costClass,
  };
}
