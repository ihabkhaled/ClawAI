/**
 * Shape of the GitHub REST API responses the adapter relies on.
 * Narrow subset — only the fields we read.
 */

export type GitHubRepo = {
  id: number;
  full_name: string;
  description: string | null;
  html_url: string;
  owner: { login: string };
  created_at: string;
  updated_at: string;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  default_branch?: string;
  visibility?: string;
};

export type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  user: { login: string } | null;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
};

export type GitHubPull = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  user: { login: string } | null;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
};
