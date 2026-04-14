import { useAgentRepos } from './use-agent-repos';

export function useAgentReposPage() {
  const { data, isLoading, isError, error } = useAgentRepos({ page: 1, pageSize: 50 });

  const repos = data?.data ?? [];
  const total = data?.total ?? 0;

  return {
    repos,
    total,
    isLoading,
    isError,
    error,
  };
}
