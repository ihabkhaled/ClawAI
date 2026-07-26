import type { TranslationDictionary } from '@/types/i18n.types';

import { en } from './en';

export const fa: TranslationDictionary = {
  ...en,
  common: {
    ...en.common,
    save: 'ذخیره',
    cancel: 'لغو',
    delete: 'حذف',
    edit: 'ویرایش',
    create: 'ایجاد',
    search: 'جست‌وجو',
    filter: 'فیلتر',
    loading: 'در حال بارگذاری...',
    noResults: 'نتیجه‌ای یافت نشد',
    confirm: 'تأیید',
    back: 'بازگشت',
    next: 'بعدی',
    previous: 'قبلی',
    close: 'بستن',
    retry: 'تلاش دوباره',
    error: 'خطا',
    success: 'موفق',
    warning: 'هشدار',
  },
  settings: {
    ...en.settings,
    langJapanese: 'ژاپنی',
    langThai: 'تایلندی',
    langPersian: 'فارسی',
    langSimplifiedChinese: 'چینی ساده‌شده',
  },
};
