import {
  PAYMOB_PIXEL_INTEGRITY,
  PAYMOB_PIXEL_URL,
  PAYMOB_SCRIPT_ID,
} from '@/constants/billing.constants';
import type { PaymobPixelCredentials } from '@/types/billing.types';

let paymobLoader: Promise<void> | null = null;

export function loadPaymobPixel(): Promise<void> {
  if (window.Pixel !== undefined) {
    return Promise.resolve();
  }
  if (paymobLoader !== null) {
    return paymobLoader;
  }
  paymobLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`#${PAYMOB_SCRIPT_ID}`);
    if (existing !== null) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Paymob SDK failed')), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.id = PAYMOB_SCRIPT_ID;
    script.src = PAYMOB_PIXEL_URL;
    script.type = 'module';
    script.crossOrigin = 'anonymous';
    script.integrity = PAYMOB_PIXEL_INTEGRITY;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Paymob SDK failed')), { once: true });
    document.head.append(script);
  });
  return paymobLoader;
}

export function readPaymobCredentials(url: string): PaymobPixelCredentials | null {
  const parsed = new URL(url);
  const publicKey = parsed.searchParams.get('publicKey');
  const clientSecret = parsed.searchParams.get('clientSecret');
  return publicKey === null || clientSecret === null ? null : { publicKey, clientSecret };
}
