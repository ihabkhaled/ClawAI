import { type DomainTag, type PrivacyClass } from '../../../generated/prisma';

export type TaxonomyRoleRecord = {
  id: string;
  roleKey: string;
  displayName: string;
  industryKey: string;
  domainKey: DomainTag;
  capabilities: string[];
  privacyDefault: PrivacyClass;
  createdAt: Date;
  updatedAt: Date;
};
