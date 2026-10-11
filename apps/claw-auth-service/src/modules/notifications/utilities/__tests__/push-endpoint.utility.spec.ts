import { isAllowedPushEndpoint } from '../push-endpoint.utility';

describe('isAllowedPushEndpoint', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://jmt17.google.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/abc',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ])('accepts the browser vendor push service %s', (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(true);
  });

  it.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://127.0.0.1/x',
    'https://localhost/x',
    'https://169.254.169.254/latest/meta-data',
    'https://auth-service:4001/x',
    'https://evil.example/fcm.googleapis.com',
    'https://google.com/fcm/send/abc',
    'https://other.google.com/fcm/send/abc',
    'https://fcm.googleapis.com.evil.example/x',
    'https://notfcm.googleapis.com.example/x',
    'https://user:pass@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
    'https://fcm.googleapis.com\\@169.254.169.254/x',
    'https://169.254.169.254\\.fcm.googleapis.com/x',
    'https://fcm.googleapis.com@169.254.169.254/x',
    'https://fcm.googleapis.com /x',
    'https://FCM.googleapis.com/x',
    'https://fcm.googleapis.com/a	b',
    'not a url',
    '',
  ])('rejects %s', (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(false);
  });
});
