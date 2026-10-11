import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const TH_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: 'ดูในแอป',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: 'แชตใน ClawAI ที่มีคำถาม คำตอบที่เขียนไว้ ป้ายบอกชื่อโมเดลที่ตอบ และรายละเอียดการจัดเส้นทางใต้คำตอบ',
      caption: 'ทุกคำตอบบอกว่าโมเดลใดเขียนและเพราะเหตุใด',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: 'ช่องพิมพ์ข้อความของ ClawAI ที่เปิดตัวเลือกโมเดลไว้ แสดงรายการโมเดลที่เลือกได้',
      caption: 'เลือกโมเดลเอง หรือปล่อยให้ AUTO เลือกให้',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: 'ช่องพิมพ์ข้อความที่เปิดการค้นคว้าบนเว็บ และมีตัวเลือกผู้ให้บริการค้นหาแสดงอยู่',
      caption: 'เปิดการค้นคว้าบนเว็บและเลือกวิธีค้นหา',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: 'ช่องพิมพ์ข้อความที่เปิดเมนูบริบทไว้ แสดงหน่วยความจำและชุดบริบทของคุณ',
      caption: 'นำหน่วยความจำและชุดบริบทของคุณเข้าสู่แชตใดก็ได้',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: 'กล่องโต้ตอบ “แชร์แชตนี้” ที่เปิดอยู่เหนือบทสนทนา พร้อมตัวเลือกวิธีแชร์',
      caption: 'แชร์แชตด้วยลิงก์ ตามเงื่อนไขของคุณ',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: 'หน้าเปรียบเทียบที่เลือกสามโมเดลไว้และพิมพ์พรอมต์ไว้พร้อมส่ง',
      caption: 'ถามหนึ่งคำถาม แล้วดูสามโมเดลตอบเคียงข้างกัน',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: 'หน้าฉันทามติ ที่หลายโมเดลตอบคำถามเดียวกันแล้วค่อย ๆ ไปสู่ผลลัพธ์ร่วมกัน',
      caption: 'ให้หลายโมเดลตอบ แล้วได้คำตอบเดียวที่ตกลงร่วมกัน',
    },
    [MarketingSceneId.FILES]: {
      alt: 'หน้าไฟล์ที่แสดงไฟล์ที่คุณอัปโหลดและไฟล์ที่ ClawAI สร้างให้คุณ',
      caption: 'ไฟล์ที่อัปโหลดและไฟล์ที่สร้างขึ้น อยู่ในที่เดียว',
    },
    [MarketingSceneId.MEMORY]: {
      alt: 'หน้าหน่วยความจำที่แสดงสิ่งที่ ClawAI จดจำเกี่ยวกับคุณ ซึ่งคุณตรวจดูและแก้ไขได้',
      caption: 'ดูและควบคุมสิ่งที่ ClawAI จดจำ',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: 'หน้าบริบทที่แสดงชุดบริบทที่ใช้ซ้ำได้ ซึ่งแนบกับแชตได้',
      caption: 'ชุดบริบทที่ใช้ซ้ำได้ สำหรับงานที่ทำเป็นประจำ',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: 'หน้าตัวเชื่อมต่อที่แสดงบริการที่คุณเชื่อมกับพื้นที่ทำงานได้',
      caption: 'เชื่อมต่อเครื่องมือของคุณเพื่อให้ AI ทำงานกับมันได้',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: 'หน้าการเรียกเก็บเงินที่แสดงแพ็กเกจที่มีและแพ็กเกจปัจจุบัน',
      caption: 'แพ็กเกจชัดเจน และคุณเห็นเสมอว่าใช้แพ็กเกจใดอยู่',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: 'หน้าแพ็กเกจที่แสดงสิ่งที่แพ็กเกจของคุณรวมอยู่และคุณใช้ไปแล้วเท่าใด',
      caption: 'ดูให้ชัดว่าแพ็กเกจของคุณมีอะไรบ้าง',
    },
    [MarketingSceneId.USAGE]: {
      alt: 'หน้าการใช้งานพร้อมกราฟแสดงจำนวนโทเค็นที่คุณใช้ตามช่วงเวลา',
      caption: 'ติดตามการใช้งานของคุณแบบทันที',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: 'หน้าการตั้งค่าที่เลื่อนลงมาถึงการ์ดการแจ้งเตือนพร้อมสวิตช์ต่าง ๆ',
      caption: 'เลือกการแจ้งเตือนที่คุณต้องการรับ',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'หน้า Threads ที่แสดงรายการ Thread ของคุณพร้อมสถานะของแต่ละรายการ',
      caption: 'Thread ทั้งหมดของคุณ และแต่ละอันอยู่ที่ขั้นไหน',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: 'ฉบับร่างของ Thread ที่เปิดในหน้าตรวจทาน ก่อนเผยแพร่',
      caption: 'ตรวจทานฉบับร่างก่อนที่อะไรจะเผยแพร่สู่สาธารณะ',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: 'แผงการแจ้งเตือนที่เปิดจากไอคอนระฆัง พร้อมการแจ้งเตือนล่าสุดไม่กี่รายการ',
      caption: 'รู้ทันทีที่มีบางอย่างพร้อม',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: 'การ์ดทัวร์ผลิตภัณฑ์แบบสั้นที่เปิดบนหน้าแชต ชี้ไปที่ฟีเจอร์หนึ่ง',
      caption: 'ทัวร์สั้น ๆ พาคุณรู้จักแอป',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: 'แดชบอร์ดของ ClawAI ที่แสดงภาพรวมกิจกรรมและการใช้งานล่าสุดของคุณ',
      caption: 'พื้นที่ทำงานของคุณในพริบตาเดียว',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: 'มุมมอง Observability สำหรับผู้ดูแลระบบ แท็บการใช้ทรัพยากร พร้อมกราฟแสดงปริมาณการใช้โมเดล',
      caption: 'ผู้ดูแลระบบดูการใช้ทรัพยากรได้ในรูปกราฟ',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: 'บทสนทนาแชตของ ClawAI บนหน้าจอโทรศัพท์',
      caption: 'แชตเดิม บนโทรศัพท์ของคุณ',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: 'แดชบอร์ดของ ClawAI บนหน้าจอโทรศัพท์',
      caption: 'แดชบอร์ดของคุณพอดีกับหน้าจอเล็กด้วย',
    },
  },
};
