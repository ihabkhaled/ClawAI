'use client';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { LANGUAGE_OPTIONS, APPEARANCE_OPTIONS, APPEARANCE_ICONS } from '@/constants';
import { ComponentSize } from '@/enums';
import type { UserLanguagePreference } from '@/enums';
import { useSettingsPage } from '@/hooks/settings/use-settings-page';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const {
    user,
    isLoading,
    isPending,
    currentLanguage,
    currentAppearance,
    handleLanguageChange,
    handleAppearanceChange,
  } = useSettingsPage();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Settings" description="Manage your account and platform preferences" />
        <LoadingSpinner size={ComponentSize.LG} label="Loading settings..." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and platform preferences" />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="settings-username" className="text-sm font-medium">
                Username
              </label>
              <Input id="settings-username" defaultValue={user?.username ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-email" className="text-sm font-medium">
                Email
              </label>
              <Input id="settings-email" defaultValue={user?.email ?? ''} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact an administrator.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-role" className="text-sm font-medium">
                Role
              </label>
              <Input id="settings-role" defaultValue={user?.role ?? ''} disabled />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Language</CardTitle>
            <CardDescription>Choose your preferred language</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={currentLanguage}
              onValueChange={(value: string) =>
                handleLanguageChange(value as UserLanguagePreference)
              }
              disabled={isPending}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.nativeLabel} ({option.label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Appearance</CardTitle>
            <CardDescription>Choose your preferred theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {APPEARANCE_OPTIONS.map((option) => {
                const IconComponent =
                  APPEARANCE_ICONS[option.icon as keyof typeof APPEARANCE_ICONS];
                const isActive = currentAppearance === option.value;

                return (
                  <Button
                    key={option.value}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleAppearanceChange(option.value)}
                    className={cn('gap-2', isActive && 'pointer-events-none')}
                  >
                    {IconComponent ? <IconComponent className="h-4 w-4" /> : null}
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
