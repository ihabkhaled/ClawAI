import { type Mock, vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { BotCheckReason } from '../../enums/bot-check-reason.enum';
import { type AntiAbuseCounterRepository } from '../../repositories/anti-abuse-counter.repository';
import { meetsDifficulty } from '../../utilities/proof-of-work.utility';
import { ProofOfWorkService } from '../proof-of-work.service';

const NOW = new Date('2026-11-27T10:00:00.000Z');
const DIFFICULTY = 12;

function solve(salt: string, difficulty: number): string {
  let nonce = 0;
  while (!meetsDifficulty(salt, String(nonce), difficulty)) {
    nonce += 1;
  }
  return String(nonce);
}

function wrongNonce(salt: string, difficulty: number): string {
  let nonce = 0;
  while (meetsDifficulty(salt, String(nonce), difficulty)) {
    nonce += 1;
  }
  return String(nonce);
}

describe('ProofOfWorkService', () => {
  let claimOnce: Mock;
  let service: ProofOfWorkService;

  beforeEach(() => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      JWT_SECRET: 'j'.repeat(48),
    } as ReturnType<typeof AppConfig.get>);
    claimOnce = vi.fn().mockResolvedValue(true);
    service = new ProofOfWorkService({ claimOnce } as unknown as AntiAbuseCounterRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues a signed challenge that expires in five minutes', () => {
    const challenge = service.issue(DIFFICULTY, NOW);
    expect(challenge.salt).toMatch(/^[0-9a-f]{32}$/u);
    expect(challenge.difficulty).toBe(DIFFICULTY);
    expect(challenge.expiresAt).toBe('2026-11-27T10:05:00.000Z');
    expect(challenge.token.split('.')).toHaveLength(2);
  });

  it('passes a solved challenge once and claims its salt for longer than its life', async () => {
    const challenge = service.issue(DIFFICULTY, NOW);
    const nonce = solve(challenge.salt, DIFFICULTY);

    await expect(service.verify({ token: challenge.token, nonce }, DIFFICULTY, NOW)).resolves.toBe(
      BotCheckReason.PASSED,
    );
    expect(claimOnce).toHaveBeenCalledWith(`auth:abuse:pow:${challenge.salt}`, 300 + 60);
  });

  it('refuses a reused solution', async () => {
    const challenge = service.issue(DIFFICULTY, NOW);
    const nonce = solve(challenge.salt, DIFFICULTY);
    claimOnce.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await service.verify({ token: challenge.token, nonce }, DIFFICULTY, NOW);
    await expect(service.verify({ token: challenge.token, nonce }, DIFFICULTY, NOW)).resolves.toBe(
      BotCheckReason.POW_REUSED,
    );
  });

  it('refuses an expired challenge without touching Redis', async () => {
    const challenge = service.issue(DIFFICULTY, NOW);
    const nonce = solve(challenge.salt, DIFFICULTY);
    const later = new Date(NOW.getTime() + 5 * 60 * 1000);

    await expect(
      service.verify({ token: challenge.token, nonce }, DIFFICULTY, later),
    ).resolves.toBe(BotCheckReason.POW_EXPIRED);
    expect(claimOnce).not.toHaveBeenCalled();
  });

  it('refuses a challenge minted below the difficulty now in force', async () => {
    const challenge = service.issue(DIFFICULTY, NOW);
    const nonce = solve(challenge.salt, DIFFICULTY);

    await expect(
      service.verify({ token: challenge.token, nonce }, DIFFICULTY + 2, NOW),
    ).resolves.toBe(BotCheckReason.POW_WEAK_DIFFICULTY);
  });

  it('refuses a nonce that does not meet the difficulty', async () => {
    const challenge = service.issue(DIFFICULTY, NOW);

    await expect(
      service.verify(
        { token: challenge.token, nonce: wrongNonce(challenge.salt, DIFFICULTY) },
        DIFFICULTY,
        NOW,
      ),
    ).resolves.toBe(BotCheckReason.POW_WRONG_SOLUTION);
    expect(claimOnce).not.toHaveBeenCalled();
  });

  it('refuses a token signed under another secret', async () => {
    const challenge = service.issue(DIFFICULTY, NOW);
    const nonce = solve(challenge.salt, DIFFICULTY);
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      JWT_SECRET: 'x'.repeat(48),
    } as ReturnType<typeof AppConfig.get>);

    await expect(service.verify({ token: challenge.token, nonce }, DIFFICULTY, NOW)).resolves.toBe(
      BotCheckReason.POW_BAD_SIGNATURE,
    );
  });

  it('accepts a correct solution when the single-use store cannot answer (fail open)', async () => {
    const challenge = service.issue(DIFFICULTY, NOW);
    const nonce = solve(challenge.salt, DIFFICULTY);
    claimOnce.mockResolvedValue(null);

    await expect(service.verify({ token: challenge.token, nonce }, DIFFICULTY, NOW)).resolves.toBe(
      BotCheckReason.PASSED,
    );
  });
});
