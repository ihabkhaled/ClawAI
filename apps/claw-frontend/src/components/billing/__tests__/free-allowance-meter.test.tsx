import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FreeAllowanceMeter } from '../free-allowance-meter';

const t = (key: string, params?: Record<string, string>): string =>
  params === undefined ? key : `${key}|${JSON.stringify(params)}`;

const BASE = { limit: 10, used: 6, remaining: 4, resetsAt: '2026-11-01T00:00:00.000Z' };

describe('FreeAllowanceMeter', () => {
  it('shows the request count, the meter as a percentage and the reset date', () => {
    render(
      <FreeAllowanceMeter
        allowance={{ ...BASE, meterUsedPercent: 35 }}
        locale="en"
        t={t as never}
      />,
    );

    expect(
      screen.getByText('billing.credit.freeMeter.requests|{"used":"6","limit":"10"}'),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/freeMeter\.percent\|\{"percent":"35"\}/u).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '35');
    expect(screen.getByTestId('free-meter-bar')).toHaveStyle({ width: '35%' });
    expect(screen.getByText('billing.credit.freeMeter.coversLowerCost')).toBeInTheDocument();
    expect(screen.getByText(/billing\.credit\.freeMeter\.resets\|/u)).toBeInTheDocument();
  });

  it('never prints a price: only counts and a percentage reach the screen', () => {
    const { container } = render(
      <FreeAllowanceMeter
        allowance={{ ...BASE, meterUsedPercent: 35 }}
        locale="en"
        t={t as never}
      />,
    );

    expect(container.textContent).not.toMatch(/\$|USD|micro/iu);
  });

  it('shows only the count for a plan with no meter', () => {
    render(
      <FreeAllowanceMeter
        allowance={{ ...BASE, meterUsedPercent: null }}
        locale="en"
        t={t as never}
      />,
    );

    expect(screen.getByText(/freeMeter\.requests/u)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText('billing.credit.freeMeter.coversLowerCost')).toBeNull();
  });

  it('hides the count for an unlimited allowance but still shows the meter', () => {
    render(
      <FreeAllowanceMeter
        allowance={{
          limit: null,
          used: 3,
          remaining: null,
          resetsAt: BASE.resetsAt,
          meterUsedPercent: 100,
        }}
        locale="en"
        t={t as never}
      />,
    );

    expect(screen.queryByText(/freeMeter\.requests/u)).toBeNull();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('leaves out the reset line when the date cannot be read', () => {
    render(
      <FreeAllowanceMeter
        allowance={{ ...BASE, resetsAt: 'not a date', meterUsedPercent: 0 }}
        locale="en"
        t={t as never}
      />,
    );

    expect(screen.queryByText(/freeMeter\.resets/u)).toBeNull();
  });
});
