import type {
  NotificationItem,
  NotificationPreferences,
  NotificationPreferencesPatch,
  NotificationRowText,
} from '@/types/notifications.types';

export type UseNotificationBellReturn = {
  unreadCount: number;
  items: NotificationItem[];
  isOpen: boolean;
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  setOpen: (open: boolean) => void;
  select: (item: NotificationItem) => void;
  markAllRead: () => void;
  loadMore: () => void;
  retry: () => void;
  rowText: (item: NotificationItem) => NotificationRowText;
};

export type UseNotificationPreferencesReturn = {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  save: (patch: NotificationPreferencesPatch) => void;
};

export type UsePushNotificationsReturn = {
  /** True when this browser and this deployment can do push; the switch is hidden otherwise. */
  isAvailable: boolean;
  isSubscribed: boolean;
  isBlocked: boolean;
  isBusy: boolean;
  toggle: (enabled: boolean) => void;
};

export type NotificationRowProps = {
  item: NotificationItem;
  text: NotificationRowText;
  onSelect: (item: NotificationItem) => void;
};
