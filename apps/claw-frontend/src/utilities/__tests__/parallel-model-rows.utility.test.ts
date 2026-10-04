import { describe, expect, it } from 'vitest';

import type { GroupedModels } from '@/types';
import {
  buildParallelModelRows,
  parallelModelRowKey,
} from '@/utilities/parallel-model-rows.utility';

const model = (provider: string, name: string): GroupedModels['models'][number] => ({
  provider,
  model: name,
  displayName: name,
});

const groups: GroupedModels[] = [
  {
    provider: 'OPENAI',
    label: 'OpenAI',
    models: [model('OPENAI', 'GPT-4.1'), model('OPENAI', 'o3')],
  },
  { provider: 'IMAGE_GEMINI', label: 'Images', models: [model('IMAGE_GEMINI', 'imagen')] },
  { provider: 'GROQ', label: 'Groq', models: [model('GROQ', 'llama')] },
];

describe('buildParallelModelRows', () => {
  it('flattens groups, skipping image generators', () => {
    const rows = buildParallelModelRows(groups, '');

    expect(rows.map((row) => row.kind)).toEqual(['group', 'model', 'model', 'group', 'model']);
  });

  it('filters by name and drops empty groups', () => {
    const rows = buildParallelModelRows(groups, ' LLAMA ');

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: 'group', key: 'GROQ' });
  });

  it('keys models by provider and id so equal names do not collide', () => {
    const rows = buildParallelModelRows(
      [
        { provider: 'A', label: 'A', models: [model('A', 'x')] },
        { provider: 'B', label: 'B', models: [model('B', 'x')] },
      ],
      '',
    );
    const keys = rows.map((row, index) => parallelModelRowKey(index, row));

    expect(new Set(keys).size).toBe(keys.length);
  });
});
