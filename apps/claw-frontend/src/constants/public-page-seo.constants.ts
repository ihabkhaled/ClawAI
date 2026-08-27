import type { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

export const PUBLIC_PAGE_SEO_BY_LOCALE: Record<
  Locale,
  Record<LaunchPublicPageSlug, PublicPageSeoCopy>
> = {
  [Locale.EN]: {
    home: {
      title: 'One workspace for cloud and local AI',
      description:
        'Use cloud and local AI models from one workspace, route each request by task and policy, and keep conversations, files, and orchestration tools together.',
      keywords: ['AI workspace', 'model routing', 'local AI'],
    },
    about: {
      title: 'About the orchestration platform',
      description:
        'Learn why the platform brings provider choice, task-aware routing, reusable context, and private deployment options into one practical AI workspace.',
      keywords: ['about the platform', 'AI orchestration', 'provider choice'],
    },
    'acceptable-use': {
      title: 'Acceptable use policy',
      description:
        'Read the rules for responsible platform use, prohibited activity, account protection, automated access, and actions that may follow policy violations.',
      keywords: ['acceptable use', 'responsible AI use', 'prohibited activity'],
    },
    architecture: {
      title: 'Event-driven platform architecture',
      description:
        'Explore the service-based architecture, isolated data ownership, event-driven coordination, streamed responses, and controls around model execution.',
      keywords: ['AI architecture', 'microservices', 'event-driven platform'],
    },
    contact: {
      title: 'Contact the team',
      description:
        'Contact the team about product questions, billing support, provider setup, private deployment, or an organisation-specific technical requirement.',
      keywords: ['contact support', 'product questions', 'private deployment'],
    },
    cookies: {
      title: 'Cookie notice',
      description:
        'Understand the browser storage and cookie mechanisms used for sessions, preferences, localisation, and optional advertising features on public pages.',
      keywords: ['cookie notice', 'browser storage', 'privacy preferences'],
    },
    faq: {
      title: 'Frequently asked questions',
      description:
        'Find clear answers about plans, allowances, supported providers, model availability, routing, data handling, local runtimes, and private deployment.',
      keywords: ['AI platform FAQ', 'plan questions', 'model availability'],
    },
    features: {
      title: 'Routing, context, and orchestration features',
      description:
        'Explore task-aware model routing, comparison and review workflows, reusable memory, file context, workspace connections, and local runtime support.',
      keywords: ['AI orchestration features', 'model comparison', 'context tools'],
    },
    'how-it-works': {
      title: 'How model routing works',
      description:
        'See how a request moves from conversation context through policy-aware model selection, streamed execution, usage recording, and optional review workflows.',
      keywords: ['how AI routing works', 'model selection', 'streamed responses'],
    },
    'local-first-ai': {
      title: 'Private AI on your infrastructure',
      description:
        'Explore scoped private deployments that can run local models on organisation-controlled infrastructure when workloads must remain inside your network.',
      keywords: ['private AI deployment', 'on-premise AI', 'local models'],
    },
    pricing: {
      title: 'Plans and usage allowances',
      description:
        'Compare monthly and yearly plans, weighted usage allowances, concurrency, chats, messages, workspaces, context packs, memory, and orchestration access.',
      keywords: ['AI pricing', 'usage allowances', 'subscription plans'],
    },
    privacy: {
      title: 'Privacy notice',
      description:
        'Review what information the service processes, why it is used, where external providers may be involved, retention practices, and available controls.',
      keywords: ['privacy notice', 'data processing', 'retention practices'],
    },
    'security-and-privacy': {
      title: 'Security and privacy controls',
      description:
        'Learn about encrypted connector credentials, transport security, service boundaries, local-only routing, retention settings, and operational safeguards.',
      keywords: ['AI security', 'encrypted credentials', 'local-only routing'],
    },
    'supported-models': {
      title: 'Supported providers and model catalog',
      description:
        'Review integrations for OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, Ollama, and llama.cpp; exact models depend on configured providers.',
      keywords: ['supported AI providers', 'model catalog', 'local model runtimes'],
    },
    terms: {
      title: 'Terms of service',
      description:
        'Read the terms governing accounts, subscriptions, platform access, user responsibilities, intellectual property, service changes, and termination.',
      keywords: ['terms of service', 'subscription terms', 'user responsibilities'],
    },
    'use-cases': {
      title: 'AI workflows for real work',
      description:
        'See how routed models, shared context, and review workflows support software development, research, analysis, writing, support, and document tasks.',
      keywords: ['AI use cases', 'research workflows', 'developer productivity'],
    },
    compare: {
      title: 'Compare ClawAI with other AI assistants',
      description:
        'ClawAI set against ChatGPT, Claude, Gemini, Perplexity and Microsoft Copilot on model choice, routing, local models, self-hosting, connectors and per-answer cost.',
      keywords: ['AI assistant comparison', 'ClawAI alternatives', 'compare AI tools'],
    },
    'compare/chatgpt': {
      title: 'ClawAI vs ChatGPT',
      description:
        'One polished assistant versus nine model families: how ClawAI and ChatGPT differ on routing, side-by-side answers, local models, self-hosting and per-answer cost.',
      keywords: ['ClawAI vs ChatGPT', 'ChatGPT alternative', 'multi-model AI workspace'],
    },
    'compare/claude': {
      title: 'ClawAI vs Claude',
      description:
        'One careful model versus nine families that can check each other: how ClawAI and Claude differ on routing, second opinions, local models and self-hosting.',
      keywords: ['ClawAI vs Claude', 'Claude alternative', 'multi-model AI workspace'],
    },
    'compare/gemini': {
      title: 'ClawAI vs Gemini',
      description:
        'Workspace-native versus provider-neutral: how ClawAI and Gemini differ on model choice, connectors, routing, local models, self-hosting and per-answer cost.',
      keywords: ['ClawAI vs Gemini', 'Gemini alternative', 'provider-neutral AI workspace'],
    },
    'compare/perplexity': {
      title: 'ClawAI vs Perplexity',
      description:
        'A cited answer engine versus a multi-model workspace: how ClawAI and Perplexity differ on research, model choice, memory, local models and self-hosting.',
      keywords: ['ClawAI vs Perplexity', 'Perplexity alternative', 'AI research workspace'],
    },
    'compare/copilot': {
      title: 'ClawAI vs Microsoft Copilot',
      description:
        'Microsoft 365-native versus vendor-neutral: how ClawAI and Copilot differ on model choice, routing, per-answer cost and deployment on your own servers.',
      keywords: ['ClawAI vs Microsoft Copilot', 'Copilot alternative', 'self-hosted AI workspace'],
    },
    'compare/kimi': {
      title: 'ClawAI vs Kimi',
      description:
        'Open weights you run yourself versus nine families on one subscription: how ClawAI and Kimi differ on model choice, routing, long context and self-hosting.',
      keywords: ['ClawAI vs Kimi', 'Kimi alternative', 'open-weight AI workspace'],
    },
    'compare/qwen': {
      title: 'ClawAI vs Qwen',
      description:
        'A model you operate versus a workspace above the models: how ClawAI and Qwen differ on model choice, routing, side-by-side answers, memory and self-hosting.',
      keywords: ['ClawAI vs Qwen', 'Qwen alternative', 'multi-model AI workspace'],
    },
    'compare/glm': {
      title: 'ClawAI vs GLM',
      description:
        'Open weights at low cost versus routing across nine families: how ClawAI and GLM differ on model choice, cost-aware routing, self-hosting and per-answer cost.',
      keywords: ['ClawAI vs GLM', 'GLM alternative', 'cost-aware model routing'],
    },
    'compare/deepseek': {
      title: 'ClawAI vs DeepSeek',
      description:
        'Open-weight reasoning versus nine families on one subscription: how ClawAI and DeepSeek differ on model choice, routing, second opinions and self-hosting.',
      keywords: ['ClawAI vs DeepSeek', 'DeepSeek alternative', 'open-weight AI workspace'],
    },
    'coding-agent': {
      title: 'ClawAI Coding Agent for VS Code',
      description:
        'See how the VS Code extension reaches every model on your ClawAI subscription, with routing, comparison, reviewable diffs, and history kept on the platform.',
      keywords: ['ClawAI Coding Agent', 'VS Code AI extension', 'AI coding assistant'],
    },
    'coding-agent/install': {
      title: 'Install the ClawAI Coding Agent for VS Code',
      description:
        'Install the extension from the Marketplace or the command line, sign in with your backend URL, and work through the common install and sign-in problems.',
      keywords: [
        'install ClawAI Coding Agent',
        'VS Code extension install',
        'AI coding assistant setup',
      ],
    },
  },
  [Locale.AR]: {
    home: {
      title: 'مساحة عمل واحدة للذكاء الاصطناعي السحابي والمحلي',
      description:
        'استخدم نماذج الذكاء الاصطناعي السحابية والمحلية من مساحة عمل واحدة، ووجّه كل طلب وفق المهمة والسياسة، واحتفظ بالمحادثات والملفات وأدوات التنسيق معًا.',
      keywords: ['مساحة عمل للذكاء الاصطناعي', 'توجيه النماذج', 'ذكاء اصطناعي محلي'],
    },
    about: {
      title: 'حول منصة تنسيق الذكاء الاصطناعي',
      description:
        'تعرّف إلى سبب جمع المنصة بين حرية اختيار المزوّد والتوجيه الملائم للمهمة والسياق القابل لإعادة الاستخدام وخيارات النشر الخاص في مساحة عمل عملية.',
      keywords: ['حول المنصة', 'تنسيق الذكاء الاصطناعي', 'اختيار المزوّد'],
    },
    'acceptable-use': {
      title: 'سياسة الاستخدام المقبول',
      description:
        'اقرأ قواعد الاستخدام المسؤول للمنصة والأنشطة المحظورة وحماية الحساب والوصول الآلي والإجراءات التي قد تُتخذ عند مخالفة هذه السياسة.',
      keywords: ['الاستخدام المقبول', 'الاستخدام المسؤول', 'الأنشطة المحظورة'],
    },
    architecture: {
      title: 'بنية منصة قائمة على الأحداث',
      description:
        'استكشف البنية المعتمدة على خدمات مستقلة وملكية البيانات المعزولة والتنسيق القائم على الأحداث وبث الاستجابات والضوابط المحيطة بتنفيذ النماذج.',
      keywords: ['بنية الذكاء الاصطناعي', 'الخدمات المصغرة', 'منصة قائمة على الأحداث'],
    },
    contact: {
      title: 'تواصل مع الفريق',
      description:
        'تواصل مع الفريق بشأن أسئلة المنتج أو دعم الفوترة أو إعداد المزوّدين أو النشر الخاص أو أي متطلبات تقنية خاصة بمؤسستك.',
      keywords: ['التواصل مع الدعم', 'أسئلة المنتج', 'النشر الخاص'],
    },
    cookies: {
      title: 'إشعار ملفات تعريف الارتباط',
      description:
        'تعرّف إلى آليات التخزين في المتصفح وملفات تعريف الارتباط المستخدمة للجلسات والتفضيلات واللغة وميزات الإعلانات الاختيارية في الصفحات العامة.',
      keywords: ['إشعار ملفات الارتباط', 'تخزين المتصفح', 'تفضيلات الخصوصية'],
    },
    faq: {
      title: 'الأسئلة الشائعة',
      description:
        'اعثر على إجابات واضحة حول الخطط وحدود الاستخدام والمزوّدين المدعومين وتوافر النماذج والتوجيه ومعالجة البيانات وبيئات التشغيل المحلية والنشر الخاص.',
      keywords: ['أسئلة المنصة الشائعة', 'أسئلة الخطط', 'توافر النماذج'],
    },
    features: {
      title: 'ميزات التوجيه والسياق والتنسيق',
      description:
        'استكشف توجيه النماذج وفق المهمة وسير عمل المقارنة والمراجعة والذاكرة القابلة لإعادة الاستخدام وسياق الملفات وربط مساحات العمل ودعم التشغيل المحلي.',
      keywords: ['ميزات تنسيق الذكاء الاصطناعي', 'مقارنة النماذج', 'أدوات السياق'],
    },
    'how-it-works': {
      title: 'كيف يعمل توجيه النماذج',
      description:
        'شاهد كيف ينتقل الطلب من سياق المحادثة إلى اختيار نموذج يراعي السياسات، ثم التنفيذ المتدفق وتسجيل الاستخدام وسير عمل المراجعة الاختياري.',
      keywords: ['آلية توجيه الذكاء الاصطناعي', 'اختيار النموذج', 'بث الاستجابات'],
    },
    'local-first-ai': {
      title: 'ذكاء اصطناعي خاص على بنيتك التحتية',
      description:
        'استكشف عمليات نشر خاصة محددة النطاق يمكنها تشغيل نماذج محلية على بنية تحتية تتحكم بها المؤسسة عندما يجب أن تبقى أعباء العمل داخل شبكتها.',
      keywords: ['نشر ذكاء اصطناعي خاص', 'ذكاء اصطناعي داخل المؤسسة', 'نماذج محلية'],
    },
    pricing: {
      title: 'الخطط وحدود الاستخدام',
      description:
        'قارن الخطط الشهرية والسنوية وحدود الاستخدام الموزونة والتزامن والمحادثات والرسائل ومساحات العمل وحزم السياق والذاكرة والوصول إلى أدوات التنسيق.',
      keywords: ['أسعار الذكاء الاصطناعي', 'حدود الاستخدام', 'خطط الاشتراك'],
    },
    privacy: {
      title: 'إشعار الخصوصية',
      description:
        'راجع المعلومات التي تعالجها الخدمة وأسباب استخدامها والمواضع التي قد يشارك فيها مزوّدون خارجيون وممارسات الاحتفاظ والضوابط المتاحة.',
      keywords: ['إشعار الخصوصية', 'معالجة البيانات', 'ممارسات الاحتفاظ'],
    },
    'security-and-privacy': {
      title: 'ضوابط الأمان والخصوصية',
      description:
        'تعرّف إلى تشفير بيانات اعتماد الموصلات وأمان النقل وحدود الخدمات والتوجيه المحلي فقط وإعدادات الاحتفاظ والضمانات التشغيلية.',
      keywords: ['أمان الذكاء الاصطناعي', 'بيانات اعتماد مشفرة', 'توجيه محلي فقط'],
    },
    'supported-models': {
      title: 'المزوّدون المدعومون ودليل النماذج',
      description:
        'راجع تكاملات OpenAI وAnthropic وGoogle Gemini وDeepSeek وxAI Grok وOllama وllama.cpp؛ وتختلف النماذج الدقيقة بحسب المزوّدين الذين تم إعدادهم.',
      keywords: ['مزوّدو الذكاء الاصطناعي', 'دليل النماذج', 'بيئات النماذج المحلية'],
    },
    terms: {
      title: 'شروط الخدمة',
      description:
        'اقرأ الشروط التي تنظّم الحسابات والاشتراكات والوصول إلى المنصة ومسؤوليات المستخدم والملكية الفكرية وتغييرات الخدمة وإنهاء الاستخدام.',
      keywords: ['شروط الخدمة', 'شروط الاشتراك', 'مسؤوليات المستخدم'],
    },
    'use-cases': {
      title: 'سير عمل ذكي للمهام الواقعية',
      description:
        'شاهد كيف تدعم النماذج الموجّهة والسياق المشترك وسير عمل المراجعة تطوير البرمجيات والبحث والتحليل والكتابة والدعم ومهام المستندات.',
      keywords: ['حالات استخدام الذكاء الاصطناعي', 'سير عمل البحث', 'إنتاجية المطورين'],
    },
    compare: {
      title: 'قارن ClawAI بمساعدي الذكاء الاصطناعي الآخرين',
      description:
        'مقارنة ClawAI مع ChatGPT وClaude وGemini وPerplexity وMicrosoft Copilot من حيث اختيار النماذج والتوجيه والنماذج المحلية والاستضافة الذاتية والموصلات وتكلفة كل إجابة.',
      keywords: ['مقارنة مساعدي الذكاء الاصطناعي', 'بدائل ClawAI', 'مقارنة أدوات الذكاء الاصطناعي'],
    },
    'compare/chatgpt': {
      title: 'ClawAI مقابل ChatGPT',
      description:
        'مساعد واحد متقن مقابل تسع عائلات نماذج: كيف يختلف ClawAI عن ChatGPT في التوجيه والإجابات المتوازية والنماذج المحلية والاستضافة الذاتية وتكلفة كل إجابة.',
      keywords: ['ClawAI مقابل ChatGPT', 'بديل ChatGPT', 'مساحة عمل متعددة النماذج'],
    },
    'compare/claude': {
      title: 'ClawAI مقابل Claude',
      description:
        'نموذج واحد دقيق مقابل تسع عائلات يمكنها مراجعة بعضها: كيف يختلف ClawAI عن Claude في التوجيه والرأي الثاني والنماذج المحلية والاستضافة الذاتية.',
      keywords: ['ClawAI مقابل Claude', 'بديل Claude', 'مساحة عمل متعددة النماذج'],
    },
    'compare/gemini': {
      title: 'ClawAI مقابل Gemini',
      description:
        'اندماج مع Workspace مقابل حياد تجاه المزوّدين: كيف يختلف ClawAI عن Gemini في اختيار النماذج والموصلات والتوجيه والنماذج المحلية والاستضافة الذاتية.',
      keywords: ['ClawAI مقابل Gemini', 'بديل Gemini', 'مساحة عمل محايدة تجاه المزودين'],
    },
    'compare/perplexity': {
      title: 'ClawAI مقابل Perplexity',
      description:
        'محرك إجابات موثّق المصادر مقابل مساحة عمل متعددة النماذج: كيف يختلف ClawAI عن Perplexity في البحث واختيار النماذج والذاكرة والنماذج المحلية والاستضافة الذاتية.',
      keywords: ['ClawAI مقابل Perplexity', 'بديل Perplexity', 'مساحة عمل للبحث بالذكاء الاصطناعي'],
    },
    'compare/copilot': {
      title: 'ClawAI مقابل Microsoft Copilot',
      description:
        'اندماج مع Microsoft 365 مقابل حياد تجاه المورّدين: كيف يختلف ClawAI عن Copilot في اختيار النماذج والتوجيه وتكلفة كل إجابة والنشر على خوادمك.',
      keywords: ['ClawAI مقابل Microsoft Copilot', 'بديل Copilot', 'مساحة عمل ذاتية الاستضافة'],
    },
    'compare/kimi': {
      title: 'ClawAI مقابل Kimi',
      description:
        'أوزان مفتوحة تستضيفها بنفسك مقابل تسع عائلات باشتراك واحد: كيف يختلف ClawAI عن Kimi في اختيار النماذج والتوجيه والتشغيل المحلي وتكلفة كل إجابة.',
      keywords: ['ClawAI مقابل Kimi', 'بديل Kimi', 'نماذج مفتوحة الأوزان'],
    },
    'compare/qwen': {
      title: 'ClawAI مقابل Qwen',
      description:
        'عائلة مفتوحة الأوزان تشغّلها بنفسك مقابل تسع عائلات باشتراك واحد: كيف يختلف ClawAI عن Qwen في التوجيه والذاكرة والملفات والتشغيل المحلي والاستضافة الذاتية.',
      keywords: ['ClawAI مقابل Qwen', 'بديل Qwen', 'استضافة ذاتية للنماذج المفتوحة'],
    },
    'compare/glm': {
      title: 'ClawAI مقابل GLM',
      description:
        'أوزان مفتوحة ومنتج مغلق مقابل تسع عائلات باشتراك واحد: كيف يختلف ClawAI عن GLM في اختيار النماذج والتوجيه والاستضافة الذاتية وتكلفة كل إجابة.',
      keywords: ['ClawAI مقابل GLM', 'بديل GLM', 'مساحة عمل متعددة النماذج'],
    },
    'compare/deepseek': {
      title: 'ClawAI مقابل DeepSeek',
      description:
        'نماذج استدلال مفتوحة الأوزان مقابل تسع عائلات باشتراك واحد: كيف يختلف ClawAI عن DeepSeek في التوجيه والإجابات المتوازية والتشغيل المحلي وتكلفة كل إجابة.',
      keywords: ['ClawAI مقابل DeepSeek', 'بديل DeepSeek', 'نماذج استدلال مفتوحة الأوزان'],
    },
    'coding-agent': {
      title: 'وكيل البرمجة من ClawAI لـ VS Code',
      description:
        'تعرّف إلى إضافة VS Code التي تصل إلى نماذج اشتراك ClawAI من داخل المحرّر، مع بقاء الحساب والحصص والسجل وبيانات اعتماد المزوّدين والتوجيه على المنصة.',
      keywords: [
        'وكيل البرمجة من ClawAI',
        'إضافة VS Code للذكاء الاصطناعي',
        'مساعد برمجة داخل المحرّر',
      ],
    },
    'coding-agent/install': {
      title: 'تثبيت وكيل البرمجة في VS Code',
      description:
        'اتبع خطوات تثبيت إضافة ClawAI من Visual Studio Marketplace أو من سطر الأوامر، ثم تسجيل الدخول واختيار عنوان الخادم، مع حلول للمشكلات الشائعة.',
      keywords: ['تثبيت وكيل البرمجة من ClawAI', 'تثبيت إضافة VS Code', 'دليل تثبيت الإضافة'],
    },
  },
  [Locale.FR]: {
    home: {
      title: 'Un espace pour les IA cloud et locales',
      description:
        'Utilisez des modèles d’IA cloud et locaux dans un même espace, acheminez chaque demande selon la tâche et les règles, puis centralisez échanges, fichiers et outils.',
      keywords: ['espace de travail IA', 'routage de modèles', 'IA locale'],
    },
    about: {
      title: 'À propos de la plateforme d’orchestration',
      description:
        'Découvrez pourquoi la plateforme réunit choix du fournisseur, routage adapté à la tâche, contexte réutilisable et déploiement privé dans un espace pratique.',
      keywords: ['à propos de la plateforme', 'orchestration IA', 'choix du fournisseur'],
    },
    'acceptable-use': {
      title: 'Politique d’utilisation acceptable',
      description:
        'Consultez les règles d’utilisation responsable, les activités interdites, la protection des comptes, les accès automatisés et les suites données aux infractions.',
      keywords: ['utilisation acceptable', 'usage responsable de l’IA', 'activités interdites'],
    },
    architecture: {
      title: 'Architecture événementielle de la plateforme',
      description:
        'Explorez une architecture par services, la propriété isolée des données, la coordination événementielle, les réponses en flux et les contrôles d’exécution.',
      keywords: ['architecture IA', 'microservices', 'plateforme événementielle'],
    },
    contact: {
      title: 'Contacter l’équipe',
      description:
        'Contactez l’équipe pour une question produit, une aide à la facturation, la configuration d’un fournisseur, un déploiement privé ou un besoin technique.',
      keywords: ['contacter le support', 'questions produit', 'déploiement privé'],
    },
    cookies: {
      title: 'Avis relatif aux cookies',
      description:
        'Comprenez les mécanismes de stockage du navigateur et les cookies utilisés pour les sessions, préférences, langues et fonctions publicitaires facultatives.',
      keywords: ['avis cookies', 'stockage du navigateur', 'préférences de confidentialité'],
    },
    faq: {
      title: 'Questions fréquentes',
      description:
        'Trouvez des réponses claires sur les offres, quotas, fournisseurs pris en charge, modèles disponibles, routage, traitement des données et déploiements privés.',
      keywords: ['FAQ plateforme IA', 'questions sur les offres', 'disponibilité des modèles'],
    },
    features: {
      title: 'Fonctions de routage, contexte et orchestration',
      description:
        'Explorez le routage selon la tâche, les parcours de comparaison et de révision, la mémoire réutilisable, les fichiers, les connexions et l’exécution locale.',
      keywords: ['fonctions d’orchestration IA', 'comparaison de modèles', 'outils de contexte'],
    },
    'how-it-works': {
      title: 'Fonctionnement du routage des modèles',
      description:
        'Suivez une demande depuis le contexte de la conversation jusqu’au choix conforme aux règles, à l’exécution en flux, au suivi d’usage et à la révision facultative.',
      keywords: ['routage IA', 'sélection de modèle', 'réponses en flux'],
    },
    'local-first-ai': {
      title: 'IA privée sur votre infrastructure',
      description:
        'Découvrez des déploiements privés cadrés qui exécutent des modèles locaux sur l’infrastructure de l’organisation lorsque les charges doivent rester sur son réseau.',
      keywords: ['déploiement IA privé', 'IA sur site', 'modèles locaux'],
    },
    pricing: {
      title: 'Offres et quotas d’utilisation',
      description:
        'Comparez les offres mensuelles et annuelles, les quotas pondérés, la concurrence, les conversations, messages, espaces, packs de contexte et fonctions d’orchestration.',
      keywords: ['tarifs IA', 'quotas d’utilisation', 'offres par abonnement'],
    },
    privacy: {
      title: 'Avis de confidentialité',
      description:
        'Découvrez les informations traitées, leurs finalités, les cas où des fournisseurs externes interviennent, les pratiques de conservation et les contrôles disponibles.',
      keywords: ['avis de confidentialité', 'traitement des données', 'conservation des données'],
    },
    'security-and-privacy': {
      title: 'Contrôles de sécurité et de confidentialité',
      description:
        'Découvrez le chiffrement des identifiants de connexion, la sécurité du transport, les limites entre services, le routage local et les réglages de conservation.',
      keywords: ['sécurité de l’IA', 'identifiants chiffrés', 'routage local'],
    },
    'supported-models': {
      title: 'Fournisseurs pris en charge et catalogue',
      description:
        'Consultez les intégrations OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, Ollama et llama.cpp ; les modèles exacts dépendent de votre configuration.',
      keywords: [
        'fournisseurs IA compatibles',
        'catalogue de modèles',
        'moteurs de modèles locaux',
      ],
    },
    terms: {
      title: 'Conditions d’utilisation',
      description:
        'Lisez les conditions applicables aux comptes, abonnements, accès à la plateforme, responsabilités, propriété intellectuelle, évolutions du service et résiliation.',
      keywords: [
        'conditions d’utilisation',
        'conditions d’abonnement',
        'responsabilités utilisateur',
      ],
    },
    'use-cases': {
      title: 'Des flux IA pour le travail quotidien',
      description:
        'Découvrez comment routage, contexte partagé et révision assistent le développement logiciel, la recherche, l’analyse, la rédaction, le support et les documents.',
      keywords: ['cas d’usage IA', 'flux de recherche', 'productivité des développeurs'],
    },
    compare: {
      title: 'Comparer ClawAI aux autres assistants IA',
      description:
        'ClawAI face à ChatGPT, Claude, Gemini, Perplexity et Microsoft Copilot : choix des modèles, routage, modèles locaux, auto-hébergement, connecteurs et coût par réponse.',
      keywords: ['comparatif assistants IA', 'alternatives à ClawAI', 'comparer les outils IA'],
    },
    'compare/chatgpt': {
      title: 'ClawAI vs ChatGPT : le comparatif',
      description:
        'Un assistant unique et abouti face à neuf familles de modèles : routage, réponses côte à côte, modèles locaux, auto-hébergement et coût par réponse.',
      keywords: [
        'ClawAI vs ChatGPT',
        'alternative à ChatGPT',
        'espace de travail IA multi-modèles',
      ],
    },
    'compare/claude': {
      title: 'ClawAI vs Claude : le comparatif',
      description:
        'Un modèle rigoureux face à neuf familles qui peuvent se relire : routage, deuxième avis, modèles locaux et auto-hébergement, comparés point par point.',
      keywords: ['ClawAI vs Claude', 'alternative à Claude', 'espace de travail IA multi-modèles'],
    },
    'compare/gemini': {
      title: 'ClawAI vs Gemini : le comparatif',
      description:
        'Intégré à Workspace ou neutre vis-à-vis des fournisseurs : choix des modèles, connecteurs, routage, modèles locaux et auto-hébergement comparés.',
      keywords: ['ClawAI vs Gemini', 'alternative à Gemini', 'espace de travail IA neutre'],
    },
    'compare/perplexity': {
      title: 'ClawAI vs Perplexity : le comparatif',
      description:
        'Un moteur de réponses sourcées face à un espace de travail multi-modèles : recherche, choix des modèles, mémoire, modèles locaux et auto-hébergement.',
      keywords: ['ClawAI vs Perplexity', 'alternative à Perplexity', 'espace de recherche IA'],
    },
    'compare/copilot': {
      title: 'ClawAI vs Microsoft Copilot : le comparatif',
      description:
        'Intégré à Microsoft 365 ou neutre : choix des modèles, routage, coût par réponse et déploiement sur vos propres serveurs, comparés point par point.',
      keywords: [
        'ClawAI vs Microsoft Copilot',
        'alternative à Copilot',
        'espace de travail IA auto-hébergé',
      ],
    },
    'compare/kimi': {
      title: 'ClawAI vs Kimi : le comparatif',
      description:
        'Contexte long chez un seul fournisseur ou neuf familles sous un abonnement : poids ouverts, exécution locale, auto-hébergement et coût par réponse.',
      keywords: ['ClawAI vs Kimi', 'alternative à Kimi', 'modèles à poids ouverts'],
    },
    'compare/qwen': {
      title: 'ClawAI vs Qwen : le comparatif',
      description:
        'Une famille à poids ouverts que vous hébergez vous-même ou la couche au-dessus : routage, comparaison, mémoire, exécution locale et quota unique.',
      keywords: ['ClawAI vs Qwen', 'alternative à Qwen', 'exécuter des modèles à poids ouverts'],
    },
    'compare/glm': {
      title: 'ClawAI vs GLM : le comparatif',
      description:
        'Le rapport prix-capacité d’un seul laboratoire face à neuf familles : poids ouverts, exécution locale, auto-hébergement et coût par réponse.',
      keywords: ['ClawAI vs GLM', 'alternative à GLM', 'modèles à poids ouverts auto-hébergés'],
    },
    'compare/deepseek': {
      title: 'ClawAI vs DeepSeek : le comparatif',
      description:
        'Un modèle de raisonnement à poids ouverts ou neuf familles routées message par message : exécution locale, auto-hébergement et coût par réponse.',
      keywords: [
        'ClawAI vs DeepSeek',
        'alternative à DeepSeek',
        'modèles de raisonnement à poids ouverts',
      ],
    },
    'coding-agent': {
      title: 'L’agent de codage ClawAI pour VS Code',
      description:
        'L’extension VS Code qui atteint les modèles de votre abonnement ClawAI : compte, quotas, historique, identifiants et routage restent sur la plateforme.',
      keywords: [
        'agent de codage ClawAI',
        'extension VS Code pour l’IA',
        'assistant de code multi-modèles',
      ],
    },
    'coding-agent/install': {
      title: 'Installer l’agent de codage pour VS Code',
      description:
        'Installez l’extension depuis la Marketplace ou en ligne de commande, connectez-vous dans le navigateur, puis indiquez l’URL de votre plateforme.',
      keywords: [
        'installer l’agent de codage ClawAI',
        'extension VS Code ClawAI',
        'connexion depuis VS Code',
      ],
    },
  },
  [Locale.IT]: {
    home: {
      title: 'Un solo spazio per IA cloud e locale',
      description:
        'Usa modelli di IA cloud e locali in un unico spazio, instrada ogni richiesta in base al compito e alle regole e riunisci conversazioni, file e strumenti.',
      keywords: ['spazio di lavoro IA', 'instradamento modelli', 'IA locale'],
    },
    about: {
      title: 'La piattaforma di orchestrazione',
      description:
        'Scopri perché la piattaforma unisce scelta del provider, instradamento adatto al compito, contesto riutilizzabile e opzioni di distribuzione privata.',
      keywords: ['informazioni sulla piattaforma', 'orchestrazione IA', 'scelta del provider'],
    },
    'acceptable-use': {
      title: 'Politica di utilizzo accettabile',
      description:
        'Consulta le regole per un uso responsabile, le attività vietate, la protezione dell’account, gli accessi automatizzati e le conseguenze delle violazioni.',
      keywords: ['utilizzo accettabile', 'uso responsabile dell’IA', 'attività vietate'],
    },
    architecture: {
      title: 'Architettura della piattaforma a eventi',
      description:
        'Esplora l’architettura a servizi, la proprietà isolata dei dati, il coordinamento a eventi, le risposte in streaming e i controlli sull’esecuzione dei modelli.',
      keywords: ['architettura IA', 'microservizi', 'piattaforma a eventi'],
    },
    contact: {
      title: 'Contatta il team',
      description:
        'Contatta il team per domande sul prodotto, assistenza alla fatturazione, configurazione dei provider, distribuzioni private o requisiti tecnici aziendali.',
      keywords: ['contatta assistenza', 'domande sul prodotto', 'distribuzione privata'],
    },
    cookies: {
      title: 'Informativa sui cookie',
      description:
        'Comprendi i meccanismi di archiviazione del browser e i cookie usati per sessioni, preferenze, lingua e funzionalità pubblicitarie facoltative.',
      keywords: ['informativa cookie', 'archiviazione browser', 'preferenze privacy'],
    },
    faq: {
      title: 'Domande frequenti',
      description:
        'Trova risposte chiare su piani, soglie d’uso, provider supportati, disponibilità dei modelli, instradamento, trattamento dei dati e distribuzione privata.',
      keywords: ['FAQ piattaforma IA', 'domande sui piani', 'disponibilità modelli'],
    },
    features: {
      title: 'Instradamento, contesto e orchestrazione',
      description:
        'Esplora instradamento per compito, flussi di confronto e revisione, memoria riutilizzabile, contesto dei file, connessioni agli spazi e runtime locali.',
      keywords: ['funzionalità orchestrazione IA', 'confronto modelli', 'strumenti di contesto'],
    },
    'how-it-works': {
      title: 'Come funziona l’instradamento dei modelli',
      description:
        'Segui una richiesta dal contesto della conversazione alla scelta conforme alle regole, all’esecuzione in streaming, al conteggio dell’uso e alla revisione.',
      keywords: ['instradamento IA', 'selezione modello', 'risposte in streaming'],
    },
    'local-first-ai': {
      title: 'IA privata sulla tua infrastruttura',
      description:
        'Scopri distribuzioni private definite su misura che eseguono modelli locali su infrastrutture controllate dall’organizzazione quando i carichi devono restare in rete.',
      keywords: ['distribuzione IA privata', 'IA on-premise', 'modelli locali'],
    },
    pricing: {
      title: 'Piani e soglie di utilizzo',
      description:
        'Confronta piani mensili e annuali, soglie ponderate, concorrenza, chat, messaggi, spazi di lavoro, pacchetti di contesto, memoria e funzioni di orchestrazione.',
      keywords: ['prezzi IA', 'soglie di utilizzo', 'piani in abbonamento'],
    },
    privacy: {
      title: 'Informativa sulla privacy',
      description:
        'Esamina quali informazioni tratta il servizio, perché vengono usate, quando intervengono provider esterni, le pratiche di conservazione e i controlli disponibili.',
      keywords: ['informativa privacy', 'trattamento dati', 'conservazione dati'],
    },
    'security-and-privacy': {
      title: 'Controlli di sicurezza e privacy',
      description:
        'Scopri credenziali dei connettori cifrate, sicurezza del trasporto, confini tra servizi, instradamento solo locale, impostazioni di conservazione e tutele operative.',
      keywords: ['sicurezza IA', 'credenziali cifrate', 'instradamento locale'],
    },
    'supported-models': {
      title: 'Provider supportati e catalogo dei modelli',
      description:
        'Consulta le integrazioni con OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, Ollama e llama.cpp; i modelli esatti dipendono dai provider configurati.',
      keywords: ['provider IA supportati', 'catalogo modelli', 'runtime per modelli locali'],
    },
    terms: {
      title: 'Termini di servizio',
      description:
        'Leggi i termini che regolano account, abbonamenti, accesso alla piattaforma, responsabilità degli utenti, proprietà intellettuale, modifiche e cessazione.',
      keywords: ['termini di servizio', 'condizioni di abbonamento', 'responsabilità utente'],
    },
    'use-cases': {
      title: 'Flussi di IA per il lavoro reale',
      description:
        'Scopri come modelli instradati, contesto condiviso e revisioni supportano sviluppo software, ricerca, analisi, scrittura, assistenza e attività documentali.',
      keywords: ['casi d’uso IA', 'flussi di ricerca', 'produttività sviluppatori'],
    },
    compare: {
      title: 'Confronta ClawAI con gli altri assistenti IA',
      description:
        'ClawAI a confronto con ChatGPT, Claude, Gemini, Perplexity e Microsoft Copilot: scelta dei modelli, routing, modelli locali, self-hosting, connettori e costo per risposta.',
      keywords: ['confronto assistenti IA', 'alternative a ClawAI', 'confrontare strumenti IA'],
    },
    'compare/chatgpt': {
      title: 'ClawAI vs ChatGPT: il confronto',
      description:
        'Un assistente curato contro nove famiglie di modelli: routing, risposte affiancate, modelli locali, self-hosting e costo per risposta a confronto.',
      keywords: ['ClawAI vs ChatGPT', 'alternativa a ChatGPT', 'workspace IA multi-modello'],
    },
    'compare/claude': {
      title: 'ClawAI vs Claude: il confronto',
      description:
        'Un modello accurato contro nove famiglie che possono controllarsi a vicenda: routing, seconda opinione, modelli locali e self-hosting a confronto.',
      keywords: ['ClawAI vs Claude', 'alternativa a Claude', 'workspace IA multi-modello'],
    },
    'compare/gemini': {
      title: 'ClawAI vs Gemini: il confronto',
      description:
        'Nativo di Workspace o neutrale rispetto ai fornitori: scelta dei modelli, connettori, routing, modelli locali e self-hosting messi a confronto.',
      keywords: ['ClawAI vs Gemini', 'alternativa a Gemini', 'workspace IA neutrale'],
    },
    'compare/perplexity': {
      title: 'ClawAI vs Perplexity: il confronto',
      description:
        'Un motore di risposte con fonti contro un workspace multi-modello: ricerca, scelta dei modelli, memoria, modelli locali e self-hosting.',
      keywords: ['ClawAI vs Perplexity', 'alternativa a Perplexity', 'workspace di ricerca IA'],
    },
    'compare/copilot': {
      title: 'ClawAI vs Microsoft Copilot: il confronto',
      description:
        'Nativo di Microsoft 365 o indipendente dal fornitore: scelta dei modelli, routing, costo per risposta e installazione sui tuoi server.',
      keywords: [
        'ClawAI vs Microsoft Copilot',
        'alternativa a Copilot',
        'workspace IA self-hosted',
      ],
    },
    'compare/kimi': {
      title: 'ClawAI vs Kimi: il confronto',
      description:
        'Contesto lungo con pesi aperti da ospitare da sé contro nove famiglie in un abbonamento: routing, modelli locali, self-hosting e costo per risposta.',
      keywords: ['ClawAI vs Kimi', 'alternativa a Kimi', 'workspace IA a pesi aperti'],
    },
    'compare/qwen': {
      title: 'ClawAI vs Qwen: il confronto',
      description:
        'Una famiglia a pesi aperti da gestire o un livello che la usa: scelta dei modelli, routing, risposte affiancate, memoria e self-hosting a confronto.',
      keywords: ['ClawAI vs Qwen', 'alternativa a Qwen', 'workspace IA self-hosted'],
    },
    'compare/glm': {
      title: 'ClawAI vs GLM: il confronto',
      description:
        'Il rapporto prezzo/capacità di un solo laboratorio contro nove famiglie: pesi aperti, routing per messaggio, modelli locali e self-hosting.',
      keywords: ['ClawAI vs GLM', 'alternativa a GLM', 'workspace IA multi-modello'],
    },
    'compare/deepseek': {
      title: 'ClawAI vs DeepSeek: il confronto',
      description:
        'Un fornitore di ragionamento a pesi aperti contro un workspace multi-modello: routing, risposte affiancate, modelli locali e self-hosting.',
      keywords: ['ClawAI vs DeepSeek', 'alternativa a DeepSeek', 'workspace IA con modelli locali'],
    },
    'coding-agent': {
      title: 'ClawAI Coding Agent per VS Code',
      description:
        'Scopri l’estensione per VS Code che porta i modelli del tuo abbonamento ClawAI nell’editor: account, quote, credenziali e cronologia restano sulla piattaforma.',
      keywords: [
        'ClawAI Coding Agent',
        'estensione IA per VS Code',
        'assistente di codice nell’editor',
      ],
    },
    'coding-agent/install': {
      title: 'Installa il Coding Agent per VS Code',
      description:
        'Segui i tre passaggi per installare l’estensione dal Marketplace o da riga di comando, accedere al tuo account ClawAI e indicare l’indirizzo del backend.',
      keywords: ['installare ClawAI Coding Agent', 'estensione VS Code', 'guida all’installazione'],
    },
  },
  [Locale.DE]: {
    home: {
      title: 'Ein Arbeitsbereich für Cloud- und lokale KI',
      description:
        'Nutzen Sie Cloud- und lokale KI-Modelle in einem Arbeitsbereich, leiten Sie Anfragen nach Aufgabe und Richtlinie weiter und bündeln Sie Chats, Dateien und Werkzeuge.',
      keywords: ['KI-Arbeitsbereich', 'Modellrouting', 'lokale KI'],
    },
    about: {
      title: 'Über die Orchestrierungsplattform',
      description:
        'Erfahren Sie, warum die Plattform Anbieterwahl, aufgabenbezogenes Routing, wiederverwendbaren Kontext und private Bereitstellung in einer Arbeitsumgebung verbindet.',
      keywords: ['über die Plattform', 'KI-Orchestrierung', 'Anbieterwahl'],
    },
    'acceptable-use': {
      title: 'Richtlinie zur zulässigen Nutzung',
      description:
        'Lesen Sie die Regeln für verantwortungsvolle Nutzung, verbotene Aktivitäten, Kontoschutz, automatisierte Zugriffe und mögliche Folgen von Verstößen.',
      keywords: ['zulässige Nutzung', 'verantwortungsvolle KI-Nutzung', 'verbotene Aktivitäten'],
    },
    architecture: {
      title: 'Ereignisgesteuerte Plattformarchitektur',
      description:
        'Entdecken Sie die servicebasierte Architektur, getrennte Datenverantwortung, ereignisgesteuerte Koordination, gestreamte Antworten und Ausführungskontrollen.',
      keywords: ['KI-Architektur', 'Microservices', 'ereignisgesteuerte Plattform'],
    },
    contact: {
      title: 'Kontakt zum Team',
      description:
        'Kontaktieren Sie das Team bei Produktfragen, Abrechnungshilfe, Anbietereinrichtung, privater Bereitstellung oder besonderen technischen Anforderungen Ihrer Organisation.',
      keywords: ['Support kontaktieren', 'Produktfragen', 'private Bereitstellung'],
    },
    cookies: {
      title: 'Cookie-Hinweis',
      description:
        'Informieren Sie sich über Browserspeicher und Cookies für Sitzungen, Einstellungen, Sprache sowie optionale Werbefunktionen auf öffentlich zugänglichen Seiten.',
      keywords: ['Cookie-Hinweis', 'Browserspeicher', 'Datenschutzeinstellungen'],
    },
    faq: {
      title: 'Häufig gestellte Fragen',
      description:
        'Finden Sie klare Antworten zu Tarifen, Nutzungskontingenten, unterstützten Anbietern, Modellverfügbarkeit, Routing, Datenverarbeitung und privater Bereitstellung.',
      keywords: ['KI-Plattform FAQ', 'Tariffragen', 'Modellverfügbarkeit'],
    },
    features: {
      title: 'Routing-, Kontext- und Orchestrierungsfunktionen',
      description:
        'Entdecken Sie aufgabenbezogenes Modellrouting, Vergleich und Prüfung, wiederverwendbaren Speicher, Dateikontext, Arbeitsbereichsanbindungen und lokale Laufzeiten.',
      keywords: ['KI-Orchestrierungsfunktionen', 'Modellvergleich', 'Kontextwerkzeuge'],
    },
    'how-it-works': {
      title: 'So funktioniert das Modellrouting',
      description:
        'Verfolgen Sie eine Anfrage vom Gesprächskontext über die richtliniengerechte Modellwahl bis zur gestreamten Ausführung, Nutzungserfassung und optionalen Prüfung.',
      keywords: ['KI-Routing erklärt', 'Modellauswahl', 'gestreamte Antworten'],
    },
    'local-first-ai': {
      title: 'Private KI auf Ihrer Infrastruktur',
      description:
        'Entdecken Sie individuell abgegrenzte private Bereitstellungen mit lokalen Modellen auf organisationskontrollierter Infrastruktur für netzinterne Arbeitslasten.',
      keywords: ['private KI-Bereitstellung', 'KI im eigenen Rechenzentrum', 'lokale Modelle'],
    },
    pricing: {
      title: 'Tarife und Nutzungskontingente',
      description:
        'Vergleichen Sie Monats- und Jahrestarife, gewichtete Kontingente, Parallelität, Chats, Nachrichten, Arbeitsbereiche, Kontextpakete, Speicher und Orchestrierungszugriff.',
      keywords: ['KI-Preise', 'Nutzungskontingente', 'Abonnementtarife'],
    },
    privacy: {
      title: 'Datenschutzhinweis',
      description:
        'Lesen Sie, welche Informationen der Dienst verarbeitet, wofür sie genutzt werden, wann externe Anbieter beteiligt sind und welche Aufbewahrung und Kontrollen gelten.',
      keywords: ['Datenschutzhinweis', 'Datenverarbeitung', 'Datenaufbewahrung'],
    },
    'security-and-privacy': {
      title: 'Sicherheits- und Datenschutzkontrollen',
      description:
        'Erfahren Sie mehr über verschlüsselte Zugangsdaten, Transportsicherheit, Dienstgrenzen, rein lokales Routing, Aufbewahrungseinstellungen und betriebliche Schutzmaßnahmen.',
      keywords: ['KI-Sicherheit', 'verschlüsselte Zugangsdaten', 'lokales Routing'],
    },
    'supported-models': {
      title: 'Unterstützte Anbieter und Modellkatalog',
      description:
        'Informieren Sie sich über OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, Ollama und llama.cpp; die genauen Modelle hängen von der Konfiguration ab.',
      keywords: ['unterstützte KI-Anbieter', 'Modellkatalog', 'lokale Modelllaufzeiten'],
    },
    terms: {
      title: 'Nutzungsbedingungen',
      description:
        'Lesen Sie die Bedingungen für Konten, Abonnements, Plattformzugriff, Nutzerpflichten, geistiges Eigentum, Dienständerungen und die Beendigung der Nutzung.',
      keywords: ['Nutzungsbedingungen', 'Abonnementbedingungen', 'Nutzerpflichten'],
    },
    'use-cases': {
      title: 'KI-Workflows für die Praxis',
      description:
        'Erfahren Sie, wie geroutete Modelle, gemeinsamer Kontext und Prüfabläufe Softwareentwicklung, Recherche, Analyse, Schreiben, Support und Dokumentarbeit unterstützen.',
      keywords: ['KI-Anwendungsfälle', 'Recherche-Workflows', 'Entwicklerproduktivität'],
    },
    compare: {
      title: 'ClawAI mit anderen KI-Assistenten vergleichen',
      description:
        'ClawAI im Vergleich zu ChatGPT, Claude, Gemini, Perplexity und Microsoft Copilot: Modellauswahl, Routing, lokale Modelle, Self-Hosting, Konnektoren und Kosten pro Antwort.',
      keywords: ['KI-Assistenten Vergleich', 'ClawAI Alternativen', 'KI-Tools vergleichen'],
    },
    'compare/chatgpt': {
      title: 'ClawAI vs. ChatGPT im Vergleich',
      description:
        'Ein ausgereifter Assistent gegen neun Modellfamilien: Routing, Antworten nebeneinander, lokale Modelle, Self-Hosting und Kosten pro Antwort im Vergleich.',
      keywords: ['ClawAI vs ChatGPT', 'ChatGPT Alternative', 'Multi-Modell-KI-Workspace'],
    },
    'compare/claude': {
      title: 'ClawAI vs. Claude im Vergleich',
      description:
        'Ein sorgfältiges Modell gegen neun Familien, die sich gegenseitig prüfen: Routing, Zweitmeinung, lokale Modelle und Self-Hosting im Vergleich.',
      keywords: ['ClawAI vs Claude', 'Claude Alternative', 'Multi-Modell-KI-Workspace'],
    },
    'compare/gemini': {
      title: 'ClawAI vs. Gemini im Vergleich',
      description:
        'Workspace-nah oder anbieterneutral: Modellauswahl, Konnektoren, Routing, lokale Modelle und Self-Hosting von ClawAI und Gemini im Vergleich.',
      keywords: ['ClawAI vs Gemini', 'Gemini Alternative', 'anbieterneutraler KI-Workspace'],
    },
    'compare/perplexity': {
      title: 'ClawAI vs. Perplexity im Vergleich',
      description:
        'Eine Antwortmaschine mit Quellen gegen einen Multi-Modell-Workspace: Recherche, Modellauswahl, Speicher, lokale Modelle und Self-Hosting im Vergleich.',
      keywords: ['ClawAI vs Perplexity', 'Perplexity Alternative', 'KI-Recherche-Workspace'],
    },
    'compare/copilot': {
      title: 'ClawAI vs. Microsoft Copilot im Vergleich',
      description:
        'Microsoft-365-nah oder herstellerneutral: Modellauswahl, Routing, Kosten pro Antwort und Betrieb auf eigenen Servern im Vergleich.',
      keywords: [
        'ClawAI vs Microsoft Copilot',
        'Copilot Alternative',
        'selbst gehosteter KI-Workspace',
      ],
    },
    'compare/kimi': {
      title: 'ClawAI vs. Kimi im Vergleich',
      description:
        'Langer Kontext mit offenen Gewichten gegen neun Modellfamilien: Modellauswahl, Routing, lokale Ausführung, Self-Hosting und Kosten pro Antwort im Vergleich.',
      keywords: ['ClawAI vs Kimi', 'Kimi Alternative', 'Workspace für offene Modelle'],
    },
    'compare/qwen': {
      title: 'ClawAI vs. Qwen im Vergleich',
      description:
        'Eine breite offene Modellfamilie gegen einen Multi-Modell-Workspace: Modellauswahl, Routing, lokale Ausführung, Self-Hosting und Kosten pro Antwort.',
      keywords: ['ClawAI vs Qwen', 'Qwen Alternative', 'offene Modelle im KI-Workspace'],
    },
    'compare/glm': {
      title: 'ClawAI vs. GLM im Vergleich',
      description:
        'Günstige Modelle für Code und Agenten gegen neun Familien: Modellauswahl, Routing, lokale Ausführung, Self-Hosting und Kosten pro Antwort im Vergleich.',
      keywords: ['ClawAI vs GLM', 'GLM Alternative', 'kostenbewusster KI-Workspace'],
    },
    'compare/deepseek': {
      title: 'ClawAI vs. DeepSeek im Vergleich',
      description:
        'Ein Reasoning-Modell mit offenen Gewichten gegen neun Familien: Modellauswahl, Routing, Zweitmeinung, lokale Ausführung und Self-Hosting im Vergleich.',
      keywords: ['ClawAI vs DeepSeek', 'DeepSeek Alternative', 'Workspace für Reasoning-Modelle'],
    },
    'coding-agent': {
      title: 'ClawAI Coding Agent für VS Code',
      description:
        'Die VS-Code-Erweiterung bringt alle Modelle Ihres ClawAI-Abonnements in den Editor; Konto, Kontingente, Zugangsdaten und Verlauf bleiben auf der Plattform.',
      keywords: ['ClawAI Coding Agent', 'VS Code KI-Erweiterung', 'KI-Assistent im Editor'],
    },
    'coding-agent/install': {
      title: 'Coding Agent in VS Code installieren',
      description:
        'Schritt für Schritt: Erweiterung aus dem Marketplace oder per Befehlszeile installieren, anmelden, Backend-URL wählen und häufige Probleme beheben.',
      keywords: [
        'ClawAI Coding Agent installieren',
        'VS Code Erweiterung installieren',
        'KI-Assistent im Editor einrichten',
      ],
    },
  },
  [Locale.ES]: {
    home: {
      title: 'Un espacio para IA local y en la nube',
      description:
        'Usa modelos de IA locales y en la nube desde un mismo espacio, dirige cada solicitud según la tarea y las reglas, y reúne conversaciones, archivos y herramientas.',
      keywords: ['espacio de trabajo IA', 'enrutamiento de modelos', 'IA local'],
    },
    about: {
      title: 'Acerca de la plataforma de orquestación',
      description:
        'Descubre por qué la plataforma reúne elección de proveedor, enrutamiento según la tarea, contexto reutilizable y opciones de despliegue privado.',
      keywords: ['acerca de la plataforma', 'orquestación de IA', 'elección de proveedor'],
    },
    'acceptable-use': {
      title: 'Política de uso aceptable',
      description:
        'Consulta las normas de uso responsable, las actividades prohibidas, la protección de cuentas, el acceso automatizado y las medidas ante incumplimientos.',
      keywords: ['uso aceptable', 'uso responsable de IA', 'actividades prohibidas'],
    },
    architecture: {
      title: 'Arquitectura de plataforma basada en eventos',
      description:
        'Explora la arquitectura por servicios, la propiedad aislada de los datos, la coordinación por eventos, las respuestas en flujo y los controles de ejecución.',
      keywords: ['arquitectura de IA', 'microservicios', 'plataforma basada en eventos'],
    },
    contact: {
      title: 'Contacta con el equipo',
      description:
        'Contacta con el equipo para resolver dudas del producto, facturación, configuración de proveedores, despliegues privados o requisitos técnicos de tu organización.',
      keywords: ['contactar con soporte', 'dudas del producto', 'despliegue privado'],
    },
    cookies: {
      title: 'Aviso de cookies',
      description:
        'Conoce el almacenamiento del navegador y las cookies que se usan para sesiones, preferencias, idioma y funciones publicitarias opcionales en páginas públicas.',
      keywords: ['aviso de cookies', 'almacenamiento del navegador', 'preferencias de privacidad'],
    },
    faq: {
      title: 'Preguntas frecuentes',
      description:
        'Encuentra respuestas claras sobre planes, límites de uso, proveedores compatibles, disponibilidad de modelos, enrutamiento, datos, ejecución local y despliegue privado.',
      keywords: ['preguntas sobre IA', 'dudas de planes', 'disponibilidad de modelos'],
    },
    features: {
      title: 'Funciones de enrutamiento, contexto y orquestación',
      description:
        'Explora el enrutamiento por tarea, flujos de comparación y revisión, memoria reutilizable, contexto de archivos, conexiones de trabajo y ejecución local.',
      keywords: [
        'funciones de orquestación IA',
        'comparación de modelos',
        'herramientas de contexto',
      ],
    },
    'how-it-works': {
      title: 'Cómo funciona el enrutamiento de modelos',
      description:
        'Sigue una solicitud desde el contexto de la conversación hasta la selección acorde con las reglas, la ejecución en flujo, el registro de uso y la revisión opcional.',
      keywords: ['cómo funciona el enrutamiento IA', 'selección de modelos', 'respuestas en flujo'],
    },
    'local-first-ai': {
      title: 'IA privada en tu infraestructura',
      description:
        'Explora despliegues privados de alcance definido que ejecutan modelos locales en infraestructura controlada por la organización cuando el trabajo debe quedar en su red.',
      keywords: ['despliegue privado de IA', 'IA en instalaciones propias', 'modelos locales'],
    },
    pricing: {
      title: 'Planes y límites de uso',
      description:
        'Compara planes mensuales y anuales, límites ponderados, concurrencia, chats, mensajes, espacios de trabajo, paquetes de contexto, memoria y acceso a orquestación.',
      keywords: ['precios de IA', 'límites de uso', 'planes de suscripción'],
    },
    privacy: {
      title: 'Aviso de privacidad',
      description:
        'Revisa qué información procesa el servicio, para qué se utiliza, cuándo pueden intervenir proveedores externos, las prácticas de conservación y los controles disponibles.',
      keywords: ['aviso de privacidad', 'tratamiento de datos', 'conservación de datos'],
    },
    'security-and-privacy': {
      title: 'Controles de seguridad y privacidad',
      description:
        'Conoce el cifrado de credenciales de conectores, la seguridad del transporte, los límites entre servicios, el enrutamiento local y los ajustes de conservación.',
      keywords: ['seguridad de IA', 'credenciales cifradas', 'enrutamiento local'],
    },
    'supported-models': {
      title: 'Proveedores compatibles y catálogo de modelos',
      description:
        'Consulta las integraciones con OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, Ollama y llama.cpp; los modelos exactos dependen de la configuración.',
      keywords: [
        'proveedores de IA compatibles',
        'catálogo de modelos',
        'motores de modelos locales',
      ],
    },
    terms: {
      title: 'Términos del servicio',
      description:
        'Lee las condiciones que rigen cuentas, suscripciones, acceso a la plataforma, responsabilidades, propiedad intelectual, cambios del servicio y finalización.',
      keywords: [
        'términos del servicio',
        'condiciones de suscripción',
        'responsabilidades del usuario',
      ],
    },
    'use-cases': {
      title: 'Flujos de IA para trabajos reales',
      description:
        'Descubre cómo los modelos enrutados, el contexto compartido y la revisión apoyan el desarrollo, la investigación, el análisis, la escritura, el soporte y los documentos.',
      keywords: ['casos de uso de IA', 'flujos de investigación', 'productividad de desarrollo'],
    },
    compare: {
      title: 'Compara ClawAI con otros asistentes de IA',
      description:
        'ClawAI frente a ChatGPT, Claude, Gemini, Perplexity y Microsoft Copilot: elección de modelos, enrutado, modelos locales, autoalojamiento, conectores y coste por respuesta.',
      keywords: [
        'comparativa de asistentes de IA',
        'alternativas a ClawAI',
        'comparar herramientas de IA',
      ],
    },
    'compare/chatgpt': {
      title: 'ClawAI vs ChatGPT: la comparativa',
      description:
        'Un asistente pulido frente a nueve familias de modelos: enrutado, respuestas en paralelo, modelos locales, autoalojamiento y coste por respuesta.',
      keywords: [
        'ClawAI vs ChatGPT',
        'alternativa a ChatGPT',
        'espacio de trabajo de IA multimodelo',
      ],
    },
    'compare/claude': {
      title: 'ClawAI vs Claude: la comparativa',
      description:
        'Un modelo cuidadoso frente a nueve familias que pueden revisarse entre sí: enrutado, segunda opinión, modelos locales y autoalojamiento.',
      keywords: [
        'ClawAI vs Claude',
        'alternativa a Claude',
        'espacio de trabajo de IA multimodelo',
      ],
    },
    'compare/gemini': {
      title: 'ClawAI vs Gemini: la comparativa',
      description:
        'Nativo de Workspace o neutral ante proveedores: elección de modelos, conectores, enrutado, modelos locales y autoalojamiento, comparados.',
      keywords: ['ClawAI vs Gemini', 'alternativa a Gemini', 'espacio de trabajo de IA neutral'],
    },
    'compare/perplexity': {
      title: 'ClawAI vs Perplexity: la comparativa',
      description:
        'Un motor de respuestas con fuentes frente a un espacio multimodelo: investigación, elección de modelos, memoria, modelos locales y autoalojamiento.',
      keywords: [
        'ClawAI vs Perplexity',
        'alternativa a Perplexity',
        'espacio de investigación con IA',
      ],
    },
    'compare/copilot': {
      title: 'ClawAI vs Microsoft Copilot: la comparativa',
      description:
        'Nativo de Microsoft 365 o independiente del proveedor: elección de modelos, enrutado, coste por respuesta y despliegue en tus propios servidores.',
      keywords: [
        'ClawAI vs Microsoft Copilot',
        'alternativa a Copilot',
        'espacio de trabajo de IA autoalojado',
      ],
    },
    'compare/kimi': {
      title: 'ClawAI vs Kimi: la comparativa',
      description:
        'Pesos abiertos de contexto largo frente a nueve familias bajo una suscripción: enrutado, modelos locales, autoalojamiento y coste por respuesta.',
      keywords: [
        'ClawAI vs Kimi',
        'alternativa a Kimi',
        'espacio de trabajo de IA con pesos abiertos',
      ],
    },
    'compare/qwen': {
      title: 'ClawAI vs Qwen: la comparativa',
      description:
        'Pesos abiertos en toda una escalera de tamaños frente a la capa que va encima: enrutado, modelos locales, autoalojamiento y coste por respuesta.',
      keywords: ['ClawAI vs Qwen', 'alternativa a Qwen', 'modelos de pesos abiertos autoalojados'],
    },
    'compare/glm': {
      title: 'ClawAI vs GLM: la comparativa',
      description:
        'Precio y capacidad de un catálogo de pesos abiertos frente a nueve familias: enrutado, modelos locales, autoalojamiento y coste por respuesta.',
      keywords: ['ClawAI vs GLM', 'alternativa a GLM', 'modelos de pesos abiertos para código'],
    },
    'compare/deepseek': {
      title: 'ClawAI vs DeepSeek: la comparativa',
      description:
        'Razonamiento de pesos abiertos a bajo precio frente a nueve familias: elección de modelos, enrutado, modelos locales y coste por respuesta.',
      keywords: [
        'ClawAI vs DeepSeek',
        'alternativa a DeepSeek',
        'modelos de razonamiento de pesos abiertos',
      ],
    },
    'coding-agent': {
      title: 'ClawAI Coding Agent para VS Code',
      description:
        'Descubre la extensión de ClawAI para VS Code: los mismos modelos y el mismo historial, con cuenta, cuotas, credenciales y enrutado en la plataforma.',
      keywords: [
        'ClawAI Coding Agent',
        'extensión de IA para VS Code',
        'asistente de código en el editor',
      ],
    },
    'coding-agent/install': {
      title: 'Instalar ClawAI Coding Agent en VS Code',
      description:
        'Sigue los pasos para instalar la extensión desde el Marketplace o la línea de comandos, iniciar sesión indicando tu backend y resolver fallos habituales.',
      keywords: [
        'instalar ClawAI Coding Agent',
        'extensión de IA para VS Code',
        'Marketplace de Visual Studio',
      ],
    },
  },
  [Locale.RU]: {
    home: {
      title: 'Единое пространство для облачного и локального ИИ',
      description:
        'Используйте облачные и локальные модели ИИ в одном пространстве, направляйте запросы с учётом задачи и правил и храните диалоги, файлы и инструменты вместе.',
      keywords: ['рабочее пространство ИИ', 'маршрутизация моделей', 'локальный ИИ'],
    },
    about: {
      title: 'О платформе оркестрации',
      description:
        'Узнайте, зачем платформа объединяет выбор поставщика, маршрутизацию по задаче, повторно используемый контекст и варианты частного развёртывания.',
      keywords: ['о платформе', 'оркестрация ИИ', 'выбор поставщика'],
    },
    'acceptable-use': {
      title: 'Политика допустимого использования',
      description:
        'Ознакомьтесь с правилами ответственного использования, запрещёнными действиями, защитой учётных записей, автоматическим доступом и мерами при нарушениях.',
      keywords: [
        'допустимое использование',
        'ответственное использование ИИ',
        'запрещённые действия',
      ],
    },
    architecture: {
      title: 'Событийная архитектура платформы',
      description:
        'Изучите сервисную архитектуру, изолированное владение данными, событийную координацию, потоковые ответы и средства контроля исполнения моделей.',
      keywords: ['архитектура ИИ', 'микросервисы', 'событийная платформа'],
    },
    contact: {
      title: 'Связаться с командой',
      description:
        'Обратитесь к команде с вопросами о продукте, оплате, настройке поставщиков, частном развёртывании или технических требованиях вашей организации.',
      keywords: ['связаться с поддержкой', 'вопросы о продукте', 'частное развёртывание'],
    },
    cookies: {
      title: 'Уведомление о файлах cookie',
      description:
        'Узнайте о хранилище браузера и cookie, которые применяются для сеансов, настроек, языка и необязательных рекламных функций на публичных страницах.',
      keywords: ['уведомление cookie', 'хранилище браузера', 'настройки конфиденциальности'],
    },
    faq: {
      title: 'Часто задаваемые вопросы',
      description:
        'Найдите ответы о тарифах, лимитах, поддерживаемых поставщиках, доступности моделей, маршрутизации, обработке данных, локальных средах и частном развёртывании.',
      keywords: ['вопросы об ИИ-платформе', 'вопросы о тарифах', 'доступность моделей'],
    },
    features: {
      title: 'Маршрутизация, контекст и оркестрация',
      description:
        'Изучите маршрутизацию по задаче, сценарии сравнения и проверки, повторно используемую память, контекст файлов, подключения рабочих сред и локальные среды.',
      keywords: ['возможности оркестрации ИИ', 'сравнение моделей', 'инструменты контекста'],
    },
    'how-it-works': {
      title: 'Как работает маршрутизация моделей',
      description:
        'Проследите путь запроса от контекста диалога и выбора модели по правилам до потокового исполнения, учёта использования и необязательной проверки.',
      keywords: ['маршрутизация ИИ', 'выбор модели', 'потоковые ответы'],
    },
    'local-first-ai': {
      title: 'Частный ИИ в вашей инфраструктуре',
      description:
        'Изучите частные развёртывания согласованного масштаба с локальными моделями в инфраструктуре организации, когда рабочие данные должны оставаться внутри сети.',
      keywords: ['частное развёртывание ИИ', 'ИИ в собственной инфраструктуре', 'локальные модели'],
    },
    pricing: {
      title: 'Тарифы и лимиты использования',
      description:
        'Сравните месячные и годовые тарифы, взвешенные лимиты, параллельность, чаты, сообщения, рабочие пространства, пакеты контекста, память и оркестрацию.',
      keywords: ['цены на ИИ', 'лимиты использования', 'тарифы подписки'],
    },
    privacy: {
      title: 'Уведомление о конфиденциальности',
      description:
        'Узнайте, какие данные обрабатывает сервис, зачем они используются, где участвуют внешние поставщики, каковы сроки хранения и доступные средства управления.',
      keywords: ['уведомление о конфиденциальности', 'обработка данных', 'хранение данных'],
    },
    'security-and-privacy': {
      title: 'Контроль безопасности и конфиденциальности',
      description:
        'Узнайте о шифровании данных подключения, защите передачи, границах сервисов, маршрутизации только на локальные модели, сроках хранения и рабочих мерах.',
      keywords: ['безопасность ИИ', 'зашифрованные данные доступа', 'локальная маршрутизация'],
    },
    'supported-models': {
      title: 'Поддерживаемые поставщики и каталог моделей',
      description:
        'Ознакомьтесь с интеграциями OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, Ollama и llama.cpp; точный набор моделей зависит от конфигурации.',
      keywords: ['поддерживаемые поставщики ИИ', 'каталог моделей', 'локальные среды моделей'],
    },
    terms: {
      title: 'Условия использования',
      description:
        'Прочитайте условия для учётных записей, подписок, доступа к платформе, обязанностей пользователя, интеллектуальной собственности, изменений и прекращения сервиса.',
      keywords: ['условия использования', 'условия подписки', 'обязанности пользователя'],
    },
    'use-cases': {
      title: 'Сценарии ИИ для практических задач',
      description:
        'Узнайте, как маршрутизация моделей, общий контекст и проверка помогают в разработке, исследованиях, анализе, написании текстов, поддержке и работе с документами.',
      keywords: [
        'сценарии использования ИИ',
        'исследовательские процессы',
        'продуктивность разработчиков',
      ],
    },
    compare: {
      title: 'Сравнение ClawAI с другими ИИ-ассистентами',
      description:
        'ClawAI против ChatGPT, Claude, Gemini, Perplexity и Microsoft Copilot: выбор моделей, маршрутизация, локальные модели, self-hosting, коннекторы и стоимость ответа.',
      keywords: ['сравнение ИИ-ассистентов', 'альтернативы ClawAI', 'сравнить ИИ-инструменты'],
    },
    'compare/chatgpt': {
      title: 'ClawAI против ChatGPT',
      description:
        'Один отточенный ассистент против девяти семейств моделей: маршрутизация, ответы рядом, локальные модели, self-hosting и стоимость каждого ответа.',
      keywords: [
        'ClawAI против ChatGPT',
        'альтернатива ChatGPT',
        'мультимодельное ИИ-пространство',
      ],
    },
    'compare/claude': {
      title: 'ClawAI против Claude',
      description:
        'Одна аккуратная модель против девяти семейств, которые проверяют друг друга: маршрутизация, второе мнение, локальные модели и self-hosting.',
      keywords: ['ClawAI против Claude', 'альтернатива Claude', 'мультимодельное ИИ-пространство'],
    },
    'compare/gemini': {
      title: 'ClawAI против Gemini',
      description:
        'Интеграция с Workspace или нейтральность к поставщикам: выбор моделей, коннекторы, маршрутизация, локальные модели и self-hosting.',
      keywords: ['ClawAI против Gemini', 'альтернатива Gemini', 'нейтральное ИИ-пространство'],
    },
    'compare/perplexity': {
      title: 'ClawAI против Perplexity',
      description:
        'Поисковый движок с источниками против мультимодельного пространства: исследование, выбор моделей, память, локальные модели и self-hosting.',
      keywords: [
        'ClawAI против Perplexity',
        'альтернатива Perplexity',
        'ИИ-пространство для исследований',
      ],
    },
    'compare/copilot': {
      title: 'ClawAI против Microsoft Copilot',
      description:
        'Интеграция с Microsoft 365 или независимость от вендора: выбор моделей, маршрутизация, стоимость ответа и развёртывание на своих серверах.',
      keywords: [
        'ClawAI против Microsoft Copilot',
        'альтернатива Copilot',
        'self-hosted ИИ-пространство',
      ],
    },
    'compare/kimi': {
      title: 'ClawAI против Kimi',
      description:
        'Длинный контекст и открытые веса у одного поставщика против девяти семейств в одной подписке: маршрутизация, локальные модели, self-hosting и стоимость ответа.',
      keywords: ['ClawAI против Kimi', 'альтернатива Kimi', 'модели с открытыми весами'],
    },
    'compare/qwen': {
      title: 'ClawAI против Qwen',
      description:
        'Запустить открытые веса самому или пользоваться ими через слой с маршрутизацией: выбор моделей, ответы рядом, память и файлы, self-hosting и стоимость ответа.',
      keywords: ['ClawAI против Qwen', 'альтернатива Qwen', 'self-hosted ИИ-пространство'],
    },
    'compare/glm': {
      title: 'ClawAI против GLM',
      description:
        'Одна линейка Zhipu с открытыми весами против девяти семейств рядом: выбор моделей, маршрутизация, локальные модели, self-hosting и стоимость ответа.',
      keywords: ['ClawAI против GLM', 'альтернатива GLM', 'мультимодельное ИИ-пространство'],
    },
    'compare/deepseek': {
      title: 'ClawAI против DeepSeek',
      description:
        'Рассуждение у одного поставщика против маршрутизации между девятью семействами: ответы рядом, локальные модели, self-hosting и стоимость каждого ответа.',
      keywords: ['ClawAI против DeepSeek', 'альтернатива DeepSeek', 'модели с рассуждением'],
    },
    'coding-agent': {
      title: 'ClawAI Coding Agent для VS Code',
      description:
        'Расширение связывает VS Code с вашей подпиской ClawAI: выбор моделей, маршрутизация, сравнение ответов, просмотр правок и общая история с веб-приложением.',
      keywords: ['ClawAI Coding Agent', 'расширение VS Code с ИИ', 'ИИ-ассистент для кода'],
    },
    'coding-agent/install': {
      title: 'Установка ClawAI Coding Agent',
      description:
        'Установите расширение из Visual Studio Marketplace или из командной строки, войдите в аккаунт, укажите адрес бэкенда и разберите частые сбои установки.',
      keywords: [
        'установка ClawAI Coding Agent',
        'установить расширение VS Code',
        'вход в ClawAI из VS Code',
      ],
    },
  },
  [Locale.PT]: {
    home: {
      title: 'Um espaço para IA na nuvem e local',
      description:
        'Use modelos de IA na nuvem e locais em um só espaço, encaminhe cada pedido conforme a tarefa e as regras e reúna conversas, ficheiros e ferramentas.',
      keywords: ['espaço de trabalho de IA', 'roteamento de modelos', 'IA local'],
    },
    about: {
      title: 'Sobre a plataforma de orquestração',
      description:
        'Saiba por que a plataforma reúne escolha de fornecedor, roteamento adequado à tarefa, contexto reutilizável e opções de implantação privada.',
      keywords: ['sobre a plataforma', 'orquestração de IA', 'escolha de fornecedor'],
    },
    'acceptable-use': {
      title: 'Política de utilização aceitável',
      description:
        'Consulte as regras para uso responsável, atividades proibidas, proteção da conta, acesso automatizado e medidas que podem decorrer de violações.',
      keywords: ['utilização aceitável', 'uso responsável de IA', 'atividades proibidas'],
    },
    architecture: {
      title: 'Arquitetura de plataforma orientada a eventos',
      description:
        'Explore a arquitetura por serviços, a propriedade isolada dos dados, a coordenação por eventos, as respostas em fluxo e os controlos de execução dos modelos.',
      keywords: ['arquitetura de IA', 'microsserviços', 'plataforma orientada a eventos'],
    },
    contact: {
      title: 'Contactar a equipa',
      description:
        'Contacte a equipa sobre dúvidas do produto, apoio de faturação, configuração de fornecedores, implantação privada ou requisitos técnicos da sua organização.',
      keywords: ['contactar suporte', 'dúvidas do produto', 'implantação privada'],
    },
    cookies: {
      title: 'Aviso de cookies',
      description:
        'Conheça o armazenamento do navegador e os cookies usados para sessões, preferências, idioma e funcionalidades publicitárias opcionais nas páginas públicas.',
      keywords: ['aviso de cookies', 'armazenamento do navegador', 'preferências de privacidade'],
    },
    faq: {
      title: 'Perguntas frequentes',
      description:
        'Encontre respostas sobre planos, limites, fornecedores compatíveis, disponibilidade de modelos, roteamento, tratamento de dados, execução local e implantação privada.',
      keywords: [
        'perguntas sobre plataforma de IA',
        'dúvidas de planos',
        'disponibilidade de modelos',
      ],
    },
    features: {
      title: 'Roteamento, contexto e orquestração',
      description:
        'Explore roteamento por tarefa, fluxos de comparação e revisão, memória reutilizável, contexto de ficheiros, ligações a espaços de trabalho e execução local.',
      keywords: [
        'funcionalidades de orquestração',
        'comparação de modelos',
        'ferramentas de contexto',
      ],
    },
    'how-it-works': {
      title: 'Como funciona o roteamento de modelos',
      description:
        'Acompanhe um pedido desde o contexto da conversa e seleção conforme as regras até à execução em fluxo, ao registo de utilização e à revisão opcional.',
      keywords: ['como funciona o roteamento de IA', 'seleção de modelos', 'respostas em fluxo'],
    },
    'local-first-ai': {
      title: 'IA privada na sua infraestrutura',
      description:
        'Explore implantações privadas com âmbito definido que executam modelos locais em infraestrutura controlada pela organização quando o trabalho deve ficar na rede.',
      keywords: ['implantação privada de IA', 'IA nas instalações', 'modelos locais'],
    },
    pricing: {
      title: 'Planos e limites de utilização',
      description:
        'Compare planos mensais e anuais, limites ponderados, simultaneidade, conversas, mensagens, espaços de trabalho, pacotes de contexto, memória e orquestração.',
      keywords: ['preços de IA', 'limites de utilização', 'planos de subscrição'],
    },
    privacy: {
      title: 'Aviso de privacidade',
      description:
        'Veja que informações o serviço trata, por que são usadas, quando podem intervir fornecedores externos, as práticas de conservação e os controlos disponíveis.',
      keywords: ['aviso de privacidade', 'tratamento de dados', 'conservação de dados'],
    },
    'security-and-privacy': {
      title: 'Controlos de segurança e privacidade',
      description:
        'Conheça a cifragem das credenciais dos conectores, a segurança do transporte, os limites entre serviços, o roteamento local e as definições de conservação.',
      keywords: ['segurança de IA', 'credenciais cifradas', 'roteamento local'],
    },
    'supported-models': {
      title: 'Fornecedores compatíveis e catálogo de modelos',
      description:
        'Consulte integrações com OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, Ollama e llama.cpp; os modelos exatos dependem dos fornecedores configurados.',
      keywords: [
        'fornecedores de IA compatíveis',
        'catálogo de modelos',
        'motores de modelos locais',
      ],
    },
    terms: {
      title: 'Termos de serviço',
      description:
        'Leia os termos que regem contas, subscrições, acesso à plataforma, responsabilidades do utilizador, propriedade intelectual, alterações e cessação do serviço.',
      keywords: ['termos de serviço', 'condições de subscrição', 'responsabilidades do utilizador'],
    },
    'use-cases': {
      title: 'Fluxos de IA para trabalho real',
      description:
        'Veja como modelos roteados, contexto partilhado e revisão apoiam desenvolvimento de software, investigação, análise, escrita, suporte e tarefas com documentos.',
      keywords: [
        'casos de uso de IA',
        'fluxos de investigação',
        'produtividade de desenvolvimento',
      ],
    },
    compare: {
      title: 'Compare o ClawAI com outros assistentes de IA',
      description:
        'O ClawAI diante do ChatGPT, Claude, Gemini, Perplexity e Microsoft Copilot: escolha de modelos, roteamento, modelos locais, self-hosting, conectores e custo por resposta.',
      keywords: [
        'comparação de assistentes de IA',
        'alternativas ao ClawAI',
        'comparar ferramentas de IA',
      ],
    },
    'compare/chatgpt': {
      title: 'ClawAI vs ChatGPT: o comparativo',
      description:
        'Um assistente polido diante de nove famílias de modelos: roteamento, respostas lado a lado, modelos locais, self-hosting e custo por resposta.',
      keywords: ['ClawAI vs ChatGPT', 'alternativa ao ChatGPT', 'workspace de IA multimodelo'],
    },
    'compare/claude': {
      title: 'ClawAI vs Claude: o comparativo',
      description:
        'Um modelo cuidadoso diante de nove famílias que se verificam: roteamento, segunda opinião, modelos locais e self-hosting, comparados.',
      keywords: ['ClawAI vs Claude', 'alternativa ao Claude', 'workspace de IA multimodelo'],
    },
    'compare/gemini': {
      title: 'ClawAI vs Gemini: o comparativo',
      description:
        'Nativo do Workspace ou neutro entre fornecedores: escolha de modelos, conectores, roteamento, modelos locais e self-hosting, comparados.',
      keywords: ['ClawAI vs Gemini', 'alternativa ao Gemini', 'workspace de IA neutro'],
    },
    'compare/perplexity': {
      title: 'ClawAI vs Perplexity: o comparativo',
      description:
        'Um motor de respostas com fontes diante de um workspace multimodelo: pesquisa, escolha de modelos, memória, modelos locais e self-hosting.',
      keywords: [
        'ClawAI vs Perplexity',
        'alternativa ao Perplexity',
        'workspace de pesquisa com IA',
      ],
    },
    'compare/copilot': {
      title: 'ClawAI vs Microsoft Copilot: o comparativo',
      description:
        'Nativo do Microsoft 365 ou independente de fornecedor: escolha de modelos, roteamento, custo por resposta e instalação nos seus servidores.',
      keywords: [
        'ClawAI vs Microsoft Copilot',
        'alternativa ao Copilot',
        'workspace de IA self-hosted',
      ],
    },
    'compare/kimi': {
      title: 'ClawAI vs Kimi: o comparativo',
      description:
        'Contexto longo com pesos abertos diante de nove famílias de modelos numa só assinatura: roteamento, modelos locais, self-hosting e custo por resposta.',
      keywords: ['ClawAI vs Kimi', 'alternativa ao Kimi', 'workspace de IA com pesos abertos'],
    },
    'compare/qwen': {
      title: 'ClawAI vs Qwen: o comparativo',
      description:
        'Uma família de pesos abertos que instala por sua conta diante de um workspace multimodelo: escolha de modelos, roteamento, memória e execução local.',
      keywords: ['ClawAI vs Qwen', 'alternativa ao Qwen', 'workspace de IA self-hosted'],
    },
    'compare/glm': {
      title: 'ClawAI vs GLM: o comparativo',
      description:
        'Um laboratório de baixo custo com pesos abertos diante de nove famílias: roteamento por mensagem, custo por resposta, modelos locais e self-hosting.',
      keywords: ['ClawAI vs GLM', 'alternativa ao GLM', 'workspace de IA multimodelo'],
    },
    'compare/deepseek': {
      title: 'ClawAI vs DeepSeek: o comparativo',
      description:
        'Raciocínio de baixo custo com pesos abertos diante de nove famílias de modelos: roteamento por mensagem, comparação, modelos locais e self-hosting.',
      keywords: [
        'ClawAI vs DeepSeek',
        'alternativa ao DeepSeek',
        'workspace de IA com pesos abertos',
      ],
    },
    'coding-agent': {
      title: 'O Coding Agent do ClawAI para VS Code',
      description:
        'Conheça a extensão que leva os modelos da sua assinatura ClawAI ao VS Code, com conta, quotas, histórico, credenciais e roteamento na plataforma.',
      keywords: [
        'extensão ClawAI para VS Code',
        'assistente de IA no editor',
        'coding agent para VS Code',
      ],
    },
    'coding-agent/install': {
      title: 'Instalar o Coding Agent no VS Code',
      description:
        'Siga os passos para instalar a extensão pelo Marketplace ou pela linha de comandos, iniciar sessão e indicar o backend alojado ou o seu próprio.',
      keywords: [
        'instalar a extensão ClawAI',
        'ClawAI Coding Agent para VS Code',
        'instalação a partir do Marketplace',
      ],
    },
  },
  [Locale.HI]: {
    home: {
      title: 'क्लाउड और स्थानीय एआई के लिए एक कार्यक्षेत्र',
      description:
        'क्लाउड और स्थानीय एआई मॉडल एक ही कार्यक्षेत्र से इस्तेमाल करें, हर अनुरोध को काम और नीति के अनुसार भेजें, तथा बातचीत, फ़ाइलें और ऑर्केस्ट्रेशन उपकरण साथ रखें।',
      keywords: ['एआई कार्यक्षेत्र', 'मॉडल रूटिंग', 'स्थानीय एआई'],
    },
    about: {
      title: 'ऑर्केस्ट्रेशन प्लेटफ़ॉर्म के बारे में',
      description:
        'जानें कि यह प्लेटफ़ॉर्म प्रदाता चुनने की स्वतंत्रता, काम के अनुरूप रूटिंग, दोबारा उपयोग योग्य संदर्भ और निजी परिनियोजन विकल्पों को एक जगह क्यों लाता है।',
      keywords: ['प्लेटफ़ॉर्म परिचय', 'एआई ऑर्केस्ट्रेशन', 'प्रदाता चयन'],
    },
    'acceptable-use': {
      title: 'स्वीकार्य उपयोग नीति',
      description:
        'ज़िम्मेदार प्लेटफ़ॉर्म उपयोग, प्रतिबंधित गतिविधियों, खाते की सुरक्षा, स्वचालित पहुँच और नीति उल्लंघन पर हो सकने वाली कार्रवाई से जुड़े नियम पढ़ें।',
      keywords: ['स्वीकार्य उपयोग', 'ज़िम्मेदार एआई उपयोग', 'प्रतिबंधित गतिविधियाँ'],
    },
    architecture: {
      title: 'घटना-आधारित प्लेटफ़ॉर्म संरचना',
      description:
        'सेवा-आधारित संरचना, अलग डेटा स्वामित्व, घटनाओं से समन्वय, स्ट्रीम किए गए उत्तर और मॉडल निष्पादन के आसपास लागू नियंत्रणों को विस्तार से समझें।',
      keywords: ['एआई संरचना', 'माइक्रोसर्विस', 'घटना-आधारित प्लेटफ़ॉर्म'],
    },
    contact: {
      title: 'टीम से संपर्क करें',
      description:
        'उत्पाद संबंधी प्रश्न, बिलिंग सहायता, प्रदाता सेटअप, निजी परिनियोजन या आपके संगठन की किसी विशिष्ट तकनीकी आवश्यकता के बारे में टीम से संपर्क करें।',
      keywords: ['सहायता से संपर्क', 'उत्पाद प्रश्न', 'निजी परिनियोजन'],
    },
    cookies: {
      title: 'कुकी सूचना',
      description:
        'सार्वजनिक पृष्ठों पर सत्र, पसंद, भाषा और वैकल्पिक विज्ञापन सुविधाओं के लिए इस्तेमाल होने वाले ब्राउज़र स्टोरेज और कुकी तंत्र के बारे में जानें।',
      keywords: ['कुकी सूचना', 'ब्राउज़र स्टोरेज', 'गोपनीयता पसंद'],
    },
    faq: {
      title: 'अक्सर पूछे जाने वाले प्रश्न',
      description:
        'प्लान, उपयोग सीमाओं, समर्थित प्रदाताओं, मॉडल उपलब्धता, रूटिंग, डेटा प्रबंधन, स्थानीय रनटाइम और निजी परिनियोजन पर स्पष्ट उत्तर पाएँ।',
      keywords: ['एआई प्लेटफ़ॉर्म प्रश्न', 'प्लान संबंधी प्रश्न', 'मॉडल उपलब्धता'],
    },
    features: {
      title: 'रूटिंग, संदर्भ और ऑर्केस्ट्रेशन सुविधाएँ',
      description:
        'काम के अनुरूप मॉडल रूटिंग, तुलना और समीक्षा प्रवाह, दोबारा उपयोग योग्य मेमोरी, फ़ाइल संदर्भ, कार्यक्षेत्र कनेक्शन और स्थानीय रनटाइम सहायता देखें।',
      keywords: ['एआई ऑर्केस्ट्रेशन सुविधाएँ', 'मॉडल तुलना', 'संदर्भ उपकरण'],
    },
    'how-it-works': {
      title: 'मॉडल रूटिंग कैसे काम करती है',
      description:
        'देखें कि अनुरोध बातचीत के संदर्भ से नीति-अनुरूप मॉडल चयन, स्ट्रीम निष्पादन, उपयोग रिकॉर्डिंग और वैकल्पिक समीक्षा प्रवाह तक कैसे पहुँचता है।',
      keywords: ['एआई रूटिंग की प्रक्रिया', 'मॉडल चयन', 'स्ट्रीम किए गए उत्तर'],
    },
    'local-first-ai': {
      title: 'आपकी संरचना पर निजी एआई',
      description:
        'सीमित दायरे वाले निजी परिनियोजन विकल्प देखें, जो काम को संगठन के नेटवर्क में रखने की आवश्यकता होने पर नियंत्रित संरचना पर स्थानीय मॉडल चला सकते हैं।',
      keywords: ['निजी एआई परिनियोजन', 'ऑन-प्रिमाइसेस एआई', 'स्थानीय मॉडल'],
    },
    pricing: {
      title: 'प्लान और उपयोग सीमाएँ',
      description:
        'मासिक और वार्षिक प्लान, भारित उपयोग सीमाएँ, समवर्ती अनुरोध, चैट, संदेश, कार्यक्षेत्र, संदर्भ पैक, मेमोरी और ऑर्केस्ट्रेशन पहुँच की तुलना करें।',
      keywords: ['एआई मूल्य निर्धारण', 'उपयोग सीमाएँ', 'सदस्यता प्लान'],
    },
    privacy: {
      title: 'गोपनीयता सूचना',
      description:
        'सेवा कौन-सी जानकारी संसाधित करती है, उसका उपयोग क्यों होता है, बाहरी प्रदाता कहाँ शामिल हो सकते हैं, प्रतिधारण तरीके और उपलब्ध नियंत्रण क्या हैं, पढ़ें।',
      keywords: ['गोपनीयता सूचना', 'डेटा संसाधन', 'डेटा प्रतिधारण'],
    },
    'security-and-privacy': {
      title: 'सुरक्षा और गोपनीयता नियंत्रण',
      description:
        'एन्क्रिप्ट किए गए कनेक्टर क्रेडेंशियल, सुरक्षित परिवहन, सेवा सीमाएँ, केवल स्थानीय रूटिंग, प्रतिधारण सेटिंग और परिचालन सुरक्षा उपाय समझें।',
      keywords: ['एआई सुरक्षा', 'एन्क्रिप्टेड क्रेडेंशियल', 'स्थानीय रूटिंग'],
    },
    'supported-models': {
      title: 'समर्थित प्रदाता और मॉडल कैटलॉग',
      description:
        'OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, Ollama और llama.cpp के एकीकरण देखें; उपलब्ध सटीक मॉडल कॉन्फ़िगर किए गए प्रदाताओं पर निर्भर करते हैं।',
      keywords: ['समर्थित एआई प्रदाता', 'मॉडल कैटलॉग', 'स्थानीय मॉडल रनटाइम'],
    },
    terms: {
      title: 'सेवा की शर्तें',
      description:
        'खातों, सदस्यताओं, प्लेटफ़ॉर्म पहुँच, उपयोगकर्ता दायित्वों, बौद्धिक संपदा, सेवा में बदलाव और उपयोग समाप्त करने से जुड़ी शर्तें पढ़ें।',
      keywords: ['सेवा की शर्तें', 'सदस्यता शर्तें', 'उपयोगकर्ता दायित्व'],
    },
    'use-cases': {
      title: 'वास्तविक काम के लिए एआई कार्यप्रवाह',
      description:
        'जानें कि रूट किए गए मॉडल, साझा संदर्भ और समीक्षा प्रवाह सॉफ़्टवेयर विकास, शोध, विश्लेषण, लेखन, सहायता और दस्तावेज़ कार्यों में कैसे मदद करते हैं।',
      keywords: ['एआई उपयोग के मामले', 'शोध कार्यप्रवाह', 'डेवलपर उत्पादकता'],
    },
    compare: {
      title: 'ClawAI की तुलना अन्य AI असिस्टेंट से करें',
      description:
        'ClawAI बनाम ChatGPT, Claude, Gemini, Perplexity और Microsoft Copilot — मॉडल चुनाव, रूटिंग, लोकल मॉडल, सेल्फ-होस्टिंग, कनेक्टर और हर जवाब की लागत।',
      keywords: ['AI असिस्टेंट तुलना', 'ClawAI विकल्प', 'AI टूल तुलना'],
    },
    'compare/chatgpt': {
      title: 'ClawAI बनाम ChatGPT',
      description:
        'एक परिष्कृत असिस्टेंट बनाम नौ मॉडल परिवार: रूटिंग, साथ-साथ जवाब, लोकल मॉडल, सेल्फ-होस्टिंग और हर जवाब की लागत की तुलना।',
      keywords: ['ClawAI बनाम ChatGPT', 'ChatGPT विकल्प', 'मल्टी-मॉडल AI वर्कस्पेस'],
    },
    'compare/claude': {
      title: 'ClawAI बनाम Claude',
      description:
        'एक सावधान मॉडल बनाम नौ परिवार जो एक-दूसरे को जाँच सकते हैं: रूटिंग, दूसरी राय, लोकल मॉडल और सेल्फ-होस्टिंग की तुलना।',
      keywords: ['ClawAI बनाम Claude', 'Claude विकल्प', 'मल्टी-मॉडल AI वर्कस्पेस'],
    },
    'compare/gemini': {
      title: 'ClawAI बनाम Gemini',
      description:
        'Workspace से जुड़ा या प्रदाता-तटस्थ: मॉडल चुनाव, कनेक्टर, रूटिंग, लोकल मॉडल और सेल्फ-होस्टिंग की तुलना।',
      keywords: ['ClawAI बनाम Gemini', 'Gemini विकल्प', 'प्रदाता-तटस्थ AI वर्कस्पेस'],
    },
    'compare/perplexity': {
      title: 'ClawAI बनाम Perplexity',
      description:
        'स्रोत सहित उत्तर देने वाला इंजन बनाम मल्टी-मॉडल वर्कस्पेस: रिसर्च, मॉडल चुनाव, मेमोरी, लोकल मॉडल और सेल्फ-होस्टिंग।',
      keywords: ['ClawAI बनाम Perplexity', 'Perplexity विकल्प', 'AI रिसर्च वर्कस्पेस'],
    },
    'compare/copilot': {
      title: 'ClawAI बनाम Microsoft Copilot',
      description:
        'Microsoft 365 से जुड़ा या वेंडर-तटस्थ: मॉडल चुनाव, रूटिंग, हर जवाब की लागत और अपने सर्वर पर तैनाती की तुलना।',
      keywords: ['ClawAI बनाम Microsoft Copilot', 'Copilot विकल्प', 'सेल्फ-होस्टेड AI वर्कस्पेस'],
    },
    'compare/kimi': {
      title: 'ClawAI बनाम Kimi',
      description:
        'ओपन-वेट मॉडल खुद चलाएँ या नौ मॉडल परिवारों वाली एक सदस्यता: लंबा संदर्भ, लोकल मॉडल, सेल्फ-होस्टिंग और हर जवाब की लागत की तुलना।',
      keywords: ['ClawAI बनाम Kimi', 'Kimi विकल्प', 'ओपन-वेट AI वर्कस्पेस'],
    },
    'compare/qwen': {
      title: 'ClawAI बनाम Qwen',
      description:
        'ओपन-वेट परिवार खुद होस्ट करें या उसे नौ में से एक विकल्प की तरह इस्तेमाल करें: मॉडल चुनाव, रूटिंग, लोकल मॉडल और सेल्फ-होस्टिंग।',
      keywords: ['ClawAI बनाम Qwen', 'Qwen विकल्प', 'सेल्फ-होस्टेड AI वर्कस्पेस'],
    },
    'compare/glm': {
      title: 'ClawAI बनाम GLM',
      description:
        'एक लैब की किफ़ायती लाइन या नौ परिवारों के बीच रूटिंग: मॉडल चुनाव, ओपन-वेट मॉडल खुद चलाना, सेल्फ-होस्टिंग और हर जवाब की लागत की तुलना।',
      keywords: ['ClawAI बनाम GLM', 'GLM विकल्प', 'मल्टी-मॉडल AI वर्कस्पेस'],
    },
    'compare/deepseek': {
      title: 'ClawAI बनाम DeepSeek',
      description:
        'तर्क करने वाले ओपन-वेट मॉडल खुद चलाएँ या नौ परिवारों के बीच रूट करें: मॉडल चुनाव, लोकल मॉडल, सेल्फ-होस्टिंग और हर जवाब की लागत।',
      keywords: ['ClawAI बनाम DeepSeek', 'DeepSeek विकल्प', 'ओपन-वेट AI वर्कस्पेस'],
    },
    'coding-agent': {
      title: 'VS Code के लिए ClawAI कोडिंग एजेंट',
      description:
        'अपने एडिटर में ClawAI का एक्सटेंशन: हर मॉडल एक ही सदस्यता से, रूटिंग और इतिहास प्लेटफ़ॉर्म पर, और लागू करने से पहले हर बदलाव की समीक्षा।',
      keywords: ['ClawAI कोडिंग एजेंट', 'VS Code AI एक्सटेंशन', 'एडिटर में AI असिस्टेंट'],
    },
    'coding-agent/install': {
      title: 'VS Code में कोडिंग एजेंट इंस्टॉल करें',
      description:
        'VS Code में ClawAI कोडिंग एजेंट इंस्टॉल करने के चरण: Marketplace या कमांड लाइन से इंस्टॉल, साइन-इन, बैकएंड URL, और आम दिक्कतों के हल।',
      keywords: [
        'ClawAI कोडिंग एजेंट इंस्टॉल',
        'VS Code एक्सटेंशन इंस्टॉल',
        'AI कोडिंग एक्सटेंशन सेटअप',
      ],
    },
  },
  [Locale.JA]: {
    home: {
      title: 'クラウドAIとローカルAIを一つの作業空間に',
      description:
        'クラウドとローカルのAIモデルを一つの作業空間から利用し、依頼の内容とポリシーに応じて実行先を選択できます。会話、ファイル、各種オーケストレーション機能も同じ場所で管理できます。',
      keywords: ['AIワークスペース', 'モデルルーティング', 'ローカルAI'],
    },
    about: {
      title: 'AIオーケストレーション基盤について',
      description:
        'プロバイダーを選べる自由、作業内容に応じたルーティング、再利用できるコンテキスト、非公開環境への導入という考え方を、実用的な一つの作業空間にまとめた理由を紹介します。',
      keywords: ['プラットフォーム概要', 'AIオーケストレーション', 'プロバイダー選択'],
    },
    'acceptable-use': {
      title: '適正利用ポリシー',
      description:
        'サービスを責任を持って利用するための規則、禁止される行為、アカウントを守るための責任、自動アクセスの扱い、違反が確認された場合に取り得る対応について説明します。利用前に適用範囲も確認できます。',
      keywords: ['適正利用', '責任あるAI利用', '禁止行為'],
    },
    architecture: {
      title: 'イベント駆動型のプラットフォーム構成',
      description:
        'サービス単位の構成、分離されたデータ所有、イベントによる連携、応答のストリーミング、モデル実行を囲む制御など、プラットフォームの技術的な仕組みを詳しく紹介します。',
      keywords: ['AIアーキテクチャ', 'マイクロサービス', 'イベント駆動'],
    },
    contact: {
      title: 'チームへのお問い合わせ',
      description:
        '製品についての質問、請求に関するサポート、プロバイダーの設定、非公開環境への導入、組織固有の技術要件について、担当チームへお問い合わせいただけます。相談内容に合わせて必要な背景も共有できます。',
      keywords: ['サポート窓口', '製品の質問', '非公開導入'],
    },
    cookies: {
      title: 'Cookieに関するお知らせ',
      description:
        '公開ページでセッション、表示設定、言語設定、任意の広告機能を扱うために利用するCookieとブラウザーストレージの仕組み、その用途について分かりやすく説明します。',
      keywords: ['Cookie通知', 'ブラウザーストレージ', 'プライバシー設定'],
    },
    faq: {
      title: 'よくある質問',
      description:
        '料金プラン、利用枠、対応プロバイダー、モデルの提供状況、ルーティング、データの取り扱い、ローカル実行環境、非公開導入について、よくある質問への回答をまとめています。',
      keywords: ['AIサービスFAQ', '料金プランの質問', 'モデル提供状況'],
    },
    features: {
      title: 'ルーティング、コンテキスト、連携機能',
      description:
        '作業内容に応じたモデル選択、比較とレビューのワークフロー、再利用可能なメモリ、ファイルコンテキスト、ワークスペース接続、ローカル実行環境への対応を紹介します。各機能の役割も具体的に確認できます。',
      keywords: ['AI連携機能', 'モデル比較', 'コンテキスト管理'],
    },
    'how-it-works': {
      title: 'モデルルーティングの仕組み',
      description:
        '依頼が会話のコンテキストからポリシーに沿ったモデル選択へ進み、ストリーミング実行、利用量の記録、必要に応じたレビューまで処理される流れを順に説明します。主要な処理段階を一続きで把握できます。',
      keywords: ['AIルーティングの仕組み', 'モデル選択', 'ストリーミング応答'],
    },
    'local-first-ai': {
      title: '自社インフラで運用する非公開AI',
      description:
        '処理を組織のネットワーク内に保つ必要がある場合に、組織が管理するインフラでローカルモデルを実行できる、個別に範囲を定めた非公開導入について紹介します。利用環境に応じて導入内容を協議します。',
      keywords: ['非公開AI導入', 'オンプレミスAI', 'ローカルモデル'],
    },
    pricing: {
      title: '料金プランと利用枠',
      description:
        '月額と年額のプラン、重み付き利用枠、同時実行数、チャット、メッセージ、ワークスペース、コンテキストパック、メモリ、オーケストレーション機能へのアクセスを比較できます。',
      keywords: ['AI料金', '利用枠', 'サブスクリプションプラン'],
    },
    privacy: {
      title: 'プライバシーに関するお知らせ',
      description:
        'サービスが処理する情報と利用目的、外部プロバイダーが関与する場面、データ保持の考え方、利用者が使える管理手段について確認できます。情報の取り扱いを項目ごとに分かりやすく説明します。',
      keywords: ['プライバシー通知', 'データ処理', 'データ保持'],
    },
    'security-and-privacy': {
      title: 'セキュリティとプライバシーの管理',
      description:
        '接続認証情報の暗号化、通信の保護、サービス境界、ローカルのみのルーティング、保持期間の設定、運用上の安全対策について具体的に説明します。それぞれの対策が対象とする範囲も確認できます。',
      keywords: ['AIセキュリティ', '認証情報の暗号化', 'ローカルルーティング'],
    },
    'supported-models': {
      title: '対応プロバイダーとモデルカタログ',
      description:
        'OpenAI、Anthropic、Google Gemini、DeepSeek、xAI Grok、Ollama、llama.cppとの連携を紹介します。実際に利用できるモデルは、設定済みプロバイダーの内容によって異なります。',
      keywords: ['対応AIプロバイダー', 'モデルカタログ', 'ローカルモデル実行環境'],
    },
    terms: {
      title: 'サービス利用規約',
      description:
        'アカウント、サブスクリプション、プラットフォームへのアクセス、利用者の責任、知的財産、サービス内容の変更、利用終了に適用される条件を説明します。サービスを利用する前に全体を確認してください。',
      keywords: ['サービス利用規約', 'サブスクリプション条件', '利用者の責任'],
    },
    'use-cases': {
      title: '実務で役立つAIワークフロー',
      description:
        'ルーティングされたモデル、共有コンテキスト、レビュー工程が、ソフトウェア開発、調査、分析、文章作成、サポート、文書作業をどのように支えるか紹介します。代表的な仕事の流れを具体的に確認できます。',
      keywords: ['AI活用例', '調査ワークフロー', '開発者の生産性'],
    },
    compare: {
      title: 'ClawAI と他の AI アシスタントの比較',
      description:
        'ClawAI と ChatGPT、Claude、Gemini、Perplexity、Microsoft Copilot を、モデル選択・ルーティング・ローカルモデル・セルフホスト・コネクター・回答ごとのコストで比較します。',
      keywords: ['AI アシスタント 比較', 'ClawAI 代替', 'AI ツール 比較'],
    },
    'compare/chatgpt': {
      title: 'ClawAI と ChatGPT の比較',
      description:
        'ClawAI と ChatGPT の違いを、完成度の高い単一アシスタントと 9 つのモデルファミリーという観点で整理します。ルーティング、並列回答、ローカルモデル、セルフホスト、回答ごとのコストまで比較。',
      keywords: ['ClawAI ChatGPT 比較', 'ChatGPT 代替', 'マルチモデル AI ワークスペース'],
    },
    'compare/claude': {
      title: 'ClawAI と Claude の比較',
      description:
        'ClawAI と Claude の違いを、丁寧な単一モデルと互いに検証できる 9 つのモデルファミリーという観点で整理します。ルーティング、セカンドオピニオン、ローカルモデル、セルフホストまで比較。',
      keywords: ['ClawAI Claude 比較', 'Claude 代替', 'マルチモデル AI ワークスペース'],
    },
    'compare/gemini': {
      title: 'ClawAI と Gemini の比較',
      description:
        'ClawAI と Gemini の違いを、Workspace 密着型かベンダー中立かという観点で整理します。モデル選択、コネクター、ルーティング、ローカルモデル、セルフホスト、回答ごとのコストまで比較。',
      keywords: ['ClawAI Gemini 比較', 'Gemini 代替', 'ベンダー中立 AI ワークスペース'],
    },
    'compare/perplexity': {
      title: 'ClawAI と Perplexity の比較',
      description:
        'ClawAI と Perplexity の違いを、出典付き回答エンジンとマルチモデルワークスペースという観点で整理します。リサーチ、モデル選択、メモリ、ローカルモデル、セルフホストまで比較。',
      keywords: ['ClawAI Perplexity 比較', 'Perplexity 代替', 'AI リサーチ ワークスペース'],
    },
    'compare/copilot': {
      title: 'ClawAI と Microsoft Copilot の比較',
      description:
        'ClawAI と Microsoft Copilot の違いを、Microsoft 365 密着型かベンダー中立かという観点で整理します。モデル選択、ルーティング、回答ごとのコスト、自社サーバーへの導入まで比較。',
      keywords: ['ClawAI Copilot 比較', 'Copilot 代替', 'セルフホスト AI ワークスペース'],
    },
    'compare/kimi': {
      title: 'ClawAI と Kimi の比較',
      description:
        'ClawAI と Kimi の違いを、単一ベンダーのオープンウェイトと 9 つのモデルファミリーという観点で整理します。長いコンテキスト、ローカル実行、セルフホスト、回答ごとのコストまで比較。',
      keywords: ['ClawAI Kimi 比較', 'Kimi 代替', 'オープンウェイト AI ワークスペース'],
    },
    'compare/qwen': {
      title: 'ClawAI と Qwen の比較',
      description:
        'ClawAI と Qwen の違いを、モデルを自分で運用するか使うだけにするかという観点で整理します。モデル選択、ルーティング、ローカル実行、セルフホスト、メモリとファイルまで比較。',
      keywords: ['ClawAI Qwen 比較', 'Qwen 代替', 'セルフホスト AI ワークスペース'],
    },
    'compare/glm': {
      title: 'ClawAI と GLM の比較',
      description:
        'ClawAI と GLM の違いを、単一ラボのラインナップとベンダー中立なワークスペースという観点で整理します。モデル選択、ルーティング、ローカル実行、セルフホスト、回答ごとのコストまで比較。',
      keywords: ['ClawAI GLM 比較', 'GLM 代替', 'ベンダー中立 AI ワークスペース'],
    },
    'compare/deepseek': {
      title: 'ClawAI と DeepSeek の比較',
      description:
        'ClawAI と DeepSeek の違いを、推論に強い単一ラインと 9 つのモデルファミリーという観点で整理します。ルーティング、並列回答、ローカル実行、セルフホスト、回答ごとのコストまで比較。',
      keywords: ['ClawAI DeepSeek 比較', 'DeepSeek 代替', 'マルチモデル AI ワークスペース'],
    },
    'coding-agent': {
      title: 'VS Code 向け ClawAI コーディングエージェント',
      description:
        'ClawAI のサブスクリプションで使えるモデルを VS Code の中から利用でき、アカウント、利用枠、履歴、プロバイダー認証情報、ルーティングはプラットフォーム側に残る拡張機能を紹介します。',
      keywords: ['ClawAI コーディングエージェント', 'VS Code AI 拡張機能', 'AI コーディング支援'],
    },
    'coding-agent/install': {
      title: 'ClawAI コーディングエージェントのインストール',
      description:
        'VS Code の拡張機能ビューまたはコマンドラインから ClawAI コーディングエージェントを導入し、バックエンド URL を指定してサインインするまでの手順を説明します。',
      keywords: [
        'ClawAI 拡張機能 インストール',
        'VS Code AI 拡張機能',
        'コーディングエージェント 導入',
      ],
    },
  },
  [Locale.TH]: {
    home: {
      title: 'พื้นที่เดียวสำหรับ AI บนคลาวด์และในเครื่อง',
      description:
        'ใช้โมเดล AI บนคลาวด์และในเครื่องจากพื้นที่ทำงานเดียว กำหนดเส้นทางคำขอตามลักษณะงานและนโยบาย พร้อมจัดการบทสนทนา ไฟล์ และเครื่องมือประสานงานไว้ด้วยกัน',
      keywords: ['พื้นที่ทำงาน AI', 'การกำหนดเส้นทางโมเดล', 'AI ในเครื่อง'],
    },
    about: {
      title: 'เกี่ยวกับแพลตฟอร์มประสานงาน AI',
      description:
        'เรียนรู้เหตุผลที่แพลตฟอร์มรวมการเลือกผู้ให้บริการ การกำหนดเส้นทางตามงาน บริบทที่นำกลับมาใช้ได้ และตัวเลือกการติดตั้งแบบส่วนตัวไว้ในพื้นที่ทำงานเดียว',
      keywords: ['เกี่ยวกับแพลตฟอร์ม', 'การประสานงาน AI', 'การเลือกผู้ให้บริการ'],
    },
    'acceptable-use': {
      title: 'นโยบายการใช้งานที่ยอมรับได้',
      description:
        'อ่านข้อกำหนดเกี่ยวกับการใช้แพลตฟอร์มอย่างรับผิดชอบ กิจกรรมที่ห้าม การปกป้องบัญชี การเข้าถึงแบบอัตโนมัติ และมาตรการที่อาจเกิดขึ้นเมื่อฝ่าฝืนนโยบาย',
      keywords: ['การใช้งานที่ยอมรับได้', 'การใช้ AI อย่างรับผิดชอบ', 'กิจกรรมที่ห้าม'],
    },
    architecture: {
      title: 'สถาปัตยกรรมแพลตฟอร์มแบบขับเคลื่อนด้วยเหตุการณ์',
      description:
        'สำรวจสถาปัตยกรรมที่แยกเป็นบริการ การถือครองข้อมูลแบบแยกส่วน การประสานงานด้วยเหตุการณ์ การสตรีมคำตอบ และการควบคุมที่ครอบคลุมการเรียกใช้โมเดล',
      keywords: ['สถาปัตยกรรม AI', 'ไมโครเซอร์วิส', 'แพลตฟอร์มขับเคลื่อนด้วยเหตุการณ์'],
    },
    contact: {
      title: 'ติดต่อทีมงาน',
      description:
        'ติดต่อทีมงานเกี่ยวกับคำถามด้านผลิตภัณฑ์ ความช่วยเหลือเรื่องการเรียกเก็บเงิน การตั้งค่าผู้ให้บริการ การติดตั้งแบบส่วนตัว หรือข้อกำหนดทางเทคนิคขององค์กร',
      keywords: ['ติดต่อฝ่ายสนับสนุน', 'คำถามเกี่ยวกับผลิตภัณฑ์', 'การติดตั้งแบบส่วนตัว'],
    },
    cookies: {
      title: 'ประกาศเกี่ยวกับคุกกี้',
      description:
        'ทำความเข้าใจกลไกพื้นที่เก็บข้อมูลของเบราว์เซอร์และคุกกี้ที่ใช้สำหรับเซสชัน การตั้งค่า ภาษา และคุณสมบัติโฆษณาแบบเลือกใช้บนหน้าสาธารณะ',
      keywords: ['ประกาศคุกกี้', 'พื้นที่เก็บข้อมูลเบราว์เซอร์', 'การตั้งค่าความเป็นส่วนตัว'],
    },
    faq: {
      title: 'คำถามที่พบบ่อย',
      description:
        'ค้นหาคำตอบเกี่ยวกับแผน ขีดจำกัดการใช้งาน ผู้ให้บริการที่รองรับ ความพร้อมของโมเดล การกำหนดเส้นทาง การจัดการข้อมูล รันไทม์ในเครื่อง และการติดตั้งแบบส่วนตัว',
      keywords: ['คำถามแพลตฟอร์ม AI', 'คำถามเกี่ยวกับแผน', 'ความพร้อมของโมเดล'],
    },
    features: {
      title: 'คุณสมบัติด้านเส้นทาง บริบท และการประสานงาน',
      description:
        'สำรวจการเลือกโมเดลตามงาน ขั้นตอนเปรียบเทียบและตรวจทาน หน่วยความจำที่ใช้ซ้ำได้ บริบทจากไฟล์ การเชื่อมต่อพื้นที่ทำงาน และการรองรับรันไทม์ในเครื่อง',
      keywords: ['คุณสมบัติการประสานงาน AI', 'การเปรียบเทียบโมเดล', 'เครื่องมือบริบท'],
    },
    'how-it-works': {
      title: 'การกำหนดเส้นทางโมเดลทำงานอย่างไร',
      description:
        'ดูเส้นทางของคำขอตั้งแต่บริบทการสนทนา การเลือกโมเดลตามนโยบาย การดำเนินงานแบบสตรีม การบันทึกการใช้งาน ไปจนถึงขั้นตอนตรวจทานที่เลือกใช้ได้',
      keywords: ['วิธีทำงานของเส้นทาง AI', 'การเลือกโมเดล', 'คำตอบแบบสตรีม'],
    },
    'local-first-ai': {
      title: 'AI ส่วนตัวบนโครงสร้างพื้นฐานของคุณ',
      description:
        'สำรวจการติดตั้งแบบส่วนตัวที่กำหนดขอบเขตร่วมกัน ซึ่งเรียกใช้โมเดลในเครื่องบนโครงสร้างพื้นฐานที่องค์กรควบคุม เมื่องานจำเป็นต้องอยู่ภายในเครือข่าย',
      keywords: ['การติดตั้ง AI ส่วนตัว', 'AI ภายในองค์กร', 'โมเดลในเครื่อง'],
    },
    pricing: {
      title: 'แผนและขีดจำกัดการใช้งาน',
      description:
        'เปรียบเทียบแผนรายเดือนและรายปี ขีดจำกัดแบบถ่วงน้ำหนัก จำนวนงานพร้อมกัน แชต ข้อความ พื้นที่ทำงาน ชุดบริบท หน่วยความจำ และสิทธิ์ใช้การประสานงาน',
      keywords: ['ราคา AI', 'ขีดจำกัดการใช้งาน', 'แผนสมาชิก'],
    },
    privacy: {
      title: 'ประกาศความเป็นส่วนตัว',
      description:
        'ตรวจสอบว่าบริการประมวลผลข้อมูลใด ใช้ข้อมูลด้วยเหตุผลใด ผู้ให้บริการภายนอกอาจเกี่ยวข้องเมื่อใด แนวทางการเก็บรักษา และการควบคุมที่มีให้ใช้งาน',
      keywords: ['ประกาศความเป็นส่วนตัว', 'การประมวลผลข้อมูล', 'การเก็บรักษาข้อมูล'],
    },
    'security-and-privacy': {
      title: 'การควบคุมความปลอดภัยและความเป็นส่วนตัว',
      description:
        'เรียนรู้เรื่องการเข้ารหัสข้อมูลรับรองตัวเชื่อมต่อ ความปลอดภัยระหว่างส่งข้อมูล ขอบเขตบริการ การกำหนดเส้นทางเฉพาะในเครื่อง การตั้งค่าการเก็บรักษา และมาตรการดำเนินงาน',
      keywords: ['ความปลอดภัย AI', 'ข้อมูลรับรองที่เข้ารหัส', 'เส้นทางเฉพาะในเครื่อง'],
    },
    'supported-models': {
      title: 'ผู้ให้บริการที่รองรับและแค็ตตาล็อกโมเดล',
      description:
        'ดูการเชื่อมต่อกับ OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, Ollama และ llama.cpp โดยโมเดลที่ใช้ได้จริงขึ้นอยู่กับผู้ให้บริการที่ตั้งค่าไว้',
      keywords: ['ผู้ให้บริการ AI ที่รองรับ', 'แค็ตตาล็อกโมเดล', 'รันไทม์โมเดลในเครื่อง'],
    },
    terms: {
      title: 'ข้อกำหนดการให้บริการ',
      description:
        'อ่านเงื่อนไขที่ควบคุมบัญชี การสมัครสมาชิก การเข้าถึงแพลตฟอร์ม ความรับผิดชอบของผู้ใช้ ทรัพย์สินทางปัญญา การเปลี่ยนแปลงบริการ และการยุติใช้งาน',
      keywords: ['ข้อกำหนดการให้บริการ', 'เงื่อนไขสมาชิก', 'ความรับผิดชอบของผู้ใช้'],
    },
    'use-cases': {
      title: 'เวิร์กโฟลว์ AI สำหรับงานจริง',
      description:
        'ดูว่าโมเดลที่กำหนดเส้นทาง บริบทที่ใช้ร่วมกัน และขั้นตอนตรวจทาน ช่วยงานพัฒนาซอฟต์แวร์ วิจัย วิเคราะห์ เขียนเนื้อหา สนับสนุน และจัดการเอกสารได้อย่างไร',
      keywords: ['กรณีใช้งาน AI', 'เวิร์กโฟลว์วิจัย', 'ประสิทธิภาพนักพัฒนา'],
    },
    compare: {
      title: 'เปรียบเทียบ ClawAI กับผู้ช่วย AI อื่น ๆ',
      description:
        'ClawAI เทียบกับ ChatGPT, Claude, Gemini, Perplexity และ Microsoft Copilot ในด้านการเลือกโมเดล การกำหนดเส้นทาง โมเดลในเครื่อง การโฮสต์เอง ตัวเชื่อมต่อ และต้นทุนต่อคำตอบ',
      keywords: ['เปรียบเทียบผู้ช่วย AI', 'ทางเลือกแทน ClawAI', 'เปรียบเทียบเครื่องมือ AI'],
    },
    'compare/chatgpt': {
      title: 'ClawAI เทียบกับ ChatGPT',
      description:
        'ผู้ช่วยเดียวที่ขัดเกลามาอย่างดี เทียบกับโมเดลเก้าตระกูล ทั้งการกำหนดเส้นทาง คำตอบคู่ขนาน โมเดลในเครื่อง การโฮสต์เอง และต้นทุนต่อคำตอบ',
      keywords: ['ClawAI เทียบ ChatGPT', 'ทางเลือกแทน ChatGPT', 'เวิร์กสเปซ AI หลายโมเดล'],
    },
    'compare/claude': {
      title: 'ClawAI เทียบกับ Claude',
      description:
        'โมเดลเดียวที่รอบคอบ เทียบกับเก้าตระกูลที่ตรวจงานกันเองได้ ทั้งการกำหนดเส้นทาง ความเห็นที่สอง โมเดลในเครื่อง และการโฮสต์เอง',
      keywords: ['ClawAI เทียบ Claude', 'ทางเลือกแทน Claude', 'เวิร์กสเปซ AI หลายโมเดล'],
    },
    'compare/gemini': {
      title: 'ClawAI เทียบกับ Gemini',
      description:
        'ผูกกับ Workspace หรือเป็นกลางต่อผู้ให้บริการ เทียบการเลือกโมเดล ตัวเชื่อมต่อ การกำหนดเส้นทาง โมเดลในเครื่อง และการโฮสต์เอง',
      keywords: ['ClawAI เทียบ Gemini', 'ทางเลือกแทน Gemini', 'เวิร์กสเปซ AI ที่เป็นกลาง'],
    },
    'compare/perplexity': {
      title: 'ClawAI เทียบกับ Perplexity',
      description:
        'เครื่องมือตอบคำถามพร้อมแหล่งอ้างอิง เทียบกับเวิร์กสเปซหลายโมเดล ทั้งงานวิจัย การเลือกโมเดล หน่วยความจำ โมเดลในเครื่อง และการโฮสต์เอง',
      keywords: ['ClawAI เทียบ Perplexity', 'ทางเลือกแทน Perplexity', 'เวิร์กสเปซวิจัยด้วย AI'],
    },
    'compare/copilot': {
      title: 'ClawAI เทียบกับ Microsoft Copilot',
      description:
        'ผูกกับ Microsoft 365 หรือเป็นกลางต่อผู้ขาย เทียบการเลือกโมเดล การกำหนดเส้นทาง ต้นทุนต่อคำตอบ และการติดตั้งบนเซิร์ฟเวอร์ของคุณเอง',
      keywords: ['ClawAI เทียบ Copilot', 'ทางเลือกแทน Copilot', 'เวิร์กสเปซ AI ที่โฮสต์เอง'],
    },
    'compare/kimi': {
      title: 'ClawAI เทียบกับ Kimi',
      description:
        'บริบทยาวและน้ำหนักเปิดจากห้องแล็บเดียว เทียบกับเก้าตระกูลในการสมัครสมาชิกเดียว ทั้งการกำหนดเส้นทาง การรันโมเดลเอง การโฮสต์เอง และต้นทุนต่อคำตอบ',
      keywords: ['ClawAI เทียบ Kimi', 'ทางเลือกแทน Kimi', 'เวิร์กสเปซโมเดลน้ำหนักเปิด'],
    },
    'compare/qwen': {
      title: 'ClawAI เทียบกับ Qwen',
      description:
        'ตระกูลโมเดลน้ำหนักเปิดที่คุณดูแลเอง เทียบกับชั้นที่อยู่เหนือโมเดล ทั้งการกำหนดเส้นทาง คำตอบคู่ขนาน หน่วยความจำ การโฮสต์เอง และโควตาเดียว',
      keywords: ['ClawAI เทียบ Qwen', 'ทางเลือกแทน Qwen', 'เวิร์กสเปซ AI ที่โฮสต์เอง'],
    },
    'compare/glm': {
      title: 'ClawAI เทียบกับ GLM',
      description:
        'น้ำหนักเปิดราคาประหยัดจากห้องแล็บเดียว เทียบกับเก้าตระกูล ทั้งงานโค้ด การกำหนดเส้นทาง โมเดลในเครื่อง การโฮสต์เอง และต้นทุนต่อคำตอบ',
      keywords: ['ClawAI เทียบ GLM', 'ทางเลือกแทน GLM', 'เวิร์กสเปซ AI หลายโมเดล'],
    },
    'compare/deepseek': {
      title: 'ClawAI เทียบกับ DeepSeek',
      description:
        'โมเดลให้เหตุผลราคาต่ำจากห้องแล็บเดียว เทียบกับเก้าตระกูล ทั้งการกำหนดเส้นทาง ความเห็นที่สอง น้ำหนักเปิดในเครื่อง การโฮสต์เอง และต้นทุนต่อคำตอบ',
      keywords: ['ClawAI เทียบ DeepSeek', 'ทางเลือกแทน DeepSeek', 'เวิร์กสเปซโมเดลน้ำหนักเปิด'],
    },
    'coding-agent': {
      title: 'ClawAI Coding Agent สำหรับ VS Code',
      description:
        'ส่วนขยาย VS Code ที่เป็นไคลเอนต์บาง ๆ เรียกใช้ทุกโมเดลในสมาชิก ClawAI เดิม โดยบัญชี โควตา ประวัติ ข้อมูลรับรองผู้ให้บริการ และการกำหนดเส้นทางยังอยู่บนแพลตฟอร์ม',
      keywords: ['ส่วนขยาย VS Code', 'ClawAI Coding Agent', 'ผู้ช่วยเขียนโค้ดด้วย AI'],
    },
    'coding-agent/install': {
      title: 'ติดตั้ง ClawAI Coding Agent สำหรับ VS Code',
      description:
        'ขั้นตอนติดตั้งส่วนขยายจาก Marketplace หรือจากบรรทัดคำสั่ง การลงชื่อเข้าใช้ การตั้ง URL ของหลังบ้านเมื่อคุณโฮสต์เอง และวิธีแก้ปัญหาที่พบบ่อย',
      keywords: ['ติดตั้งส่วนขยาย VS Code', 'ClawAI Coding Agent', 'การลงชื่อเข้าใช้ส่วนขยาย'],
    },
  },
  [Locale.FA]: {
    home: {
      title: 'یک فضای کاری برای هوش مصنوعی ابری و محلی',
      description:
        'مدل‌های هوش مصنوعی ابری و محلی را از یک فضای کاری به‌کار بگیرید، هر درخواست را بر پایه نوع کار و سیاست هدایت کنید و گفتگوها، فایل‌ها و ابزارها را کنار هم نگه دارید.',
      keywords: ['فضای کاری هوش مصنوعی', 'مسیریابی مدل', 'هوش مصنوعی محلی'],
    },
    about: {
      title: 'درباره پلتفرم هماهنگ‌سازی',
      description:
        'بخوانید چرا این پلتفرم حق انتخاب ارائه‌دهنده، مسیریابی متناسب با کار، زمینه قابل استفاده مجدد و گزینه‌های استقرار خصوصی را در یک فضای کاری گرد آورده است.',
      keywords: ['درباره پلتفرم', 'هماهنگ‌سازی هوش مصنوعی', 'انتخاب ارائه‌دهنده'],
    },
    'acceptable-use': {
      title: 'سیاست استفاده قابل قبول',
      description:
        'قواعد استفاده مسئولانه از پلتفرم، فعالیت‌های ممنوع، حفاظت از حساب، دسترسی خودکار و اقدام‌هایی را که ممکن است پس از نقض سیاست انجام شود مرور کنید.',
      keywords: ['استفاده قابل قبول', 'استفاده مسئولانه از هوش مصنوعی', 'فعالیت‌های ممنوع'],
    },
    architecture: {
      title: 'معماری رویدادمحور پلتفرم',
      description:
        'معماری سرویس‌محور، مالکیت جداگانه داده، هماهنگی رویدادمحور، پاسخ‌های جریانی و کنترل‌های پیرامون اجرای مدل را در ساختار فنی پلتفرم بررسی کنید.',
      keywords: ['معماری هوش مصنوعی', 'میکروسرویس', 'پلتفرم رویدادمحور'],
    },
    contact: {
      title: 'تماس با تیم',
      description:
        'برای پرسش درباره محصول، پشتیبانی صورتحساب، راه‌اندازی ارائه‌دهنده، استقرار خصوصی یا یک نیاز فنی ویژه سازمان خود با تیم تماس بگیرید.',
      keywords: ['تماس با پشتیبانی', 'پرسش محصول', 'استقرار خصوصی'],
    },
    cookies: {
      title: 'اطلاعیه کوکی‌ها',
      description:
        'با سازوکارهای ذخیره‌سازی مرورگر و کوکی‌هایی آشنا شوید که برای نشست، تنظیمات، زبان و قابلیت‌های تبلیغاتی اختیاری در صفحه‌های عمومی استفاده می‌شوند.',
      keywords: ['اطلاعیه کوکی', 'ذخیره‌سازی مرورگر', 'تنظیمات حریم خصوصی'],
    },
    faq: {
      title: 'پرسش‌های متداول',
      description:
        'پاسخ‌های روشن درباره طرح‌ها، سقف مصرف، ارائه‌دهندگان پشتیبانی‌شده، دسترسی مدل‌ها، مسیریابی، پردازش داده، اجرای محلی و استقرار خصوصی را پیدا کنید.',
      keywords: ['پرسش‌های پلتفرم هوش مصنوعی', 'پرسش طرح‌ها', 'دسترسی مدل‌ها'],
    },
    features: {
      title: 'قابلیت‌های مسیریابی، زمینه و هماهنگ‌سازی',
      description:
        'مسیریابی مدل بر اساس کار، فرایندهای مقایسه و بازبینی، حافظه قابل استفاده مجدد، زمینه فایل، اتصال فضای کاری و پشتیبانی از اجرای محلی را بررسی کنید.',
      keywords: ['قابلیت‌های هماهنگ‌سازی هوش مصنوعی', 'مقایسه مدل', 'ابزارهای زمینه'],
    },
    'how-it-works': {
      title: 'مسیریابی مدل چگونه کار می‌کند',
      description:
        'ببینید یک درخواست چگونه از زمینه گفتگو به انتخاب مدل مطابق سیاست، اجرای جریانی، ثبت میزان مصرف و فرایند بازبینی اختیاری منتقل می‌شود.',
      keywords: ['روش مسیریابی هوش مصنوعی', 'انتخاب مدل', 'پاسخ جریانی'],
    },
    'local-first-ai': {
      title: 'هوش مصنوعی خصوصی روی زیرساخت شما',
      description:
        'استقرار خصوصی با دامنه مشخص را بررسی کنید که وقتی کار باید درون شبکه بماند، مدل‌های محلی را روی زیرساخت تحت کنترل سازمان اجرا می‌کند.',
      keywords: ['استقرار خصوصی هوش مصنوعی', 'هوش مصنوعی درون‌سازمانی', 'مدل‌های محلی'],
    },
    pricing: {
      title: 'طرح‌ها و سقف‌های مصرف',
      description:
        'طرح‌های ماهانه و سالانه، سقف مصرف وزن‌دار، هم‌زمانی، گفتگوها، پیام‌ها، فضاهای کاری، بسته‌های زمینه، حافظه و دسترسی به هماهنگ‌سازی را مقایسه کنید.',
      keywords: ['قیمت هوش مصنوعی', 'سقف مصرف', 'طرح‌های اشتراک'],
    },
    privacy: {
      title: 'اطلاعیه حریم خصوصی',
      description:
        'بررسی کنید سرویس چه اطلاعاتی را پردازش می‌کند، چرا به‌کار می‌روند، ارائه‌دهندگان بیرونی کجا دخیل می‌شوند، شیوه نگهداری چیست و چه کنترل‌هایی در دسترس است.',
      keywords: ['اطلاعیه حریم خصوصی', 'پردازش داده', 'نگهداری داده'],
    },
    'security-and-privacy': {
      title: 'کنترل‌های امنیت و حریم خصوصی',
      description:
        'درباره رمزنگاری اطلاعات اتصال، امنیت انتقال، مرز سرویس‌ها، مسیریابی فقط محلی، تنظیمات نگهداری و تدابیر عملیاتی پلتفرم بیشتر بدانید.',
      keywords: ['امنیت هوش مصنوعی', 'اطلاعات اتصال رمزنگاری‌شده', 'مسیریابی محلی'],
    },
    'supported-models': {
      title: 'ارائه‌دهندگان پشتیبانی‌شده و فهرست مدل‌ها',
      description:
        'یکپارچه‌سازی با OpenAI، Anthropic، Google Gemini، DeepSeek، xAI Grok، Ollama و llama.cpp را ببینید؛ مدل‌های دقیق به ارائه‌دهندگان پیکربندی‌شده بستگی دارند.',
      keywords: ['ارائه‌دهندگان هوش مصنوعی', 'فهرست مدل‌ها', 'محیط اجرای مدل محلی'],
    },
    terms: {
      title: 'شرایط استفاده از سرویس',
      description:
        'شرایط حاکم بر حساب‌ها، اشتراک‌ها، دسترسی به پلتفرم، مسئولیت کاربر، مالکیت فکری، تغییرات سرویس و پایان استفاده را مطالعه کنید.',
      keywords: ['شرایط استفاده', 'شرایط اشتراک', 'مسئولیت کاربر'],
    },
    'use-cases': {
      title: 'گردش‌کارهای هوش مصنوعی برای کار واقعی',
      description:
        'ببینید مدل‌های مسیریابی‌شده، زمینه مشترک و فرایند بازبینی چگونه به توسعه نرم‌افزار، پژوهش، تحلیل، نگارش، پشتیبانی و کار با سند کمک می‌کنند.',
      keywords: ['کاربردهای هوش مصنوعی', 'گردش‌کار پژوهش', 'بهره‌وری توسعه‌دهنده'],
    },
    compare: {
      title: 'مقایسه ClawAI با دیگر دستیارهای هوش مصنوعی',
      description:
        'ClawAI در برابر ChatGPT، Claude، Gemini، Perplexity و Microsoft Copilot: انتخاب مدل، مسیریابی، مدل‌های محلی، میزبانی شخصی، اتصال‌دهنده‌ها و هزینهٔ هر پاسخ.',
      keywords: ['مقایسه دستیارهای هوش مصنوعی', 'جایگزین‌های ClawAI', 'مقایسه ابزارهای هوش مصنوعی'],
    },
    'compare/chatgpt': {
      title: 'ClawAI در برابر ChatGPT',
      description:
        'یک دستیار پرداخته در برابر نُه خانوادهٔ مدل: مسیریابی، پاسخ‌های هم‌زمان، مدل‌های محلی، میزبانی شخصی و هزینهٔ هر پاسخ.',
      keywords: ['ClawAI در برابر ChatGPT', 'جایگزین ChatGPT', 'فضای کاری چندمدلی'],
    },
    'compare/claude': {
      title: 'ClawAI در برابر Claude',
      description:
        'یک مدل دقیق در برابر نُه خانواده که یکدیگر را بررسی می‌کنند: مسیریابی، نظر دوم، مدل‌های محلی و میزبانی شخصی.',
      keywords: ['ClawAI در برابر Claude', 'جایگزین Claude', 'فضای کاری چندمدلی'],
    },
    'compare/gemini': {
      title: 'ClawAI در برابر Gemini',
      description:
        'پیوسته به Workspace یا بی‌طرف نسبت به ارائه‌دهنده: انتخاب مدل، اتصال‌دهنده‌ها، مسیریابی، مدل‌های محلی و میزبانی شخصی.',
      keywords: ['ClawAI در برابر Gemini', 'جایگزین Gemini', 'فضای کاری بی‌طرف'],
    },
    'compare/perplexity': {
      title: 'ClawAI در برابر Perplexity',
      description:
        'موتور پاسخ با ارجاع در برابر فضای کاری چندمدلی: پژوهش، انتخاب مدل، حافظه، مدل‌های محلی و میزبانی شخصی.',
      keywords: ['ClawAI در برابر Perplexity', 'جایگزین Perplexity', 'فضای کاری پژوهش هوش مصنوعی'],
    },
    'compare/copilot': {
      title: 'ClawAI در برابر Microsoft Copilot',
      description:
        'پیوسته به Microsoft 365 یا مستقل از فروشنده: انتخاب مدل، مسیریابی، هزینهٔ هر پاسخ و استقرار روی سرورهای خودتان.',
      keywords: ['ClawAI در برابر Copilot', 'جایگزین Copilot', 'فضای کاری خودمیزبان'],
    },
    'compare/kimi': {
      title: 'ClawAI در برابر Kimi',
      description:
        'بافت طولانی با وزن‌های باز در برابر نُه خانوادهٔ مدل زیر یک اشتراک: انتخاب مدل، مسیریابی، اجرای محلی، میزبانی شخصی و هزینهٔ هر پاسخ.',
      keywords: ['ClawAI در برابر Kimi', 'جایگزین Kimi', 'فضای کاری مدل‌های وزن‌باز'],
    },
    'compare/qwen': {
      title: 'ClawAI در برابر Qwen',
      description:
        'خانواده‌ای پهن از مدل‌های وزن‌باز در برابر لایه‌ای روی نُه خانواده: انتخاب مدل، مسیریابی، حافظه و پرونده‌ها، اجرای محلی و میزبانی شخصی.',
      keywords: ['ClawAI در برابر Qwen', 'جایگزین Qwen', 'اجرای محلی مدل‌های وزن‌باز'],
    },
    'compare/glm': {
      title: 'ClawAI در برابر GLM',
      description:
        'هزینهٔ پایین با وزن‌های باز در برابر فضای کاری چندمدلی: انتخاب مدل، مسیریابی هزینه‌آگاه، اجرای محلی، میزبانی شخصی و هزینهٔ هر پاسخ.',
      keywords: ['ClawAI در برابر GLM', 'جایگزین GLM', 'فضای کاری چندمدلی'],
    },
    'compare/deepseek': {
      title: 'ClawAI در برابر DeepSeek',
      description:
        'مدل‌های استدلالی با وزن‌های باز در برابر نُه خانوادهٔ مدل: انتخاب مدل، مسیریابی برای هر پیام، پاسخ‌های هم‌زمان، اجرای محلی و میزبانی شخصی.',
      keywords: ['ClawAI در برابر DeepSeek', 'جایگزین DeepSeek', 'فضای کاری خودمیزبان'],
    },
    'coding-agent': {
      title: 'عامل کدنویسی ClawAI برای VS Code',
      description:
        'افزونه‌ای برای VS Code که مدل‌ها، مسیریابی و تاریخچهٔ اشتراک ClawAI را درون ویرایشگر می‌آورد، در حالی که حساب، سهمیه و اطلاعات ارائه‌دهنده روی پلتفرم می‌مانند.',
      keywords: ['افزونهٔ VS Code هوش مصنوعی', 'عامل کدنویسی ClawAI', 'دستیار کدنویسی'],
    },
    'coding-agent/install': {
      title: 'نصب عامل کدنویسی ClawAI برای VS Code',
      description:
        'نصب افزونه از درون VS Code یا از خط فرمان، ورود به حساب، انتخاب میان سرویس میزبانی‌شده و نمونهٔ خودمیزبان، و رفع مشکل‌های رایج نصب.',
      keywords: ['نصب افزونهٔ ClawAI', 'نصب افزونه VS Code', 'ورود به عامل کدنویسی'],
    },
  },
  [Locale.ZH]: {
    home: {
      title: '统一使用云端与本地人工智能',
      description:
        '在同一个工作空间中使用云端和本地人工智能模型，并根据任务特点与既定策略为每项请求选择执行路径。对话、文件、上下文和编排工具也能在这里集中管理，减少在多个独立工具之间反复切换。',
      keywords: ['人工智能工作空间', '模型路由', '本地人工智能'],
    },
    about: {
      title: '关于人工智能编排平台',
      description:
        '了解平台为何把供应商选择、面向任务的模型路由、可重复使用的上下文以及私有部署选项整合到一个实用工作空间中，并说明这些能力如何共同支持日常工作与团队协作，帮助不同任务保持连续的上下文。',
      keywords: ['平台介绍', '人工智能编排', '供应商选择'],
    },
    'acceptable-use': {
      title: '可接受使用政策',
      description:
        '阅读负责任使用平台时应遵守的规则，包括被禁止的活动、账户保护责任、自动化访问的要求，以及发生违反政策的行为后平台可能采取的处理措施。使用服务前，请确认这些规则适用于哪些账户与操作方式。',
      keywords: ['可接受使用', '负责任使用人工智能', '禁止活动'],
    },
    architecture: {
      title: '事件驱动的平台架构',
      description:
        '了解平台的服务化架构、彼此隔离的数据所有权、基于事件的协调机制、流式响应方式，以及模型执行过程周围设置的控制边界和运行保障，并查看各部分如何协作完成一次请求的处理。',
      keywords: ['人工智能架构', '微服务', '事件驱动平台'],
    },
    contact: {
      title: '联系产品团队',
      description:
        '如需咨询产品功能、账单支持、供应商配置、私有部署，或讨论组织特有的技术要求，可以通过联系页面向团队说明背景、目标和需要解决的问题，以便团队根据咨询类型安排后续沟通。',
      keywords: ['联系支持', '产品咨询', '私有部署'],
    },
    cookies: {
      title: 'Cookie 使用说明',
      description:
        '了解公开页面为维持会话、保存偏好、选择语言以及支持可选广告功能而使用的 Cookie 和浏览器存储机制，并查看这些机制在访问过程中的具体用途、保存位置及与页面功能之间的关系。',
      keywords: ['Cookie 说明', '浏览器存储', '隐私偏好'],
    },
    faq: {
      title: '常见问题',
      description:
        '查找有关方案、使用额度、受支持供应商、模型可用性、请求路由、数据处理、本地运行环境和私有部署的清晰回答，快速确认服务是否适合自己的工作方式，并了解哪些内容会随配置而变化。',
      keywords: ['人工智能平台常见问题', '方案问题', '模型可用性'],
    },
    features: {
      title: '模型路由、上下文与编排功能',
      description:
        '探索面向任务的模型路由、比较与复核流程、可重复使用的记忆、文件上下文、工作空间连接和本地运行环境支持，了解各项能力如何组合成完整工作流，并在不同任务阶段共享必要的信息。',
      keywords: ['人工智能编排功能', '模型比较', '上下文工具'],
    },
    'how-it-works': {
      title: '模型路由如何工作',
      description:
        '查看一项请求如何从对话上下文进入符合策略的模型选择，再经过流式执行、使用量记录，并在需要时进入可选的复核流程，从而理解完整的处理路径、每个阶段承担的具体作用以及结果如何返回给用户。',
      keywords: ['人工智能路由原理', '模型选择', '流式响应'],
    },
    'local-first-ai': {
      title: '在自有基础设施上运行私有人工智能',
      description:
        '了解经过单独界定范围的私有部署方案。当工作负载必须留在组织网络内部时，这类方案可在组织控制的基础设施上运行本地模型，并按实际环境、硬件条件和组织需求共同规划实施范围。',
      keywords: ['私有人工智能部署', '本地部署人工智能', '本地模型'],
    },
    pricing: {
      title: '方案与使用额度',
      description:
        '比较月付和年付方案，以及加权使用额度、并发数、聊天、消息、工作空间、上下文包、记忆和编排功能访问范围，按照实际使用需求选择合适方案，并了解不同额度项目之间的区别。',
      keywords: ['人工智能价格', '使用额度', '订阅方案'],
    },
    privacy: {
      title: '隐私声明',
      description:
        '查看服务处理哪些信息、处理这些信息的目的、外部供应商可能参与的环节、数据保留做法，以及用户目前可以使用的相关控制和管理方式，从而清楚了解不同数据在服务中的处理路径。',
      keywords: ['隐私声明', '数据处理', '数据保留'],
    },
    'security-and-privacy': {
      title: '安全与隐私控制',
      description:
        '了解连接凭据加密、传输安全、服务边界、仅限本地模型的路由、保留设置和运行保障等控制，并明确这些技术措施各自覆盖的实际范围、适用条件、操作责任以及与不同部署方式的关系。',
      keywords: ['人工智能安全', '凭据加密', '本地路由'],
    },
    'supported-models': {
      title: '受支持供应商与模型目录',
      description:
        '查看 OpenAI、Anthropic、Google Gemini、DeepSeek、xAI Grok、Ollama 和 llama.cpp 的集成信息。实际可用的具体模型取决于当前已配置的供应商及其同步结果。',
      keywords: ['受支持的人工智能供应商', '模型目录', '本地模型运行环境'],
    },
    terms: {
      title: '服务条款',
      description:
        '阅读适用于账户、订阅、平台访问、用户责任、知识产权、服务调整和终止使用的条款，了解使用平台时双方权利、义务和限制的基本范围，并在创建账户或订阅前完整查看相关内容。',
      keywords: ['服务条款', '订阅条款', '用户责任'],
    },
    'use-cases': {
      title: '面向实际工作的人工智能流程',
      description:
        '了解经过路由的模型、共享上下文和复核流程如何支持软件开发、研究、分析、写作、客户支持和文档处理，并帮助不同类型的任务保持连贯、共享必要信息并有效减少重复准备工作。',
      keywords: ['人工智能使用场景', '研究工作流', '开发者效率'],
    },
    compare: {
      title: '将 ClawAI 与其他 AI 助手对比',
      description:
        'ClawAI 对比 ChatGPT、Claude、Gemini、Perplexity 与 Microsoft Copilot：模型选择、路由、本地模型、自托管、连接器与每次回答的成本。',
      keywords: ['AI 助手对比', 'ClawAI 替代方案', 'AI 工具对比'],
    },
    'compare/chatgpt': {
      title: 'ClawAI 与 ChatGPT 对比',
      description:
        'ClawAI 与 ChatGPT 的差别在哪里：一个打磨精良的单一助手，对比一个覆盖九大模型家族的工作区。逐项比较模型选择、路由、并排回答、本地模型、自托管以及每次回答的成本记录。',
      keywords: ['ClawAI 对比 ChatGPT', 'ChatGPT 替代方案', '多模型 AI 工作区'],
    },
    'compare/claude': {
      title: 'ClawAI 与 Claude 对比',
      description:
        'ClawAI 与 Claude 的差别在哪里：一个严谨的单一模型，对比可以互相校验的九大模型家族。逐项比较模型选择、路由、第二意见、本地模型、自托管以及每次回答的成本记录。',
      keywords: ['ClawAI 对比 Claude', 'Claude 替代方案', '多模型 AI 工作区'],
    },
    'compare/gemini': {
      title: 'ClawAI 与 Gemini 对比',
      description:
        'ClawAI 与 Gemini 的差别在哪里：深度绑定 Workspace，还是保持厂商中立。逐项比较模型选择、连接器、路由、本地模型、自托管以及每次回答的成本记录。',
      keywords: ['ClawAI 对比 Gemini', 'Gemini 替代方案', '厂商中立 AI 工作区'],
    },
    'compare/perplexity': {
      title: 'ClawAI 与 Perplexity 对比',
      description:
        'ClawAI 与 Perplexity 的差别在哪里：带引用的答案引擎，对比一个多模型工作区。逐项比较研究能力、模型选择、记忆、文件、本地模型、自托管以及每次回答的成本记录。',
      keywords: ['ClawAI 对比 Perplexity', 'Perplexity 替代方案', 'AI 研究工作区'],
    },
    'compare/copilot': {
      title: 'ClawAI 与 Microsoft Copilot 对比',
      description:
        'ClawAI 与 Microsoft Copilot 的差别在哪里：深度绑定 Microsoft 365，还是保持厂商无关。逐项比较模型选择、路由、每次回答的成本，以及部署到自有服务器的能力。',
      keywords: ['ClawAI 对比 Copilot', 'Copilot 替代方案', '自托管 AI 工作区'],
    },
    'compare/kimi': {
      title: 'ClawAI 与 Kimi 对比',
      description:
        'ClawAI 与 Kimi 的差别在哪里：一家把旗舰权重公开的实验室，对比一个覆盖九大模型家族的工作区。逐项比较模型选择、路由、并排回答、在自有硬件上运行开源权重、自托管以及每次回答的成本记录。',
      keywords: ['ClawAI 对比 Kimi', 'Kimi 替代方案', '开源权重 AI 工作区'],
    },
    'compare/qwen': {
      title: 'ClawAI 与 Qwen 对比',
      description:
        'ClawAI 与 Qwen 的差别在哪里：一个可以自己部署的开源权重家族，对比一个替你把模型跑起来的工作区。逐项比较模型选择、路由、本地模型、自托管、记忆与文件以及每次回答的成本记录。',
      keywords: ['ClawAI 对比 Qwen', 'Qwen 替代方案', '本地模型 AI 工作区'],
    },
    'compare/glm': {
      title: 'ClawAI 与 GLM 对比',
      description:
        'ClawAI 与 GLM 的差别在哪里：押注一家实验室的价格与能力，还是按消息在九个家族之间选路。逐项比较模型选择、路由、本地模型、自托管以及每次回答的成本记录。',
      keywords: ['ClawAI 对比 GLM', 'GLM 替代方案', '自托管 AI 工作区'],
    },
    'compare/deepseek': {
      title: 'ClawAI 与 DeepSeek 对比',
      description:
        'ClawAI 与 DeepSeek 的差别在哪里：一条以推理见长、并公开旗舰权重的产品线，对比一个多模型工作区。逐项比较模型选择、路由、并排回答、本地模型、自托管以及每次回答的成本记录。',
      keywords: ['ClawAI 对比 DeepSeek', 'DeepSeek 替代方案', '多模型 AI 工作区'],
    },
    'coding-agent': {
      title: 'VS Code 版 ClawAI 编程助手',
      description:
        '了解 ClawAI 编程助手扩展在 VS Code 里做什么：它是一个瘦客户端，账户、额度、对话历史、供应商凭据与模型路由都留在平台上，编辑器中可以选择模型、并排对比回答，并在改动写入前先查看差异。',
      keywords: ['ClawAI 编程助手', 'VS Code AI 扩展', '编辑器内 AI 编程'],
    },
    'coding-agent/install': {
      title: '安装 ClawAI 编程助手扩展',
      description:
        '按步骤在 VS Code 中安装 ClawAI 编程助手：从扩展面板或命令行安装、在浏览器中登录并填写后端地址（使用 ClawAI 托管平台或自己的部署），并查看安装与登录出问题时的排查方法。',
      keywords: ['ClawAI 编程助手安装', 'VS Code 扩展安装', 'AI 编程助手设置'],
    },
  },
};
