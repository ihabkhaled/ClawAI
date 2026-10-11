import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const FA_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: 'آن را در برنامه ببینید',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: 'گفتگویی در ClawAI شامل یک پرسش، پاسخ نوشته‌شده، نشانی با نام مدلی که پاسخ داده و جزئیات مسیریابی زیر پاسخ.',
      caption: 'هر پاسخ نشان می‌دهد کدام مدل آن را نوشته و چرا.',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: 'کادر پیام ClawAI با انتخابگر مدل باز که مدل‌های قابل انتخاب را فهرست می‌کند.',
      caption: 'مدل را خودتان انتخاب کنید یا بگذارید AUTO انتخاب کند.',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: 'کادر پیام با پژوهش وب روشن و انتخابگر ارائه‌دهنده جست‌وجو در حال نمایش.',
      caption: 'پژوهش وب را روشن کنید و شیوه جست‌وجو را برگزینید.',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: 'کادر پیام با منوی زمینه باز که حافظه و بسته‌های زمینه شما را پیشنهاد می‌دهد.',
      caption: 'حافظه و بسته‌های زمینه خود را به هر گفتگو بیاورید.',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: 'پنجره «اشتراک‌گذاری این گفتگو» روی یک گفتگو، با گزینه‌های نحوه اشتراک‌گذاری.',
      caption: 'گفتگو را با پیوند و با شرایط خودتان به اشتراک بگذارید.',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: 'صفحه مقایسه با سه مدل انتخاب‌شده و یک پرسش تایپ‌شده که آماده ارسال است.',
      caption: 'یک پرسش بپرسید و پاسخ سه مدل را کنار هم ببینید.',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: 'صفحه اجماع که در آن چند مدل به یک پرسش پاسخ می‌دهند و به نتیجه‌ای مشترک نزدیک می‌شوند.',
      caption: 'بگذارید چند مدل پاسخ دهند، سپس به یک پاسخ مورد توافق برسید.',
    },
    [MarketingSceneId.FILES]: {
      alt: 'صفحه پرونده‌ها با فهرست پرونده‌هایی که بارگذاری کرده‌اید و پرونده‌هایی که ClawAI برایتان ساخته است.',
      caption: 'بارگذاری‌ها و پرونده‌های تولیدشده شما در یک جا.',
    },
    [MarketingSceneId.MEMORY]: {
      alt: 'صفحه حافظه که نشان می‌دهد ClawAI چه چیزی درباره شما به یاد دارد و می‌توانید آن را بررسی و ویرایش کنید.',
      caption: 'ببینید و کنترل کنید ClawAI چه چیزی را به یاد می‌سپارد.',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: 'صفحه زمینه با فهرست بسته‌های زمینه قابل استفاده مجدد که می‌توانید به گفتگوها پیوست کنید.',
      caption: 'بسته‌های زمینه قابل استفاده مجدد برای کارهای تکراری.',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: 'صفحه اتصال‌دهنده‌ها با فهرست سرویس‌هایی که می‌توانید به فضای کاری خود وصل کنید.',
      caption: 'ابزارهایتان را وصل کنید تا هوش مصنوعی با آن‌ها کار کند.',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: 'صفحه صورتحساب با طرح‌های موجود و طرح فعلی.',
      caption: 'طرح‌های روشن، و همیشه می‌دانید کدام را دارید.',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: 'صفحه طرح که نشان می‌دهد طرح شما چه چیزهایی دارد و چقدر از آن را مصرف کرده‌اید.',
      caption: 'دقیقاً ببینید طرح شما چه چیزهایی دارد.',
    },
    [MarketingSceneId.USAGE]: {
      alt: 'صفحه مصرف با نمودارهایی از تعداد توکن‌هایی که در طول زمان مصرف کرده‌اید.',
      caption: 'مصرف خود را همان لحظه دنبال کنید.',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: 'صفحه تنظیمات که تا کارت اعلان‌ها و کلیدهای آن پایین رفته است.',
      caption: 'انتخاب کنید کدام اعلان‌ها را دریافت کنید.',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'صفحه Threads با فهرست Threadهای شما و وضعیت هرکدام.',
      caption: 'همه Threadهای شما و اینکه هرکدام در چه مرحله‌ای است.',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: 'پیش‌نویس یک Thread در صفحه بازبینی، پیش از انتشار.',
      caption: 'پیش از آنکه چیزی عمومی شود، پیش‌نویس را بازبینی کنید.',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: 'پانل اعلان‌ها که از زنگ باز شده و چند اعلان اخیر را نشان می‌دهد.',
      caption: 'همان لحظه که چیزی آماده شد باخبر شوید.',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: 'کارت یک تور کوتاه محصول روی صفحه گفتگو که به یکی از قابلیت‌ها اشاره می‌کند.',
      caption: 'یک تور کوتاه شما را با برنامه آشنا می‌کند.',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: 'داشبورد ClawAI با نمایی کلی از فعالیت و مصرف اخیر شما.',
      caption: 'فضای کاری شما در یک نگاه.',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: 'نمای رصد برای مدیر در زبانه مصرف، با نمودارهایی از میزان استفاده از مدل‌ها.',
      caption: 'مدیران مصرف را در نمودارها می‌بینند.',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: 'یک گفتگوی ClawAI روی صفحه تلفن همراه.',
      caption: 'همان گفتگو، روی تلفن شما.',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: 'داشبورد ClawAI روی صفحه تلفن همراه.',
      caption: 'داشبورد شما روی صفحه کوچک هم جا می‌شود.',
    },
  },
};
