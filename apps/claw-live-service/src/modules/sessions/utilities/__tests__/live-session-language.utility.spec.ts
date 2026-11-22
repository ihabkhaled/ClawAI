import { createSessionBodySchema } from '../../dto/live-session.dto';
import { canonicalLanguage } from '../live-session-language.utility';

describe('canonicalLanguage', () => {
  it('matches the allowlist case-insensitively and returns its spelling', () => {
    expect(canonicalLanguage('EN')).toBe('en');
    expect(canonicalLanguage('pt_br')).toBe('pt-BR');
    expect(canonicalLanguage('xx')).toBeNull();
  });

  it('is enforced by the create-session body', () => {
    const ok = createSessionBodySchema.safeParse({
      url: 'https://x/a.m3u8',
      language: 'zh-tw',
      mode: 'AUDIO',
    });
    expect(ok.success && ok.data.language).toBe('zh-TW');
    expect(ok.success && ok.data.attestRights).toBe(false);
    const bad = createSessionBodySchema.safeParse({
      url: 'https://x/a.m3u8',
      language: 'klingon',
      mode: 'AUDIO',
    });
    expect(bad.success).toBe(false);
  });
});
