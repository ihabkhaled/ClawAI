import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '@claw/shared-auth';
import { AppModule } from '../../app/app.module';
import { MOBILE_ROUTE_METADATA_KEY } from '../decorators/mobile-route.decorator';
import { REQUIRE_SCOPES_METADATA_KEY } from '../decorators/require-scopes.decorator';
import type { RouteAuthKind, RouteDescriptor } from './route-inventory.types';

const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';
const GUARDS_METADATA = '__guards__';
const IMPORTS_METADATA = 'imports';
const CONTROLLERS_METADATA = 'controllers';

type ModuleRef = { module?: unknown } | (new () => object);

function moduleClassOf(ref: ModuleRef): (new () => object) | undefined {
  if (typeof ref === 'function') return ref;
  return typeof ref.module === 'function' ? (ref.module as new () => object) : undefined;
}

/** Every controller registered anywhere under `AppModule`: what the service really serves. */
function registeredControllers(): Array<new () => object> {
  const seen = new Set<new () => object>();
  const controllers = new Set<new () => object>();
  const visit = (ref: ModuleRef): void => {
    const moduleClass = moduleClassOf(ref);
    if (moduleClass === undefined || seen.has(moduleClass)) return;
    seen.add(moduleClass);
    const own: unknown = Reflect.getMetadata(CONTROLLERS_METADATA, moduleClass);
    if (Array.isArray(own)) {
      for (const controller of own as Array<new () => object>) controllers.add(controller);
    }
    const imported: unknown = Reflect.getMetadata(IMPORTS_METADATA, moduleClass);
    if (Array.isArray(imported)) {
      for (const child of imported as ModuleRef[]) visit(child);
    }
  };
  visit(AppModule);
  return [...controllers];
}

function normalizePath(...parts: string[]): string {
  const joined = parts
    .flatMap((part) => part.split('/'))
    .filter((part) => part.length > 0)
    .join('/');
  return `/${joined}`;
}

function guardsOf(target: object): Array<{ name: string }> {
  const guards: unknown = Reflect.getMetadata(GUARDS_METADATA, target);
  return Array.isArray(guards) ? (guards as Array<{ name: string }>) : [];
}

function methodName(method: number): string {
  const found = Object.entries(RequestMethod).find(([, value]) => value === method);
  return found?.[0] ?? String(method);
}

function classify(isPublic: boolean, guardNames: string[]): RouteAuthKind {
  if (!isPublic) return 'user-jwt';
  const device =
    guardNames.includes('DeviceAccessGuard') || guardNames.includes('CompatAgentGuard');
  if (device) return 'device-token';
  if (guardNames.includes('RunnerTokenGuard')) return 'runner-token';
  if (guardNames.includes('ServiceTokenGuard')) return 'service-token';
  return guardNames.length === 0 ? 'anonymous' : 'unclassified';
}

function describeHandler(controller: new () => object, name: string): RouteDescriptor | undefined {
  const handler: unknown = Reflect.getOwnPropertyDescriptor(controller.prototype, name)?.value;
  if (typeof handler !== 'function') return undefined;
  const method: unknown = Reflect.getMetadata(METHOD_METADATA, handler);
  if (typeof method !== 'number') return undefined;
  const basePath: unknown = Reflect.getMetadata(PATH_METADATA, controller);
  const methodPath: unknown = Reflect.getMetadata(PATH_METADATA, handler);
  const isPublic =
    Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true ||
    Reflect.getMetadata(IS_PUBLIC_KEY, controller) === true;
  const guardNames = [...guardsOf(controller), ...guardsOf(handler)].map((guard) => guard.name);
  const required: unknown =
    Reflect.getMetadata(REQUIRE_SCOPES_METADATA_KEY, handler) ??
    Reflect.getMetadata(REQUIRE_SCOPES_METADATA_KEY, controller);
  return {
    signature: `${methodName(method)} ${normalizePath(
      typeof basePath === 'string' ? basePath : '',
      typeof methodPath === 'string' ? methodPath : '',
    )}`,
    controller,
    controllerName: controller.name,
    handlerName: name,
    handler: handler as () => void,
    isPublic,
    guardNames,
    authKind: classify(isPublic, guardNames),
    mobileRoute:
      Reflect.getMetadata(MOBILE_ROUTE_METADATA_KEY, handler) === true ||
      Reflect.getMetadata(MOBILE_ROUTE_METADATA_KEY, controller) === true,
    requiredScopes: Array.isArray(required) ? (required as string[]) : [],
  };
}

/** Every HTTP handler of every registered controller, with the facts that decide who may call it. */
export function discoverRoutes(): { controllers: string[]; routes: RouteDescriptor[] } {
  const controllers = registeredControllers();
  const routes = controllers.flatMap((controller) =>
    Object.getOwnPropertyNames(controller.prototype)
      .filter((name) => name !== 'constructor')
      .map((name) => describeHandler(controller, name))
      .filter((route): route is RouteDescriptor => route !== undefined),
  );
  return { controllers: controllers.map((controller) => controller.name), routes };
}
