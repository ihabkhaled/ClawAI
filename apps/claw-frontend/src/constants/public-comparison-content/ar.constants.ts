import { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import type { ComparisonDictionary } from '@/types/public-comparison.types';

export const AR_COMPARISON_CONTENT: ComparisonDictionary = {
  labels: {
    onThisPage: 'في هذه الصفحة',
    atAGlance: 'لمحة سريعة',
    tableCaption: 'مقارنة ClawAI و{rival} قدرةً بقدرة',
    capabilityColumn: 'القدرة',
    clawColumn: 'ClawAI',
    strengthTitle: 'أين يتفوق {rival}',
    differenceTitle: 'أين يعمل ClawAI بطريقة مختلفة',
    chooseTitle: 'أيهما تختار',
    chooseRivalLabel: 'اختر {rival} إذا',
    chooseClawLabel: 'اختر ClawAI إذا',
    faqTitle: 'أسئلة شائعة',
    lastReviewed: 'مقارنة مبنية على معلومات علنية، آخر تحقق',
    independence:
      'ClawAI منتج مستقل. ليس تابعًا لأي من المساعدين المذكورين في هذه الصفحة، ولا معتمدًا منهم، ولا يعيد بيع خدماتهم. كل عبارة هنا مأخوذة من التوثيق العلني لكل مزوّد في التاريخ أعلاه، وهذه المنتجات تتغير بسرعة — راجع صفحات المزوّد نفسه قبل أن تقرر.',
    otherComparisons: 'قارن ClawAI بمساعد آخر',
    startFree: 'ابدأ بالخطة المجانية',
    seePricing: 'اطّلع على الأسعار',
  },
  hub: {
    eyebrow: 'المقارنات',
    intro:
      'لا يحاول ClawAI أن يكون مساعدًا واحدًا أفضل. هو يضع تسع عائلات من النماذج الرائدة خلف اشتراك واحد، ويرسل كل رسالة إلى النموذج المناسب لها. هذه الصفحات تضع ذلك في مواجهة المساعدين الذين يستخدمهم الناس بالفعل، وفق القدرات الثماني نفسها في كل مرة.',
    cardsTitle: 'اختر مساعدًا للمقارنة',
    cardCta: 'قارن مع {rival}',
    coversTitle: 'ما تغطيه كل مقارنة',
    coversBody:
      'القدرات الثماني نفسها، وبالترتيب نفسه، في كل صفحة: اختيار النماذج، والتوجيه، والإجابات المتوازية، والنماذج المحلية، والاستضافة الذاتية، والذاكرة والملفات، وموصلات العمل، وسجل الاستهلاك لكل إجابة. الأسئلة نفسها للجميع، حتى يمكن قراءة صفحتين جنبًا إلى جنب.',
  },
  dimensionLabels: {
    [ComparisonDimension.MODEL_CHOICE]: 'اختيار النماذج',
    [ComparisonDimension.ROUTING]: 'التوجيه',
    [ComparisonDimension.SIDE_BY_SIDE]: 'الإجابات المتوازية',
    [ComparisonDimension.LOCAL_MODELS]: 'النماذج المحلية والمفتوحة الأوزان',
    [ComparisonDimension.SELF_HOSTING]: 'الاستضافة الذاتية',
    [ComparisonDimension.MEMORY_AND_FILES]: 'الذاكرة والملفات',
    [ComparisonDimension.CONNECTORS]: 'موصلات العمل',
    [ComparisonDimension.RECEIPTS]: 'سجل الاستهلاك',
  },
  clawCells: {
    [ComparisonDimension.MODEL_CHOICE]: 'تسع عائلات من النماذج الرائدة باشتراك واحد',
    [ComparisonDimension.ROUTING]: 'خمسة أوضاع توجيه، منها التوجيه التلقائي لكل رسالة',
    [ComparisonDimension.SIDE_BY_SIDE]:
      'طلب واحد إلى عدة نماذج دفعة واحدة، والإجابات جنبًا إلى جنب',
    [ComparisonDimension.LOCAL_MODELS]:
      'نماذج مفتوحة الأوزان على وحدة معالجتك الرسومية، عبر Ollama أو llama.cpp',
    [ComparisonDimension.SELF_HOSTING]: 'المنظومة كاملة تعمل على خوادمك، والشيفرة على GitHub',
    [ComparisonDimension.MEMORY_AND_FILES]: 'ذاكرة تبقى بين المحادثات، إضافة إلى سياق الملفات',
    [ComparisonDimension.CONNECTORS]: 'اثنا عشر موصلًا لأدوات العمل',
    [ComparisonDimension.RECEIPTS]: 'كل إجابة تسجّل نموذجها وتكلفتها والحصة التي استهلكتها',
  },
  rivals: {
    [ComparisonRival.CHATGPT]: {
      name: 'ChatGPT',
      vendor: 'OpenAI',
      eyebrow: 'ClawAI مقابل ChatGPT',
      intro:
        'ChatGPT هو المساعد الذي يقصده معظم الناس حين يقولون «الذكاء الاصطناعي»: متقن وسريع ومدعوم بنماذج OpenAI الرائدة. ClawAI بشكل مختلف: اشتراك واحد يصل إلى نماذج OpenAI إلى جانب ثماني عائلات أخرى، ويرسل كل رسالة إلى ما يناسبها.',
      theirStrength:
        'منتج واحد مصنوع بإتقان شديد. الصوت وتوليد الصور وتشغيل الشيفرة والبحث المعمّق مدمجة وتعمل معًا، وتطبيقات الهاتف ممتازة، والنموذج تحتها نموذج رائد لا حلًا وسطًا.',
      ourDifference:
        'لا يحاول ClawAI أن يكون مساعدًا واحدًا أفضل، بل يزيل مسألة المزوّد الواحد: المحادثة نفسها يمكن أن تنتقل بين OpenAI وAnthropic وGoogle وست عائلات أخرى، وأن تنزل إلى نموذج محلي مفتوح الأوزان حين لا يجوز للبيانات مغادرة شبكتك، وأن تسجّل أي نموذج أجاب.',
      chooseRival:
        'كنت تريد مساعدًا واحدًا متقنًا، وتغطي نماذج OpenAI تقريبًا كل ما تفعله، وتهمّك أدوات الصوت والصور المدمجة.',
      chooseClaw:
        'كنت تصطدم كثيرًا بحدود مزوّد واحد، أو تريد نموذجًا ثانيًا يراجع الأول، أو يجب أن يبقى جزء من العمل على أجهزتك.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'نماذج OpenAI فقط',
        [ComparisonDimension.ROUTING]: 'اختيار تلقائي ضمن تشكيلة OpenAI',
        [ComparisonDimension.SIDE_BY_SIDE]: 'إجابة واحدة في كل مرة',
        [ComparisonDimension.LOCAL_MODELS]: 'سحابة فقط',
        [ComparisonDimension.SELF_HOSTING]: 'غير متاحة',
        [ComparisonDimension.MEMORY_AND_FILES]: 'ذاكرة ومشاريع ورفع ملفات',
        [ComparisonDimension.CONNECTORS]: 'تطبيقات وموصلات في الخطط المدفوعة',
        [ComparisonDimension.RECEIPTS]: 'استهلاك على مستوى الخطة، لا تكلفة لكل إجابة',
      },
      faq: [
        {
          question: 'هل يستطيع ClawAI استخدام نماذج OpenAI نفسها التي يستخدمها ChatGPT؟',
          answer:
            'يوجّه ClawAI إلى نماذج OpenAI بوصفها إحدى تسع عائلات في تشكيلته. لا حساب OpenAI تنشئه ولا مفتاح واجهة برمجية تلصقه: الوصول إلى النماذج يأتي مع الاشتراك.',
        },
        {
          question: 'هل ClawAI واجهة لـ ChatGPT؟',
          answer:
            'لا. ClawAI منصة مستقلة لها طبقاتها الخاصة للتوجيه والذاكرة والمقارنة والتنسيق. OpenAI أحد المزوّدين الذين يمكنها إرسال رسالة إليهم، لا المنتج الذي تقوم عليه.',
        },
        {
          question: 'هل يمكنني استخدام ClawAI دون إرسال أي شيء إلى OpenAI؟',
          answer:
            'نعم. ثبّت المحادثة على نموذج محلي مفتوح الأوزان، أو استضف المنظومة كاملة عندك وشغّل نماذج على وحدات معالجتك الرسومية فقط، دون أي اتصال خارجي.',
        },
      ],
    },
    [ComparisonRival.CLAUDE]: {
      name: 'Claude',
      vendor: 'Anthropic',
      eyebrow: 'ClawAI مقابل Claude',
      intro:
        'Claude ما يلجأ إليه كثيرون حين يكون العمل طويلًا ودقيقًا ومكتوبًا. يصل ClawAI إلى نماذج Anthropic أيضًا — إلى جانب ثماني عائلات أخرى — ويتيح لنموذج ثانٍ أن يراجع ما قاله الأول.',
      theirStrength:
        'استدلال دقيق على المستندات الطويلة، والتزام بالتعليمات هو الأوثق في هذا المجال، ومراجعة قوية للشيفرة. المشاريع والمخرجات وموصلات MCP تجعله مكانًا جيدًا فعلًا للعمل الكتابي الممتد.',
      ourDifference:
        'يعامل ClawAI شركة Anthropic كخيار قوي لا كخيار وحيد. المحادثة نفسها يمكن أن ترسل الطلب إلى Claude وأربعة نماذج أخرى دفعة واحدة، وأن تجعل نموذجًا يحكم على إجابة نموذج آخر، وأن تتحوّل تلقائيًا حين يتعطل مزوّد.',
      chooseRival: 'كان جُلّ عملك استدلالًا طويلًا أو مراجعة شيفرة، ونموذج واحد ممتاز يكفيك.',
      chooseClaw:
        'أردت إجابة Claude ورأيًا ثانيًا، أو احتجت نموذجًا محليًا لعمل حساس، أو فضّلت ألّا تحمل اشتراكًا لكل مزوّد.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'نماذج Anthropic فقط',
        [ComparisonDimension.ROUTING]: 'تختار النموذج بنفسك',
        [ComparisonDimension.SIDE_BY_SIDE]: 'إجابة واحدة في كل مرة',
        [ComparisonDimension.LOCAL_MODELS]: 'سحابة فقط',
        [ComparisonDimension.SELF_HOSTING]: 'غير متاحة',
        [ComparisonDimension.MEMORY_AND_FILES]: 'مشاريع وملفات وذاكرة',
        [ComparisonDimension.CONNECTORS]: 'موصلات MCP وإضافات سطح المكتب',
        [ComparisonDimension.RECEIPTS]: 'استهلاك على مستوى الخطة، لا تكلفة لكل إجابة',
      },
      faq: [
        {
          question: 'هل يتضمن ClawAI نماذج Claude؟',
          answer:
            'نعم. Anthropic إحدى تسع عائلات نماذج في التشكيلة، ويمكن الوصول إليها من أي محادثة دون حساب أو مفتاح منفصل من Anthropic.',
        },
        {
          question: 'هل يمكن لنموذج أن يراجع إجابة نموذج آخر؟',
          answer:
            'نعم. تضع أدوات Verify وJudge وCritic نموذجًا ثانيًا على مخرجات الأول. هذا يقلل خطر إجابة خاطئة وواثقة دون أن يلغيه: كل ما له أثر يظل بحاجة إلى قراءة بشرية.',
        },
        {
          question: 'هل ClawAI تابع لـ Anthropic؟',
          answer:
            'لا. ClawAI مستقل. يوجّه إلى نماذج Anthropic كما يوجّه إلى ثمانية مزوّدين آخرين، وليس معتمدًا من أي منهم ولا شريكًا لهم.',
        },
      ],
    },
    [ComparisonRival.GEMINI]: {
      name: 'Gemini',
      vendor: 'Google',
      eyebrow: 'ClawAI مقابل Gemini',
      intro:
        'Gemini هو المساعد الأقرب إلى المستندات التي لديك بالفعل، شرط أن تكون داخل Google Workspace. يأتي ClawAI من الجهة المقابلة: محايد تجاه المزوّدين، ونماذج Google لديه إحدى تسع عائلات.',
      theirStrength:
        'نوافذ سياق ضخمة، ومعالجة أصلية للصور والصوت والفيديو، وإجابات سريعة، وتكامل مع Gmail وDrive وDocs لا يستطيع طرف ثالث مجاراته.',
      ourDifference:
        'ClawAI ليس مرتبطًا بحزمة مكتبية واحدة ولا بخارطة طريق مزوّد بعينه. يتصل باثنتي عشرة أداة عمل بدل أداة واحدة، ويوجّه كل رسالة حسب المهمة، ويستطيع إبقاء العمل الحساس على نموذج محلي مفتوح الأوزان.',
      chooseRival: 'كانت مؤسستك تعيش داخل Google Workspace وتريد المساعد داخلها مباشرة.',
      chooseClaw:
        'كنت تستخدم أدوات من عدة مزوّدين، أو تريد مقارنة النماذج قبل الالتزام بواحد، أو تحتاج نشرًا بلا أي اتصال خارجي.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'نماذج Google فقط',
        [ComparisonDimension.ROUTING]: 'اختيار تلقائي ضمن تشكيلة Google',
        [ComparisonDimension.SIDE_BY_SIDE]: 'إجابة واحدة في كل مرة',
        [ComparisonDimension.LOCAL_MODELS]: 'استضافة لدى Google فقط',
        [ComparisonDimension.SELF_HOSTING]: 'غير متاحة',
        [ComparisonDimension.MEMORY_AND_FILES]: 'ملفات وDrive وسياق Workspace',
        [ComparisonDimension.CONNECTORS]: 'تكامل عميق مع Google Workspace',
        [ComparisonDimension.RECEIPTS]: 'استهلاك على مستوى الخطة، لا تكلفة لكل إجابة',
      },
      faq: [
        {
          question: 'هل يستطيع ClawAI استخدام نماذج Gemini؟',
          answer:
            'نعم. Google إحدى عائلات النماذج التسع في التشكيلة، ومتاحة في أي محادثة ضمن الاشتراك نفسه.',
        },
        {
          question: 'هل يتصل ClawAI بـ Google Workspace؟',
          answer:
            'يوفّر ClawAI اثني عشر موصلًا تغطي أدوات تتبّع المهام والمحادثة والمستندات. تكامله مع Google موصل لا واجهة أصلية: أوسع عبر المزوّدين، وأقل عمقًا داخل Google.',
        },
        {
          question: 'أيهما أفضل للمستندات الطويلة جدًا؟',
          answer:
            'كلاهما يتعامل معها جيدًا، ونوافذ سياق Google الأكبر من بين الأوسع المتاحة. الفرق في ClawAI أنك تستطيع إرسال المستند نفسه إلى نموذجين ومقارنة ما خلص إليه كل منهما.',
        },
      ],
    },
    [ComparisonRival.PERPLEXITY]: {
      name: 'Perplexity',
      vendor: 'Perplexity AI',
      eyebrow: 'ClawAI مقابل Perplexity',
      intro:
        'بُني Perplexity حول مهمة واحدة: الإجابة عن سؤال من الويب الحيّ مع ذكر المصادر. وبُني ClawAI حول مهمة أخرى: وضع النموذج المناسب على العمل الذي بين يديك، والبحث من ضمنه.',
      theirStrength:
        'المنتج الأفضل تفصيلًا لأسئلة البحث. تأتي الإجابات ومعها مصادرها، وتحافظ الأسئلة اللاحقة على تماسك الخيط، وواجهته كلها مصممة للتحقق من مصدر أي عبارة.',
      ourDifference:
        'ClawAI مساحة عمل لا محرك إجابات. البحث وضع من بين أوضاع، إلى جانب مقارنة النماذج والذاكرة الدائمة وسياق الملفات ووكيل البرمجة والنماذج المحلية — وكل إجابة تسجّل النموذج الذي أنتجها.',
      chooseRival: 'كانت أغلب أسئلتك «ما الصحيح الآن، ومن يقول ذلك».',
      chooseClaw:
        'كان البحث جزءًا من العمل فقط وتحتاج أيضًا إلى برمجة وكتابة طويلة ومقارنة نماذج أو نموذج يعمل على أجهزتك.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'نماذج من عدة مزوّدين في الخطط الأعلى',
        [ComparisonDimension.ROUTING]: 'يُختار حسب جودة البحث والإجابة',
        [ComparisonDimension.SIDE_BY_SIDE]: 'إجابة واحدة في كل مرة',
        [ComparisonDimension.LOCAL_MODELS]: 'سحابة فقط',
        [ComparisonDimension.SELF_HOSTING]: 'غير متاحة',
        [ComparisonDimension.MEMORY_AND_FILES]: 'مساحات ومحادثات ورفع ملفات',
        [ComparisonDimension.CONNECTORS]: 'موصلات في خطط الأعمال',
        [ComparisonDimension.RECEIPTS]: 'استهلاك على مستوى الخطة، لا تكلفة لكل إجابة',
      },
      faq: [
        {
          question: 'هل يبحث ClawAI في الويب؟',
          answer:
            'نعم. ينفّذ البحث عملية متعددة الخطوات على الويب ويعيد إجابة مع مصادرها. هي قدرة داخل مساحة العمل لا المنتج كله.',
        },
        {
          question: 'أيهما أفضل في ذكر المصادر؟',
          answer:
            'صُمم Perplexity خصيصًا للإجابات الموثّقة ويعرض مصادر لكل عبارة تقريبًا. يذكر ClawAI مصادر عمليات بحثه؛ ولسؤال «ابحث واذكر المصدر» الخالص يبقى محرك الإجابات المتخصص أداة أحدّ.',
        },
        {
          question: 'هل يمكنني استخدام الاثنين؟',
          answer:
            'كثيرون يفعلون. المقارنة الحقيقية هي: أتريد محرك إجابات متخصصًا، أم مساحة عمل عامة متعددة النماذج، أم كليهما.',
        },
      ],
    },
    [ComparisonRival.COPILOT]: {
      name: 'Microsoft Copilot',
      vendor: 'Microsoft',
      eyebrow: 'ClawAI مقابل Microsoft Copilot',
      intro:
        'Copilot هو Microsoft 365 وقد نُسج فيه مساعد. أما ClawAI فمساحة عمل قائمة بذاتها تصل إلى تسع عائلات نماذج ويمكن تشغيلها كاملة على خوادمك.',
      theirStrength:
        'لا شيء يجلس بهذا القرب من بيانات Microsoft الموجودة أصلًا لدى المؤسسة. يصل سياق Word وExcel وOutlook وTeams دون إعداد، ويتبع الترخيص والعزل والامتثال عقد Microsoft 365 الذي لدى قسم تقنية المعلومات بالفعل.',
      ourDifference:
        'ClawAI محايد تجاه المورّدين وقابل للنشر في أي مكان. يوجّه عبر تسع عائلات نماذج بدل تشكيلة مورّد واحد، ويعرض تكلفة كل إجابة، ويمكن تثبيته داخل شبكتك بنماذج مفتوحة الأوزان ودون أي اتصال خارجي.',
      chooseRival:
        'كانت مؤسستك تعمل على Microsoft 365 والقيمة عندك أن يكون المساعد داخل المستندات الموجودة أصلًا.',
      chooseClaw:
        'أردت حرية اختيار المزوّد، أو وضوح تكلفة كل إجابة، أو نشرًا لا يغادر بنيتك التحتية أبدًا.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'نماذج OpenAI إضافة إلى نماذج Microsoft',
        [ComparisonDimension.ROUTING]: 'تختاره Microsoft لكل واجهة',
        [ComparisonDimension.SIDE_BY_SIDE]: 'إجابة واحدة في كل مرة',
        [ComparisonDimension.LOCAL_MODELS]: 'سحابة فقط',
        [ComparisonDimension.SELF_HOSTING]: 'غير متاحة',
        [ComparisonDimension.MEMORY_AND_FILES]: 'ملفات Microsoft 365 وسياق المؤسسة',
        [ComparisonDimension.CONNECTORS]: 'أعمق تكامل مع Microsoft 365',
        [ComparisonDimension.RECEIPTS]: 'ترخيص لكل مستخدم، لا تكلفة لكل إجابة',
      },
      faq: [
        {
          question: 'هل يمكن نشر ClawAI داخل شبكتنا؟',
          answer:
            'نعم. تعمل المنظومة كاملة على خوادمك، بنماذج مفتوحة الأوزان على وحدات معالجتك الرسومية ودون أي اتصال بمزوّد خارجي. هذا ارتباط بنطاق محدد لا خطة تُشترى عبر الإنترنت.',
        },
        {
          question: 'هل يتكامل ClawAI مع Microsoft 365؟',
          answer:
            'يوفّر ClawAI اثني عشر موصلًا تغطي أدوات تتبّع المهام والمحادثة والمستندات — أوسع عبر المزوّدين من Copilot، وأقل عمقًا داخل تطبيقات Microsoft نفسها.',
        },
        {
          question: 'كيف تُحتسب فاتورة الاستخدام؟',
          answer:
            'برموز مُطبَّعة على أساس التكلفة مقابل حصة يومية وشهرية، لا لكل مستخدم. وكل إجابة تعرض النموذج والتكلفة والحصة المستهلكة.',
        },
      ],
    },
  },
};
