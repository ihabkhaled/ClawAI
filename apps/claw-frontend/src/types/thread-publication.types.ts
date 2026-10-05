import type { ThreadPublicationStatus } from '@/enums/thread-publication-status.enum';

export type OwnedThreadPublication = {
  id: string;
  status: ThreadPublicationStatus;
  title: string | null;
  updatedAt: string;
};
