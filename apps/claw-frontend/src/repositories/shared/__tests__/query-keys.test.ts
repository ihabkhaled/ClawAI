import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/repositories/shared/query-keys';

describe('queryKeys', () => {
  describe('auth', () => {
    it('has a me key that is an array of strings', () => {
      expect(queryKeys.auth.me).toEqual(['auth', 'me']);
    });
  });

  describe('threads', () => {
    it('has an all key', () => {
      expect(queryKeys.threads.all).toEqual(['threads']);
    });

    it('detail returns key with thread id', () => {
      expect(queryKeys.threads.detail('t-1')).toEqual(['threads', 't-1']);
    });

    it('messages returns key with thread id and messages segment', () => {
      expect(queryKeys.threads.messages('t-1')).toEqual([
        'threads',
        't-1',
        'messages',
      ]);
    });
  });

  describe('connectors', () => {
    it('has an all key', () => {
      expect(queryKeys.connectors.all).toEqual(['connectors']);
    });

    it('detail returns key with connector id', () => {
      expect(queryKeys.connectors.detail('c-1')).toEqual([
        'connectors',
        'c-1',
      ]);
    });
  });

  describe('models', () => {
    it('has an all key', () => {
      expect(queryKeys.models.all).toEqual(['models']);
    });
  });

  describe('routing', () => {
    it('has a config key', () => {
      expect(queryKeys.routing.config).toEqual(['routing', 'config']);
    });
  });

  describe('audits', () => {
    it('has an all key', () => {
      expect(queryKeys.audits.all).toEqual(['audits']);
    });

    it('list returns key with params', () => {
      const params = { page: '1', limit: '10' };
      expect(queryKeys.audits.list(params)).toEqual(['audits', params]);
    });
  });

  describe('all keys are arrays', () => {
    it('every static key is an array', () => {
      expect(Array.isArray(queryKeys.auth.me)).toBe(true);
      expect(Array.isArray(queryKeys.threads.all)).toBe(true);
      expect(Array.isArray(queryKeys.connectors.all)).toBe(true);
      expect(Array.isArray(queryKeys.models.all)).toBe(true);
      expect(Array.isArray(queryKeys.routing.config)).toBe(true);
      expect(Array.isArray(queryKeys.audits.all)).toBe(true);
    });
  });
});
