import {
  PAYG_ADJUSTMENT_REASON_MAX_LENGTH,
  PAYG_ADJUSTMENT_REASON_MIN_LENGTH,
  PAYG_MAX_ADMIN_ADJUSTMENT_MICRO_USD,
} from '@claw/shared-constants';

import { CREDIT_PACKAGE_SLUG_PATTERN } from '@/constants/credit.constants';
import type {
  AdjustCreditRequest,
  CreateCreditPackageRequest,
  CreditAdjustmentFormErrors,
  CreditAdjustmentFormState,
  CreditFormParse,
  CreditPackageFormErrors,
  CreditPackageFormState,
  PublishCreditPackageVersionRequest,
} from '@/types/credit.types';
import { parseMajorAmountToMinor } from '@/utilities/billing.utility';
import { parseMajorToMicroUsd } from '@/utilities/credit.utility';

/**
 * Parses the "create a package" half of the admin form.
 *
 * Creating the package and pricing it are two calls because they are two facts:
 * the package is an identity that lives forever, the price is an immutable
 * version. The form fills both in one sitting, but they never merge into one
 * request that could rewrite a published price.
 */
export function parseCreditPackageCreate(
  state: CreditPackageFormState,
): CreditFormParse<CreateCreditPackageRequest> {
  const errors: CreditPackageFormErrors = {};
  const slug = state.slug.trim();
  if (slug.length === 0 || !CREDIT_PACKAGE_SLUG_PATTERN.test(slug)) {
    errors.slug = 'Slug must be lowercase kebab-case';
  }
  const displayOrder = Number.parseInt(state.displayOrder, 10);
  if (!Number.isInteger(displayOrder) || displayOrder < 0) {
    errors.displayOrder = 'Display order must be zero or greater';
  }
  if (Object.keys(errors).length > 0) {
    return { value: null, errors };
  }
  return { value: { slug, displayOrder }, errors: {} };
}

/**
 * Parses the "publish a price version" half.
 *
 * `priceMinor` and `creditMicroUsd` are parsed INDEPENDENTLY and neither is
 * derived from the other. The gap between them is the platform's margin on a
 * top-up; computing one from the other would freeze that decision into a deploy
 * and book negative gross margin the first time a gateway fee moved.
 */
export function parseCreditPackageVersion(
  state: CreditPackageFormState,
): CreditFormParse<PublishCreditPackageVersionRequest> {
  const errors: CreditPackageFormErrors = {};
  const currency = state.currency.trim().toUpperCase();
  if (currency.length !== 3) {
    errors.currency = 'Currency must be a 3-letter code';
  }
  const priceMinor = parseMajorAmountToMinor(state.priceMajor, currency);
  if (priceMinor === null) {
    errors.priceMajor = 'Enter a price greater than zero';
  }
  const creditMicroUsd = parseMajorToMicroUsd(state.creditMajor);
  if (creditMicroUsd === null || creditMicroUsd <= 0) {
    errors.creditMajor = 'Enter a credit amount greater than zero';
  }
  if (priceMinor === null || creditMicroUsd === null || Object.keys(errors).length > 0) {
    return { value: null, errors };
  }
  return { value: { priceMinor, currency, creditMicroUsd }, errors: {} };
}

/**
 * Parses an operator credit or debit.
 *
 * Bounded in BOTH directions so a fat-fingered extra zero cannot mint a fortune,
 * and a reason of real length is mandatory: an unattributed adjustment is
 * indistinguishable from a fabricated payment when finance asks where a balance
 * came from.
 */
export function parseCreditAdjustment(
  state: CreditAdjustmentFormState,
): CreditFormParse<AdjustCreditRequest> {
  const errors: CreditAdjustmentFormErrors = {};
  if (state.userId.trim().length === 0) {
    errors.userId = 'A user id is required';
  }
  const amountMicroUsd = parseMajorToMicroUsd(state.amountMajor, true);
  if (amountMicroUsd === null || amountMicroUsd === 0) {
    errors.amountMajor = 'Enter a non-zero amount';
  } else if (Math.abs(amountMicroUsd) > PAYG_MAX_ADMIN_ADJUSTMENT_MICRO_USD) {
    errors.amountMajor = 'Amount exceeds the maximum single adjustment';
  }
  const reason = state.reason.trim();
  if (
    reason.length < PAYG_ADJUSTMENT_REASON_MIN_LENGTH ||
    reason.length > PAYG_ADJUSTMENT_REASON_MAX_LENGTH
  ) {
    errors.reason = 'Give a reason of at least 8 characters';
  }
  if (amountMicroUsd === null || Object.keys(errors).length > 0) {
    return { value: null, errors };
  }
  return { value: { amountMicroUsd, reason }, errors: {} };
}
