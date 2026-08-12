import {
  describeProviderErrorResponse,
  isProviderErrorResponse,
} from '../provider-error-response.utility';

// A provider can answer HTTP 200 with an error body. Gemini returned
// `[{"error":{"code":429,"status":"RESOURCE_EXHAUSTED",...}}]` as the assistant
// message: nothing threw, so the fallback chain never advanced, and the raw
// JSON — billing URL and all — was stored and rendered as the reply.
describe('detecting a provider error returned as an answer', () => {
  it('catches the quota envelope that caused the outage', () => {
    const body =
      '[{ "error": { "code": 429, "message": "Your prepayment credits are depleted.", "status": "RESOURCE_EXHAUSTED" } }]';

    expect(isProviderErrorResponse(body)).toBe(true);
  });

  it.each([
    ['object form', '{"error":{"code":500,"message":"internal"}}'],
    ['permission denied', '{"error":{"status":"PERMISSION_DENIED","message":"no"}}'],
    ['unauthenticated', '{"error":{"status":"UNAUTHENTICATED","message":"no key"}}'],
    ['string detail', '{"error":"rate limited"}'],
  ])('catches %s', (_name, body) => {
    expect(isProviderErrorResponse(body)).toBe(true);
  });

  it('treats an empty or missing answer as a failure', () => {
    expect(isProviderErrorResponse('')).toBe(true);
    expect(isProviderErrorResponse('   ')).toBe(true);
    expect(isProviderErrorResponse()).toBe(true);
    expect(isProviderErrorResponse(null)).toBe(true);
  });

  // The detector must not eat real answers. Prose that merely discusses an
  // error, and JSON the user actually asked for, are answers.
  it.each([
    ['ordinary prose', 'The request failed with error 429 because the quota ran out.'],
    ['prose mentioning a shape', 'Return {"error": ...} when the call fails.'],
    ['a JSON answer', '{"status":"ok","value":42}'],
    ['a JSON array answer', '[{"name":"a"},{"name":"b"}]'],
    ['markdown with a fenced error sample', '```json\n{"error":{"code":429}}\n```'],
    ['code containing the word error', 'try { run(); } catch (error) { log(error); }'],
    // An adversarial review caught these: a validation answer and a structured
    // result both carry an `error` field and are real answers. Discarding them
    // burned the whole chain and charged the user for every provider.
    ['a validation result', '{"valid":false,"error":"email is required"}'],
    ['a structured answer with a status', '{"status":"INTERNAL","summary":"done"}'],
    ['an answer with a numeric code', '{"code":404,"message":"Not found","hint":"check the id"}'],
    ['a list of records', '[{"error":"a"},{"error":"b"}]'],
  ])('keeps %s', (_name, body) => {
    expect(isProviderErrorResponse(body)).toBe(false);
  });

  it('never reuses the vendor text in the reason', () => {
    const body = '{"error":{"code":429,"message":"go to https://ai.studio/projects to pay"}}';

    const reason = describeProviderErrorResponse(body);

    expect(reason).not.toContain('ai.studio');
    expect(reason).toBe('Provider returned an error payload instead of an answer');
  });

  it('distinguishes an empty answer from an error payload', () => {
    expect(describeProviderErrorResponse('')).toBe('Provider returned an empty response');
  });
});
