'use client';

import type { ReactElement } from 'react';

import { TerminalCommandStatus } from '@/enums';
import { cn } from '@/lib/utils';
import type { TerminalOutputBlockProps } from '@/types/agent-component.types';

/**
 * Renders a single terminal command + its stdout/stderr in a proper terminal
 * emulator skin: monospace font, near-black background, lime-green prompt,
 * light-zinc body. Stderr renders in destructive-red for contrast.
 *
 * Used inside the agent terminal page list rows. Drops cleanly into a Card.
 */
export function TerminalOutputBlock({ command }: TerminalOutputBlockProps): ReactElement {
  const hasStdout = command.stdout !== null && command.stdout.length > 0;
  const hasStderr = command.stderr !== null && command.stderr.length > 0;
  const wd = command.workingDir ?? '~';
  const isFailed = command.status === TerminalCommandStatus.FAILED;

  return (
    <pre
      className={cn(
        'm-0 overflow-x-auto rounded-md bg-black/95 px-3 py-3 font-mono text-xs leading-relaxed',
        'shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]',
        'border border-zinc-800',
      )}
    >
      {/* Prompt line: lime-green prompt + zinc-100 typed command */}
      <code className="block whitespace-pre-wrap break-all">
        <span className="text-green-400">{wd}</span>
        <span className="text-zinc-500"> $ </span>
        <span className="text-zinc-100">{command.command}</span>
      </code>

      {/* stdout body */}
      {hasStdout && (
        <code className="mt-2 block whitespace-pre-wrap break-all text-zinc-100">
          {command.stdout}
        </code>
      )}

      {/* stderr body — red for visibility */}
      {hasStderr && (
        <code className="mt-2 block whitespace-pre-wrap break-all text-red-400">
          {command.stderr}
        </code>
      )}

      {/* Footer: exit code marker on the next line */}
      {command.exitCode !== null && (
        <code
          className={cn(
            'mt-2 block whitespace-pre-wrap break-all',
            isFailed ? 'text-red-400' : 'text-zinc-500',
          )}
        >
          {`[exit ${command.exitCode}]`}
        </code>
      )}
    </pre>
  );
}
