/** Which credential a route asks for, read off its decorators. */
export type RouteAuthKind =
  'user-jwt' | 'device-token' | 'runner-token' | 'service-token' | 'anonymous' | 'unclassified';

export type RouteDescriptor = {
  /** `GET /agent/mobile/commands` */
  signature: string;
  controller: new (...args: never[]) => object;
  controllerName: string;
  handlerName: string;
  handler: () => void;
  isPublic: boolean;
  guardNames: string[];
  authKind: RouteAuthKind;
  mobileRoute: boolean;
  requiredScopes: string[];
};
