export type PaypalApprovalData = {
  orderID: string;
};

export type PaypalButtonOptions = {
  fundingSource: string;
  createOrder: () => Promise<string>;
  onApprove: (data: PaypalApprovalData) => Promise<void>;
  onCancel: () => void;
  onError: (error: unknown) => void;
  style: {
    layout: 'vertical';
    shape: 'rect';
    height: number;
  };
};

export type PaypalButtonInstance = {
  isEligible: () => boolean;
  render: (container: HTMLElement) => Promise<void>;
  close?: () => void;
};

export type PaypalSdk = {
  FUNDING: {
    PAYPAL: string;
    CARD: string;
  };
  Buttons: (options: PaypalButtonOptions) => PaypalButtonInstance;
};

export type PaypalButtonsHandle = {
  close: () => void;
};

export type RenderPaypalButtonsInput = {
  container: HTMLElement;
  currency: string;
  createOrder: () => Promise<string>;
  onApprove: (data: PaypalApprovalData) => Promise<void>;
  onCancel: () => void;
  onError: (error: unknown) => void;
};
