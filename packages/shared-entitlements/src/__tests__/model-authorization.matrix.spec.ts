import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  authorizeModel,
  ModelAuthorizationDenial,
  type ModelAuthorizationFacts,
} from '../model-authorization';

const CSV_PATH = join(
  __dirname,
  '../../../../docs/implementation/model-exposure-entitlements/test_matrix_300.csv',
);

interface MatrixRow {
  id: string;
  provider: string;
  plan: string;
  deploymentState: string;
  operation: string;
  planAssignment: string;
  expected: string;
  reason: string;
  expectedProviderInvocationCount: string;
  mode: string;
}

function parseCsv(path: string): MatrixRow[] {
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split('\n');
  // Drop header and any blank trailing line.
  return lines
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [
        id,
        provider,
        plan,
        deploymentState,
        operation,
        planAssignment,
        expected,
        reason,
        expectedProviderInvocationCount,
        mode,
      ] = line.split(',');
      return {
        id,
        provider,
        plan,
        deploymentState,
        operation,
        planAssignment,
        expected,
        reason,
        expectedProviderInvocationCount,
        mode,
      };
    });
}

// Translate a matrix row into the pure facts the decision function needs.
function factsFor(row: MatrixRow): ModelAuthorizationFacts {
  return {
    // The matrix never tests a missing model — every row has a deployment
    // state, so exists is always true here.
    exists: true,
    retired: row.deploymentState === 'RETIRED',
    stale: row.deploymentState === 'STALE',
    connectorEnabled: row.deploymentState !== 'CONNECTOR_DISABLED',
    exposed: row.deploymentState === 'EXPOSED',
    hasActivePlan: row.plan !== 'NO_ACTIVE_PLAN',
    // The matrix varies model assignment, not provider policy, so every row
    // is treated as having the provider allowed by the plan.
    providerAllowedByPlan: true,
    modelAllowedByPlan: row.planAssignment === 'ASSIGNED',
    // No row exercises ALLOW_ALL — every plan is a concrete tier.
    unrestrictedPlan: false,
  };
}

const rows = parseCsv(CSV_PATH);

describe('model authorization matrix', () => {
  it('has the expected number of cases', () => {
    // A truncated CSV would silently test less; assert the count so it fails
    // loudly instead.
    expect(rows.length).toBe(300);
  });

  it('matches every expected outcome', () => {
    const mismatches: string[] = [];
    for (const row of rows) {
      const result = authorizeModel(factsFor(row));
      const gotAllowed = result.allowed;
      const wantAllowed = row.expected === 'ALLOW';
      if (gotAllowed !== wantAllowed) {
        mismatches.push(
          `${row.id}: expected ${row.expected}, got ${gotAllowed ? 'ALLOW' : 'DENY'}`,
        );
        continue;
      }
      if (!result.allowed && row.reason !== 'NONE' && result.reason !== row.reason) {
        mismatches.push(`${row.id}: expected reason ${row.reason}, got ${result.reason}`);
      }
    }
    // Report EVERY mismatch at once. A loop of individual expects stops at
    // the first failure and hides how wide the problem is.
    expect(mismatches).toEqual([]);
  });
});
