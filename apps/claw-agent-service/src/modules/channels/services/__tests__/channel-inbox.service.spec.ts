import { HttpException, HttpStatus } from '@nestjs/common';
import { ChannelInboxStore } from '../../repositories/channel-inbox.store';
import { ChannelInboxService } from '../channel-inbox.service';
import { ChannelKeyring } from '../channel-keyring';
import { deriveChannelSecret, signChannelPayload } from '../../utilities/channel-signature.utility';
import type { ChannelMessage } from '../../types/channel.types';

const KEY = 'b'.repeat(64);
const NOW = 1_700_000_000_000;
const TS = String(NOW / 1_000);

class MemoryStore extends ChannelInboxStore {
  readonly lists = new Map<string, string[]>();

  append(userId: string, message: ChannelMessage): Promise<void> {
    const list = this.lists.get(userId) ?? [];
    list.push(JSON.stringify(message));
    this.lists.set(userId, list);
    return Promise.resolve();
  }

  listRaw(userId: string): Promise<string[]> {
    return Promise.resolve([...(this.lists.get(userId) ?? [])]);
  }

  removeRaw(userId: string, raw: string): Promise<boolean> {
    const list = this.lists.get(userId) ?? [];
    const index = list.indexOf(raw);
    if (index < 0) return Promise.resolve(false);
    list.splice(index, 1);
    return Promise.resolve(true);
  }
}

class FixedKeyring extends ChannelKeyring {
  masterKey(): string {
    return KEY;
  }

  publicOrigin(): string {
    return 'https://claw.local';
  }
}

function signed(userId: string, body: string): { signature: string; timestamp: string } {
  return {
    signature: signChannelPayload(deriveChannelSecret(KEY, userId), TS, body),
    timestamp: TS,
  };
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof HttpException) return error.getStatus();
  }
  return 0;
}

describe('ChannelInboxService', () => {
  let store: MemoryStore;
  let service: ChannelInboxService;
  const body = JSON.stringify({ kind: 'ci', source: 'github', title: 'CI failed on main' });

  beforeEach(() => {
    store = new MemoryStore();
    service = new ChannelInboxService(store, new FixedKeyring());
  });

  it('gives the owner a per-owner URL and the secret that signs for it', () => {
    const info = service.webhookInfo('user-1');

    expect(info.url).toBe('https://claw.local/api/v1/agent/channels/inbound/user-1');
    expect(info.secret).toBe(deriveChannelSecret(KEY, 'user-1'));
    expect(info.signatureHeader).toBe('x-claw-signature');
  });

  it('stores a correctly signed event for that owner only', async () => {
    const result = await service.ingest('user-1', signed('user-1', body), body, NOW);

    expect(result.accepted).toBe(true);
    const page = await service.list('user-1', 20);
    expect(page.messages).toHaveLength(1);
    expect(page.messages[0]).toMatchObject({
      id: result.id,
      kind: 'ci',
      title: 'CI failed on main',
      url: null,
    });
    expect((await service.list('user-2', 20)).messages).toHaveLength(0);
  });

  it('refuses a missing, stale, forged or cross-owner signature with 401', async () => {
    const good = signed('user-1', body);

    expect(
      await statusOf(service.ingest('user-1', { signature: undefined, timestamp: TS }, body, NOW)),
    ).toBe(HttpStatus.UNAUTHORIZED);
    expect(await statusOf(service.ingest('user-1', good, body, NOW + 600_000))).toBe(
      HttpStatus.UNAUTHORIZED,
    );
    expect(
      await statusOf(service.ingest('user-1', { ...good, signature: 'sha256=00' }, body, NOW)),
    ).toBe(HttpStatus.UNAUTHORIZED);
    expect(await statusOf(service.ingest('user-2', good, body, NOW))).toBe(HttpStatus.UNAUTHORIZED);
    expect(store.lists.size).toBe(0);
  });

  it('refuses an oversized or malformed body', async () => {
    const huge = 'x'.repeat(20_000);
    expect(await statusOf(service.ingest('user-1', signed('user-1', huge), huge, NOW))).toBe(
      HttpStatus.PAYLOAD_TOO_LARGE,
    );

    const notJson = 'not json';
    expect(await statusOf(service.ingest('user-1', signed('user-1', notJson), notJson, NOW))).toBe(
      HttpStatus.BAD_REQUEST,
    );

    const missingTitle = JSON.stringify({ source: 'ci' });
    expect(
      await statusOf(service.ingest('user-1', signed('user-1', missingTitle), missingTitle, NOW)),
    ).toBe(HttpStatus.BAD_REQUEST);
  });

  it('acknowledges a message once and 404s the second time or for another owner', async () => {
    const { id } = await service.ingest('user-1', signed('user-1', body), body, NOW);

    expect(await statusOf(service.ack('user-2', id))).toBe(HttpStatus.NOT_FOUND);
    await service.ack('user-1', id);
    expect((await service.list('user-1', 20)).messages).toHaveLength(0);
    expect(await statusOf(service.ack('user-1', id))).toBe(HttpStatus.NOT_FOUND);
  });

  it('skips a corrupted stored entry instead of failing the whole inbox', async () => {
    store.lists.set('user-1', ['{broken', JSON.stringify({ id: 'x' })]);
    await service.ingest('user-1', signed('user-1', body), body, NOW);

    const page = await service.list('user-1', 20);
    expect(page.messages).toHaveLength(1);
  });
});
