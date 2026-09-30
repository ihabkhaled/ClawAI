import { ZodError } from 'zod';

import { RUNTIME_V2_TURN_EXECUTION_OPTIONS } from '../../constants/runtime-v2-execution.constants';
import {
  runtimeV2OutputFromNativeCalls,
  runtimeV2TurnExecutionOptions,
} from '../runtime-v2-native-tools.utility';

import type { NormalizedToolCall } from '../../types/provider-tool.types';

const fileDefinition = {
  schemaVersion: '2.0' as const,
  name: 'workspace.files',
  version: '2.0.0',
  description: 'Bounded workspace discovery.',
  operations: ['list', 'read'],
  riskClasses: ['inspect' as const],
  targetIds: ['target:workspace'],
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
};
const definitions = [fileDefinition];

const call = (overrides: Partial<NormalizedToolCall> = {}): NormalizedToolCall => ({
  callId: 'call-1',
  nativeName: 'workspace_files',
  toolName: 'workspace.files',
  toolVersion: '2.0.0',
  operation: 'read',
  targetId: 'target:workspace',
  arguments: { rootKey: 'workspace-1', path: 'config.js' },
  ...overrides,
});

describe('runtimeV2TurnExecutionOptions', () => {
  it('declares the admitted tools so the provider layer can offer them natively', () => {
    expect(runtimeV2TurnExecutionOptions(definitions)).toEqual({
      ...RUNTIME_V2_TURN_EXECUTION_OPTIONS,
      toolCatalog: definitions,
    });
  });

  it('keeps the plain options for a run with no tools', () => {
    expect(runtimeV2TurnExecutionOptions([])).toBe(RUNTIME_V2_TURN_EXECUTION_OPTIONS);
  });
});

describe('runtimeV2OutputFromNativeCalls', () => {
  it('turns the first native call into a Runtime V2 tool request', () => {
    expect(
      runtimeV2OutputFromNativeCalls([call(), call({ operation: 'list' })], definitions),
    ).toEqual({
      kind: 'tool',
      toolName: 'workspace.files',
      toolVersion: '2.0.0',
      operation: 'read',
      targetId: 'target:workspace',
      arguments: { rootKey: 'workspace-1', path: 'config.js' },
    });
  });

  it('returns null when the provider made no native call', () => {
    expect(runtimeV2OutputFromNativeCalls(undefined, definitions)).toBeNull();
    expect(runtimeV2OutputFromNativeCalls([], definitions)).toBeNull();
  });

  it('refuses an operation the admitted catalog does not list', () => {
    expect(() =>
      runtimeV2OutputFromNativeCalls([call({ operation: 'delete' })], definitions),
    ).toThrow(/outside the admitted tool catalog/);
  });

  it('refuses a target the tool does not accept', () => {
    expect(() =>
      runtimeV2OutputFromNativeCalls([call({ targetId: 'target:elsewhere' })], definitions),
    ).toThrow(/outside the admitted tool catalog/);
  });

  it('refuses a request the schema rejects, so the repair loop can correct it', () => {
    expect(() =>
      runtimeV2OutputFromNativeCalls([call({ targetId: 'no spaces allowed' })], definitions),
    ).toThrow(ZodError);
  });
});
