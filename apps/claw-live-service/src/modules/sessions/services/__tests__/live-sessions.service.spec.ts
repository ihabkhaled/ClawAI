import {
  HttpStatus,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { LiveErrorCode } from '../../../../common/enums/live-error-code.enum';
import {
  LiveCapability,
  LiveMode,
  LiveSessionState,
  LiveSourceKind,
} from '../../../../generated/prisma';
import { LiveSessionsService } from '../live-sessions.service';

const policy = { version: 4, config: {} };

function resolution(kind: LiveSourceKind, capability: LiveCapability) {
  return {
    sourceKind: kind,
    capability,
    sourceIdentity: 'id',
    accessScope: 'PUBLIC',
    normalizedUrl: 'https://x/live.m3u8?token=secret',
    declaredHost: 'x',
    embedUrl: kind === LiveSourceKind.YOUTUBE ? 'https://www.youtube-nocookie.com/embed/abc' : null,
    reasonCode: null,
  };
}

function setup(
  kind: LiveSourceKind = LiveSourceKind.HLS,
  capability: LiveCapability = LiveCapability.AUDIO_VISION,
) {
  const res = resolution(kind, capability);
  const stream = { id: 'stream1', sourceKind: kind, capability };
  const deps = {
    policies: { active: vi.fn().mockResolvedValue(policy) },
    sources: {
      resolve: vi.fn().mockResolvedValue(res),
      upsertStream: vi.fn().mockResolvedValue(stream),
    },
    coordinator: { attach: vi.fn().mockResolvedValue({ runId: 'run1', created: true }) },
    sessions: {
      create: vi.fn(async ({ data, ...input }: Record<string, unknown>) => ({
        id: 'sess1',
        runId: null,
        ...(data as object),
        ...input,
      })),
      findOwned: vi.fn(),
      approve: vi.fn(),
      updateLanguage: vi.fn(),
      switchRun: vi.fn(),
    },
    admission: {
      assertFeatureEnabled: vi.fn(),
      assertProcessingAllowed: vi.fn(),
      assertAttestation: vi.fn(),
      assertLimits: vi.fn(),
      assertCapacity: vi.fn(),
    },
    heartbeats: { beat: vi.fn().mockResolvedValue({ state: LiveSessionState.ACTIVE }) },
    presence: { touch: vi.fn(), remove: vi.fn() },
    detacher: {
      detach: vi.fn().mockResolvedValue(true),
      settleRemainder: vi.fn(),
      leaveRun: vi.fn(),
    },
    closeTokens: { issue: vi.fn().mockReturnValue('tok'), verify: vi.fn() },
    presenter: { usage: vi.fn().mockResolvedValue({ billedSeconds: 0 }) },
    billing: { usage: vi.fn().mockResolvedValue({ freeSecondsUsed: 0, freeSecondsTotal: 1800 }) },
  };
  const service = new LiveSessionsService(
    deps.policies as never,
    deps.sources as never,
    deps.coordinator as never,
    deps.sessions as never,
    deps.admission as never,
    deps.heartbeats as never,
    deps.presence as never,
    deps.detacher as never,
    deps.closeTokens as never,
    deps.presenter as never,
    deps.billing as never,
  );
  return { service, ...deps };
}

const body = {
  url: 'https://x/live.m3u8',
  language: 'en',
  mode: LiveMode.AUDIO,
  attestRights: true,
};

describe('LiveSessionsService', () => {
  it('resolve never echoes the (possibly private) URL', async () => {
    const { service } = setup();
    const view = await service.resolve('https://x/live.m3u8?token=secret', 'u1');
    expect(JSON.stringify(view)).not.toContain('secret');
    expect(view).toEqual({
      sourceKind: LiveSourceKind.HLS,
      capability: LiveCapability.AUDIO_VISION,
      embedUrl: null,
      reasonCode: null,
    });
  });

  it('records a PLAYER_ONLY source as UNSUPPORTED with no run and no admission/billing', async () => {
    const { service, sessions, coordinator, admission } = setup(
      LiveSourceKind.YOUTUBE,
      LiveCapability.PLAYER_ONLY,
    );
    const view = await service.create('u1', body);
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ state: LiveSessionState.UNSUPPORTED, policyVersion: 4 }),
    );
    expect(sessions.create.mock.calls[0]?.[0]).not.toHaveProperty('runId');
    expect(coordinator.attach).not.toHaveBeenCalled();
    expect(admission.assertCapacity).not.toHaveBeenCalled();
    expect(view).toMatchObject({
      state: LiveSessionState.UNSUPPORTED,
      playbackUrl: null,
      embedUrl: expect.stringContaining('youtube-nocookie'),
    });
  });

  it('creates an ACTIVE session on the attached run with the playback proxy URL and a close token', async () => {
    const { service, sessions, coordinator, presence } = setup();
    const view = await service.create('u1', body);
    expect(coordinator.attach).toHaveBeenCalledWith({ streamId: 'stream1', mode: LiveMode.AUDIO });
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run1',
        state: LiveSessionState.ACTIVE,
        rightsAttestedAt: expect.any(Date),
      }),
    );
    expect(presence.touch).toHaveBeenCalledWith('run1', 'sess1', expect.any(Number));
    expect(view).toMatchObject({
      sessionId: 'sess1',
      streamId: 'stream1',
      playbackUrl: '/api/v1/live/streams/stream1/hls/index.m3u8',
      closeToken: 'tok',
    });
  });

  it('starts in CREDITS_REQUIRED when no free seconds are left', async () => {
    const { service, sessions, billing } = setup();
    billing.usage.mockResolvedValue({ freeSecondsUsed: 1800, freeSecondsTotal: 1800 });
    await service.create('u1', body);
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ state: LiveSessionState.CREDITS_REQUIRED }),
    );
  });

  it('stops before attaching when attestation, limits or capacity refuse', async () => {
    const attest = setup();
    attest.admission.assertAttestation.mockImplementation(() => {
      throw new UnprocessableEntityException({
        errorCode: LiveErrorCode.LIVE_RIGHTS_ATTESTATION_REQUIRED,
      });
    });
    await expect(
      attest.service.create('u1', { ...body, attestRights: false }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(attest.coordinator.attach).not.toHaveBeenCalled();

    const capacity = setup();
    capacity.admission.assertCapacity.mockRejectedValue(
      new ServiceUnavailableException({ errorCode: LiveErrorCode.CAPACITY }),
    );
    await expect(capacity.service.create('u1', body)).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
    expect(capacity.coordinator.attach).not.toHaveBeenCalled();
    expect(capacity.sessions.create).not.toHaveBeenCalled();
  });

  it('returns 404 for a session the caller does not own', async () => {
    const { service, sessions } = setup();
    sessions.findOwned.mockResolvedValue(null);
    await expect(service.heartbeat('other', 'u1', {} as never)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
    await expect(service.close('other', 'u1')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('approves paid credits with an optional cap and resumes a credits-stopped session', async () => {
    const { service, sessions } = setup();
    sessions.findOwned.mockResolvedValue({
      id: 'sess1',
      state: LiveSessionState.CREDITS_REQUIRED,
      language: 'en',
      runId: 'run1',
    });
    await service.approveCredits('sess1', 'u1', { spendingCapMicroUsd: 500_000 });
    expect(sessions.approve).toHaveBeenCalledWith('sess1', expect.any(Date), 500_000n, true);
  });

  it('switches run on a mode change: settle, attach new, leave old', async () => {
    const { service, sessions, detacher, coordinator, presence } = setup();
    sessions.findOwned.mockResolvedValue({
      id: 'sess1',
      streamId: 'stream1',
      state: LiveSessionState.ACTIVE,
      mode: LiveMode.AUDIO,
      language: 'en',
      runId: 'run-old',
    });
    coordinator.attach.mockResolvedValue({ runId: 'run-new', created: false });
    await service.update('sess1', 'u1', { mode: LiveMode.AUDIO_VISION, language: 'fr' });
    expect(sessions.updateLanguage).toHaveBeenCalledWith('sess1', 'fr');
    expect(detacher.settleRemainder).toHaveBeenCalledWith('sess1');
    expect(sessions.switchRun).toHaveBeenCalledWith('sess1', LiveMode.AUDIO_VISION, 'run-new');
    expect(presence.remove).toHaveBeenCalledWith('run-old', 'sess1');
    expect(detacher.leaveRun).toHaveBeenCalledWith('run-old');
  });

  it('refuses to update a closed session', async () => {
    const { service, sessions } = setup();
    sessions.findOwned.mockResolvedValue({ id: 'sess1', state: LiveSessionState.DETACHED });
    await expect(service.update('sess1', 'u1', { language: 'fr' })).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  describe('closeWithToken (sendBeacon)', () => {
    it('rejects a missing or invalid token (401)', async () => {
      const { service, closeTokens } = setup();
      closeTokens.verify.mockReturnValue(null);
      await expect(
        service.closeWithToken('sess1', { body: { token: 'bad' } } as never),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
      });
      await expect(
        service.closeWithToken('sess1', { body: {}, readable: false } as never),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
      });
    });

    it('closes the session named by a valid token, scoped to its owner', async () => {
      const { service, closeTokens, sessions, detacher } = setup();
      closeTokens.verify.mockReturnValue({
        sessionId: 'sess1',
        userId: 'u1',
        expiresAt: Date.now() + 1000,
      });
      sessions.findOwned.mockResolvedValue({ id: 'sess1', state: LiveSessionState.ACTIVE });
      await expect(
        service.closeWithToken('sess1', { body: { token: 'ok' } } as never),
      ).resolves.toEqual({ closed: true });
      expect(closeTokens.verify).toHaveBeenCalledWith('ok', 'sess1');
      expect(sessions.findOwned).toHaveBeenCalledWith('sess1', 'u1');
      expect(detacher.detach).toHaveBeenCalled();
    });
  });
});
