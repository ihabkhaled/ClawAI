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

    it('detail returns key with detail segment and thread id', () => {
      expect(queryKeys.threads.detail('t-1')).toEqual(['threads', 'detail', 't-1']);
    });

    it('messages returns key with messages segment, thread id, and optional page', () => {
      expect(queryKeys.threads.messages('t-1')).toEqual(['threads', 'messages', 't-1', undefined]);
      expect(queryKeys.threads.messages('t-1', 2)).toEqual(['threads', 'messages', 't-1', 2]);
    });
  });

  describe('connectors', () => {
    it('has an all key', () => {
      expect(queryKeys.connectors.all).toEqual(['connectors']);
    });

    it('detail returns key with detail segment and connector id', () => {
      expect(queryKeys.connectors.detail('c-1')).toEqual(['connectors', 'detail', 'c-1']);
    });

    it('models returns key with models segment and connector id', () => {
      expect(queryKeys.connectors.models('c-1')).toEqual(['connectors', 'models', 'c-1']);
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

    it('policies all key', () => {
      expect(queryKeys.routing.policies.all).toEqual(['routing', 'policies']);
    });

    it('decisions byThread returns key with threadId', () => {
      expect(queryKeys.routing.decisions.byThread('t-1')).toEqual(['routing', 'decisions', 't-1']);
    });
  });

  describe('audits', () => {
    it('has an all key', () => {
      expect(queryKeys.audits.all).toEqual(['audits']);
    });

    it('list returns key with list segment and params', () => {
      const params = { page: '1', limit: '10' };
      expect(queryKeys.audits.list(params)).toEqual(['audits', 'list', params]);
    });

    it('stats key', () => {
      expect(queryKeys.audits.stats).toEqual(['audits', 'stats']);
    });
  });

  describe('memory', () => {
    it('has an all key', () => {
      expect(queryKeys.memory.all).toEqual(['memory']);
    });

    it('detail returns key with detail segment and id', () => {
      expect(queryKeys.memory.detail('m-1')).toEqual(['memory', 'detail', 'm-1']);
    });
  });

  describe('files', () => {
    it('has an all key', () => {
      expect(queryKeys.files.all).toEqual(['files']);
    });

    it('chunks returns key with chunks segment and id', () => {
      expect(queryKeys.files.chunks('f-1')).toEqual(['files', 'chunks', 'f-1']);
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
      expect(Array.isArray(queryKeys.memory.all)).toBe(true);
      expect(Array.isArray(queryKeys.files.all)).toBe(true);
    });
  });
});
