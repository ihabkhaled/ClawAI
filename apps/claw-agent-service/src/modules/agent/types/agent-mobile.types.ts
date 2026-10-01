export type MobileActionTarget = {
  type: 'command' | 'capability';
  id: string;
};

export type MobileActionOutcome = 'success' | 'denied';
