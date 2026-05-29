import { AuditEventManager } from '../audit-event.manager';

describe('AuditEventManager.handleMessageCompleted', () => {
  function build(): {
    manager: AuditEventManager;
    audits: { createAuditLog: jest.Mock };
    usage: { createUsageEntry: jest.Mock };
    rabbit: { subscribe: jest.Mock };
  } {
    const audits = { createAuditLog: jest.fn().mockResolvedValue({}) };
    const usage = { createUsageEntry: jest.fn().mockResolvedValue({}) };
    const rabbit = { subscribe: jest.fn().mockImplementation(async () => {}) };
    const manager = new AuditEventManager(rabbit as any, audits as any, usage as any);
    return { manager, audits, usage, rabbit };
  }

  const basePayload = {
    timestamp: '2026-05-29T00:00:00.000Z',
    messageId: 'm1',
    threadId: 't1',
    assistantMessageId: 'a1',
    provider: 'openai',
    model: 'gpt-4',
    inputTokens: 100,
    outputTokens: 50,
    latencyMs: 1200,
  };

  it('attributes usage to the real userId from the payload', async () => {
    const { manager, usage } = build();
    await manager.handleMessageCompleted({ ...basePayload, userId: 'user-123' } as any);
    expect(usage.createUsageEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        resourceType: 'llm_tokens',
        action: 'message.completed',
        quantity: 150,
        unit: 'tokens',
      }),
    );
  });

  it("falls back to 'system' when payload has no userId", async () => {
    const { manager, usage } = build();
    await manager.handleMessageCompleted({ ...basePayload } as any);
    expect(usage.createUsageEntry).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'system' }),
    );
  });

  it('tags the usage entry with the supplied tokenContext', async () => {
    const { manager, usage } = build();
    await manager.handleMessageCompleted({
      ...basePayload,
      userId: 'user-123',
      tokenContext: 'compare',
      tokenEstimated: true,
      tokenSource: 'tokenizer',
    } as any);
    const entry = usage.createUsageEntry.mock.calls[0]?.[0];
    expect(entry.context).toBe('compare');
    expect(entry.estimated).toBe(true);
    expect(entry.metadata.context).toBe('compare');
    expect(entry.metadata.estimated).toBe(true);
    expect(entry.metadata.tokenSource).toBe('tokenizer');
  });

  it("defaults context to 'chat' when tokenContext is absent", async () => {
    const { manager, usage } = build();
    await manager.handleMessageCompleted({ ...basePayload } as any);
    const entry = usage.createUsageEntry.mock.calls[0]?.[0];
    expect(entry.context).toBe('chat');
    expect(entry.metadata.context).toBe('chat');
  });

  it('never stores raw prompt/response content in metadata', async () => {
    const { manager, usage } = build();
    await manager.handleMessageCompleted({ ...basePayload, userId: 'user-123' } as any);
    const entry = usage.createUsageEntry.mock.calls[0]?.[0];
    expect(JSON.stringify(entry.metadata)).not.toContain('content');
  });

  it('still records an audit log row for the completed message', async () => {
    const { manager, audits } = build();
    await manager.handleMessageCompleted({ ...basePayload, userId: 'user-123' } as any);
    expect(audits.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ACCESS',
        entityType: 'message',
        entityId: 'm1',
      }),
    );
  });
});
