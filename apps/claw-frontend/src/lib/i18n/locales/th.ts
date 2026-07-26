import type { TranslationDictionary } from '@/types/i18n.types';

import { en } from './en';

export const th: TranslationDictionary = {
  ...en,
  common: {
    ...en.common,
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    delete: 'ลบ',
    edit: 'แก้ไข',
    create: 'สร้าง',
    search: 'ค้นหา',
    filter: 'ตัวกรอง',
    loading: 'กำลังโหลด...',
    noResults: 'ไม่พบผลลัพธ์',
    confirm: 'ยืนยัน',
    back: 'ย้อนกลับ',
    next: 'ถัดไป',
    previous: 'ก่อนหน้า',
    close: 'ปิด',
    retry: 'ลองอีกครั้ง',
    error: 'ข้อผิดพลาด',
    success: 'สำเร็จ',
    warning: 'คำเตือน',
  },
  settings: {
    ...en.settings,
    langJapanese: 'ภาษาญี่ปุ่น',
    langThai: 'ภาษาไทย',
    langPersian: 'ภาษาเปอร์เซีย',
    langSimplifiedChinese: 'ภาษาจีนตัวย่อ',
  },
  billing: {
    ...en.billing,
    paymentMethods: {
      ...en.billing.paymentMethods,
      setupFailed: 'ไม่สามารถเริ่มตั้งค่าวิธีชำระเงินอย่างปลอดภัยได้',
      add: 'เพิ่มวิธีชำระเงิน',
      adding: 'กำลังเปิด…',
      consent:
        'เมื่อดำเนินการต่อ Paymob จะเปิดขึ้น การบันทึกโทเค็นบัตรที่ตรวจสอบแล้วถือว่าคุณยินยอมให้จัดเก็บวิธีชำระเงินนี้',
    },
  },
};
