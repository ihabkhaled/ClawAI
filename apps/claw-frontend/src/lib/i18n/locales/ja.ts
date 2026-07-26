import type { TranslationDictionary } from '@/types/i18n.types';

import { en } from './en';

export const ja: TranslationDictionary = {
  ...en,
  common: {
    ...en.common,
    save: '保存',
    cancel: 'キャンセル',
    delete: '削除',
    edit: '編集',
    create: '作成',
    search: '検索',
    filter: '絞り込み',
    loading: '読み込み中...',
    noResults: '結果が見つかりません',
    confirm: '確認',
    back: '戻る',
    next: '次へ',
    previous: '前へ',
    close: '閉じる',
    retry: '再試行',
    error: 'エラー',
    success: '完了',
    warning: '警告',
  },
  settings: {
    ...en.settings,
    langJapanese: '日本語',
    langThai: 'タイ語',
    langPersian: 'ペルシア語',
    langSimplifiedChinese: '簡体字中国語',
  },
  billing: {
    ...en.billing,
    paymentMethods: {
      ...en.billing.paymentMethods,
      setupFailed: '安全な支払い方法の設定を開始できませんでした。',
      add: '支払い方法を追加',
      adding: '開いています…',
      consent:
        '続行するとPaymobが開きます。検証済みカードトークンを保存することで、この支払い方法の保存に同意したものとみなされます。',
    },
  },
};
