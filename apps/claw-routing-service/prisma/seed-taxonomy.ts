/* eslint-disable no-console */
import { DomainTag, PrismaClient, PrivacyClass } from '../src/generated/prisma';

const prisma = new PrismaClient();

type RoleSeed = {
  roleKey: string;
  displayName: string;
  industryKey: string;
  domainKey: DomainTag;
  capabilities?: string[];
  privacyDefault?: PrivacyClass;
};

const ROLES: RoleSeed[] = [
  // Software / Tech
  {
    roleKey: 'software-engineer',
    displayName: 'Software Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'senior-software-engineer',
    displayName: 'Senior Software Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'staff-engineer',
    displayName: 'Staff Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'principal-engineer',
    displayName: 'Principal Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'frontend-engineer',
    displayName: 'Frontend Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'backend-engineer',
    displayName: 'Backend Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'fullstack-engineer',
    displayName: 'Full-Stack Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'devops-engineer',
    displayName: 'DevOps Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'sre',
    displayName: 'Site Reliability Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'security-engineer',
    displayName: 'Security Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'data-engineer',
    displayName: 'Data Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'data-scientist',
    displayName: 'Data Scientist',
    industryKey: 'tech',
    domainKey: DomainTag.RESEARCH,
  },
  {
    roleKey: 'ml-engineer',
    displayName: 'ML Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'mlops-engineer',
    displayName: 'MLOps Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'architect',
    displayName: 'Software Architect',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'tech-lead',
    displayName: 'Tech Lead',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'engineering-manager',
    displayName: 'Engineering Manager',
    industryKey: 'tech',
    domainKey: DomainTag.BUSINESS,
  },
  { roleKey: 'cto', displayName: 'CTO', industryKey: 'tech', domainKey: DomainTag.BUSINESS },
  {
    roleKey: 'qa-engineer',
    displayName: 'QA Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  { roleKey: 'sdet', displayName: 'SDET', industryKey: 'tech', domainKey: DomainTag.CODING },
  {
    roleKey: 'mobile-engineer',
    displayName: 'Mobile Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'embedded-engineer',
    displayName: 'Embedded Engineer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'game-developer',
    displayName: 'Game Developer',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },
  {
    roleKey: 'cloud-architect',
    displayName: 'Cloud Architect',
    industryKey: 'tech',
    domainKey: DomainTag.CODING,
  },

  // Medicine / Healthcare
  {
    roleKey: 'physician',
    displayName: 'Physician',
    industryKey: 'healthcare',
    domainKey: DomainTag.MEDICAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'nurse',
    displayName: 'Nurse',
    industryKey: 'healthcare',
    domainKey: DomainTag.MEDICAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'nurse-practitioner',
    displayName: 'Nurse Practitioner',
    industryKey: 'healthcare',
    domainKey: DomainTag.MEDICAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'pharmacist',
    displayName: 'Pharmacist',
    industryKey: 'healthcare',
    domainKey: DomainTag.MEDICAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'medical-student',
    displayName: 'Medical Student',
    industryKey: 'healthcare',
    domainKey: DomainTag.MEDICAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'radiologist',
    displayName: 'Radiologist',
    industryKey: 'healthcare',
    domainKey: DomainTag.MEDICAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'surgeon',
    displayName: 'Surgeon',
    industryKey: 'healthcare',
    domainKey: DomainTag.MEDICAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'psychiatrist',
    displayName: 'Psychiatrist',
    industryKey: 'healthcare',
    domainKey: DomainTag.MENTAL_HEALTH,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'psychologist',
    displayName: 'Psychologist',
    industryKey: 'healthcare',
    domainKey: DomainTag.MENTAL_HEALTH,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'therapist',
    displayName: 'Therapist',
    industryKey: 'healthcare',
    domainKey: DomainTag.MENTAL_HEALTH,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'dentist',
    displayName: 'Dentist',
    industryKey: 'healthcare',
    domainKey: DomainTag.MEDICAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'veterinarian',
    displayName: 'Veterinarian',
    industryKey: 'healthcare',
    domainKey: DomainTag.MEDICAL,
  },
  {
    roleKey: 'medical-researcher',
    displayName: 'Medical Researcher',
    industryKey: 'healthcare',
    domainKey: DomainTag.RESEARCH,
  },

  // Law
  {
    roleKey: 'lawyer',
    displayName: 'Lawyer',
    industryKey: 'legal',
    domainKey: DomainTag.LEGAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'paralegal',
    displayName: 'Paralegal',
    industryKey: 'legal',
    domainKey: DomainTag.LEGAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'corporate-counsel',
    displayName: 'Corporate Counsel',
    industryKey: 'legal',
    domainKey: DomainTag.LEGAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'compliance-officer',
    displayName: 'Compliance Officer',
    industryKey: 'legal',
    domainKey: DomainTag.LEGAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'judge',
    displayName: 'Judge',
    industryKey: 'legal',
    domainKey: DomainTag.LEGAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'law-student',
    displayName: 'Law Student',
    industryKey: 'legal',
    domainKey: DomainTag.LEGAL,
  },
  {
    roleKey: 'ip-attorney',
    displayName: 'IP Attorney',
    industryKey: 'legal',
    domainKey: DomainTag.LEGAL,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },

  // Finance / Accounting
  {
    roleKey: 'financial-analyst',
    displayName: 'Financial Analyst',
    industryKey: 'finance',
    domainKey: DomainTag.FINANCE,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'investment-banker',
    displayName: 'Investment Banker',
    industryKey: 'finance',
    domainKey: DomainTag.FINANCE,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'accountant',
    displayName: 'Accountant',
    industryKey: 'finance',
    domainKey: DomainTag.FINANCE,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'cpa',
    displayName: 'CPA',
    industryKey: 'finance',
    domainKey: DomainTag.FINANCE,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'cfo',
    displayName: 'CFO',
    industryKey: 'finance',
    domainKey: DomainTag.FINANCE,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'controller',
    displayName: 'Controller',
    industryKey: 'finance',
    domainKey: DomainTag.FINANCE,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'treasurer',
    displayName: 'Treasurer',
    industryKey: 'finance',
    domainKey: DomainTag.FINANCE,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'tax-advisor',
    displayName: 'Tax Advisor',
    industryKey: 'finance',
    domainKey: DomainTag.FINANCE,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'auditor',
    displayName: 'Auditor',
    industryKey: 'finance',
    domainKey: DomainTag.FINANCE,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'actuary',
    displayName: 'Actuary',
    industryKey: 'finance',
    domainKey: DomainTag.FINANCE,
  },

  // Marketing / Sales
  {
    roleKey: 'marketing-manager',
    displayName: 'Marketing Manager',
    industryKey: 'marketing',
    domainKey: DomainTag.MARKETING,
  },
  { roleKey: 'cmo', displayName: 'CMO', industryKey: 'marketing', domainKey: DomainTag.MARKETING },
  {
    roleKey: 'product-marketing-manager',
    displayName: 'Product Marketing Manager',
    industryKey: 'marketing',
    domainKey: DomainTag.MARKETING,
  },
  {
    roleKey: 'growth-marketer',
    displayName: 'Growth Marketer',
    industryKey: 'marketing',
    domainKey: DomainTag.MARKETING,
  },
  {
    roleKey: 'content-marketer',
    displayName: 'Content Marketer',
    industryKey: 'marketing',
    domainKey: DomainTag.MARKETING,
  },
  {
    roleKey: 'seo-specialist',
    displayName: 'SEO Specialist',
    industryKey: 'marketing',
    domainKey: DomainTag.MARKETING,
  },
  {
    roleKey: 'social-media-manager',
    displayName: 'Social Media Manager',
    industryKey: 'marketing',
    domainKey: DomainTag.MARKETING,
  },
  {
    roleKey: 'brand-manager',
    displayName: 'Brand Manager',
    industryKey: 'marketing',
    domainKey: DomainTag.MARKETING,
  },
  {
    roleKey: 'pr-specialist',
    displayName: 'PR Specialist',
    industryKey: 'marketing',
    domainKey: DomainTag.MARKETING,
  },
  {
    roleKey: 'sales-rep',
    displayName: 'Sales Representative',
    industryKey: 'sales',
    domainKey: DomainTag.SALES,
  },
  {
    roleKey: 'account-executive',
    displayName: 'Account Executive',
    industryKey: 'sales',
    domainKey: DomainTag.SALES,
  },
  {
    roleKey: 'sales-manager',
    displayName: 'Sales Manager',
    industryKey: 'sales',
    domainKey: DomainTag.SALES,
  },
  {
    roleKey: 'sdr',
    displayName: 'Sales Development Rep',
    industryKey: 'sales',
    domainKey: DomainTag.SALES,
  },
  {
    roleKey: 'customer-success-manager',
    displayName: 'Customer Success Manager',
    industryKey: 'sales',
    domainKey: DomainTag.SALES,
  },

  // Engineering (non-software)
  {
    roleKey: 'mechanical-engineer',
    displayName: 'Mechanical Engineer',
    industryKey: 'engineering',
    domainKey: DomainTag.MECHANICAL,
  },
  {
    roleKey: 'electrical-engineer',
    displayName: 'Electrical Engineer',
    industryKey: 'engineering',
    domainKey: DomainTag.MECHANICAL,
  },
  {
    roleKey: 'civil-engineer',
    displayName: 'Civil Engineer',
    industryKey: 'engineering',
    domainKey: DomainTag.MECHANICAL,
  },
  {
    roleKey: 'aerospace-engineer',
    displayName: 'Aerospace Engineer',
    industryKey: 'engineering',
    domainKey: DomainTag.MECHANICAL,
  },
  {
    roleKey: 'chemical-engineer',
    displayName: 'Chemical Engineer',
    industryKey: 'engineering',
    domainKey: DomainTag.CHEMISTRY,
  },
  {
    roleKey: 'biomedical-engineer',
    displayName: 'Biomedical Engineer',
    industryKey: 'engineering',
    domainKey: DomainTag.BIOLOGY,
  },
  {
    roleKey: 'automotive-technician',
    displayName: 'Automotive Technician',
    industryKey: 'automotive',
    domainKey: DomainTag.AUTOMOTIVE,
  },
  {
    roleKey: 'automotive-engineer',
    displayName: 'Automotive Engineer',
    industryKey: 'automotive',
    domainKey: DomainTag.AUTOMOTIVE,
  },

  // Sciences / Research
  {
    roleKey: 'biologist',
    displayName: 'Biologist',
    industryKey: 'research',
    domainKey: DomainTag.BIOLOGY,
  },
  {
    roleKey: 'geneticist',
    displayName: 'Geneticist',
    industryKey: 'research',
    domainKey: DomainTag.BIOLOGY,
  },
  {
    roleKey: 'chemist',
    displayName: 'Chemist',
    industryKey: 'research',
    domainKey: DomainTag.CHEMISTRY,
  },
  {
    roleKey: 'physicist',
    displayName: 'Physicist',
    industryKey: 'research',
    domainKey: DomainTag.PHYSICS,
  },
  {
    roleKey: 'astronomer',
    displayName: 'Astronomer',
    industryKey: 'research',
    domainKey: DomainTag.PHYSICS,
  },
  {
    roleKey: 'researcher',
    displayName: 'Academic Researcher',
    industryKey: 'research',
    domainKey: DomainTag.RESEARCH,
  },
  {
    roleKey: 'postdoc',
    displayName: 'Postdoctoral Researcher',
    industryKey: 'research',
    domainKey: DomainTag.RESEARCH,
  },
  {
    roleKey: 'lab-technician',
    displayName: 'Lab Technician',
    industryKey: 'research',
    domainKey: DomainTag.BIOLOGY,
  },

  // Education
  {
    roleKey: 'k12-teacher',
    displayName: 'K-12 Teacher',
    industryKey: 'education',
    domainKey: DomainTag.EDUCATION,
  },
  {
    roleKey: 'professor',
    displayName: 'Professor',
    industryKey: 'education',
    domainKey: DomainTag.EDUCATION,
  },
  {
    roleKey: 'instructional-designer',
    displayName: 'Instructional Designer',
    industryKey: 'education',
    domainKey: DomainTag.EDUCATION,
  },
  {
    roleKey: 'tutor',
    displayName: 'Tutor',
    industryKey: 'education',
    domainKey: DomainTag.EDUCATION,
  },
  {
    roleKey: 'university-student',
    displayName: 'University Student',
    industryKey: 'education',
    domainKey: DomainTag.EDUCATION,
  },
  {
    roleKey: 'grad-student',
    displayName: 'Graduate Student',
    industryKey: 'education',
    domainKey: DomainTag.RESEARCH,
  },

  // Creative / Writing
  {
    roleKey: 'novelist',
    displayName: 'Novelist',
    industryKey: 'creative',
    domainKey: DomainTag.CREATIVE_WRITING,
  },
  {
    roleKey: 'screenwriter',
    displayName: 'Screenwriter',
    industryKey: 'creative',
    domainKey: DomainTag.CREATIVE_WRITING,
  },
  {
    roleKey: 'copywriter',
    displayName: 'Copywriter',
    industryKey: 'creative',
    domainKey: DomainTag.MARKETING,
  },
  {
    roleKey: 'journalist',
    displayName: 'Journalist',
    industryKey: 'creative',
    domainKey: DomainTag.LITERATURE,
  },
  {
    roleKey: 'editor',
    displayName: 'Editor',
    industryKey: 'creative',
    domainKey: DomainTag.LITERATURE,
  },
  {
    roleKey: 'translator',
    displayName: 'Translator',
    industryKey: 'creative',
    domainKey: DomainTag.TRANSLATION,
  },
  {
    roleKey: 'illustrator',
    displayName: 'Illustrator',
    industryKey: 'creative',
    domainKey: DomainTag.MULTIMEDIA,
  },
  {
    roleKey: 'photographer',
    displayName: 'Photographer',
    industryKey: 'creative',
    domainKey: DomainTag.MULTIMEDIA,
  },
  {
    roleKey: 'video-editor',
    displayName: 'Video Editor',
    industryKey: 'creative',
    domainKey: DomainTag.MULTIMEDIA,
  },
  {
    roleKey: 'graphic-designer',
    displayName: 'Graphic Designer',
    industryKey: 'creative',
    domainKey: DomainTag.MULTIMEDIA,
  },
  {
    roleKey: 'ux-designer',
    displayName: 'UX Designer',
    industryKey: 'tech',
    domainKey: DomainTag.MULTIMEDIA,
  },
  {
    roleKey: 'ui-designer',
    displayName: 'UI Designer',
    industryKey: 'tech',
    domainKey: DomainTag.MULTIMEDIA,
  },

  // Business / Operations
  { roleKey: 'ceo', displayName: 'CEO', industryKey: 'business', domainKey: DomainTag.BUSINESS },
  { roleKey: 'coo', displayName: 'COO', industryKey: 'business', domainKey: DomainTag.BUSINESS },
  {
    roleKey: 'product-manager',
    displayName: 'Product Manager',
    industryKey: 'business',
    domainKey: DomainTag.BUSINESS,
  },
  {
    roleKey: 'project-manager',
    displayName: 'Project Manager',
    industryKey: 'business',
    domainKey: DomainTag.BUSINESS,
  },
  {
    roleKey: 'program-manager',
    displayName: 'Program Manager',
    industryKey: 'business',
    domainKey: DomainTag.BUSINESS,
  },
  {
    roleKey: 'business-analyst',
    displayName: 'Business Analyst',
    industryKey: 'business',
    domainKey: DomainTag.BUSINESS,
  },
  {
    roleKey: 'management-consultant',
    displayName: 'Management Consultant',
    industryKey: 'business',
    domainKey: DomainTag.BUSINESS,
  },
  {
    roleKey: 'operations-manager',
    displayName: 'Operations Manager',
    industryKey: 'business',
    domainKey: DomainTag.BUSINESS,
  },
  {
    roleKey: 'startup-founder',
    displayName: 'Startup Founder',
    industryKey: 'business',
    domainKey: DomainTag.BUSINESS,
  },
  {
    roleKey: 'venture-capitalist',
    displayName: 'Venture Capitalist',
    industryKey: 'finance',
    domainKey: DomainTag.BUSINESS,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },

  // HR / People
  {
    roleKey: 'hr-manager',
    displayName: 'HR Manager',
    industryKey: 'hr',
    domainKey: DomainTag.HR,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  { roleKey: 'recruiter', displayName: 'Recruiter', industryKey: 'hr', domainKey: DomainTag.HR },
  {
    roleKey: 'chro',
    displayName: 'CHRO',
    industryKey: 'hr',
    domainKey: DomainTag.HR,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
  {
    roleKey: 'talent-acquisition-specialist',
    displayName: 'Talent Acquisition Specialist',
    industryKey: 'hr',
    domainKey: DomainTag.HR,
  },
  {
    roleKey: 'people-ops-manager',
    displayName: 'People Ops Manager',
    industryKey: 'hr',
    domainKey: DomainTag.HR,
    privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  },
];

async function main(): Promise<void> {
  console.log(`Seeding ${ROLES.length} taxonomy roles...`);
  for (const role of ROLES) {
    await prisma.taxonomyRole.upsert({
      where: { roleKey: role.roleKey },
      create: {
        roleKey: role.roleKey,
        displayName: role.displayName,
        industryKey: role.industryKey,
        domainKey: role.domainKey,
        capabilities: role.capabilities ?? [],
        privacyDefault: role.privacyDefault ?? PrivacyClass.CLOUD_PERMITTED,
      },
      update: {
        displayName: role.displayName,
        industryKey: role.industryKey,
        domainKey: role.domainKey,
      },
    });
  }
  const count = await prisma.taxonomyRole.count();
  console.log(`Seed complete. Taxonomy contains ${count} roles.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
