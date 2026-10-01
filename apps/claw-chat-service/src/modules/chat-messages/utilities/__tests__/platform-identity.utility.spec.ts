import { ChatSurface } from '../../../../common/enums/chat-surface.enum';
import {
  asksAboutThisPlatform,
  buildPlatformIdentityBlock,
  buildSelfInspectIntent,
} from '../platform-identity.utility';

describe('buildPlatformIdentityBlock', () => {
  it('tells the model it is inside ClawAI and what the workspace offers', () => {
    const block = buildPlatformIdentityBlock(undefined);

    expect(block).toContain('ClawAI');
    expect(block).toContain('Every AI, one workspace');
    expect(block).toMatch(/Compare and Judge/);
    expect(block).toMatch(/not present it as a memory or context item/i);
    expect(block).toMatch(/never deny it/i);
  });

  it('states the served address from configuration, so a new domain needs no edit', () => {
    expect(buildPlatformIdentityBlock('https://claw-ai.co/')).toContain(
      'The workspace is served at: https://claw-ai.co',
    );
    expect(buildPlatformIdentityBlock('https://other.example')).toContain('https://other.example');
    expect(buildPlatformIdentityBlock('   ')).not.toContain('served at');
  });

  it('gives a coding-agent turn the editor wording, not the web app line', () => {
    const block = buildPlatformIdentityBlock('https://claw-ai.co', ChatSurface.AGENT);

    expect(block).toContain('Every AI, one workspace');
    expect(block).toContain('coding agent in their editor');
    expect(block).not.toContain('through the ClawAI web app');
    expect(block).toContain('served at: https://claw-ai.co');
    expect(block).toMatch(/never deny it/i);
  });

  it('keeps the web wording for chat and for no surface, and is static per surface', () => {
    const chat = buildPlatformIdentityBlock(undefined, ChatSurface.CHAT);

    expect(chat).toBe(buildPlatformIdentityBlock(undefined));
    expect(chat).toContain('through the ClawAI web app');
    expect(buildPlatformIdentityBlock(undefined, ChatSurface.AGENT)).toBe(
      buildPlatformIdentityBlock(undefined, ChatSurface.AGENT),
    );
  });

  it('never states a price, a limit or a plan figure', () => {
    expect(buildPlatformIdentityBlock('https://claw-ai.co')).not.toMatch(
      /\$\s?\d|\d+\s?%|\d+\s?(tokens|messages)/i,
    );
  });
});

describe('asksAboutThisPlatform', () => {
  it.each([
    'what is the current webapp ?',
    'What is this app?',
    "what's this platform",
    'what is ClawAI',
    'where are we?',
    'which site is this',
    'what features does this platform offer',
    'crawl this site',
    'inspect the current website',
    'crawl yourself',
    'Can you crawl yourself and tell me what you are?',
    'what can ClawAI do',
    'what can you do for me on this platform',
    'tell me about ClawAI',
  ])('recognises %j', (message) => {
    expect(asksAboutThisPlatform(message)).toBe(true);
  });

  it.each([
    'what is the capital of France',
    'explain how a site map works',
    'where are we on the roadmap of my project',
    'write a webapp for me',
    'hello',
  ])('ignores %j', (message) => {
    expect(asksAboutThisPlatform(message)).toBe(false);
  });
});

describe('buildSelfInspectIntent', () => {
  it('appends a crawl of the platform origin, keeping the user words', () => {
    expect(buildSelfInspectIntent('what is this app?', 'https://claw-ai.co/')).toBe(
      'what is this app?\ncrawl https://claw-ai.co',
    );
  });

  it('is null for an unrelated message or an unknown origin', () => {
    expect(buildSelfInspectIntent('hello', 'https://claw-ai.co')).toBeNull();
    expect(buildSelfInspectIntent('what is this app?', ' ')).toBeNull();
  });
});
