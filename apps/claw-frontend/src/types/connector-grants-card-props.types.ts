// v3 round 8 — connector grants card component props.

export type ConnectorGrantsCardProps = {
  connectorId: string;
  // Frontend t() is loose-typed against the dictionary, so we accept the
  // resolved label strings as props (same pattern as the other workspace
  // detail cards).
  labels: {
    title: string;
    description: string;
    loading: string;
    error: string;
    empty: string;
    granteeUserIdLabel: string;
    granteeUserIdPlaceholder: string;
    accessLevelLabel: string;
    grant: string;
    granting: string;
    revoke: string;
    revoking: string;
    grantedBy: string;
    levelReadOnly: string;
    levelAiActions: string;
    levelFull: string;
  };
};
