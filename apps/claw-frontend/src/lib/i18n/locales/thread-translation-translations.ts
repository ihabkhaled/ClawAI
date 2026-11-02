import { Locale } from '@/enums/locale.enum';
import type { ThreadTranslationLocaleTranslation } from '@/types/i18n.types';

/**
 * Public Threads read in any language (ADR-217): the language dropdown on a Thread, its notice, and
 * the Public Threads entry on the home page. One file imported by every locale, so a missing
 * locale is a type error rather than a key rendering raw. Real translations, not placeholders.
 */
export const THREAD_TRANSLATION_TRANSLATIONS: Record<Locale, ThreadTranslationLocaleTranslation> = {
  [Locale.EN]: {
    promoTitle: 'Public Threads',
    promoBody:
      'Read in-depth, sourced articles written with ClawAI. Every Thread opens in your own language.',
    promoCta: 'Browse public Threads',
    languageLabel: 'Read this Thread in',
    translatedNotice: 'Translated automatically. Original language: {language}.',
    showOriginal: 'Show the original',
    featureTitle: 'Every Thread, in every language',
    featureBody:
      'Once a Thread is published, ClawAI translates it into all 13 app languages. Readers pick a language on the Thread and the app itself stays as it is. Each translation has its own page that search engines can find.',
  },
  [Locale.AR]: {
    promoTitle: 'المواضيع العامة',
    promoBody: 'اقرأ مقالات معمّقة وموثّقة بالمصادر كُتبت بواسطة ClawAI. يُفتح كل موضوع بلغتك.',
    promoCta: 'تصفّح المواضيع العامة',
    languageLabel: 'اقرأ هذا الموضوع بلغة',
    translatedNotice: 'تُرجم تلقائيًا. اللغة الأصلية: {language}.',
    showOriginal: 'عرض النص الأصلي',
    featureTitle: 'كل موضوع بكل اللغات',
    featureBody:
      'بعد نشر الموضوع يترجمه ClawAI إلى جميع لغات التطبيق الثلاث عشرة. يختار القارئ اللغة من صفحة الموضوع وتبقى لغة التطبيق كما هي. ولكل ترجمة صفحتها الخاصة التي تستطيع محركات البحث العثور عليها.',
  },
  [Locale.FR]: {
    promoTitle: 'Threads publics',
    promoBody:
      'Lisez des articles approfondis et sourcés rédigés avec ClawAI. Chaque Thread s’ouvre dans votre langue.',
    promoCta: 'Parcourir les Threads publics',
    languageLabel: 'Lire ce Thread en',
    translatedNotice: 'Traduit automatiquement. Langue d’origine : {language}.',
    showOriginal: 'Afficher l’original',
    featureTitle: 'Chaque Thread, dans toutes les langues',
    featureBody:
      'Une fois un Thread publié, ClawAI le traduit dans les 13 langues de l’application. Le lecteur choisit la langue sur le Thread et l’application reste inchangée. Chaque traduction a sa propre page, que les moteurs de recherche peuvent trouver.',
  },
  [Locale.IT]: {
    promoTitle: 'Thread pubblici',
    promoBody:
      'Leggi articoli approfonditi e documentati scritti con ClawAI. Ogni Thread si apre nella tua lingua.',
    promoCta: 'Sfoglia i Thread pubblici',
    languageLabel: 'Leggi questo Thread in',
    translatedNotice: 'Tradotto automaticamente. Lingua originale: {language}.',
    showOriginal: 'Mostra l’originale',
    featureTitle: 'Ogni Thread, in ogni lingua',
    featureBody:
      'Dopo la pubblicazione, ClawAI traduce il Thread in tutte e 13 le lingue dell’app. Il lettore sceglie la lingua sul Thread e l’app resta com’è. Ogni traduzione ha una pagina propria che i motori di ricerca possono trovare.',
  },
  [Locale.DE]: {
    promoTitle: 'Öffentliche Threads',
    promoBody:
      'Lies ausführliche, belegte Artikel, die mit ClawAI entstanden sind. Jeder Thread öffnet sich in deiner Sprache.',
    promoCta: 'Öffentliche Threads ansehen',
    languageLabel: 'Diesen Thread lesen auf',
    translatedNotice: 'Automatisch übersetzt. Originalsprache: {language}.',
    showOriginal: 'Original anzeigen',
    featureTitle: 'Jeder Thread in jeder Sprache',
    featureBody:
      'Sobald ein Thread veröffentlicht ist, übersetzt ClawAI ihn in alle 13 App-Sprachen. Leser wählen die Sprache am Thread, die App selbst bleibt unverändert. Jede Übersetzung hat eine eigene Seite, die Suchmaschinen finden können.',
  },
  [Locale.ES]: {
    promoTitle: 'Threads públicos',
    promoBody:
      'Lee artículos extensos y con fuentes escritos con ClawAI. Cada Thread se abre en tu idioma.',
    promoCta: 'Explorar Threads públicos',
    languageLabel: 'Leer este Thread en',
    translatedNotice: 'Traducido automáticamente. Idioma original: {language}.',
    showOriginal: 'Ver el original',
    featureTitle: 'Cada Thread, en cada idioma',
    featureBody:
      'Cuando se publica un Thread, ClawAI lo traduce a los 13 idiomas de la app. El lector elige el idioma en el Thread y la app sigue igual. Cada traducción tiene su propia página, que los buscadores pueden encontrar.',
  },
  [Locale.RU]: {
    promoTitle: 'Публичные Threads',
    promoBody:
      'Читайте подробные статьи с источниками, написанные с ClawAI. Каждый Thread открывается на вашем языке.',
    promoCta: 'Смотреть публичные Threads',
    languageLabel: 'Читать этот Thread на',
    translatedNotice: 'Переведено автоматически. Язык оригинала: {language}.',
    showOriginal: 'Показать оригинал',
    featureTitle: 'Каждый Thread на каждом языке',
    featureBody:
      'После публикации ClawAI переводит Thread на все 13 языков приложения. Читатель выбирает язык на странице Thread, а само приложение остаётся прежним. У каждого перевода своя страница, которую находят поисковые системы.',
  },
  [Locale.PT]: {
    promoTitle: 'Threads públicos',
    promoBody:
      'Leia artigos aprofundados e com fontes escritos com o ClawAI. Cada Thread abre no seu idioma.',
    promoCta: 'Ver Threads públicos',
    languageLabel: 'Ler este Thread em',
    translatedNotice: 'Traduzido automaticamente. Idioma original: {language}.',
    showOriginal: 'Mostrar o original',
    featureTitle: 'Cada Thread, em cada idioma',
    featureBody:
      'Depois de publicado, o ClawAI traduz o Thread para os 13 idiomas do app. O leitor escolhe o idioma no Thread e o app continua como está. Cada tradução tem a sua própria página, que os motores de busca conseguem encontrar.',
  },
  [Locale.HI]: {
    promoTitle: 'सार्वजनिक Threads',
    promoBody:
      'ClawAI से लिखे गए गहन, स्रोत-सहित लेख पढ़ें। हर Thread आपकी अपनी भाषा में खुलता है।',
    promoCta: 'सार्वजनिक Threads देखें',
    languageLabel: 'यह Thread इस भाषा में पढ़ें',
    translatedNotice: 'अपने-आप अनुवादित। मूल भाषा: {language}।',
    showOriginal: 'मूल पाठ दिखाएँ',
    featureTitle: 'हर Thread, हर भाषा में',
    featureBody:
      'Thread प्रकाशित होते ही ClawAI उसे ऐप की सभी 13 भाषाओं में अनुवादित कर देता है। पाठक Thread पर भाषा चुनता है और ऐप वैसा ही रहता है। हर अनुवाद का अपना पेज है जिसे सर्च इंजन खोज सकते हैं।',
  },
  [Locale.JA]: {
    promoTitle: '公開スレッド',
    promoBody:
      'ClawAI で書かれた、出典付きの読み応えある記事を読めます。どのスレッドもあなたの言語で開きます。',
    promoCta: '公開スレッドを見る',
    languageLabel: 'このスレッドを読む言語',
    translatedNotice: '自動翻訳です。原文の言語：{language}。',
    showOriginal: '原文を表示',
    featureTitle: 'すべてのスレッドを、すべての言語で',
    featureBody:
      'スレッドが公開されると、ClawAI がアプリの全13言語に翻訳します。読者はスレッド上で言語を選び、アプリの表示言語はそのままです。各翻訳には検索エンジンが見つけられる専用ページがあります。',
  },
  [Locale.TH]: {
    promoTitle: 'Threads สาธารณะ',
    promoBody:
      'อ่านบทความเชิงลึกพร้อมแหล่งอ้างอิงที่เขียนด้วย ClawAI ทุก Thread เปิดเป็นภาษาของคุณ',
    promoCta: 'เรียกดู Threads สาธารณะ',
    languageLabel: 'อ่าน Thread นี้เป็นภาษา',
    translatedNotice: 'แปลอัตโนมัติ ภาษาต้นฉบับ: {language}',
    showOriginal: 'แสดงต้นฉบับ',
    featureTitle: 'ทุก Thread ในทุกภาษา',
    featureBody:
      'เมื่อเผยแพร่ Thread ClawAI จะแปลเป็นทั้ง 13 ภาษาของแอปให้ ผู้อ่านเลือกภาษาที่ Thread ส่วนตัวแอปยังเหมือนเดิม การแปลแต่ละภาษามีหน้าของตัวเองที่เสิร์ชเอนจินค้นเจอได้',
  },
  [Locale.FA]: {
    promoTitle: 'Threadهای عمومی',
    promoBody:
      'مقاله‌های عمیق و دارای منبع را بخوانید که با ClawAI نوشته شده‌اند. هر Thread به زبان خودتان باز می‌شود.',
    promoCta: 'مرور Threadهای عمومی',
    languageLabel: 'این Thread را بخوانید به زبان',
    translatedNotice: 'به‌طور خودکار ترجمه شده است. زبان اصلی: {language}.',
    showOriginal: 'نمایش متن اصلی',
    featureTitle: 'هر Thread به هر زبان',
    featureBody:
      'پس از انتشار Thread، ClawAI آن را به هر ۱۳ زبان برنامه ترجمه می‌کند. خواننده زبان را روی Thread انتخاب می‌کند و خود برنامه تغییری نمی‌کند. هر ترجمه صفحهٔ جداگانه‌ای دارد که موتورهای جست‌وجو می‌توانند پیدایش کنند.',
  },
  [Locale.ZH]: {
    promoTitle: '公开 Threads',
    promoBody: '阅读用 ClawAI 写成的深度、带来源的文章。每篇 Thread 都能用你的语言打开。',
    promoCta: '浏览公开 Threads',
    languageLabel: '阅读此 Thread 的语言',
    translatedNotice: '自动翻译。原文语言：{language}。',
    showOriginal: '查看原文',
    featureTitle: '每篇 Thread，每种语言',
    featureBody:
      'Thread 发布后，ClawAI 会把它翻译成应用的全部 13 种语言。读者在 Thread 上选择语言，应用本身保持不变。每种译文都有自己的页面，搜索引擎可以收录。',
  },
};
