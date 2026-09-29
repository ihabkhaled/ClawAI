// Rewrites the Team plan's user-facing description on EXISTING installs.
//
// The seeded text, "Shared workspaces and a large pooled allowance.", promised
// pooled team billing and a shared account. Neither exists: every user holds
// their own plan, quota and credit wallet (REQ-POS-005). plan-catalog.json now
// carries the accurate text, but plan-catalog v2 has already run on every
// install and its else branch never writes `description`, so the JSON change
// alone reaches fresh installs only.
//
// TEXT ONLY. This seeder writes the `description` column and nothing else — no
// price, quota, ceiling, feature rule or entitlement is touched (rule 28).
//
// The update is keyed on the OLD text, so an administrator who has already
// rewritten the description keeps their wording, and a second run is a no-op.

const catalogData = require('./plan-catalog.json');

const TEAM_SLUG = 'team';
const PREVIOUS_DESCRIPTION = 'Shared workspaces and a large pooled allowance.';

function currentTeamDescription() {
  const team = catalogData.plans.find((plan) => plan.slug === TEAM_SLUG);
  if (!team) {
    throw new Error('plan-catalog.json has no team plan');
  }
  return team.description;
}

const NEXT_DESCRIPTION = currentTeamDescription();

async function run(prisma) {
  const result = await prisma.plan.updateMany({
    where: { slug: TEAM_SLUG, description: PREVIOUS_DESCRIPTION },
    data: { description: NEXT_DESCRIPTION },
  });
  console.warn(`[seed] plan-team-description: updated=${result.count}`);
  return { updated: result.count };
}

module.exports = {
  name: 'plan-team-description',
  version: 1,
  payload: { slug: TEAM_SLUG, from: PREVIOUS_DESCRIPTION, to: NEXT_DESCRIPTION },
  run,
  TEAM_SLUG,
  PREVIOUS_DESCRIPTION,
  NEXT_DESCRIPTION,
};
