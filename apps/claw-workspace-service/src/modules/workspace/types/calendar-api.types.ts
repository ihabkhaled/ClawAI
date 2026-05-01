// Stream 23 — calendar-API response shapes (subset of fields we consume).

export type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
  organizer?: { email?: string; displayName?: string };
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ uri?: string; entryPointType?: string }>;
  };
  created?: string;
  updated?: string;
};

export type GoogleCalendarEventList = {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

export type OutlookCalendarEvent = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: 'html' | 'text'; content?: string };
  webLink?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  attendees?: Array<{
    emailAddress?: { address?: string; name?: string };
    type?: string;
    status?: { response?: string };
  }>;
  organizer?: { emailAddress?: { address?: string; name?: string } };
  onlineMeeting?: { joinUrl?: string };
  isCancelled?: boolean;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
};

export type OutlookCalendarEventList = {
  value: OutlookCalendarEvent[];
  '@odata.nextLink'?: string;
};
