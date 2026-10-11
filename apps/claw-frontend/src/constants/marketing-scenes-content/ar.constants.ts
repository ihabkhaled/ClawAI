import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const AR_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: 'شاهده داخل التطبيق',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: 'محادثة في ClawAI تتضمن سؤالاً والإجابة المكتوبة وشارة تحدد النموذج الذي أجاب وتفاصيل التوجيه أسفل الرد.',
      caption: 'كل إجابة توضح أي نموذج كتبها ولماذا.',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: 'مربع الرسالة في ClawAI مع قائمة اختيار النموذج مفتوحة وتعرض النماذج التي يمكنك الاختيار منها.',
      caption: 'اختر النموذج بنفسك، أو دع AUTO يختار.',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: 'مربع الرسالة مع تفعيل البحث على الويب وظهور أداة اختيار مزوّد البحث.',
      caption: 'فعّل البحث على الويب واختر طريقة البحث.',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: 'مربع الرسالة مع قائمة السياق مفتوحة وتعرض ذاكرتك وحزم السياق الخاصة بك.',
      caption: 'أدخل ذاكرتك وحزم السياق في أي محادثة.',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: 'نافذة «مشاركة هذه المحادثة» مفتوحة فوق محادثة، مع خيارات طريقة المشاركة.',
      caption: 'شارك المحادثة برابط وبالشروط التي تحددها.',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: 'صفحة المقارنة وقد حُدّدت فيها ثلاثة نماذج وكُتب سؤال جاهز للإرسال.',
      caption: 'اطرح سؤالاً واحداً وشاهد ثلاثة نماذج تجيب جنباً إلى جنب.',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: 'صفحة الإجماع، حيث تجيب عدة نماذج عن السؤال نفسه وتتجه نحو نتيجة واحدة متفق عليها.',
      caption: 'دع عدة نماذج تجيب، ثم احصل على إجابة واحدة متفق عليها.',
    },
    [MarketingSceneId.FILES]: {
      alt: 'صفحة الملفات وتعرض الملفات التي رفعتها والملفات التي أنشأها ClawAI لك.',
      caption: 'ملفاتك المرفوعة والمُنشأة في مكان واحد.',
    },
    [MarketingSceneId.MEMORY]: {
      alt: 'صفحة الذاكرة وتعرض ما يتذكره ClawAI عنك، ويمكنك مراجعته وتعديله.',
      caption: 'اطّلع على ما يتذكره ClawAI وتحكّم فيه.',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: 'صفحة السياق وتعرض حزم سياق قابلة لإعادة الاستخدام يمكنك إرفاقها بالمحادثات.',
      caption: 'حزم سياق قابلة لإعادة الاستخدام للأعمال التي تكررها.',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: 'صفحة الموصّلات وتعرض الخدمات التي يمكنك ربطها بمساحة عملك.',
      caption: 'اربط أدواتك ليتمكن الذكاء الاصطناعي من العمل معها.',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: 'صفحة الفوترة وتعرض الباقات المتاحة والباقة الحالية.',
      caption: 'باقات واضحة، وتعرف دائماً أي باقة تستخدم.',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: 'صفحة الباقة وتعرض ما تتضمنه باقتك وكم استهلكت منه.',
      caption: 'اعرف بالضبط ما تتضمنه باقتك.',
    },
    [MarketingSceneId.USAGE]: {
      alt: 'صفحة الاستخدام مع مخططات توضح عدد الرموز التي استهلكتها عبر الزمن.',
      caption: 'تابع استخدامك لحظة بلحظة.',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: 'صفحة الإعدادات بعد التمرير إلى بطاقة الإشعارات مع مفاتيح التحكم فيها.',
      caption: 'اختر الإشعارات التي تريد استلامها.',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'صفحة Threads وتعرض قائمة الـ Threads الخاصة بك مع حالة كل واحد منها.',
      caption: 'كل الـ Threads الخاصة بك، وأين وصل كل منها.',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: 'مسودة Thread مفتوحة في صفحة المراجعة قبل نشرها.',
      caption: 'راجع المسودة قبل أن يُنشر أي شيء للعامة.',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: 'لوحة الإشعارات مفتوحة من أيقونة الجرس مع عدد من الإشعارات الأخيرة.',
      caption: 'اعرف في اللحظة التي يصبح فيها شيء جاهزاً.',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: 'بطاقة جولة قصيرة في المنتج مفتوحة على صفحة المحادثة وتشير إلى إحدى الميزات.',
      caption: 'جولة قصيرة تعرّفك على التطبيق.',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: 'لوحة معلومات ClawAI مع نظرة عامة على نشاطك واستخدامك الأخير.',
      caption: 'مساحة عملك في نظرة واحدة.',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: 'عرض المراقبة الخاص بالمسؤول في تبويب الاستهلاك، مع مخططات توضح مقدار استخدام النماذج.',
      caption: 'يرى المسؤولون الاستهلاك في مخططات.',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: 'محادثة في ClawAI على شاشة هاتف.',
      caption: 'المحادثة نفسها على هاتفك.',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: 'لوحة معلومات ClawAI على شاشة هاتف.',
      caption: 'لوحة المعلومات تناسب الشاشات الصغيرة أيضاً.',
    },
  },
};
