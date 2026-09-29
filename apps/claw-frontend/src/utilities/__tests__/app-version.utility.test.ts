import { describe, expect, it } from 'vitest';

import { isNewerVersion } from '../app-version.utility';

// Reported 2026-09-29: the update banner stayed after a reload and after
// pressing Update. It must show only while the deployed release is later than
// the running page; equal or older means the page is current.
describe('isNewerVersion', () => {
  it.each([
    ['1.148.8', '1.148.7', true],
    ['1.149.0', '1.148.7', true],
    ['2.0.0', '1.148.7', true],
    ['1.148.10', '1.148.9', true],
    ['1.148.7', '1.148.7', false],
    ['1.148.6', '1.148.7', false],
    ['1.99.0', '1.148.0', false],
    ['1.148', '1.148.0', false],
    ['1.148.7-rc.1', '1.148.6', true],
  ])('deployed %s vs running %s → %s', (deployed, running, expected) => {
    expect(isNewerVersion(deployed, running)).toBe(expected);
  });

  it.each([
    ['', '1.0.0'],
    ['latest', '1.0.0'],
    ['1.0.0', 'dev'],
    ['1.x.0', '1.0.0'],
  ])('treats unparseable %s / %s as not newer', (deployed, running) => {
    expect(isNewerVersion(deployed, running)).toBe(false);
  });
});
