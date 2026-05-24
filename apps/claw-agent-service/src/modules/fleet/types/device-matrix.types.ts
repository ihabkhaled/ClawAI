/**
 * V2 Stream 07 — device matrix row shape returned by
 * OrganizationRepository.listDevicesForOrganization.
 */
export type DeviceMatrixRow = {
  deviceId: string;
  deviceName: string | null;
  userId: string;
  os: string | null;
  platform: string | null;
  agentVersion: string | null;
  status: string;
  lastSeenAt: Date | null;
  pendingCapabilities: number;
};
