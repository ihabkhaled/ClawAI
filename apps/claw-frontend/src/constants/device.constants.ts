import { DeviceScope } from '../enums';

export const DEFAULT_CONNECT_SCOPES: DeviceScope[] = [
  DeviceScope.SESSIONS_READ,
  DeviceScope.SHELL_EXEC,
];

export const AVAILABLE_CONNECT_SCOPES: DeviceScope[] = [
  DeviceScope.SESSIONS_READ,
  DeviceScope.SHELL_EXEC,
];
