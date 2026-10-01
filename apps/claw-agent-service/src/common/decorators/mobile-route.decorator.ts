import { SetMetadata } from '@nestjs/common';

export const MOBILE_ROUTE_METADATA_KEY = 'agent:mobileRoute';

/**
 * F097. Marks a route (or every route of a controller) as one a MOBILE token
 * may call, and as callable by NOTHING else of the device family.
 *
 * `DeviceAccessGuard` is the single place that reads it: a mobile token is
 * refused on every route that does not carry this mark, and a desktop device
 * token is refused on every route that does. Default deny, so a route added
 * tomorrow is closed to a phone until someone writes this line on purpose.
 */
export const MobileRoute = (): MethodDecorator & ClassDecorator =>
  SetMetadata(MOBILE_ROUTE_METADATA_KEY, true);
