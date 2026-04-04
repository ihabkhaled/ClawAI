import { describe, expect, it } from 'vitest';

import {
  AuditAction,
  AuditSeverity,
  ComponentSize,
  ConnectorProvider,
  ConnectorStatus,
  HttpMethod,
  MessageRole,
  RoutingMode,
  UserRole,
  UserStatus,
} from '@/enums';

describe('UserRole enum', () => {
  it('has ADMIN, OPERATOR, and VIEWER members', () => {
    expect(UserRole.ADMIN).toBe('ADMIN');
    expect(UserRole.OPERATOR).toBe('OPERATOR');
    expect(UserRole.VIEWER).toBe('VIEWER');
  });

  it('has exactly 3 members', () => {
    expect(Object.keys(UserRole)).toHaveLength(3);
  });
});

describe('RoutingMode enum', () => {
  it('has all 7 routing modes', () => {
    const expected = [
      'AUTO',
      'MANUAL_MODEL',
      'LOCAL_ONLY',
      'PRIVACY_FIRST',
      'LOW_LATENCY',
      'HIGH_REASONING',
      'COST_SAVER',
    ];
    expect(Object.keys(RoutingMode)).toEqual(expected);
  });

  it('has values matching their keys', () => {
    for (const key of Object.keys(RoutingMode)) {
      expect(RoutingMode[key as keyof typeof RoutingMode]).toBe(key);
    }
  });
});

describe('ConnectorProvider enum', () => {
  it('has all 6 providers', () => {
    expect(Object.keys(ConnectorProvider)).toHaveLength(6);
  });

  it('contains expected providers', () => {
    expect(ConnectorProvider.OPENAI).toBe('OPENAI');
    expect(ConnectorProvider.ANTHROPIC).toBe('ANTHROPIC');
    expect(ConnectorProvider.GEMINI).toBe('GEMINI');
    expect(ConnectorProvider.AWS_BEDROCK).toBe('AWS_BEDROCK');
    expect(ConnectorProvider.DEEPSEEK).toBe('DEEPSEEK');
    expect(ConnectorProvider.OLLAMA).toBe('OLLAMA');
  });
});

describe('ConnectorStatus enum', () => {
  it('has HEALTHY, DEGRADED, DOWN, UNKNOWN', () => {
    expect(ConnectorStatus.HEALTHY).toBe('HEALTHY');
    expect(ConnectorStatus.DEGRADED).toBe('DEGRADED');
    expect(ConnectorStatus.DOWN).toBe('DOWN');
    expect(ConnectorStatus.UNKNOWN).toBe('UNKNOWN');
  });
});

describe('ComponentSize enum', () => {
  it('has lowercase string values', () => {
    expect(ComponentSize.SM).toBe('sm');
    expect(ComponentSize.MD).toBe('md');
    expect(ComponentSize.LG).toBe('lg');
  });
});

describe('HttpMethod enum', () => {
  it('has all HTTP methods', () => {
    expect(HttpMethod.GET).toBe('GET');
    expect(HttpMethod.POST).toBe('POST');
    expect(HttpMethod.PUT).toBe('PUT');
    expect(HttpMethod.PATCH).toBe('PATCH');
    expect(HttpMethod.DELETE).toBe('DELETE');
  });
});

describe('MessageRole enum', () => {
  it('has all 4 roles', () => {
    expect(MessageRole.SYSTEM).toBe('SYSTEM');
    expect(MessageRole.USER).toBe('USER');
    expect(MessageRole.ASSISTANT).toBe('ASSISTANT');
    expect(MessageRole.TOOL).toBe('TOOL');
  });
});

describe('AuditAction enum', () => {
  it('has all 11 actions', () => {
    expect(Object.keys(AuditAction)).toHaveLength(11);
  });

  it('includes key audit actions', () => {
    expect(AuditAction.LOGIN).toBe('LOGIN');
    expect(AuditAction.SETTINGS_CHANGE).toBe('SETTINGS_CHANGE');
    expect(AuditAction.ROUTING_DECISION).toBe('ROUTING_DECISION');
  });
});

describe('AuditSeverity enum', () => {
  it('has LOW, MEDIUM, HIGH, CRITICAL', () => {
    expect(AuditSeverity.LOW).toBe('LOW');
    expect(AuditSeverity.MEDIUM).toBe('MEDIUM');
    expect(AuditSeverity.HIGH).toBe('HIGH');
    expect(AuditSeverity.CRITICAL).toBe('CRITICAL');
  });
});

describe('UserStatus enum', () => {
  it('has ACTIVE, SUSPENDED, PENDING', () => {
    expect(UserStatus.ACTIVE).toBe('ACTIVE');
    expect(UserStatus.SUSPENDED).toBe('SUSPENDED');
    expect(UserStatus.PENDING).toBe('PENDING');
  });
});
