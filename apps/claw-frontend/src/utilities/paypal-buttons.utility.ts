import {
  PAYPAL_ORDER_ID_QUERY_KEY,
  PAYPAL_SDK_NAMESPACE_PREFIX,
  PAYPAL_SDK_SCRIPT_ID_PREFIX,
  PAYPAL_SDK_URL,
} from '@/constants/billing.constants';
import type {
  PaypalButtonInstance,
  PaypalButtonsHandle,
  PaypalSdk,
  RenderPaypalButtonsInput,
} from '@/types/paypal-sdk.types';

let paypalLoaders: Record<string, Promise<PaypalSdk>> = {};

function readPaypalClientId(): string | null {
  const clientId = process.env['NEXT_PUBLIC_PAYPAL_CLIENT_ID']?.trim();
  return clientId === undefined || clientId.length === 0 ? null : clientId;
}

function readPaypalSdk(value: unknown): PaypalSdk | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const buttons = Reflect.get(value, 'Buttons');
  const funding = Reflect.get(value, 'FUNDING');
  if (typeof buttons !== 'function' || typeof funding !== 'object' || funding === null) {
    return null;
  }
  const paypal = Reflect.get(funding, 'PAYPAL');
  const card = Reflect.get(funding, 'CARD');
  return typeof paypal === 'string' && typeof card === 'string' ? (value as PaypalSdk) : null;
}

function loadPaypalSdk(currency: string): Promise<PaypalSdk> {
  const globalSdk = readPaypalSdk(Reflect.get(window, 'paypal'));
  if (globalSdk !== null) {
    return Promise.resolve(globalSdk);
  }

  const normalizedCurrency = currency.toUpperCase().replaceAll(/[^A-Z]/g, '');
  const namespace = `${PAYPAL_SDK_NAMESPACE_PREFIX}${normalizedCurrency}`;
  const namespacedSdk = readPaypalSdk(Reflect.get(window, namespace));
  if (namespacedSdk !== null) {
    return Promise.resolve(namespacedSdk);
  }
  if (paypalLoaders[namespace] !== undefined) {
    return paypalLoaders[namespace];
  }

  paypalLoaders[namespace] = new Promise((resolve, reject) => {
    const clientId = readPaypalClientId();
    if (clientId === null) {
      reject(new Error('PayPal client ID is not configured'));
      return;
    }
    const script = document.createElement('script');
    const query = new URLSearchParams({
      'client-id': clientId,
      currency: normalizedCurrency,
      components: 'buttons,funding-eligibility',
      'enable-funding': 'card',
      intent: 'capture',
    });
    script.id = `${PAYPAL_SDK_SCRIPT_ID_PREFIX}-${normalizedCurrency.toLowerCase()}`;
    script.src = `${PAYPAL_SDK_URL}?${query.toString()}`;
    script.dataset['namespace'] = namespace;
    const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;
    if (nonce !== undefined && nonce.length > 0) {
      script.nonce = nonce;
      script.dataset['cspNonce'] = nonce;
    }
    script.addEventListener(
      'load',
      () => {
        const sdk = readPaypalSdk(Reflect.get(window, namespace));
        if (sdk === null) {
          reject(new Error('PayPal SDK did not initialize'));
          return;
        }
        resolve(sdk);
      },
      { once: true },
    );
    script.addEventListener('error', () => reject(new Error('PayPal SDK failed')), { once: true });
    document.head.append(script);
  });
  return paypalLoaders[namespace];
}

export function readPaypalOrderId(hostedCheckoutUrl: string): string | null {
  try {
    const orderId = new URL(hostedCheckoutUrl).searchParams.get(PAYPAL_ORDER_ID_QUERY_KEY);
    return orderId === null || orderId.length === 0 ? null : orderId;
  } catch {
    return null;
  }
}

export async function renderPaypalButtons(
  input: RenderPaypalButtonsInput,
): Promise<PaypalButtonsHandle> {
  const sdk = await loadPaypalSdk(input.currency);
  const instances: PaypalButtonInstance[] = [];
  for (const fundingSource of [sdk.FUNDING.PAYPAL, sdk.FUNDING.CARD]) {
    const instance = sdk.Buttons({
      fundingSource,
      createOrder: input.createOrder,
      onApprove: input.onApprove,
      onCancel: input.onCancel,
      onError: input.onError,
      style: { layout: 'vertical', shape: 'rect', height: 45 },
    });
    if (instance.isEligible()) {
      instances.push(instance);
      await instance.render(input.container);
    }
  }
  return {
    close: () => {
      for (const instance of instances) {
        instance.close?.();
      }
      input.container.replaceChildren();
    },
  };
}

export function resetPaypalSdkLoaderForTests(): void {
  paypalLoaders = {};
}
