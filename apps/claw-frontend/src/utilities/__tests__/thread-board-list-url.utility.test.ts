import { describe, expect, it } from 'vitest';

import {
  boardReaderPath,
  readBoardListUrl,
  rememberBoardListUrl,
  slugFromThreadUrl,
} from '../thread-board-list-url.utility';

describe('thread board list url', () => {
  it('remembers only board addresses', () => {
    rememberBoardListUrl('/board?q=ai&page=2');
    expect(readBoardListUrl()).toBe('/board?q=ai&page=2');
    rememberBoardListUrl('https://evil.example');
    expect(readBoardListUrl()).toBeNull();
  });

  it('accepts locale-prefixed board addresses with filters', () => {
    rememberBoardListUrl('/en/board?q=vector&lang=all&sort=trending');
    expect(readBoardListUrl()).toBe('/en/board?q=vector&lang=all&sort=trending');
    rememberBoardListUrl('/pt/board');
    expect(readBoardListUrl()).toBe('/pt/board');
    rememberBoardListUrl('/en/chat');
    expect(readBoardListUrl()).toBeNull();
    rememberBoardListUrl('//evil.example/board');
    expect(readBoardListUrl()).toBeNull();
  });

  it('reads the slug from a public address', () => {
    expect(slugFromThreadUrl('https://claw.local/threads/clear-writing')).toBe('clear-writing');
    expect(slugFromThreadUrl('https://claw.local/threads/a%20b/?x=1')).toBe('a b');
    expect(slugFromThreadUrl('https://claw.local/other')).toBeNull();
    expect(slugFromThreadUrl('https://claw.local/threads/%E0%A4')).toBeNull();
  });

  it('builds the reader path', () => {
    expect(boardReaderPath('a b')).toBe('/board/a%20b');
  });
});
