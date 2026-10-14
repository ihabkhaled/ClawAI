import { Locale } from '@/enums/locale.enum';
import type {
  PluginQaFixesLocaleTranslation,
  PluralForms,
  RawPluginQaFixesTranslation,
  RawPluralForms,
} from '@/types/plugin-qa-fixes-i18n.types';

/**
 * Plugins QA fixes: counted phrases in every plural form ("1 item" / "2 items"; Arabic has six forms,
 * Russian four, Japanese one), the import error texts the service codes map to, and the labels of the
 * admin audit log. One file imported by every locale, so a missing locale is a type error. Placeholders:
 * `{count}` a number, `{time}` a clock time, `{items}` / `{files}` the counted phrases above.
 */
const RAW_TRANSLATIONS: Record<Locale, RawPluginQaFixesTranslation> = {
  [Locale.EN]: {
    count: {
      items: { one: '{count} item', other: '{count} items' },
      files: { one: '{count} file', other: '{count} files' },
      tools: { one: '{count} tool', other: '{count} tools' },
      toolsOn: { one: '{count} tool on', other: '{count} tools on' },
      toolsSkipped: {
        one: '{count} tool skipped: the name cannot be used.',
        other: '{count} tools skipped: the names cannot be used.',
      },
      installs: { one: '{count} install', other: '{count} installs' },
      summary: '{items} and {files}',
    },
    errors: {
      contentInvalid: 'A file in that plugin contains characters that cannot be stored.',
      parseFailed: 'That plugin could not be read. Check the files and try again.',
      rateLimitedAt: 'GitHub is limiting requests. Try again at {time}.',
    },
    audit: {
      actions: {
        catalogCreated: 'Entry created',
        catalogUpdated: 'Entry updated',
        catalogEnabled: 'Entry turned on',
        catalogDisabled: 'Entry turned off',
        catalogDeleted: 'Entry deleted',
        catalogHealthChecked: 'Health checked',
        catalogSeeded: 'Catalog seeded',
        serverApproved: 'Server approved',
        serverRejected: 'Server rejected',
        ruleAdded: 'Rule added',
        ruleRemoved: 'Rule removed',
      },
      targets: { catalogEntry: 'Catalog entry', mcpServer: 'MCP server', hostRule: 'Host rule' },
    },
  },
  [Locale.AR]: {
    count: {
      items: {
        zero: '{count} عنصر',
        one: '{count} عنصر',
        two: '{count} عنصران',
        few: '{count} عناصر',
        many: '{count} عنصرًا',
        other: '{count} عنصر',
      },
      files: {
        zero: '{count} ملف',
        one: '{count} ملف',
        two: '{count} ملفان',
        few: '{count} ملفات',
        many: '{count} ملفًا',
        other: '{count} ملف',
      },
      tools: {
        zero: '{count} أداة',
        one: '{count} أداة',
        two: '{count} أداتان',
        few: '{count} أدوات',
        many: '{count} أداة',
        other: '{count} أداة',
      },
      toolsOn: {
        zero: '{count} أداة مفعّلة',
        one: '{count} أداة مفعّلة',
        two: '{count} أداتان مفعّلتان',
        few: '{count} أدوات مفعّلة',
        many: '{count} أداة مفعّلة',
        other: '{count} أداة مفعّلة',
      },
      toolsSkipped: {
        zero: 'تم تخطي {count} أداة: لا يمكن استخدام أسمائها.',
        one: 'تم تخطي {count} أداة: لا يمكن استخدام اسمها.',
        two: 'تم تخطي {count} أداتين: لا يمكن استخدام اسميهما.',
        few: 'تم تخطي {count} أدوات: لا يمكن استخدام أسمائها.',
        many: 'تم تخطي {count} أداة: لا يمكن استخدام أسمائها.',
        other: 'تم تخطي {count} أداة: لا يمكن استخدام أسمائها.',
      },
      installs: {
        zero: '{count} عملية تثبيت',
        one: '{count} عملية تثبيت',
        two: '{count} عمليتا تثبيت',
        few: '{count} عمليات تثبيت',
        many: '{count} عملية تثبيت',
        other: '{count} عملية تثبيت',
      },
      summary: '{items} و{files}',
    },
    errors: {
      contentInvalid: 'يحتوي ملف في هذه الإضافة على أحرف لا يمكن حفظها.',
      parseFailed: 'تعذّرت قراءة هذه الإضافة. تحقق من الملفات وحاول مجددًا.',
      rateLimitedAt: 'GitHub يحدّ من الطلبات حاليًا. حاول مرة أخرى في {time}.',
    },
    audit: {
      actions: {
        catalogCreated: 'تم إنشاء المدخل',
        catalogUpdated: 'تم تحديث المدخل',
        catalogEnabled: 'تم تفعيل المدخل',
        catalogDisabled: 'تم إيقاف المدخل',
        catalogDeleted: 'تم حذف المدخل',
        catalogHealthChecked: 'تم فحص الحالة',
        catalogSeeded: 'تم تهيئة الفهرس',
        serverApproved: 'تمت الموافقة على الخادم',
        serverRejected: 'تم رفض الخادم',
        ruleAdded: 'تمت إضافة قاعدة',
        ruleRemoved: 'تمت إزالة القاعدة',
      },
      targets: { catalogEntry: 'مدخل الفهرس', mcpServer: 'خادم MCP', hostRule: 'قاعدة المضيف' },
    },
  },
  [Locale.DE]: {
    count: {
      items: { one: '{count} Element', other: '{count} Elemente' },
      files: { one: '{count} Datei', other: '{count} Dateien' },
      tools: { one: '{count} Tool', other: '{count} Tools' },
      toolsOn: { one: '{count} Tool aktiv', other: '{count} Tools aktiv' },
      toolsSkipped: {
        one: '{count} Tool übersprungen: Der Name kann nicht verwendet werden.',
        other: '{count} Tools übersprungen: Die Namen können nicht verwendet werden.',
      },
      installs: { one: '{count} Installation', other: '{count} Installationen' },
      summary: '{items} und {files}',
    },
    errors: {
      contentInvalid:
        'Eine Datei in diesem Plugin enthält Zeichen, die nicht gespeichert werden können.',
      parseFailed:
        'Dieses Plugin konnte nicht gelesen werden. Prüfe die Dateien und versuche es erneut.',
      rateLimitedAt: 'GitHub begrenzt gerade Anfragen. Versuche es um {time} erneut.',
    },
    audit: {
      actions: {
        catalogCreated: 'Eintrag erstellt',
        catalogUpdated: 'Eintrag aktualisiert',
        catalogEnabled: 'Eintrag eingeschaltet',
        catalogDisabled: 'Eintrag ausgeschaltet',
        catalogDeleted: 'Eintrag gelöscht',
        catalogHealthChecked: 'Zustand geprüft',
        catalogSeeded: 'Katalog befüllt',
        serverApproved: 'Server genehmigt',
        serverRejected: 'Server abgelehnt',
        ruleAdded: 'Regel hinzugefügt',
        ruleRemoved: 'Regel entfernt',
      },
      targets: { catalogEntry: 'Katalogeintrag', mcpServer: 'MCP-Server', hostRule: 'Host-Regel' },
    },
  },
  [Locale.ES]: {
    count: {
      items: { one: '{count} elemento', other: '{count} elementos' },
      files: { one: '{count} archivo', other: '{count} archivos' },
      tools: { one: '{count} herramienta', other: '{count} herramientas' },
      toolsOn: { one: '{count} herramienta activada', other: '{count} herramientas activadas' },
      toolsSkipped: {
        one: '{count} herramienta omitida: no se puede usar el nombre.',
        other: '{count} herramientas omitidas: no se pueden usar los nombres.',
      },
      installs: { one: '{count} instalación', other: '{count} instalaciones' },
      summary: '{items} y {files}',
    },
    errors: {
      contentInvalid: 'Un archivo de ese plugin contiene caracteres que no se pueden guardar.',
      parseFailed: 'No se pudo leer ese plugin. Revisa los archivos e inténtalo de nuevo.',
      rateLimitedAt: 'GitHub está limitando las solicitudes. Inténtalo de nuevo a las {time}.',
    },
    audit: {
      actions: {
        catalogCreated: 'Entrada creada',
        catalogUpdated: 'Entrada actualizada',
        catalogEnabled: 'Entrada activada',
        catalogDisabled: 'Entrada desactivada',
        catalogDeleted: 'Entrada eliminada',
        catalogHealthChecked: 'Estado comprobado',
        catalogSeeded: 'Catálogo inicializado',
        serverApproved: 'Servidor aprobado',
        serverRejected: 'Servidor rechazado',
        ruleAdded: 'Regla añadida',
        ruleRemoved: 'Regla eliminada',
      },
      targets: {
        catalogEntry: 'Entrada del catálogo',
        mcpServer: 'Servidor MCP',
        hostRule: 'Regla de host',
      },
    },
  },
  [Locale.FA]: {
    count: {
      items: { one: '{count} مورد', other: '{count} مورد' },
      files: { one: '{count} فایل', other: '{count} فایل' },
      tools: { one: '{count} ابزار', other: '{count} ابزار' },
      toolsOn: { one: '{count} ابزار روشن', other: '{count} ابزار روشن' },
      toolsSkipped: {
        one: '{count} ابزار رد شد: نام آن قابل استفاده نیست.',
        other: '{count} ابزار رد شد: نام آن‌ها قابل استفاده نیست.',
      },
      installs: { one: '{count} نصب', other: '{count} نصب' },
      summary: '{items} و {files}',
    },
    errors: {
      contentInvalid: 'فایلی در این افزونه نویسه‌هایی دارد که قابل ذخیره نیستند.',
      parseFailed: 'خواندن این افزونه ممکن نشد. فایل‌ها را بررسی و دوباره تلاش کنید.',
      rateLimitedAt:
        'GitHub در حال حاضر درخواست‌ها را محدود کرده است. ساعت {time} دوباره تلاش کنید.',
    },
    audit: {
      actions: {
        catalogCreated: 'ورودی ایجاد شد',
        catalogUpdated: 'ورودی به‌روزرسانی شد',
        catalogEnabled: 'ورودی روشن شد',
        catalogDisabled: 'ورودی خاموش شد',
        catalogDeleted: 'ورودی حذف شد',
        catalogHealthChecked: 'سلامت بررسی شد',
        catalogSeeded: 'فهرست مقداردهی شد',
        serverApproved: 'سرور تأیید شد',
        serverRejected: 'سرور رد شد',
        ruleAdded: 'قاعده افزوده شد',
        ruleRemoved: 'قاعده حذف شد',
      },
      targets: { catalogEntry: 'ورودی فهرست', mcpServer: 'سرور MCP', hostRule: 'قاعده میزبان' },
    },
  },
  [Locale.FR]: {
    count: {
      items: { one: '{count} élément', other: '{count} éléments' },
      files: { one: '{count} fichier', other: '{count} fichiers' },
      tools: { one: '{count} outil', other: '{count} outils' },
      toolsOn: { one: '{count} outil activé', other: '{count} outils activés' },
      toolsSkipped: {
        one: '{count} outil ignoré : son nom ne peut pas être utilisé.',
        other: '{count} outils ignorés : leurs noms ne peuvent pas être utilisés.',
      },
      installs: { one: '{count} installation', other: '{count} installations' },
      summary: '{items} et {files}',
    },
    errors: {
      contentInvalid:
        'Un fichier de ce plugin contient des caractères qui ne peuvent pas être enregistrés.',
      parseFailed: 'Impossible de lire ce plugin. Vérifiez les fichiers et réessayez.',
      rateLimitedAt: 'GitHub limite les requêtes pour le moment. Réessayez à {time}.',
    },
    audit: {
      actions: {
        catalogCreated: 'Entrée créée',
        catalogUpdated: 'Entrée mise à jour',
        catalogEnabled: 'Entrée activée',
        catalogDisabled: 'Entrée désactivée',
        catalogDeleted: 'Entrée supprimée',
        catalogHealthChecked: 'État vérifié',
        catalogSeeded: 'Catalogue initialisé',
        serverApproved: 'Serveur approuvé',
        serverRejected: 'Serveur refusé',
        ruleAdded: 'Règle ajoutée',
        ruleRemoved: 'Règle supprimée',
      },
      targets: {
        catalogEntry: 'Entrée du catalogue',
        mcpServer: 'Serveur MCP',
        hostRule: "Règle d'hôte",
      },
    },
  },
  [Locale.HI]: {
    count: {
      items: { one: '{count} आइटम', other: '{count} आइटम' },
      files: { one: '{count} फ़ाइल', other: '{count} फ़ाइलें' },
      tools: { one: '{count} टूल', other: '{count} टूल' },
      toolsOn: { one: '{count} टूल चालू', other: '{count} टूल चालू' },
      toolsSkipped: {
        one: '{count} टूल छोड़ा गया: उसका नाम उपयोग नहीं हो सकता।',
        other: '{count} टूल छोड़े गए: उनके नाम उपयोग नहीं हो सकते।',
      },
      installs: { one: '{count} इंस्टॉल', other: '{count} इंस्टॉल' },
      summary: '{items} और {files}',
    },
    errors: {
      contentInvalid: 'उस प्लगइन की एक फ़ाइल में ऐसे वर्ण हैं जिन्हें सहेजा नहीं जा सकता।',
      parseFailed: 'उस प्लगइन को पढ़ा नहीं जा सका। फ़ाइलें जाँचें और फिर कोशिश करें।',
      rateLimitedAt: 'GitHub अभी अनुरोध सीमित कर रहा है। {time} पर फिर कोशिश करें।',
    },
    audit: {
      actions: {
        catalogCreated: 'प्रविष्टि बनाई गई',
        catalogUpdated: 'प्रविष्टि अपडेट हुई',
        catalogEnabled: 'प्रविष्टि चालू की गई',
        catalogDisabled: 'प्रविष्टि बंद की गई',
        catalogDeleted: 'प्रविष्टि हटाई गई',
        catalogHealthChecked: 'स्थिति जाँची गई',
        catalogSeeded: 'कैटलॉग तैयार किया गया',
        serverApproved: 'सर्वर स्वीकृत',
        serverRejected: 'सर्वर अस्वीकृत',
        ruleAdded: 'नियम जोड़ा गया',
        ruleRemoved: 'नियम हटाया गया',
      },
      targets: { catalogEntry: 'कैटलॉग प्रविष्टि', mcpServer: 'MCP सर्वर', hostRule: 'होस्ट नियम' },
    },
  },
  [Locale.IT]: {
    count: {
      items: { one: '{count} elemento', other: '{count} elementi' },
      files: { one: '{count} file', other: '{count} file' },
      tools: { one: '{count} strumento', other: '{count} strumenti' },
      toolsOn: { one: '{count} strumento attivo', other: '{count} strumenti attivi' },
      toolsSkipped: {
        one: '{count} strumento saltato: il nome non può essere usato.',
        other: '{count} strumenti saltati: i nomi non possono essere usati.',
      },
      installs: { one: '{count} installazione', other: '{count} installazioni' },
      summary: '{items} e {files}',
    },
    errors: {
      contentInvalid: 'Un file di questo plugin contiene caratteri che non possono essere salvati.',
      parseFailed: 'Impossibile leggere questo plugin. Controlla i file e riprova.',
      rateLimitedAt: 'GitHub sta limitando le richieste. Riprova alle {time}.',
    },
    audit: {
      actions: {
        catalogCreated: 'Voce creata',
        catalogUpdated: 'Voce aggiornata',
        catalogEnabled: 'Voce attivata',
        catalogDisabled: 'Voce disattivata',
        catalogDeleted: 'Voce eliminata',
        catalogHealthChecked: 'Stato verificato',
        catalogSeeded: 'Catalogo inizializzato',
        serverApproved: 'Server approvato',
        serverRejected: 'Server rifiutato',
        ruleAdded: 'Regola aggiunta',
        ruleRemoved: 'Regola rimossa',
      },
      targets: {
        catalogEntry: 'Voce del catalogo',
        mcpServer: 'Server MCP',
        hostRule: 'Regola host',
      },
    },
  },
  [Locale.JA]: {
    count: {
      items: { other: '{count} 件' },
      files: { other: '{count} 個のファイル' },
      tools: { other: '{count} 個のツール' },
      toolsOn: { other: '{count} 個のツールがオン' },
      toolsSkipped: { other: '{count} 個のツールをスキップしました。名前を使用できません。' },
      installs: { other: '{count} 件のインストール' },
      summary: '{items}と{files}',
    },
    errors: {
      contentInvalid: 'このプラグインのファイルに、保存できない文字が含まれています。',
      parseFailed:
        'このプラグインを読み取れませんでした。ファイルを確認してもう一度お試しください。',
      rateLimitedAt: 'GitHub が現在リクエストを制限しています。{time} にもう一度お試しください。',
    },
    audit: {
      actions: {
        catalogCreated: 'エントリを作成しました',
        catalogUpdated: 'エントリを更新しました',
        catalogEnabled: 'エントリをオンにしました',
        catalogDisabled: 'エントリをオフにしました',
        catalogDeleted: 'エントリを削除しました',
        catalogHealthChecked: '状態を確認しました',
        catalogSeeded: 'カタログを初期化しました',
        serverApproved: 'サーバーを承認しました',
        serverRejected: 'サーバーを却下しました',
        ruleAdded: 'ルールを追加しました',
        ruleRemoved: 'ルールを削除しました',
      },
      targets: {
        catalogEntry: 'カタログエントリ',
        mcpServer: 'MCP サーバー',
        hostRule: 'ホストルール',
      },
    },
  },
  [Locale.PT]: {
    count: {
      items: { one: '{count} item', other: '{count} itens' },
      files: { one: '{count} arquivo', other: '{count} arquivos' },
      tools: { one: '{count} ferramenta', other: '{count} ferramentas' },
      toolsOn: { one: '{count} ferramenta ativada', other: '{count} ferramentas ativadas' },
      toolsSkipped: {
        one: '{count} ferramenta ignorada: o nome não pode ser usado.',
        other: '{count} ferramentas ignoradas: os nomes não podem ser usados.',
      },
      installs: { one: '{count} instalação', other: '{count} instalações' },
      summary: '{items} e {files}',
    },
    errors: {
      contentInvalid: 'Um arquivo desse plugin contém caracteres que não podem ser salvos.',
      parseFailed: 'Não foi possível ler esse plugin. Verifique os arquivos e tente novamente.',
      rateLimitedAt: 'O GitHub está limitando as solicitações. Tente novamente às {time}.',
    },
    audit: {
      actions: {
        catalogCreated: 'Entrada criada',
        catalogUpdated: 'Entrada atualizada',
        catalogEnabled: 'Entrada ativada',
        catalogDisabled: 'Entrada desativada',
        catalogDeleted: 'Entrada excluída',
        catalogHealthChecked: 'Estado verificado',
        catalogSeeded: 'Catálogo inicializado',
        serverApproved: 'Servidor aprovado',
        serverRejected: 'Servidor rejeitado',
        ruleAdded: 'Regra adicionada',
        ruleRemoved: 'Regra removida',
      },
      targets: {
        catalogEntry: 'Entrada do catálogo',
        mcpServer: 'Servidor MCP',
        hostRule: 'Regra de host',
      },
    },
  },
  [Locale.RU]: {
    count: {
      items: {
        one: '{count} элемент',
        few: '{count} элемента',
        many: '{count} элементов',
        other: '{count} элемента',
      },
      files: {
        one: '{count} файл',
        few: '{count} файла',
        many: '{count} файлов',
        other: '{count} файла',
      },
      tools: {
        one: '{count} инструмент',
        few: '{count} инструмента',
        many: '{count} инструментов',
        other: '{count} инструмента',
      },
      toolsOn: {
        one: '{count} инструмент включён',
        few: '{count} инструмента включено',
        many: '{count} инструментов включено',
        other: '{count} инструмента включено',
      },
      toolsSkipped: {
        one: '{count} инструмент пропущен: его имя нельзя использовать.',
        few: '{count} инструмента пропущено: их имена нельзя использовать.',
        many: '{count} инструментов пропущено: их имена нельзя использовать.',
        other: '{count} инструмента пропущено: их имена нельзя использовать.',
      },
      installs: {
        one: '{count} установка',
        few: '{count} установки',
        many: '{count} установок',
        other: '{count} установки',
      },
      summary: '{items} и {files}',
    },
    errors: {
      contentInvalid: 'Файл в этом плагине содержит символы, которые нельзя сохранить.',
      parseFailed: 'Не удалось прочитать этот плагин. Проверьте файлы и повторите попытку.',
      rateLimitedAt: 'GitHub сейчас ограничивает запросы. Повторите попытку в {time}.',
    },
    audit: {
      actions: {
        catalogCreated: 'Запись создана',
        catalogUpdated: 'Запись обновлена',
        catalogEnabled: 'Запись включена',
        catalogDisabled: 'Запись выключена',
        catalogDeleted: 'Запись удалена',
        catalogHealthChecked: 'Состояние проверено',
        catalogSeeded: 'Каталог заполнен',
        serverApproved: 'Сервер одобрен',
        serverRejected: 'Сервер отклонён',
        ruleAdded: 'Правило добавлено',
        ruleRemoved: 'Правило удалено',
      },
      targets: {
        catalogEntry: 'Запись каталога',
        mcpServer: 'MCP-сервер',
        hostRule: 'Правило хоста',
      },
    },
  },
  [Locale.TH]: {
    count: {
      items: { other: '{count} รายการ' },
      files: { other: '{count} ไฟล์' },
      tools: { other: '{count} เครื่องมือ' },
      toolsOn: { other: 'เปิดใช้ {count} เครื่องมือ' },
      toolsSkipped: { other: 'ข้าม {count} เครื่องมือ: ใช้ชื่อไม่ได้' },
      installs: { other: '{count} การติดตั้ง' },
      summary: '{items} และ {files}',
    },
    errors: {
      contentInvalid: 'ไฟล์ในปลั๊กอินนี้มีอักขระที่บันทึกไม่ได้',
      parseFailed: 'อ่านปลั๊กอินนี้ไม่ได้ ตรวจสอบไฟล์แล้วลองอีกครั้ง',
      rateLimitedAt: 'GitHub กำลังจำกัดคำขอ ลองอีกครั้งเวลา {time}',
    },
    audit: {
      actions: {
        catalogCreated: 'สร้างรายการแล้ว',
        catalogUpdated: 'อัปเดตรายการแล้ว',
        catalogEnabled: 'เปิดรายการแล้ว',
        catalogDisabled: 'ปิดรายการแล้ว',
        catalogDeleted: 'ลบรายการแล้ว',
        catalogHealthChecked: 'ตรวจสอบสถานะแล้ว',
        catalogSeeded: 'เตรียมแคตตาล็อกแล้ว',
        serverApproved: 'อนุมัติเซิร์ฟเวอร์แล้ว',
        serverRejected: 'ปฏิเสธเซิร์ฟเวอร์แล้ว',
        ruleAdded: 'เพิ่มกฎแล้ว',
        ruleRemoved: 'ลบกฎแล้ว',
      },
      targets: {
        catalogEntry: 'รายการในแคตตาล็อก',
        mcpServer: 'เซิร์ฟเวอร์ MCP',
        hostRule: 'กฎโฮสต์',
      },
    },
  },
  [Locale.ZH]: {
    count: {
      items: { other: '{count} 项' },
      files: { other: '{count} 个文件' },
      tools: { other: '{count} 个工具' },
      toolsOn: { other: '{count} 个工具已开启' },
      toolsSkipped: { other: '已跳过 {count} 个工具：名称无法使用。' },
      installs: { other: '{count} 次安装' },
      summary: '{items}和{files}',
    },
    errors: {
      contentInvalid: '该插件中的某个文件包含无法保存的字符。',
      parseFailed: '无法读取该插件。请检查文件后重试。',
      rateLimitedAt: 'GitHub 目前在限制请求。请在 {time} 重试。',
    },
    audit: {
      actions: {
        catalogCreated: '条目已创建',
        catalogUpdated: '条目已更新',
        catalogEnabled: '条目已开启',
        catalogDisabled: '条目已关闭',
        catalogDeleted: '条目已删除',
        catalogHealthChecked: '已检查健康状态',
        catalogSeeded: '目录已初始化',
        serverApproved: '服务器已批准',
        serverRejected: '服务器已拒绝',
        ruleAdded: '规则已添加',
        ruleRemoved: '规则已移除',
      },
      targets: { catalogEntry: '目录条目', mcpServer: 'MCP 服务器', hostRule: '主机规则' },
    },
  },
};

function fillForms(forms: RawPluralForms): PluralForms {
  return {
    zero: forms.zero ?? forms.other,
    one: forms.one ?? forms.other,
    two: forms.two ?? forms.other,
    few: forms.few ?? forms.other,
    many: forms.many ?? forms.other,
    other: forms.other,
  };
}

function fillLocale(raw: RawPluginQaFixesTranslation): PluginQaFixesLocaleTranslation {
  const { count } = raw;
  return {
    ...raw,
    count: {
      items: fillForms(count.items),
      files: fillForms(count.files),
      tools: fillForms(count.tools),
      toolsOn: fillForms(count.toolsOn),
      toolsSkipped: fillForms(count.toolsSkipped),
      installs: fillForms(count.installs),
      summary: count.summary,
    },
  };
}

/**
 * Every locale carries all six plural keys so the dictionaries stay key-for-key identical. A language
 * writes only the forms it distinguishes; the rest repeat its general (`other`) form.
 */
export const PLUGIN_QA_FIXES_TRANSLATIONS: Record<Locale, PluginQaFixesLocaleTranslation> =
  Object.fromEntries(
    Object.entries(RAW_TRANSLATIONS).map(([locale, raw]) => [locale, fillLocale(raw)]),
  ) as Record<Locale, PluginQaFixesLocaleTranslation>;
