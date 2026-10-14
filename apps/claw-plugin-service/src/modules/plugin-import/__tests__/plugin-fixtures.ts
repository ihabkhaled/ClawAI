import { type BundleFile } from '../types/plugin-import.types';

export function file(path: string, content: string | object): BundleFile {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  return { path, content: Buffer.from(text, 'utf8') };
}

const SKILL = (name: string, description: string): string =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\nDo the thing.\n`;

const HOOKS = {
  hooks: {
    SessionStart: [
      { hooks: [{ type: 'command', command: 'node ${CLAUDE_PLUGIN_ROOT}/hooks/start.js' }] },
    ],
    UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'bash hooks/nudge.sh' }] }],
  },
};

/** The layout of a "be brief, keep code clean" plugin: manifest, one skill, two commands, hooks. */
export function iHaveHeadacheLayout(): BundleFile[] {
  return [
    file('.claude-plugin/plugin.json', {
      name: 'i-have-headache',
      version: '1.2.0',
      description: 'Be concise and keep code clean.',
      author: { name: 'Owner', email: 'owner@example.com' },
      license: 'MIT',
      homepage: 'https://example.com/headache',
    }),
    file('skills/i-have-headache/SKILL.md', SKILL('i-have-headache', 'Shortest complete answer.')),
    file('commands/headache.md', '---\ndescription: Switch to terse mode\n---\nBe terse.\n'),
    file('commands/relief.md', 'Leave terse mode.\n'),
    file('hooks/hooks.json', HOOKS),
  ];
}

/** A game plugin: skills, an agent, hooks, and an .mcp.json with one remote and one stdio server. */
export function akinatorLayout(): BundleFile[] {
  return [
    file('.claude-plugin/plugin.json', {
      name: 'akinator',
      version: '0.4.1',
      description: 'Guess the thing.',
    }),
    file('skills/akinator/SKILL.md', SKILL('akinator', 'Ask yes/no questions.')),
    file('skills/akinator/references/questions.md', '- Is it alive?\n'),
    file('agents/oracle.md', '---\nname: oracle\ndescription: Keeps score\n---\nBody\n'),
    file('hooks/hooks.json', HOOKS),
    file('.mcp.json', {
      mcpServers: {
        remote: {
          type: 'http',
          url: 'https://mcp.example.com/mcp',
          headers: { Authorization: 'Bearer SECRET' },
        },
        local: { command: 'npx', args: ['-y', 'some-server'] },
      },
    }),
  ];
}

/** A "psychiatry" plugin: several skills, commands, hooks. */
export function aiPsychiatryLayout(): BundleFile[] {
  return [
    file('.claude-plugin/plugin.json', {
      name: 'ai-psychiatry',
      version: '2.0.0',
      author: 'Dr. Owner',
    }),
    file('skills/all-the-medicine/SKILL.md', SKILL('all-the-medicine', 'Diagnose agent state.')),
    file('skills/second-opinion/SKILL.md', SKILL('second-opinion', 'Review the first answer.')),
    file('commands/all-the-medicine.md', 'Run the full pass.\n'),
    file('hooks/hooks.json', HOOKS),
  ];
}

export const STATS = { fileCount: 5, skippedCount: 0, totalBytes: 1000 };
