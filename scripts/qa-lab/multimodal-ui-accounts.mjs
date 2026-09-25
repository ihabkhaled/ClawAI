// Throwaway free + paid accounts for the multimodal browser lane.
// Mirrors qa/test-multimodal.sh ACCOUNTS: random passwords, never printed.
// Cached (mode 0600-ish) under the OS temp dir so reruns reuse them.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= '0';

export const BASE = process.env.QA_BASE ?? 'https://claw.local/api/v1';
const CACHE = path.join(os.tmpdir(), 'claw-qa-multimodal-ui-accounts.json');

async function call(method, route, token, body) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

export async function apiLogin(email, password) {
  const r = await call('POST', '/auth/login', null, { email, password });
  if (r.status >= 300) throw new Error(`login ${email} → ${r.status}`);
  return r.json.tokens.accessToken;
}

export async function api(method, route, token, body) {
  return call(method, route, token, body);
}

async function createUser(adminToken, tag) {
  const suffix = `${tag}${Date.now()}${crypto.randomInt(1000)}`;
  const email = `qa-mmui-${suffix}@claw.local`;
  const password = `Qa1!${crypto.randomBytes(8).toString('hex')}Zz`;
  const r = await call('POST', '/users', adminToken, {
    email,
    username: `qammui${suffix}`.slice(0, 32),
    password,
    firstName: 'QA',
    lastName: 'MultimodalUI',
    role: 'USER',
  });
  const id = r.json?.id ?? r.json?.user?.id;
  if (!id) throw new Error(`create ${tag} user → ${r.status} ${r.text.slice(0, 200)}`);
  // Admin-created users must change their password before the UI lets them in.
  const token = await apiLogin(email, password);
  const next = `Qa2!${crypto.randomBytes(8).toString('hex')}Zz`;
  const change = await call('PATCH', '/users/me/password', token, {
    currentPassword: password,
    newPassword: next,
  });
  if (change.status >= 300) throw new Error(`rotate ${tag} password → ${change.status}`);
  return { email, password: next, id };
}

export async function ensureAccounts() {
  if (fs.existsSync(CACHE) && process.env.QA_FRESH_ACCOUNTS !== '1') {
    const cached = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
    try {
      await apiLogin(cached.paid.email, cached.paid.password);
      await apiLogin(cached.free.email, cached.free.password);
      return cached;
    } catch {
      /* fall through and recreate */
    }
  }
  const adminEmail = process.env.QA_ADMIN_EMAIL;
  const adminPassword = process.env.QA_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error('QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD not set');
  const admin = await apiLogin(adminEmail, adminPassword);
  const paid = await createUser(admin, 'paid');
  const plans = await call('GET', '/admin/plans', admin);
  const rows = Array.isArray(plans.json) ? plans.json : (plans.json?.data ?? plans.json?.items ?? []);
  const slug = process.env.QA_PAID_PLAN_SLUG ?? 'pro';
  const plan = rows.find((p) => p.slug === slug);
  if (!plan) throw new Error(`plan ${slug} not found`);
  const assign = await call('POST', `/admin/plans/users/${paid.id}/assign`, admin, {
    planId: plan.id,
    durationMonths: 1,
    grantReason: 'qa multimodal browser lane',
  });
  if (assign.status >= 300) throw new Error(`assign plan → ${assign.status}`);
  const topup = await call('POST', `/admin/credit/wallets/${paid.id}/adjust`, admin, {
    amountMicroUsd: 2000000,
    reason: 'qa multimodal browser lane top-up',
  });
  const free = await createUser(admin, 'free');
  const accounts = { paid, free, topupStatus: topup.status, plan: slug };
  fs.writeFileSync(CACHE, JSON.stringify(accounts), { mode: 0o600 });
  return accounts;
}
