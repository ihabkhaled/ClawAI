import type { CreditFallbackMode } from '@/enums';

export type CreditFallbackModeCardProps = {
  value: CreditFallbackMode;
  isPending: boolean;
  onChange: (value: string) => void;
};

export type CreditFallbackModeOption = {
  value: CreditFallbackMode;
  labelKey: string;
};

export type CreditFallbackModeState = {
  currentCreditFallbackMode: CreditFallbackMode;
  handleCreditFallbackModeChange: (value: string) => void;
};
