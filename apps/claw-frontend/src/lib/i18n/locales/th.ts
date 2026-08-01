import type { TranslationDictionary } from '@/types/i18n.types';

import { en } from './en';

export const th: TranslationDictionary = {
  ...en,
  userPlan: {
    ...en.userPlan,
    planLimits: 'ขีดจำกัดแพ็กเกจ',
    dailyLimitLabel: 'โทเค็นต่อวัน',
    weeklyLimitLabel: 'โทเค็นต่อสัปดาห์',
    monthlyLimitLabel: 'โทเค็นต่อเดือน',
    chatsLimitLabel: 'แชตต่อวัน',
  },
  userUsage: {
    ...en.userUsage,
    adminBypass: 'สิทธิ์ผู้ดูแลระบบ',
    adminBypassHint:
      'บทบาทผู้ดูแลระบบข้ามการบังคับใช้ขีดจำกัด โดยขีดจำกัดแพ็กเกจด้านบนไม่เปลี่ยนแปลง',
  },
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
  chat: {
    ...en.chat,
    errors: {
      videoAttachmentProviderUnsupported:
        'โมเดลนี้ไม่สามารถประมวลผลไฟล์วิดีโอแนบได้ โปรดเลือก Gemini 2.5 Flash หรือ Pro หรือเปลี่ยนเป็นอัตโนมัติ',
      videoAttachmentLocalModelUnavailable:
        'ไฟล์วิดีโอแนบไม่พร้อมใช้งานในโหมดเฉพาะภายในเครื่องหรือเน้นความเป็นส่วนตัว เนื่องจากยังไม่ได้กำหนดค่าโมเดลภายในเครื่องที่รองรับวิดีโอ',
    },
  },
  settings: {
    ...en.settings,
    langJapanese: 'ภาษาญี่ปุ่น',
    langThai: 'ภาษาไทย',
    langPersian: 'ภาษาเปอร์เซีย',
    langSimplifiedChinese: 'ภาษาจีนตัวย่อ',
  },
  vscodeAuthorization: {
    title: 'อนุญาต ClawAI สำหรับ VS Code',
    description: 'อนุญาตให้เอเจนต์เขียนโค้ดใช้บัญชี ClawAI ของคุณใน VS Code',
    requestFor: 'คำขออนุญาตจาก {client}',
    approve: 'อนุญาต VS Code',
    approving: 'กำลังอนุญาต...',
    successTitle: 'อนุญาต VS Code แล้ว',
    successDescription: 'กลับไปที่ VS Code คุณสามารถปิดแท็บนี้ได้แล้ว',
    errorTitle: 'ไม่สามารถดำเนินการอนุญาตให้เสร็จสิ้น',
  },
  nav: {
    ...en.nav,
    adminRefunds: 'การคืนเงิน',
  },
  adminRefunds: {
    title: 'การคืนเงิน',
    description: 'ตรวจสอบการชำระเงินที่รับแล้วและคืนเงินโดยไม่เกินยอดคงเหลือ',
    loading: 'กำลังโหลดรายการที่คืนเงินได้...',
    error: 'โหลดรายการที่คืนเงินได้ไม่สำเร็จ',
    empty: 'ไม่มีการชำระเงินที่รับแล้วและมียอดคงเหลือให้คืน',
    user: 'ลูกค้า',
    captured: 'ยอดที่รับ',
    remaining: 'คืนได้',
    remainingBalance: 'ยอดคงเหลือที่คืนได้',
    capturedOn: 'วันที่รับเงิน',
    refundAction: 'ออกเงินคืน',
    refunding: 'กำลังคืนเงิน...',
    dialogTitle: 'ออกเงินคืน',
    dialogDescription:
      'ป้อนจำนวนเงินในสกุลเงินของการชำระเงิน การดำเนินการนี้จะถูกบันทึกในบัญชีเรียกเก็บเงิน',
    amount: 'จำนวนเงิน',
    maximum: 'สูงสุด',
    reason: 'เหตุผล',
    confirm: 'ออกเงินคืน',
    invalidAmount: 'ป้อนจำนวนเงินที่ถูกต้องภายในยอดคงเหลือพร้อมเหตุผล',
    success: 'ส่งคำขอคืนเงินแล้ว',
    failed: 'ไม่สามารถออกเงินคืนได้',
  },
  billing: {
    ...en.billing,
    actions: {
      ...en.billing.actions,
      remove: 'ลบการสมัครสมาชิก',
      removing: 'กำลังลบ…',
    },
    remove: {
      title: 'ลบการสมัครสมาชิกตอนนี้หรือไม่',
      description:
        'สิทธิ์การใช้งานแบบชำระเงินจะสิ้นสุดทันที และไม่สามารถย้อนกลับได้ ใบแจ้งหนี้และประวัติการชำระเงินของคุณจะยังคงพร้อมใช้งาน',
      confirm: 'ลบการสมัครสมาชิก',
      done: 'การสมัครสมาชิกของคุณสิ้นสุดแล้ว',
      failed: 'ไม่สามารถลบการสมัครสมาชิกของคุณได้',
    },
    errors: {
      PLAN_NOT_PURCHASABLE: 'แพ็กเกจนี้ไม่พร้อมให้ซื้อ',
      PAYMENT_NOT_VERIFIED: 'ไม่สามารถยืนยันการชำระเงินได้ และยังไม่มีการเรียกเก็บเงินจากคุณ',
      PAYMENT_METHOD_UNAVAILABLE:
        'วิธีชำระเงินนี้ไม่พร้อมใช้งานในขณะนี้ โปรดเลือกวิธีอื่นหรือลองอีกครั้งภายหลัง',
      SUBSCRIPTION_NOT_FOUND: 'คุณไม่มีการสมัครสมาชิกที่ใช้งานอยู่',
    },
    invoices: {
      ...en.billing.invoices,
      download: 'ดาวน์โหลด',
      downloading: 'กำลังดาวน์โหลด…',
      downloadError: 'ไม่สามารถดาวน์โหลดใบแจ้งหนี้นี้ได้',
    },
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
