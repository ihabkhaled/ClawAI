export type FigmaTeamProject = {
  id: string;
  name: string;
};

export type FigmaProjectsResponse = {
  name: string;
  projects: FigmaTeamProject[];
};

export type FigmaFile = {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
};

export type FigmaProjectFilesResponse = {
  name: string;
  files: FigmaFile[];
};

export type FigmaFileDetailsResponse = {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document?: { id?: string };
  role?: string;
};

export type FigmaTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: string;
};

export type FigmaTeamResolutionMode = {
  teamId: string;
};
