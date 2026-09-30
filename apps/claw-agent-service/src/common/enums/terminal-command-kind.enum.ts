/** F099: a queued job is a shell command or an agent prompt. Mirrors the Prisma enum. */
export enum TerminalCommandKind {
  SHELL = 'SHELL',
  PROMPT = 'PROMPT',
}
