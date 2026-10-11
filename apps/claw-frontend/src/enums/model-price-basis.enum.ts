/**
 * How far to trust a stored model price.
 *
 * Mirrors ModelPriceBasis in claw-routing-service
 * (`src/common/enums/model-price-basis.enum.ts`).
 */
export enum ModelPriceBasis {
  PROVIDER_PUBLISHED = 'PROVIDER_PUBLISHED',
  ESTIMATED = 'ESTIMATED',
  ADMIN_SET = 'ADMIN_SET',
}
