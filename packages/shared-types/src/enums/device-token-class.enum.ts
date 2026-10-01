/**
 * F097 — the credential class of a paired agent device.
 *
 * `DEVICE` is the desktop agent token (shell, filesystem, schedule, ...).
 * `MOBILE` is the narrow phone token: it can read runs, approve or deny a
 * pending one and cancel one, and nothing else. A class is fixed when the
 * device is paired and never widens afterwards.
 */
export enum DeviceTokenClass {
  DEVICE = 'device',
  MOBILE = 'mobile',
}

/**
 * The complete, explicit scope list of a `MOBILE` token. A scope that is not
 * listed here can never be granted to a mobile device, whatever the approver
 * asks for.
 */
export enum MobileDeviceScope {
  RUNS_READ = 'runs:read',
  RUNS_APPROVE = 'runs:approve',
  RUNS_CANCEL = 'runs:cancel',
}
