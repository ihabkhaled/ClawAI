type PaymobPixelOptions = {
  publicKey: string;
  clientSecret: string;
  paymentMethods: string[];
  elementId: string;
  disablePay: boolean;
  showSaveCard: boolean;
  forceSaveCard: boolean;
  afterPaymentComplete: () => Promise<void>;
  onPaymentCancel: () => void;
};

declare global {
  interface Window {
    Pixel?: new (options: PaymobPixelOptions) => unknown;
  }
}

export {};
