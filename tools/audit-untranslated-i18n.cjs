#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * audit-untranslated-i18n.cjs
 *
 * Reports every entry in a non-English locale file whose value is
 * identical to the English value, minus a documented exempt set
 * (brand names, technical loanwords, placeholder-only strings, units).
 *
 * Run before committing new i18n keys to catch English-leaks before
 * users see them. See rules/03-frontend-rules.md "NEVER leak English
 * into non-EN locales" for the policy.
 *
 *   node tools/audit-untranslated-i18n.cjs           # all locales
 *   node tools/audit-untranslated-i18n.cjs de fr     # only de + fr
 *
 * Exits 0 if every flagged entry is in the exempt set; exits 1 if any
 * un-exempt English-leak remains. CI may wire this into pre-merge.
 */
const fs = require('node:fs');
const path = require('node:path');

const LOCALES_DIR = 'apps/claw-frontend/src/lib/i18n/locales';
const ALL_LOCALES = ['ar', 'de', 'es', 'fr', 'hi', 'it', 'pt', 'ru'];

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function loadLocale(name) {
  const file = path.join(LOCALES_DIR, `${name}.ts`);
  const src = fs.readFileSync(file, 'utf-8');
  const m = src.match(/export const \w+:[^=]+=\s*(\{[\s\S]*\});/);
  if (!m) {
    throw new Error(`could not parse object literal from ${file}`);
  }
  // eslint-disable-next-line no-new-func
  return new Function('return ' + m[1])();
}

// Words/values that are identical across languages by intent — brand names,
// unit acronyms, technical jargon, placeholder-only strings.
const EXEMPT_VALUES = new Set([
  // Brands
  'Confluence', 'Slack', 'Jira', 'GitHub', 'GitLab', 'Bitbucket', 'OneDrive',
  'SharePoint', 'Drive', 'Gmail', 'Figma', 'ClickUp', 'HuggingFace', 'Ollama',
  'Claw', 'OpenAI', 'Anthropic', 'Gemini', 'AWS Bedrock', 'DeepSeek', 'Grok',
  'Bedrock', 'GLM', 'Qwen', 'Llama', 'Phi', 'GPT', 'Tauri', 'TypeScript',
  // Tech jargon
  'API Key', 'Webhook', 'OAuth', 'JSON', 'CSV', 'PDF', 'DOCX', 'YAML', 'XML',
  'HTTP', 'HTTPS', 'CPU', 'GPU', 'RAM', 'VRAM', 'SHA-256', 'UUID', 'OK', 'OK!',
  'P50', 'P95', 'P99',
  'Story Points', 'Sprint', 'Epic', 'Backlog',
  'AUTO', 'MANUAL', 'PENDING', 'APPROVED', 'DENIED', 'EXECUTED',
  // Common ambiguous words also shared across many target languages
  'Live', 'Auto', 'Info',
]);

function isExempt(key, value) {
  if (typeof value !== 'string') return true;
  if (value.length < 2) return true;
  // Pure placeholder strings ({foo}, {ms}ms, etc.)
  const stripped = value.replace(/\{[\w]+\}/g, '').trim();
  if (stripped.length < 4) return true;
  if (/^https?:\/\//.test(value)) return true;
  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) return true;
  if (EXEMPT_VALUES.has(value)) return true;
  if (/Placeholder$/i.test(key.split('.').pop() ?? '')) return true;
  if (/(brandVersion|sourceLink|requiresRamGb)$/.test(key)) return true;
  return false;
}

const requestedLocales = process.argv.slice(2);
const locales = requestedLocales.length > 0 ? requestedLocales : ALL_LOCALES;

const en = flatten(loadLocale('en'));
const findings = {};
let totalLeaked = 0;
for (const loc of locales) {
  const flat = flatten(loadLocale(loc));
  const entries = [];
  for (const [k, enVal] of Object.entries(en)) {
    if (typeof enVal !== 'string') continue;
    const locVal = flat[k];
    if (typeof locVal !== 'string') continue;
    if (isExempt(k, enVal)) continue;
    if (locVal === enVal) entries.push({ key: k, en: enVal });
  }
  findings[loc] = entries;
  totalLeaked += entries.length;
}

console.log(`Audit: untranslated entries (value === English) per locale`);
console.log(`(exempt: brand names, unit acronyms, placeholders, common loanwords)\n`);
for (const loc of locales) {
  console.log(`[${loc}] ${findings[loc].length}`);
  for (const f of findings[loc].slice(0, 30)) {
    console.log(`  ${f.key}: ${JSON.stringify(f.en)}`);
  }
  if (findings[loc].length > 30) {
    console.log(`  ... +${findings[loc].length - 30} more`);
  }
}

console.log(`\nTotal: ${totalLeaked} leaked-English entries across ${locales.length} locales.`);

if (totalLeaked > 0) {
  console.log(`\n→ Review each entry. Either translate it natively or add it to`);
  console.log(`  EXEMPT_VALUES in this script (with a comment explaining why).`);
  process.exit(1);
}
process.exit(0);
