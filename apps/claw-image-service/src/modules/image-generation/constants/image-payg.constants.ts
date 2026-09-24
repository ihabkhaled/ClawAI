import { BillingErrorCode } from '@claw/shared-types';

/**
 * The output ceiling this service reserves against for one image.
 *
 * IT IS NEVER SENT TO AN IMAGE API. An image response is not token-bounded —
 * neither `POST /images/generations` nor `:generateContent` with
 * `responseModalities: ['TEXT','IMAGE']` accepts a max-output-token argument, so
 * `hold.maxOutputTokens` has no request field to land in. It exists here only so
 * `reserve` has a worst case to price the hold from.
 *
 * 8,192 is chosen against the one image family that reports tokens at all:
 * Gemini bills a generated image as a fixed block of output tokens (~1,290 for
 * 2.5 Flash Image) plus the text part. 8,192 covers several times that, so the
 * hold is never short, while staying ~4x smaller than the 30,512 text default —
 * which at any realistic output rate would hold more than a Starter plan's
 * entire daily allowance for a single picture.
 *
 * OpenAI image rows are priced PER IMAGE with an output token rate of 0, so for
 * them this ceiling adds nothing to the hold: the hold is exactly
 * `IMAGE_PAYG_IMAGES_PER_REQUEST x imagePerUnitMicroUsd`.
 */
export const IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS = 8192;

/**
 * Images one generation request asks the provider for — the EXPECTED
 * `imageUnits` the hold is sized on.
 *
 * One, because that is what this service sends: the OpenAI adapter hard-codes
 * `n: 1`, Gemini and xAI return one image per call, and no request DTO carries
 * a count. If a count parameter is ever added, reserve on it instead of this.
 * Settlement never uses this number — it uses the images actually returned.
 */
export const IMAGE_PAYG_IMAGES_PER_REQUEST = 1;

/**
 * The prompt-token figure handed to `reserve` for an image request.
 *
 * Zero, deliberately. The image APIs do not report a prompt token count, and
 * inventing one from the prompt string would inflate the hold with a number no
 * provider will ever confirm at finalize. The prompt half of an image request is
 * a rounding error next to the image itself; the ceiling above is what actually
 * bounds the spend.
 */
export const IMAGE_PAYG_PROMPT_TOKENS = 0;

/**
 * Failure codes that mean "the wallet said no", as stored on
 * `ImageGeneration.errorCode`.
 *
 * A generation job is fire-and-forget (`void this.processJobWithFallback(...)`),
 * so a refused reservation has no HTTP response to surface on. It has to land in
 * the stored record or it is invisible — the user watches a spinner reach FAILED
 * with "please try again", tries again, and is refused again for a reason
 * nothing ever told them. These codes are what the SSE stream and the row carry
 * instead.
 */
export const IMAGE_CREDIT_FAILURE_CODES: readonly string[] = [
  BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
  BillingErrorCode.PAYG_PROMPT_TOO_EXPENSIVE,
  BillingErrorCode.PAYG_MODEL_UNPRICED,
  BillingErrorCode.PAYG_PRICING_UNAVAILABLE,
];

/**
 * User-facing message stored alongside a credit failure.
 *
 * Deliberately does NOT say "try again" — the retry that the generic provider
 * message invites would be refused identically, and each refusal costs the user
 * another wait. i18n for the rendered surface lives in the frontend; this string
 * is the stored fallback the SSE consumer shows when it has no key.
 */
export const IMAGE_CREDIT_FAILURE_MESSAGE =
  'Image generation needs pay-as-you-go credit. Add credit or switch to a local image model.';

/**
 * The quality every `gpt-image*` call is sent at. The per-image rate seeded
 * for `gpt-image-1` (seed v4) is OpenAI's HIGH-quality 1024x1024 list price,
 * so the request must ask for exactly that tier: left unset, OpenAI's `auto`
 * picks a tier the charge does not follow, and a caller-supplied `low` would
 * be billed at the high price. The charge follows the call only when the call
 * is pinned.
 */
export const OPENAI_GPT_IMAGE_PRICED_QUALITY = 'high';

/** Model-id prefix of the OpenAI image family priced per image at a fixed quality. */
export const OPENAI_GPT_IMAGE_MODEL_PREFIX = 'gpt-image';
