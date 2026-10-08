/** The publication a generation job belongs to, as far as a notification needs to know. */
export type NotificationPublicationTarget = {
  id: string;
  ownerId: string;
  slug: string;
};
