/**
 * Subset of GitLab REST API responses the adapter relies on.
 */

export type GitLabProject = {
  id: number;
  path_with_namespace: string;
  description: string | null;
  web_url: string;
  owner?: { username: string } | null;
  namespace?: { full_path: string };
  created_at: string;
  last_activity_at: string;
  star_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  default_branch?: string | null;
  visibility?: string;
};

export type GitLabIssue = {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  web_url: string;
  state: string;
  author: { username: string } | null;
  created_at: string;
  updated_at: string;
};

export type GitLabMergeRequest = {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  web_url: string;
  state: string;
  author: { username: string } | null;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
};

export type GitLabTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};
