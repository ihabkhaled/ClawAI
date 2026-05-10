import { createHmac, timingSafeEqual } from 'node:crypto';

import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import {
  WEBHOOK_HEADER_NAMES,
  WEBHOOK_REJECTION_CODES,
} from '../constants/webhook-receiver.constants';
import type {
  WebhookSignatureVerifier,
  WebhookVerificationResult,
} from '../types/webhook-receiver.types';

function headerString(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const entry = Object.entries(headers).find(([k]) => k === name);
  const v = entry?.[1];
  if (Array.isArray(v)) return v.at(0) ?? null;
  return v ?? null;
}

function safeEqualHex(expectedHex: string, providedHex: string): boolean {
  if (expectedHex.length !== providedHex.length) return false;
  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(providedHex, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function failedResult(reason: string): WebhookVerificationResult {
  return {
    signatureValid: false,
    externalDeliveryId: null,
    eventType: null,
    signature: null,
    reason,
  };
}

function buildGithubVerifier(): WebhookSignatureVerifier {
  return {
    provider: WorkspaceProvider.GITHUB,
    verify(input, secret) {
      const sig = headerString(input.headers, WEBHOOK_HEADER_NAMES.GITHUB_SIGNATURE_256);
      const eventType = headerString(input.headers, WEBHOOK_HEADER_NAMES.GITHUB_EVENT);
      const deliveryId = headerString(input.headers, WEBHOOK_HEADER_NAMES.GITHUB_DELIVERY);
      if (sig === null) return failedResult(WEBHOOK_REJECTION_CODES.SIGNATURE_MISSING);
      if (secret.length === 0) return failedResult(WEBHOOK_REJECTION_CODES.SECRET_NOT_CONFIGURED);
      const expected = `sha256=${createHmac('sha256', secret).update(input.rawBody).digest('hex')}`;
      if (!safeEqualHex(expected.replace('sha256=', ''), sig.replace('sha256=', ''))) {
        return failedResult(WEBHOOK_REJECTION_CODES.SIGNATURE_INVALID);
      }
      return {
        signatureValid: true,
        externalDeliveryId: deliveryId,
        eventType,
        signature: sig,
        reason: null,
      };
    },
  };
}

function buildGitlabVerifier(): WebhookSignatureVerifier {
  return {
    provider: WorkspaceProvider.GITLAB,
    verify(input, secret) {
      const token = headerString(input.headers, WEBHOOK_HEADER_NAMES.GITLAB_TOKEN);
      const eventType = headerString(input.headers, WEBHOOK_HEADER_NAMES.GITLAB_EVENT);
      if (typeof token !== 'string') return failedResult(WEBHOOK_REJECTION_CODES.SIGNATURE_MISSING);
      if (secret.length === 0) return failedResult(WEBHOOK_REJECTION_CODES.SECRET_NOT_CONFIGURED);
      const a = Buffer.from(token);
      const b = Buffer.from(secret);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return failedResult(WEBHOOK_REJECTION_CODES.SIGNATURE_INVALID);
      }
      return {
        signatureValid: true,
        externalDeliveryId: null,
        eventType,
        signature: token,
        reason: null,
      };
    },
  };
}

function buildBitbucketVerifier(): WebhookSignatureVerifier {
  return {
    provider: WorkspaceProvider.BITBUCKET,
    verify(input, _secret) {
      // Bitbucket Cloud doesn't send HMAC by default. We treat the request-uuid
      // header as the only authenticity signal we can record. Tighter validation
      // happens upstream via IP allowlist when configured (deferred to v1.x).
      const deliveryId = headerString(input.headers, WEBHOOK_HEADER_NAMES.BITBUCKET_REQUEST_UUID);
      const eventType = headerString(input.headers, WEBHOOK_HEADER_NAMES.BITBUCKET_EVENT);
      if (deliveryId === null) {
        return failedResult(WEBHOOK_REJECTION_CODES.SIGNATURE_MISSING);
      }
      return {
        signatureValid: true,
        externalDeliveryId: deliveryId,
        eventType,
        signature: deliveryId,
        reason: null,
      };
    },
  };
}

function buildSlackVerifier(): WebhookSignatureVerifier {
  return {
    provider: WorkspaceProvider.SLACK,
    verify(input, secret) {
      const sig = headerString(input.headers, WEBHOOK_HEADER_NAMES.SLACK_SIGNATURE);
      const ts = headerString(input.headers, WEBHOOK_HEADER_NAMES.SLACK_TIMESTAMP);
      if (sig === null || ts === null)
        return failedResult(WEBHOOK_REJECTION_CODES.SIGNATURE_MISSING);
      if (secret.length === 0) return failedResult(WEBHOOK_REJECTION_CODES.SECRET_NOT_CONFIGURED);
      const base = `v0:${ts}:${input.rawBody.toString('utf-8')}`;
      const expected = `v0=${createHmac('sha256', secret).update(base).digest('hex')}`;
      if (!safeEqualHex(expected.replace('v0=', ''), sig.replace('v0=', ''))) {
        return failedResult(WEBHOOK_REJECTION_CODES.SIGNATURE_INVALID);
      }
      return {
        signatureValid: true,
        externalDeliveryId: null,
        eventType: null,
        signature: sig,
        reason: null,
      };
    },
  };
}

function buildJiraVerifier(): WebhookSignatureVerifier {
  return {
    provider: WorkspaceProvider.JIRA,
    verify(input, _secret) {
      // Atlassian Connect / Jira webhooks don't carry HMAC by default; the
      // documented authenticity signal is the JWT-style ?jwt= query parameter
      // for Connect apps OR allowlisted source IP. We record the
      // x-atlassian-webhook-identifier header as a delivery id proxy and trust
      // the OAuth-pre-validated connector context. Production deployments
      // should enable IP allowlisting upstream (deferred to v1.x).
      const deliveryId = headerString(input.headers, WEBHOOK_HEADER_NAMES.JIRA_SIGNATURE);
      return {
        signatureValid: true,
        externalDeliveryId: deliveryId,
        eventType: null,
        signature: deliveryId,
        reason: null,
      };
    },
  };
}

function buildFigmaVerifier(): WebhookSignatureVerifier {
  return {
    provider: WorkspaceProvider.FIGMA,
    verify(input, secret) {
      const sig = headerString(input.headers, WEBHOOK_HEADER_NAMES.FIGMA_SIGNATURE);
      if (sig === null) return failedResult(WEBHOOK_REJECTION_CODES.SIGNATURE_MISSING);
      if (secret.length === 0) return failedResult(WEBHOOK_REJECTION_CODES.SECRET_NOT_CONFIGURED);
      const expected = createHmac('sha256', secret).update(input.rawBody).digest('hex');
      if (!safeEqualHex(expected, sig)) {
        return failedResult(WEBHOOK_REJECTION_CODES.SIGNATURE_INVALID);
      }
      return {
        signatureValid: true,
        externalDeliveryId: null,
        eventType: null,
        signature: sig,
        reason: null,
      };
    },
  };
}

let verifierCache: Map<WorkspaceProvider, WebhookSignatureVerifier> | null = null;

function getVerifiers(): Map<WorkspaceProvider, WebhookSignatureVerifier> {
  verifierCache ??= new Map<WorkspaceProvider, WebhookSignatureVerifier>([
    [WorkspaceProvider.GITHUB, buildGithubVerifier()],
    [WorkspaceProvider.GITLAB, buildGitlabVerifier()],
    [WorkspaceProvider.BITBUCKET, buildBitbucketVerifier()],
    [WorkspaceProvider.SLACK, buildSlackVerifier()],
    [WorkspaceProvider.JIRA, buildJiraVerifier()],
    [WorkspaceProvider.FIGMA, buildFigmaVerifier()],
  ]);
  return verifierCache;
}

export function findVerifier(provider: WorkspaceProvider): WebhookSignatureVerifier | null {
  return getVerifiers().get(provider) ?? null;
}

export function isWebhookSupported(provider: WorkspaceProvider): boolean {
  return getVerifiers().has(provider);
}
