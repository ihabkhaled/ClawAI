import type { Dispatch, SetStateAction } from 'react';

import type { DeviceScope, PairingEmptyStateKind, RiskLabel } from '../enums';

import type { Device, DeviceWithCounts } from './agent.types';
import type { TranslateFunction } from './i18n.types';

export type ScopeCheckboxListProps = {
  value: DeviceScope[];
  onChange: (next: DeviceScope[]) => void;
  disabled?: boolean;
};

export type PairingApprovalCardProps = {
  t: TranslateFunction;
  deviceName: string;
  setDeviceName: Dispatch<SetStateAction<string>>;
  selectedScopes: DeviceScope[];
  setSelectedScopes: Dispatch<SetStateAction<DeviceScope[]>>;
  approve: () => Promise<void>;
  deny: () => Promise<void>;
  isBusy: boolean;
};

export type PairingEmptyStateProps = {
  t: TranslateFunction;
  kind: PairingEmptyStateKind;
};

export type DeviceStatusBadgeProps = {
  status: Device['status'];
};

export type DeviceListRowProps = {
  t: TranslateFunction;
  device: Device;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
};

export type DeviceDetailCardProps = {
  t: TranslateFunction;
  device: DeviceWithCounts;
  onRevoke: () => void;
  isRevoking: boolean;
};

export type RiskBadgeProps = {
  label: RiskLabel;
  score: number;
};
