import type { TranslationDictionary } from '@/types/i18n.types';

import { en } from './en';

export const zh: TranslationDictionary = {
  ...en,
  common: {
    ...en.common,
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    search: '搜索',
    filter: '筛选',
    loading: '正在加载...',
    noResults: '未找到结果',
    confirm: '确认',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    close: '关闭',
    retry: '重试',
    error: '错误',
    success: '成功',
    warning: '警告',
  },
  settings: {
    ...en.settings,
    langJapanese: '日语',
    langThai: '泰语',
    langPersian: '波斯语',
    langSimplifiedChinese: '简体中文',
  },
  billing: {
    ...en.billing,
    paymentMethods: {
      ...en.billing.paymentMethods,
      setupFailed: '无法启动安全的付款方式设置。',
      add: '添加付款方式',
      adding: '正在打开…',
      consent: '继续操作将打开 Paymob。保存已验证的银行卡令牌即表示您同意存储此付款方式。',
    },
  },
};
