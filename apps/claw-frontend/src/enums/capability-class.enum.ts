// Mirrors apps/claw-agent-service/src/common/enums/capability-class.enum.ts.
// Keep in sync with the backend Prisma enum.
export enum CapabilityClass {
  TERMINAL = 'TERMINAL',
  FILESYSTEM = 'FILESYSTEM',
  PROCESS = 'PROCESS',
  BROWSER = 'BROWSER',
  SCREEN = 'SCREEN',
  CLIPBOARD = 'CLIPBOARD',
  NOTIFICATION = 'NOTIFICATION',
  APPLICATION = 'APPLICATION',
  AUDIO = 'AUDIO',
  SYSTEM = 'SYSTEM',
  RECIPE_STEP = 'RECIPE_STEP',
}
