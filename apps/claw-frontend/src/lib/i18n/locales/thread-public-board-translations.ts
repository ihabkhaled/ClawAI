import { Locale } from '@/enums/locale.enum';
import type { ThreadPublicBoardLocaleTranslation } from '@/types/i18n.types';

/**
 * The public, read-only Threads board for guests (marketing site, no login): the page heading,
 * the introduction that makes the page more than a list of links (rule 38), the sign-in call to
 * action and the search-result title and description. Spread flat into `chat` in every locale
 * (read as `chat.threadPublicBoard<Name>`), so a missing locale or key is a type error rather
 * than a raw key. The SEO pair feeds the content registry
 * (see `threads-public-board-seo.constants.ts`).
 */
export const THREAD_PUBLIC_BOARD_TRANSLATIONS: Record<Locale, ThreadPublicBoardLocaleTranslation> =
  {
    [Locale.EN]: {
      threadPublicBoardTitle: 'Public Threads board',
      threadPublicBoardIntro:
        'Every Thread on this board was written by a ClawAI member, checked against its sources, approved by its author and reviewed for safety before it was published. Search by topic, filter by language or type, and open any Thread to read it in full. You can see how many people liked, discussed and suggested changes to each one. Sign in to join the conversation.',
      threadPublicBoardCta: 'Sign in to like, comment or suggest a change',
      threadPublicBoardSeoTitle: 'Public Threads board',
      threadPublicBoardSeoDescription:
        'Browse and search every public Thread from the ClawAI community: researched articles, guides and explanations with sources, likes and discussion counts. Free to read, no account needed.',
    },
    [Locale.AR]: {
      threadPublicBoardTitle: 'لوحة Threads العامة',
      threadPublicBoardIntro:
        'كل Thread في هذه اللوحة كتبه عضو في ClawAI، وتمت مراجعته مقابل مصادره، ووافق عليه كاتبه، وخضع لمراجعة السلامة قبل نشره. ابحث حسب الموضوع، وصفِّ حسب اللغة أو النوع، وافتح أي Thread لقراءته كاملاً. يمكنك رؤية عدد من أعجبوا بكل منها وناقشوها واقترحوا تعديلات عليها. سجّل الدخول للمشاركة في النقاش.',
      threadPublicBoardCta: 'سجّل الدخول للإعجاب أو التعليق أو اقتراح تعديل',
      threadPublicBoardSeoTitle: 'لوحة Threads العامة',
      threadPublicBoardSeoDescription:
        'تصفّح وابحث في كل Threads العامة من مجتمع ClawAI: مقالات وأدلة وشروحات موثّقة بمصادرها مع أعداد الإعجابات والنقاشات. القراءة مجانية ولا تحتاج إلى حساب.',
    },
    [Locale.DE]: {
      threadPublicBoardTitle: 'Öffentliches Threads-Board',
      threadPublicBoardIntro:
        'Jeder Thread auf diesem Board stammt von einem ClawAI-Mitglied, wurde anhand seiner Quellen geprüft, vom Autor freigegeben und vor der Veröffentlichung auf Sicherheit kontrolliert. Suche nach Thema, filtere nach Sprache oder Typ und öffne jeden Thread zum vollständigen Lesen. Du siehst, wie viele Personen ihn mögen, diskutieren und Änderungen vorgeschlagen haben. Melde dich an, um mitzudiskutieren.',
      threadPublicBoardCta:
        'Anmelden, um zu liken, zu kommentieren oder eine Änderung vorzuschlagen',
      threadPublicBoardSeoTitle: 'Öffentliches Threads-Board',
      threadPublicBoardSeoDescription:
        'Durchsuche alle öffentlichen Threads der ClawAI-Community: recherchierte Artikel, Leitfäden und Erklärungen mit Quellen sowie Zahlen zu Likes und Diskussionen. Kostenlos lesbar, ohne Konto.',
    },
    [Locale.ES]: {
      threadPublicBoardTitle: 'Tablero público de Threads',
      threadPublicBoardIntro:
        'Cada Thread de este tablero lo escribió un miembro de ClawAI, se contrastó con sus fuentes, lo aprobó su autor y se revisó su seguridad antes de publicarse. Busca por tema, filtra por idioma o tipo y abre cualquier Thread para leerlo completo. Puedes ver cuántas personas lo han valorado, comentado y propuesto cambios. Inicia sesión para unirte a la conversación.',
      threadPublicBoardCta: 'Inicia sesión para dar me gusta, comentar o sugerir un cambio',
      threadPublicBoardSeoTitle: 'Tablero público de Threads',
      threadPublicBoardSeoDescription:
        'Explora y busca todos los Threads públicos de la comunidad de ClawAI: artículos, guías y explicaciones con fuentes, con recuentos de me gusta y debates. Gratis para leer, sin cuenta.',
    },
    [Locale.FR]: {
      threadPublicBoardTitle: 'Tableau public des Threads',
      threadPublicBoardIntro:
        'Chaque Thread de ce tableau a été écrit par un membre de ClawAI, vérifié à partir de ses sources, approuvé par son auteur et contrôlé du point de vue de la sécurité avant sa publication. Cherchez par sujet, filtrez par langue ou par type et ouvrez un Thread pour le lire en entier. Vous voyez combien de personnes l’ont aimé, commenté et ont proposé des modifications. Connectez-vous pour rejoindre la discussion.',
      threadPublicBoardCta: 'Connectez-vous pour aimer, commenter ou proposer une modification',
      threadPublicBoardSeoTitle: 'Tableau public des Threads',
      threadPublicBoardSeoDescription:
        'Parcourez et recherchez tous les Threads publics de la communauté ClawAI : articles documentés, guides et explications avec sources, mentions j’aime et discussions. Lecture gratuite, sans compte.',
    },
    [Locale.HI]: {
      threadPublicBoardTitle: 'सार्वजनिक Threads बोर्ड',
      threadPublicBoardIntro:
        'इस बोर्ड का हर Thread ClawAI के किसी सदस्य ने लिखा है, उसके स्रोतों से जाँचा गया है, लेखक ने उसे मंज़ूर किया है और प्रकाशन से पहले सुरक्षा की समीक्षा हुई है। विषय से खोजें, भाषा या प्रकार से फ़िल्टर करें और किसी भी Thread को पूरा पढ़ने के लिए खोलें। आप देख सकते हैं कि कितने लोगों ने उसे पसंद किया, उस पर चर्चा की और बदलाव सुझाए। चर्चा में शामिल होने के लिए साइन इन करें।',
      threadPublicBoardCta: 'पसंद करने, टिप्पणी करने या बदलाव सुझाने के लिए साइन इन करें',
      threadPublicBoardSeoTitle: 'सार्वजनिक Threads बोर्ड',
      threadPublicBoardSeoDescription:
        'ClawAI समुदाय के सभी सार्वजनिक Threads ब्राउज़ करें और खोजें: स्रोतों वाले शोधित लेख, मार्गदर्शिकाएँ और व्याख्याएँ, साथ में पसंद और चर्चा की गिनती। पढ़ना मुफ़्त है, खाते की ज़रूरत नहीं।',
    },
    [Locale.IT]: {
      threadPublicBoardTitle: 'Bacheca pubblica dei Thread',
      threadPublicBoardIntro:
        'Ogni Thread di questa bacheca è stato scritto da un membro di ClawAI, verificato sulle sue fonti, approvato dall’autore e controllato per la sicurezza prima della pubblicazione. Cerca per argomento, filtra per lingua o tipo e apri qualsiasi Thread per leggerlo per intero. Puoi vedere quante persone lo hanno apprezzato, commentato e hanno proposto modifiche. Accedi per partecipare alla conversazione.',
      threadPublicBoardCta: 'Accedi per mettere mi piace, commentare o proporre una modifica',
      threadPublicBoardSeoTitle: 'Bacheca pubblica dei Thread',
      threadPublicBoardSeoDescription:
        'Sfoglia e cerca tutti i Thread pubblici della community ClawAI: articoli, guide e spiegazioni documentati con fonti, mi piace e conteggio delle discussioni. Lettura gratuita, senza account.',
    },
    [Locale.PT]: {
      threadPublicBoardTitle: 'Quadro público de Threads',
      threadPublicBoardIntro:
        'Cada Thread deste quadro foi escrito por um membro do ClawAI, conferido com as suas fontes, aprovado pelo autor e revisado quanto à segurança antes de ser publicado. Pesquise por assunto, filtre por idioma ou tipo e abra qualquer Thread para lê-lo por inteiro. Você vê quantas pessoas curtiram, comentaram e sugeriram alterações. Entre na sua conta para participar da conversa.',
      threadPublicBoardCta: 'Entre para curtir, comentar ou sugerir uma alteração',
      threadPublicBoardSeoTitle: 'Quadro público de Threads',
      threadPublicBoardSeoDescription:
        'Explore e pesquise todos os Threads públicos da comunidade ClawAI: artigos, guias e explicações com fontes, curtidas e contagem de discussões. Leitura gratuita, sem conta.',
    },
    [Locale.RU]: {
      threadPublicBoardTitle: 'Публичная доска Threads',
      threadPublicBoardIntro:
        'Каждый Thread на этой доске написан участником ClawAI, сверен с источниками, одобрен автором и проверен на безопасность до публикации. Ищите по теме, фильтруйте по языку или типу и открывайте любой Thread, чтобы прочитать его целиком. Вы видите, сколько человек отметили его, обсудили и предложили правки. Войдите, чтобы присоединиться к обсуждению.',
      threadPublicBoardCta:
        'Войдите, чтобы поставить отметку, прокомментировать или предложить правку',
      threadPublicBoardSeoTitle: 'Публичная доска Threads',
      threadPublicBoardSeoDescription:
        'Просматривайте и ищите все публичные Threads сообщества ClawAI: статьи, руководства и объяснения с источниками, число отметок и обсуждений. Читать бесплатно, аккаунт не нужен.',
    },
    [Locale.JA]: {
      threadPublicBoardTitle: '公開 Threads ボード',
      threadPublicBoardIntro:
        'このボードの Thread はすべて ClawAI のメンバーが書き、出典と照合され、作者の承認を受け、公開前に安全性の確認を経たものです。トピックで検索し、言語や種類で絞り込み、気になる Thread を開いて全文を読めます。いいね、コメント、変更提案の件数も確認できます。議論に参加するにはサインインしてください。',
      threadPublicBoardCta: 'サインインして、いいね・コメント・変更提案をする',
      threadPublicBoardSeoTitle: '公開 Threads ボード',
      threadPublicBoardSeoDescription:
        'ClawAI コミュニティが公開したすべての Thread を閲覧・検索できます。出典付きの調査記事、ガイド、解説と、いいねや議論の件数を掲載。閲覧は無料で、アカウントは不要です。',
    },
    [Locale.TH]: {
      threadPublicBoardTitle: 'บอร์ด Threads สาธารณะ',
      threadPublicBoardIntro:
        'ทุก Thread บนบอร์ดนี้เขียนโดยสมาชิก ClawAI ผ่านการตรวจเทียบกับแหล่งข้อมูล ได้รับการอนุมัติจากผู้เขียน และผ่านการตรวจสอบความปลอดภัยก่อนเผยแพร่ ค้นหาตามหัวข้อ กรองตามภาษาหรือประเภท และเปิด Thread ใดก็ได้เพื่ออ่านฉบับเต็ม คุณดูได้ว่ามีกี่คนกดถูกใจ พูดคุย และเสนอแก้ไข เข้าสู่ระบบเพื่อร่วมสนทนา',
      threadPublicBoardCta: 'เข้าสู่ระบบเพื่อกดถูกใจ แสดงความคิดเห็น หรือเสนอการแก้ไข',
      threadPublicBoardSeoTitle: 'บอร์ด Threads สาธารณะ',
      threadPublicBoardSeoDescription:
        'เรียกดูและค้นหา Threads สาธารณะทั้งหมดจากชุมชน ClawAI ทั้งบทความ คู่มือ และคำอธิบายที่มีแหล่งอ้างอิง พร้อมจำนวนถูกใจและการสนทนา อ่านฟรี ไม่ต้องมีบัญชี',
    },
    [Locale.FA]: {
      threadPublicBoardTitle: 'تابلوی عمومی Threads',
      threadPublicBoardIntro:
        'هر Thread در این تابلو را یکی از اعضای ClawAI نوشته، با منبع‌هایش سنجیده شده، نویسنده آن را تأیید کرده و پیش از انتشار از نظر ایمنی بررسی شده است. بر اساس موضوع جست‌وجو کنید، با زبان یا نوع فیلتر کنید و هر Thread را برای خواندن کامل باز کنید. می‌توانید ببینید چند نفر آن را پسندیده، درباره‌اش گفت‌وگو کرده و تغییر پیشنهاد داده‌اند. برای پیوستن به گفت‌وگو وارد شوید.',
      threadPublicBoardCta: 'برای پسندیدن، نظر دادن یا پیشنهاد تغییر وارد شوید',
      threadPublicBoardSeoTitle: 'تابلوی عمومی Threads',
      threadPublicBoardSeoDescription:
        'همه Threads عمومی جامعه ClawAI را مرور و جست‌وجو کنید: مقاله‌ها، راهنماها و توضیحات منبع‌دار همراه با شمار پسندها و گفت‌وگوها. خواندن رایگان است و حساب لازم نیست.',
    },
    [Locale.ZH]: {
      threadPublicBoardTitle: '公开 Threads 看板',
      threadPublicBoardIntro:
        '此看板上的每一篇 Thread 都由 ClawAI 成员撰写，经过来源核对，获得作者批准，并在发布前通过了安全审核。你可以按主题搜索，按语言或类型筛选，并打开任意 Thread 阅读全文。每篇内容的点赞、讨论和修改建议数量都清晰可见。登录后即可参与讨论。',
      threadPublicBoardCta: '登录后即可点赞、评论或提出修改建议',
      threadPublicBoardSeoTitle: '公开 Threads 看板',
      threadPublicBoardSeoDescription:
        '浏览并搜索 ClawAI 社区的所有公开 Thread：附有来源的研究文章、指南和说明，并显示点赞与讨论数量。你可以按主题、语言和类型快速找到所需内容，打开任意一篇阅读完整文章。免费阅读，无需账号。',
    },
  };
