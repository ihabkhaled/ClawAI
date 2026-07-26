import { withoutBlankEnvValues } from '../env-blank.utility';

describe('withoutBlankEnvValues', () => {
  it('drops an empty-string value', () => {
    // `PAYPAL_WEBHOOK_ID=` in a .env file — which is what .env.example ships —
    // must read as "gateway not configured", not as "the empty string".
    expect(withoutBlankEnvValues({ PAYPAL_WEBHOOK_ID: '' })).toEqual({});
  });

  it('drops a whitespace-only value', () => {
    expect(withoutBlankEnvValues({ PAYMOB_API_KEY: '   ' })).toEqual({});
  });

  it('keeps a real value untouched, including its surrounding whitespace', () => {
    // Trimming a kept value would silently change a secret. Blankness is the only
    // judgement this function makes.
    const result = withoutBlankEnvValues({ JWT_SECRET: ' abc ' });
    expect(result['JWT_SECRET']).toBe(' abc ');
  });

  it('keeps a value that is literally "0"', () => {
    // USD_TO_EGP_FALLBACK_RATE=0 is meaningful — it means "fail checkout rather
    // than charge a stale rate" — so it must survive.
    expect(withoutBlankEnvValues({ USD_TO_EGP_FALLBACK_RATE: '0' })).toEqual({
      USD_TO_EGP_FALLBACK_RATE: '0',
    });
  });

  it('leaves an already-clean environment unchanged', () => {
    const source = { A: '1', B: '2' };
    expect(withoutBlankEnvValues(source)).toEqual(source);
  });

  it('does not mutate its input', () => {
    const source = { KEEP: 'x', DROP: '' };
    withoutBlankEnvValues(source);
    expect(source).toEqual({ KEEP: 'x', DROP: '' });
  });
});
