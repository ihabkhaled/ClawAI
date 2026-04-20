import type { Dispatch, SetStateAction } from 'react';

import type { DeviceScope, MutationStatus } from '../enums';

import type { Device, DeviceWithCounts } from './agent.types';

export type UseConnectDevicePageResult = {
  pairingCode: string | null;
  deviceName: string;
  setDeviceName: Dispatch<SetStateAction<string>>;
  selectedScopes: DeviceScope[];
  setSelectedScopes: Dispatch<SetStateAction<DeviceScope[]>>;
  approve: () => Promise<void>;
  deny: () => Promise<void>;
  approveStatus: MutationStatus;
  approveError: unknown;
  denyStatus: MutationStatus;
  approvedDeviceId: string | null;
};

export type UseDevicesPageResult = {
  devices: Device[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  revoke: (id: string) => Promise<void>;
  revokeStatus: MutationStatus;
  revokingId: string | null;
};

export type UseDeviceDetailPageResult = {
  device: DeviceWithCounts | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  revoke: () => Promise<void>;
  rename: (name: string) => Promise<void>;
  revokeStatus: MutationStatus;
  renameStatus: MutationStatus;
};
