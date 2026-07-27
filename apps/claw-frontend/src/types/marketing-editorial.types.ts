import type { ReactNode } from 'react';

export type EditorialPageShellProps = {
  eyebrow?: string;
  title: string;
  summary: string;
  sectionNavigation?: ReactNode;
  children: ReactNode;
};

export type EditorialSectionNavItem = {
  id: string;
  label: string;
};

export type EditorialSectionNavProps = {
  label: string;
  items: ReadonlyArray<EditorialSectionNavItem>;
};

export type EvidenceSource = {
  href: string;
  label: string;
};

export type EvidenceNoteProps = {
  label: string;
  source?: EvidenceSource;
  children: ReactNode;
};

export type RoutingRailStage = {
  label: string;
  description: string;
};

export type RoutingRailProps = {
  title: string;
  summary: string;
  textAlternative: string;
  evaluation: RoutingRailStage;
  routing: RoutingRailStage;
  comparison: RoutingRailStage;
  receipt: RoutingRailStage;
};
