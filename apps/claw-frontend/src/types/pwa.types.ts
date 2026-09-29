import type { PwaInstallOutcome } from '@/enums/pwa-install-outcome.enum';

export interface PwaInstallPromptChoice {
  outcome: PwaInstallOutcome;
}

export interface PwaInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<PwaInstallPromptChoice>;
}

/** Body of `GET /api/version`. */
export interface DeployedVersionResponse {
  version: string;
}
