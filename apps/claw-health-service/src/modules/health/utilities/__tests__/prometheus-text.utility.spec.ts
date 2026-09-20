import { escapeLabelValue, renderMetrics } from '../prometheus-text.utility';

describe('renderMetrics', () => {
  it('writes HELP, TYPE and one line per sample', () => {
    const text = renderMetrics([
      {
        name: 'claw_service_up',
        help: 'Whether a service answered.',
        type: 'gauge',
        samples: [
          { value: 1, labels: { service: 'auth-service' } },
          { value: 0, labels: { service: 'chat-service' } },
        ],
      },
    ]);

    expect(text).toBe(
      [
        '# HELP claw_service_up Whether a service answered.',
        '# TYPE claw_service_up gauge',
        'claw_service_up{service="auth-service"} 1',
        'claw_service_up{service="chat-service"} 0',
        '',
      ].join('\n'),
    );
  });

  it('writes a sample with no labels', () => {
    expect(
      renderMetrics([
        { name: 'claw_services_up', help: 'n', type: 'gauge', samples: [{ value: 17 }] },
      ]),
    ).toContain('claw_services_up 17\n');
  });

  // Prometheus rejects the WHOLE scrape on one malformed line, so a value that
  // cannot be measured must cost only its own sample.
  it.each([[Number.NaN], [Number.POSITIVE_INFINITY]])('skips the sample for %s', (value) => {
    const text = renderMetrics([
      {
        name: 'claw_service_response_ms',
        help: 'n',
        type: 'gauge',
        samples: [
          { value, labels: { service: 'down-service' } },
          { value: 12, labels: { service: 'up-service' } },
        ],
      },
    ]);

    expect(text).not.toContain('down-service');
    expect(text).toContain('claw_service_response_ms{service="up-service"} 12');
  });

  // rules/19: a metric is long-lived and widely readable, so it carries
  // infrastructure identity and nothing else.
  it.each([['userId'], ['email'], ['threadId']])('refuses the label %s', (label) => {
    expect(() =>
      renderMetrics([
        {
          name: 'claw_service_up',
          help: 'n',
          type: 'gauge',
          samples: [{ value: 1, labels: { [label]: 'x' } }],
        },
      ]),
    ).toThrow(/not allowed/u);
  });
});

describe('escapeLabelValue', () => {
  it.each([
    ['plain', 'plain'],
    ['say "hi"', 'say \\"hi\\"'],
    ['back\\slash', 'back\\\\slash'],
    ['two\nlines', 'two\\nlines'],
  ])('escapes %j', (value, expected) => {
    expect(escapeLabelValue(value)).toBe(expected);
  });

  it('cannot inject a second sample line', () => {
    const text = renderMetrics([
      {
        name: 'claw_service_up',
        help: 'n',
        type: 'gauge',
        samples: [{ value: 1, labels: { service: 'evil"} 0\nclaw_service_up{service="fake' } }],
      },
    ]);

    expect(text.trim().split('\n')).toHaveLength(3);
  });
});
