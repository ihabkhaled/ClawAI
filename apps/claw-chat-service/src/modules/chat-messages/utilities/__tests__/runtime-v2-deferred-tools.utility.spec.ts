import { describe, expect, it } from 'vitest';
import { runtimeDeferredToolLoadSchema } from '../../dto/runtime-v2-deferred-tools.dto';
import { runtimeStartSchema, type ToolDefinitionDto } from '../../dto/runtime-v2.dto';
import {
  deferredDefinitionHash,
  deferredToolField,
  effectiveRuntimeV2Catalog,
  loadedToolsRecord,
  verifyDeferredLoad,
} from '../runtime-v2-deferred-tools.utility';
import {
  buildRuntimeV2ModelInstruction,
  parseRuntimeV2ModelOutput,
} from '../runtime-v2-model-output.utility';

const eager: ToolDefinitionDto = {
  schemaVersion: '2.0',
  name: 'workspace.files',
  version: '1.0.0',
  description: 'Read and write workspace files.',
  operations: ['read'],
  riskClasses: ['inspect'],
  targetIds: ['target:workspace'],
  inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
};

const full: ToolDefinitionDto = {
  schemaVersion: '2.0',
  name: 'workspace.database',
  version: '2.0.0',
  description: 'Query a configured database profile. A long description the model need not see.',
  operations: ['query'],
  riskClasses: ['inspect'],
  targetIds: ['target:workspace'],
  inputSchema: { type: 'object', properties: { sql: { type: 'string' } } },
};

function stubOf(definition: ToolDefinitionDto): ToolDefinitionDto {
  return {
    ...definition,
    description: 'Query a database.',
    inputSchema: { type: 'object' },
    deferred: { definitionHash: deferredDefinitionHash(definition) },
  };
}

const catalog = [eager, stubOf(full)];
const toolRequest = (toolName: string, toolVersion: string, operation: string): string =>
  JSON.stringify({
    kind: 'tool',
    toolName,
    toolVersion,
    operation,
    targetId: 'target:workspace',
    arguments: {},
  });

describe('Runtime V2 deferred tools (F028)', () => {
  // Pinned in the extension's runtime-deferred-tools test too: both sides must
  // hash a definition identically or every deferred load is a mismatch.
  it('hashes a definition exactly as the coding-agent extension does', () => {
    const extensionFixture = runtimeStartSchema.shape.toolDefinitions.parse([
      {
        schemaVersion: '2.0',
        name: 'workspace.database',
        version: '2.0.0',
        description: 'Query a configured database profile. Long guidance the model rarely needs.',
        operations: ['query'],
        riskClasses: ['inspect'],
        targetIds: ['target:workspace'],
        inputSchema: { type: 'object', properties: { sql: { type: 'string' } } },
      },
    ])[0];
    expect(extensionFixture && deferredDefinitionHash(extensionFixture)).toBe(
      'sha256:cab7971ae51c68f96d63c2b913cb4243237a6385e814f48e06dd75dc07d78e4d',
    );
  });

  it('admits a deferred stub inside the hashed start catalog', () => {
    const parsed = runtimeStartSchema.shape.toolDefinitions.safeParse(catalog);
    expect(parsed.success).toBe(true);
    // The start hash is JSON.stringify of the PARSED catalog, so parsing must
    // keep the stub's key order (with `deferred` last) byte-for-byte.
    expect(JSON.stringify(parsed.data)).toBe(JSON.stringify(catalog));
  });

  it('refuses a stub where a full definition must be loaded', () => {
    const parsed = runtimeDeferredToolLoadSchema.safeParse({
      generation: 'generation_0001',
      definitions: [stubOf(full)],
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a load that matches the commitment made at start', () => {
    expect(() => verifyDeferredLoad(catalog, [full])).not.toThrow();
  });

  it('never admits a tool the client did not declare deferred at start', () => {
    const undeclared = { ...full, name: 'workspace.secret' };
    expect(() => verifyDeferredLoad(catalog, [undeclared])).toThrow(/not declared deferred/u);
    // An eager tool is not deferred either, so it cannot be "reloaded" with a new schema.
    expect(() => verifyDeferredLoad(catalog, [{ ...eager, operations: ['write'] }])).toThrow(
      /not declared deferred/u,
    );
  });

  it('refuses a definition that differs from the one committed to', () => {
    const tampered = { ...full, operations: ['query', 'drop'] };
    expect(() => verifyDeferredLoad(catalog, [tampered])).toThrow(/does not match/u);
  });

  it('replaces a stub only with a stored definition that still verifies', () => {
    const start = effectiveRuntimeV2Catalog(catalog, new Map());
    expect(start.catalogVersion).toBe(1);
    const loaded = effectiveRuntimeV2Catalog(
      catalog,
      new Map([[deferredToolField(full), JSON.stringify(full)]]),
    );
    expect(loaded.catalogVersion).toBe(2);
    expect(loaded.definitions[1]).toEqual(full);
    expect(loaded.effectiveCatalogHash).not.toBe(start.effectiveCatalogHash);

    const tampered = effectiveRuntimeV2Catalog(
      catalog,
      new Map([[deferredToolField(full), JSON.stringify({ ...full, operations: ['drop'] })]]),
    );
    expect(tampered.catalogVersion).toBe(1);
    expect(tampered.definitions[1]?.deferred).toBeDefined();
    expect(
      effectiveRuntimeV2Catalog(catalog, new Map([[deferredToolField(full), '{']])).catalogVersion,
    ).toBe(1);
  });

  it('reads a flat HGETALL reply', () => {
    expect(loadedToolsRecord(['a', '1', 'b', '2', 3])).toEqual(
      new Map([
        ['a', '1'],
        ['b', '2'],
      ]),
    );
    expect(loadedToolsRecord(null).size).toBe(0);
  });

  it('shows the model a stub without its schema and says how to load it', () => {
    const instruction = buildRuntimeV2ModelInstruction(catalog);
    expect(instruction).toContain('"deferred":true');
    expect(instruction).toContain('runtime.tool_search');
    expect(instruction).not.toContain('"sql"');
    expect(buildRuntimeV2ModelInstruction([eager])).not.toContain('runtime.tool_search');
  });

  it('sends a call to a still-deferred tool back to the repair loop with the fix', () => {
    expect(() =>
      parseRuntimeV2ModelOutput(toolRequest('workspace.database', '2.0.0', 'query'), catalog),
    ).toThrow(/is deferred.*runtime\.tool_search/u);
    const loaded = effectiveRuntimeV2Catalog(
      catalog,
      new Map([[deferredToolField(full), JSON.stringify(full)]]),
    ).definitions;
    expect(
      parseRuntimeV2ModelOutput(toolRequest('workspace.database', '2.0.0', 'query'), loaded),
    ).toMatchObject({ kind: 'tool', toolName: 'workspace.database' });
  });
});
