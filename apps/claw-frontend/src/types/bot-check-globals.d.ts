import type { RecaptchaApi, TurnstileApi } from '@/types/bot-check.types';

// The two bot-check scripts install these globals once loaded. Only
// lib/bot-check/turnstile.ts and lib/bot-check/recaptcha.ts read them.
declare global {
  interface Window {
    turnstile?: TurnstileApi;
    grecaptcha?: RecaptchaApi;
  }
}

export {};
