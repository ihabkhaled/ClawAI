export type ClamScanResult = {
  clean: boolean;
  reason: string;
};

export type FileValidationResult = {
  valid: boolean;
  reason: string;
};

export type FileSecurityCheckResult = {
  passed: boolean;
  checks: FileSecurityCheck[];
};

export type FileSecurityCheck = {
  name: string;
  passed: boolean;
  reason: string;
};
