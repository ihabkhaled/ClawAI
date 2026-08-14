'use strict';

/**
 * Reconcile the configured administrator with the immutable super-admin role.
 * Returns true when an existing account handled the bootstrap, otherwise false
 * so the caller can create the first administrator.
 */
async function reconcileExistingSuperAdmin({ prisma, adminEmail, adminRoleId, verifiedAt }) {
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const existingSuperAdmin = await prisma.user.findFirst({ where: { isSuperAdmin: true } });

  if (existingSuperAdmin && existingSuperAdmin.id !== existingAdmin?.id) {
    return true;
  }

  if (!existingAdmin) {
    return false;
  }

  await prisma.user.update({
    where: { id: existingAdmin.id },
    data: {
      role: 'ADMIN',
      roleId: adminRoleId,
      status: 'ACTIVE',
      isSuperAdmin: true,
      emailVerifiedAt: existingAdmin.emailVerifiedAt ?? verifiedAt,
    },
  });
  return true;
}

module.exports = { reconcileExistingSuperAdmin };
