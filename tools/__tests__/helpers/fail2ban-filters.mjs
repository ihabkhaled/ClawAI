import fs from 'node:fs';

import { repoPath } from '../../lib/repo.mjs';

// Reads the fail2ban files of infra/fail2ban the way the tests need them (not a general fail2ban parser).

/** @param {string} relative */
export const readRepoText = (relative) =>
  fs.readFileSync(repoPath(relative), 'utf8').replaceAll('\r\n', '\n');

/**
 * A fail2ban INI file as { section: { key: value } }; an indented line continues the previous value.
 * @param {string} relative
 */
export function readIni(relative) {
  /** @type {Record<string, Record<string, string>>} */
  const sections = {};
  let section = null;
  let key = null;
  for (const raw of readRepoText(relative).split('\n')) {
    if (/^\s*(?:#|;|$)/u.test(raw)) continue;
    const header = /^\[([^\]]+)\]\s*$/u.exec(raw);
    if (header) {
      section = header[1];
      sections[section] = sections[section] ?? {};
      key = null;
      continue;
    }
    const continuation = /^\s+(\S.*)$/u.exec(raw);
    if (continuation && section !== null && key !== null) {
      sections[section][key] = `${sections[section][key]}\n${continuation[1].trim()}`;
      continue;
    }
    const pair = /^([\w.]+)\s*=\s*(.*)$/u.exec(raw);
    if (pair && section !== null) {
      key = pair[1];
      sections[section][key] = pair[2].trim();
    }
  }
  return sections;
}

/**
 * The failregex and ignoreregex lines of a filter as JavaScript regular expressions. `<HOST>` becomes an IPv4
 * capture and `%%` (a literal percent in a fail2ban file) becomes `%`.
 * @param {string} name
 */
export function filterRegexes(name) {
  const section = readIni(`infra/fail2ban/filter.d/${name}.conf`).Definition;
  const toJs = (pattern) =>
    new RegExp(
      pattern
        .replaceAll('%%', '%')
        .replaceAll('<HOST>', String.raw`(?<host>(?:\d{1,3}\.){3}\d{1,3})`),
      'u',
    );
  return {
    fail: section.failregex.split('\n').map(toJs),
    ignore: (section.ignoreregex ?? '').split('\n').filter(Boolean).map(toJs),
  };
}

/**
 * Would fail2ban count this log line against its address?
 * @param {string} name
 * @param {string} line
 */
export function counts(name, line) {
  const { fail, ignore } = filterRegexes(name);
  return fail.some((regex) => regex.test(line)) && !ignore.some((regex) => regex.test(line));
}
