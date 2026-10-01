import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from '@claw/shared-auth';
import { RoutineWebhookController } from '../routine-webhook.controller';
import type { RoutineWebhookService } from '../../services/routine-webhook.service';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const user = { id: 'user-1' } as AuthenticatedUser;

function build() {
  const service = {
    info: vi.fn().mockResolvedValue({ enabled: false }),
    setEnabled: vi.fn().mockResolvedValue({ enabled: true }),
    rotate: vi.fn().mockResolvedValue({ enabled: true }),
    receive: vi.fn().mockResolvedValue({ accepted: true, commandId: 'cmd-1', replayed: false }),
  };
  const controller = new RoutineWebhookController(service as unknown as RoutineWebhookService);
  return { controller, service };
}

describe('RoutineWebhookController (F099)', () => {
  it('owner endpoints pass the authenticated user, never a body-supplied one', async () => {
    const { controller, service } = build();
    await controller.info(user, 'routine-1');
    await controller.setEnabled(user, 'routine-1', { enabled: true });
    await controller.rotate(user, 'routine-1');
    expect(service.info).toHaveBeenCalledWith('user-1', 'routine-1');
    expect(service.setEnabled).toHaveBeenCalledWith('user-1', 'routine-1', true);
    expect(service.rotate).toHaveBeenCalledWith('user-1', 'routine-1');
  });

  it('the receiver hands the signature, timestamp and RAW body to the service', async () => {
    const { controller, service } = build();
    const request = { rawBody: Buffer.from('{"a":1}', 'utf8') };
    const result = await controller.receive('routine-1', request as never, 'sha256=ab', '1700');
    expect(service.receive).toHaveBeenCalledWith(
      'routine-1',
      { signature: 'sha256=ab', timestamp: '1700' },
      '{"a":1}',
    );
    expect(result).toEqual({ accepted: true, commandId: 'cmd-1', replayed: false });
  });

  it('a request with no body is signed over the empty string', async () => {
    const { controller, service } = build();
    await controller.receive('routine-1', {} as never, undefined, undefined);
    expect(service.receive).toHaveBeenCalledWith(
      'routine-1',
      { signature: undefined, timestamp: undefined },
      '',
    );
  });

  it('only the receiver is public; the owner endpoints keep the JWT guard', () => {
    const proto = RoutineWebhookController.prototype;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto.receive)).toBe(true);
    for (const handler of [proto.info, proto.setEnabled, proto.rotate]) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
    }
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, RoutineWebhookController)).not.toBe(true);
  });

  it('answers 202 Accepted to a delivery', () => {
    expect(Reflect.getMetadata('__httpCode__', RoutineWebhookController.prototype.receive)).toBe(
      202,
    );
  });
});
