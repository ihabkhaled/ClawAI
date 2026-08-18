import { useState } from 'react';

import type { UseAdminUserFiltersReturn } from '@/types';

export function useAdminUserFilters(): UseAdminUserFiltersReturn {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const updateRole = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };
  const updateStatus = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };
  const updatePlan = (value: string) => {
    setPlanFilter(value);
    setPage(1);
  };
  const updateVerification = (value: string) => {
    setVerificationFilter(value);
    setPage(1);
  };

  return {
    page,
    setPage,
    search,
    setSearch: updateSearch,
    roleFilter,
    setRoleFilter: updateRole,
    statusFilter,
    setStatusFilter: updateStatus,
    planFilter,
    setPlanFilter: updatePlan,
    verificationFilter,
    setVerificationFilter: updateVerification,
  };
}
