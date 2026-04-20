/**
 * Subset of Bitbucket Cloud 2.0 API responses the adapter relies on.
 */

export type BitbucketRepository = {
  uuid: string;
  full_name: string;
  description: string | null;
  links: { html: { href: string } };
  owner: { username?: string; display_name?: string };
  created_on: string;
  updated_on: string;
  is_private?: boolean;
  mainbranch?: { name: string } | null;
};

export type BitbucketPullRequest = {
  id: number;
  title: string;
  description: string | null;
  state: string;
  links: { html: { href: string } };
  author: { username?: string; display_name?: string } | null;
  created_on: string;
  updated_on: string;
  destination?: { repository?: { full_name?: string } };
};

export type BitbucketTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scopes?: string;
};

export type BitbucketPaginated<T> = {
  values: T[];
  next?: string;
};
