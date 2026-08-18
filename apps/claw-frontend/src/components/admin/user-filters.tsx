import type { ReactElement } from 'react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserFiltersProps } from '@/types';

export function UserFilters({
  t,
  plans,
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  planFilter,
  setPlanFilter,
  verificationFilter,
  setVerificationFilter,
}: UserFiltersProps): ReactElement {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      <Input
        aria-label={t('common.search')}
        placeholder={t('common.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select
        value={roleFilter || 'all'}
        onValueChange={(v) => setRoleFilter(v === 'all' ? '' : v)}
      >
        <SelectTrigger aria-label={t('admin.colRole')}>
          <SelectValue placeholder={t('admin.colRole')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.colRole')}</SelectItem>
          <SelectItem value="ADMIN">{t('admin.roleAdmin')}</SelectItem>
          <SelectItem value="OPERATOR">{t('admin.roleOperator')}</SelectItem>
          <SelectItem value="VIEWER">{t('admin.roleViewer')}</SelectItem>
          <SelectItem value="USER">USER</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={statusFilter || 'all'}
        onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
      >
        <SelectTrigger aria-label={t('admin.colStatus')}>
          <SelectValue placeholder={t('admin.colStatus')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.colStatus')}</SelectItem>
          <SelectItem value="ACTIVE">ACTIVE</SelectItem>
          <SelectItem value="PENDING">PENDING</SelectItem>
          <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={planFilter || 'all'}
        onValueChange={(v) => setPlanFilter(v === 'all' ? '' : v)}
      >
        <SelectTrigger aria-label={t('admin.planColumn')}>
          <SelectValue placeholder={t('admin.planColumn')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.planColumn')}</SelectItem>
          {plans.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={verificationFilter || 'all'}
        onValueChange={(v) => setVerificationFilter(v === 'all' ? '' : v)}
      >
        <SelectTrigger aria-label={t('admin.colEmail')}>
          <SelectValue placeholder={t('admin.colEmail')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.colEmail')}</SelectItem>
          <SelectItem value="VERIFIED">VERIFIED</SelectItem>
          <SelectItem value="UNVERIFIED">UNVERIFIED</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
