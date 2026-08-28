import { describeRejection, isSafeForAdvertising } from '../safe-search-verdict.utility';

describe('isSafeForAdvertising', () => {
  const clean = { adult: 'VERY_UNLIKELY', violence: 'UNLIKELY', racy: 'VERY_UNLIKELY' };

  it('approves an image every moderated category calls unlikely', () => {
    expect(isSafeForAdvertising(clean)).toBe(true);
  });

  it.each(['POSSIBLE', 'LIKELY', 'VERY_LIKELY'])('rejects at %s', (likelihood) => {
    // Strict on purpose: POSSIBLE is a rejection, not a maybe. The asymmetry is
    // deliberate — wrongly approving one image risks the ad account, wrongly
    // withholding ads from one share costs almost nothing.
    expect(isSafeForAdvertising({ ...clean, adult: likelihood })).toBe(false);
  });

  it('ignores spoof and medical, which are not advertising problems', () => {
    // A doctored photo or a clinical image should not withhold ads from a
    // legitimate technical conversation.
    expect(isSafeForAdvertising({ ...clean, spoof: 'VERY_LIKELY', medical: 'VERY_LIKELY' })).toBe(
      true,
    );
  });

  it('refuses to approve when there is no annotation', () => {
    // An image nobody managed to classify is exactly the image not to put an
    // ad beside.
    expect(isSafeForAdvertising(null)).toBe(false);
  });

  it('refuses to approve when a moderated category is missing', () => {
    expect(isSafeForAdvertising({ adult: 'VERY_UNLIKELY' })).toBe(false);
  });

  it('refuses to approve an unrecognised likelihood', () => {
    // A future Cloud Vision level this code has never heard of must not pass
    // just because it is not on the disqualifying list.
    expect(isSafeForAdvertising({ ...clean, racy: 'SOMEWHAT_MAYBE' })).toBe(false);
  });
});

describe('describeRejection', () => {
  it('names the categories that failed, and nothing else', () => {
    const reason = describeRejection({ adult: 'LIKELY', violence: 'UNLIKELY', racy: 'POSSIBLE' });

    expect(reason).toBe('adult,racy');
  });

  it('never returns anything that points back at the image', () => {
    // The reason column is read by operators; it must not become a pointer to
    // the content it describes.
    const reason = describeRejection({
      adult: 'VERY_LIKELY',
      violence: 'UNLIKELY',
      racy: 'UNLIKELY',
    });

    expect(reason).not.toMatch(/http|base64|data:/i);
  });

  it('says so when nothing could be read', () => {
    expect(describeRejection(null)).toBe('no annotation returned');
  });
});
