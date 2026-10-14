import type {
  CuratedEntryRequest,
  CuratedEntryView,
  CuratedLocaleText,
  CuratedPreviewRequest,
  CuratedPreviewView,
  CuratedToolInput,
} from '@claw/shared-types';

import {
  ADMIN_CURATION_ERROR_GENERIC,
  ADMIN_CURATION_ERROR_KEYS,
} from '@/constants/plugin-admin-curation.constants';
import { ApiClientError } from '@/services/shared/api-client';
import type { CuratedFormValues, CuratedToolDraft } from '@/types/plugin-admin-curation.types';
import type { PluginsTranslate } from '@/types/plugins.types';

const EMPTY_TEXT: CuratedLocaleText = { name: '', summary: '', description: '' };

export function emptyCuratedForm(): CuratedFormValues {
  return {
    slug: '',
    publisher: '',
    category: 'dev',
    iconKey: 'globe',
    homepageUrl: '',
    url: '',
    transport: 'streamable-http',
    authKind: 'NONE',
    headerName: 'X-API-Key',
    oauthAuthorizeUrl: '',
    oauthTokenUrl: '',
    probeCredential: '',
    texts: { en: { ...EMPTY_TEXT } },
    tools: [],
    allowedPlans: '',
    adminNotes: '',
  };
}

/** The edit form starts from what is stored; the probe key is never stored, so it starts empty. */
export function formFromEntry(entry: CuratedEntryView): CuratedFormValues {
  return {
    ...emptyCuratedForm(),
    slug: entry.slug,
    publisher: entry.publisher,
    category: entry.category,
    iconKey: entry.iconKey,
    homepageUrl: entry.homepageUrl ?? '',
    url: entry.url ?? '',
    transport: entry.transport ?? 'streamable-http',
    authKind: entry.authKind,
    headerName: entry.authHeaderName ?? 'X-API-Key',
    texts: { ...entry.translations },
    tools: entry.tools.map((tool) => ({
      name: tool.name,
      description: '',
      riskLevel: tool.riskLevel,
      selected: true,
      curatable: true,
    })),
    allowedPlans: entry.allowedPlanSlugs.join(', '),
    adminNotes: entry.adminNotes ?? '',
  };
}

export function parsePlanSlugs(text: string): string[] {
  return text
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
}

function authFor(values: CuratedFormValues): CuratedEntryRequest['auth'] {
  if (values.authKind === 'NONE') {
    return { kind: 'NONE' };
  }
  if (values.authKind === 'OAUTH2_PKCE') {
    return {
      kind: 'OAUTH2_PKCE',
      oauth: {
        authorizeUrl: values.oauthAuthorizeUrl.trim(),
        tokenUrl: values.oauthTokenUrl.trim(),
        scopes: [],
      },
    };
  }
  return { kind: values.authKind, headerName: values.headerName.trim() };
}

function toolInput(tool: CuratedToolDraft): CuratedToolInput {
  return {
    name: tool.name,
    description: tool.description.length > 0 ? tool.description : tool.name,
    riskLevel: tool.riskLevel,
    ...(tool.inputSchema === undefined ? {} : { inputSchema: tool.inputSchema }),
  };
}

/** Only languages with a name are sent; English is required and the server says so if it is missing. */
function filledTexts(
  texts: Record<string, CuratedLocaleText>,
): CuratedEntryRequest['translations'] {
  const entries = Object.entries(texts).filter(([, text]) => text.name.trim().length > 0);
  return Object.fromEntries(entries) as CuratedEntryRequest['translations'];
}

export function buildEntryRequest(
  values: CuratedFormValues,
  isEdit: boolean,
  publish: boolean,
): CuratedEntryRequest {
  const homepage = values.homepageUrl.trim();
  const credential = values.probeCredential;
  return {
    ...(isEdit ? {} : { slug: values.slug.trim() }),
    publisher: values.publisher.trim(),
    category: values.category,
    iconKey: values.iconKey,
    ...(homepage.length > 0 ? { homepageUrl: homepage } : {}),
    translations: filledTexts(values.texts),
    server: { url: values.url.trim(), transport: values.transport },
    auth: authFor(values),
    tools: values.tools.filter((tool) => tool.selected).map((tool) => toolInput(tool)),
    allowedPlanSlugs: parsePlanSlugs(values.allowedPlans),
    ...(values.adminNotes.trim().length > 0 ? { adminNotes: values.adminNotes.trim() } : {}),
    publish,
    ...(credential.length > 0 ? { probeCredential: credential } : {}),
  };
}

export function buildPreviewRequest(values: CuratedFormValues): CuratedPreviewRequest {
  return {
    url: values.url.trim(),
    transport: values.transport,
    auth: authFor(values),
    ...(values.probeCredential.length > 0 ? { credential: values.probeCredential } : {}),
  };
}

/** Tools the server listed replace the form's tools; the admin's earlier risk choice for a name is kept. */
export function toolsFromPreview(
  preview: CuratedPreviewView,
  current: readonly CuratedToolDraft[],
): CuratedToolDraft[] {
  const before = new Map(current.map((tool) => [tool.name, tool]));
  return preview.tools.map((tool) => {
    const earlier = before.get(tool.name);
    return {
      name: tool.name,
      description: tool.description,
      riskLevel: earlier?.riskLevel ?? tool.defaultRisk,
      inputSchema: tool.inputSchema,
      selected: tool.curatable && (earlier?.selected ?? true),
      curatable: tool.curatable,
    };
  });
}

export function adminCurationErrorKey(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return ADMIN_CURATION_ERROR_GENERIC;
  }
  if (error.code !== undefined && Object.hasOwn(ADMIN_CURATION_ERROR_KEYS, error.code)) {
    return ADMIN_CURATION_ERROR_KEYS[error.code] ?? ADMIN_CURATION_ERROR_GENERIC;
  }
  return ADMIN_CURATION_ERROR_GENERIC;
}

/** An audit action or target code as text in the user's language; an unknown code is shown as it is. */
export function auditCodeLabel(
  t: PluginsTranslate,
  table: Readonly<Record<string, string>>,
  code: string,
): string {
  return Object.hasOwn(table, code) ? t(table[code] ?? code) : code;
}
