import { Locale } from '@/enums/locale.enum';
import type { PluginChatLocaleTranslation } from '@/types/i18n.types';

/**
 * Plugins inside a conversation: the `@` picker in every composer, the chips it leaves, the
 * timeline of tool calls above an answer and the notices that explain a plugin that did not run.
 * One file imported by every locale, so a missing locale is a type error rather than a raw key.
 * `{value}` is a count, a plugin name or a duration.
 */
export const PLUGIN_CHAT_TRANSLATIONS: Record<Locale, PluginChatLocaleTranslation> = {
  [Locale.EN]: {
    mention: {
      listLabel: 'Plugins you can mention',
      count:
        '{value} plugins available. Use the up and down arrows to choose, Enter to select, Escape to close.',
      chipsLabel: 'Plugins for this message',
      removeChip: 'Remove {value}',
    },
    calls: {
      title: 'Plugins used',
      duration: '{value} ms',
      truncated: 'Result shortened',
      resultToggle: 'What the plugin returned',
      status: {
        ok: 'Done',
        error: 'Failed',
        consentRequired: 'Needs your approval',
        blocked: 'Blocked',
        rateLimited: 'Too many calls',
        quotaExceeded: 'Plan limit reached',
      },
    },
    notices: {
      serviceUnavailable: 'Plugins could not be reached, so this answer was written without them.',
      noTools:
        'The plugin you mentioned has no usable tools right now, so this answer was written without it.',
      consentNotAvailable:
        'A plugin action needed your approval, which chat cannot ask for yet. It was not run.',
      limitReached:
        'The plugin call limit for one message was reached, so the model answered with what it had.',
    },
  },
  [Locale.AR]: {
    mention: {
      listLabel: 'الإضافات التي يمكنك ذكرها',
      count:
        'عدد الإضافات المتاحة: {value}. استخدم السهمين لأعلى ولأسفل للتنقل، وEnter للاختيار، وEscape للإغلاق.',
      chipsLabel: 'إضافات هذه الرسالة',
      removeChip: 'إزالة {value}',
    },
    calls: {
      title: 'الإضافات المستخدمة',
      duration: '{value} م.ث',
      truncated: 'تم اختصار النتيجة',
      resultToggle: 'ما أعادته الإضافة',
      status: {
        ok: 'تم',
        error: 'فشل',
        consentRequired: 'يحتاج إلى موافقتك',
        blocked: 'محظور',
        rateLimited: 'طلبات كثيرة جدًا',
        quotaExceeded: 'تم بلوغ حد الخطة',
      },
    },
    notices: {
      serviceUnavailable: 'تعذر الوصول إلى الإضافات، لذلك كُتبت هذه الإجابة بدونها.',
      noTools: 'الإضافة التي ذكرتها لا تملك أدوات صالحة للاستخدام الآن، لذلك كُتبت الإجابة بدونها.',
      consentNotAvailable:
        'احتاج إجراء في إحدى الإضافات إلى موافقتك، ولا يمكن للمحادثة طلبها بعد. لم يتم تنفيذه.',
      limitReached:
        'تم بلوغ حد استدعاءات الإضافات للرسالة الواحدة، لذلك أجاب النموذج بما توفر لديه.',
    },
  },
  [Locale.FR]: {
    mention: {
      listLabel: 'Plugins que vous pouvez mentionner',
      count:
        '{value} plugins disponibles. Utilisez les flèches haut et bas pour choisir, Entrée pour sélectionner, Échap pour fermer.',
      chipsLabel: 'Plugins de ce message',
      removeChip: 'Retirer {value}',
    },
    calls: {
      title: 'Plugins utilisés',
      duration: '{value} ms',
      truncated: 'Résultat raccourci',
      resultToggle: 'Ce que le plugin a renvoyé',
      status: {
        ok: 'Terminé',
        error: 'Échec',
        consentRequired: 'Votre accord est nécessaire',
        blocked: 'Bloqué',
        rateLimited: 'Trop d’appels',
        quotaExceeded: 'Limite du forfait atteinte',
      },
    },
    notices: {
      serviceUnavailable:
        'Les plugins sont injoignables : cette réponse a donc été rédigée sans eux.',
      noTools:
        'Le plugin mentionné n’a aucun outil utilisable pour le moment : cette réponse a donc été rédigée sans lui.',
      consentNotAvailable:
        'Une action d’un plugin demandait votre accord, que le chat ne peut pas encore demander. Elle n’a pas été exécutée.',
      limitReached:
        'La limite d’appels de plugins pour un message a été atteinte : le modèle a répondu avec ce qu’il avait.',
    },
  },
  [Locale.IT]: {
    mention: {
      listLabel: 'Plugin che puoi menzionare',
      count:
        '{value} plugin disponibili. Usa le frecce su e giù per scegliere, Invio per selezionare, Esc per chiudere.',
      chipsLabel: 'Plugin di questo messaggio',
      removeChip: 'Rimuovi {value}',
    },
    calls: {
      title: 'Plugin usati',
      duration: '{value} ms',
      truncated: 'Risultato abbreviato',
      resultToggle: 'Cosa ha restituito il plugin',
      status: {
        ok: 'Fatto',
        error: 'Non riuscito',
        consentRequired: 'Serve la tua approvazione',
        blocked: 'Bloccato',
        rateLimited: 'Troppe chiamate',
        quotaExceeded: 'Limite del piano raggiunto',
      },
    },
    notices: {
      serviceUnavailable:
        'Non è stato possibile raggiungere i plugin, quindi questa risposta è stata scritta senza di essi.',
      noTools:
        'Il plugin che hai menzionato non ha strumenti utilizzabili in questo momento, quindi la risposta è stata scritta senza di esso.',
      consentNotAvailable:
        'Un’azione del plugin richiedeva la tua approvazione, che la chat non può ancora chiedere. Non è stata eseguita.',
      limitReached:
        'È stato raggiunto il limite di chiamate ai plugin per un messaggio, quindi il modello ha risposto con ciò che aveva.',
    },
  },
  [Locale.DE]: {
    mention: {
      listLabel: 'Plugins, die du erwähnen kannst',
      count:
        '{value} Plugins verfügbar. Mit den Pfeiltasten nach oben und unten auswählen, mit Enter bestätigen, mit Esc schließen.',
      chipsLabel: 'Plugins für diese Nachricht',
      removeChip: '{value} entfernen',
    },
    calls: {
      title: 'Verwendete Plugins',
      duration: '{value} ms',
      truncated: 'Ergebnis gekürzt',
      resultToggle: 'Was das Plugin zurückgegeben hat',
      status: {
        ok: 'Erledigt',
        error: 'Fehlgeschlagen',
        consentRequired: 'Deine Zustimmung ist nötig',
        blocked: 'Blockiert',
        rateLimited: 'Zu viele Aufrufe',
        quotaExceeded: 'Tarifgrenze erreicht',
      },
    },
    notices: {
      serviceUnavailable:
        'Die Plugins waren nicht erreichbar, deshalb wurde diese Antwort ohne sie geschrieben.',
      noTools:
        'Das erwähnte Plugin hat gerade keine nutzbaren Tools, deshalb wurde die Antwort ohne es geschrieben.',
      consentNotAvailable:
        'Eine Plugin-Aktion brauchte deine Zustimmung, die der Chat noch nicht einholen kann. Sie wurde nicht ausgeführt.',
      limitReached:
        'Das Limit für Plugin-Aufrufe pro Nachricht wurde erreicht, deshalb hat das Modell mit dem geantwortet, was es hatte.',
    },
  },
  [Locale.ES]: {
    mention: {
      listLabel: 'Plugins que puedes mencionar',
      count:
        '{value} plugins disponibles. Usa las flechas arriba y abajo para elegir, Intro para seleccionar y Escape para cerrar.',
      chipsLabel: 'Plugins de este mensaje',
      removeChip: 'Quitar {value}',
    },
    calls: {
      title: 'Plugins usados',
      duration: '{value} ms',
      truncated: 'Resultado acortado',
      resultToggle: 'Lo que devolvió el plugin',
      status: {
        ok: 'Hecho',
        error: 'Falló',
        consentRequired: 'Necesita tu aprobación',
        blocked: 'Bloqueado',
        rateLimited: 'Demasiadas llamadas',
        quotaExceeded: 'Límite del plan alcanzado',
      },
    },
    notices: {
      serviceUnavailable:
        'No se pudo contactar con los plugins, así que esta respuesta se escribió sin ellos.',
      noTools:
        'El plugin que mencionaste no tiene herramientas utilizables ahora mismo, así que la respuesta se escribió sin él.',
      consentNotAvailable:
        'Una acción de un plugin necesitaba tu aprobación, que el chat aún no puede pedir. No se ejecutó.',
      limitReached:
        'Se alcanzó el límite de llamadas a plugins por mensaje, así que el modelo respondió con lo que tenía.',
    },
  },
  [Locale.RU]: {
    mention: {
      listLabel: 'Плагины, которые можно упомянуть',
      count:
        'Доступно плагинов: {value}. Стрелки вверх и вниз — выбор, Enter — подтвердить, Escape — закрыть.',
      chipsLabel: 'Плагины этого сообщения',
      removeChip: 'Убрать {value}',
    },
    calls: {
      title: 'Использованные плагины',
      duration: '{value} мс',
      truncated: 'Результат сокращён',
      resultToggle: 'Что вернул плагин',
      status: {
        ok: 'Готово',
        error: 'Ошибка',
        consentRequired: 'Нужно ваше разрешение',
        blocked: 'Заблокировано',
        rateLimited: 'Слишком много вызовов',
        quotaExceeded: 'Достигнут лимит тарифа',
      },
    },
    notices: {
      serviceUnavailable: 'Плагины недоступны, поэтому этот ответ написан без них.',
      noTools:
        'У упомянутого плагина сейчас нет доступных инструментов, поэтому ответ написан без него.',
      consentNotAvailable:
        'Действие плагина требовало вашего разрешения, а чат пока не умеет его запрашивать. Оно не выполнено.',
      limitReached:
        'Достигнут лимит вызовов плагинов на одно сообщение, поэтому модель ответила тем, что у неё было.',
    },
  },
  [Locale.PT]: {
    mention: {
      listLabel: 'Plugins que você pode mencionar',
      count:
        '{value} plugins disponíveis. Use as setas para cima e para baixo para escolher, Enter para selecionar e Esc para fechar.',
      chipsLabel: 'Plugins desta mensagem',
      removeChip: 'Remover {value}',
    },
    calls: {
      title: 'Plugins usados',
      duration: '{value} ms',
      truncated: 'Resultado encurtado',
      resultToggle: 'O que o plugin devolveu',
      status: {
        ok: 'Concluído',
        error: 'Falhou',
        consentRequired: 'Precisa da sua aprovação',
        blocked: 'Bloqueado',
        rateLimited: 'Chamadas demais',
        quotaExceeded: 'Limite do plano atingido',
      },
    },
    notices: {
      serviceUnavailable:
        'Não foi possível acessar os plugins, então esta resposta foi escrita sem eles.',
      noTools:
        'O plugin que você mencionou não tem ferramentas utilizáveis agora, então a resposta foi escrita sem ele.',
      consentNotAvailable:
        'Uma ação de plugin precisava da sua aprovação, que o chat ainda não consegue pedir. Ela não foi executada.',
      limitReached:
        'O limite de chamadas de plugins por mensagem foi atingido, então o modelo respondeu com o que tinha.',
    },
  },
  [Locale.HI]: {
    mention: {
      listLabel: 'जिन प्लगइन का आप उल्लेख कर सकते हैं',
      count:
        '{value} प्लगइन उपलब्ध हैं। चुनने के लिए ऊपर और नीचे के तीर, चयन के लिए Enter और बंद करने के लिए Escape दबाएँ।',
      chipsLabel: 'इस संदेश के प्लगइन',
      removeChip: '{value} हटाएँ',
    },
    calls: {
      title: 'उपयोग किए गए प्लगइन',
      duration: '{value} मि.से.',
      truncated: 'परिणाम छोटा किया गया',
      resultToggle: 'प्लगइन ने क्या लौटाया',
      status: {
        ok: 'पूरा हुआ',
        error: 'विफल',
        consentRequired: 'आपकी मंज़ूरी चाहिए',
        blocked: 'रोका गया',
        rateLimited: 'बहुत ज़्यादा कॉल',
        quotaExceeded: 'प्लान की सीमा पूरी हो गई',
      },
    },
    notices: {
      serviceUnavailable: 'प्लगइन तक पहुँच नहीं हो सकी, इसलिए यह उत्तर उनके बिना लिखा गया।',
      noTools: 'आपके बताए प्लगइन में अभी कोई उपयोगी टूल नहीं है, इसलिए उत्तर उसके बिना लिखा गया।',
      consentNotAvailable:
        'एक प्लगइन कार्रवाई के लिए आपकी मंज़ूरी चाहिए थी, जो चैट अभी नहीं माँग सकता। उसे चलाया नहीं गया।',
      limitReached:
        'एक संदेश के लिए प्लगइन कॉल की सीमा पूरी हो गई, इसलिए मॉडल ने जो उसके पास था उसी से उत्तर दिया।',
    },
  },
  [Locale.JA]: {
    mention: {
      listLabel: 'メンションできるプラグイン',
      count: '利用できるプラグインは{value}件です。上下矢印で選び、Enterで決定、Escapeで閉じます。',
      chipsLabel: 'このメッセージのプラグイン',
      removeChip: '{value}を外す',
    },
    calls: {
      title: '使用したプラグイン',
      duration: '{value}ミリ秒',
      truncated: '結果を短縮しました',
      resultToggle: 'プラグインが返した内容',
      status: {
        ok: '完了',
        error: '失敗',
        consentRequired: '承認が必要です',
        blocked: 'ブロックされました',
        rateLimited: '呼び出しが多すぎます',
        quotaExceeded: 'プランの上限に達しました',
      },
    },
    notices: {
      serviceUnavailable:
        'プラグインに接続できなかったため、この回答はプラグインなしで作成されました。',
      noTools:
        'メンションしたプラグインには現在使えるツールがないため、この回答はプラグインなしで作成されました。',
      consentNotAvailable:
        'プラグインの操作にはあなたの承認が必要でしたが、チャットではまだ確認できません。実行されていません。',
      limitReached:
        '1通のメッセージで使えるプラグイン呼び出しの上限に達したため、モデルは手元の情報で回答しました。',
    },
  },
  [Locale.TH]: {
    mention: {
      listLabel: 'ปลั๊กอินที่คุณพูดถึงได้',
      count:
        'มีปลั๊กอินให้เลือก {value} รายการ ใช้ลูกศรขึ้นลงเพื่อเลือก กด Enter เพื่อยืนยัน และ Escape เพื่อปิด',
      chipsLabel: 'ปลั๊กอินของข้อความนี้',
      removeChip: 'นำ {value} ออก',
    },
    calls: {
      title: 'ปลั๊กอินที่ใช้',
      duration: '{value} มิลลิวินาที',
      truncated: 'ผลลัพธ์ถูกย่อ',
      resultToggle: 'สิ่งที่ปลั๊กอินส่งกลับมา',
      status: {
        ok: 'เสร็จแล้ว',
        error: 'ล้มเหลว',
        consentRequired: 'ต้องได้รับการอนุมัติจากคุณ',
        blocked: 'ถูกบล็อก',
        rateLimited: 'เรียกใช้มากเกินไป',
        quotaExceeded: 'ถึงขีดจำกัดของแพ็กเกจแล้ว',
      },
    },
    notices: {
      serviceUnavailable: 'เชื่อมต่อปลั๊กอินไม่ได้ คำตอบนี้จึงเขียนขึ้นโดยไม่ใช้ปลั๊กอิน',
      noTools:
        'ปลั๊กอินที่คุณพูดถึงยังไม่มีเครื่องมือที่ใช้งานได้ในตอนนี้ คำตอบนี้จึงเขียนขึ้นโดยไม่ใช้ปลั๊กอินนั้น',
      consentNotAvailable:
        'การทำงานของปลั๊กอินต้องได้รับอนุมัติจากคุณ ซึ่งแชตยังขอไม่ได้ จึงไม่ได้ดำเนินการ',
      limitReached: 'ถึงขีดจำกัดการเรียกปลั๊กอินต่อหนึ่งข้อความแล้ว โมเดลจึงตอบด้วยข้อมูลที่มี',
    },
  },
  [Locale.FA]: {
    mention: {
      listLabel: 'افزونه‌هایی که می‌توانید نام ببرید',
      count:
        '{value} افزونه در دسترس است. با کلیدهای جهت بالا و پایین انتخاب کنید، با Enter تأیید کنید و با Escape ببندید.',
      chipsLabel: 'افزونه‌های این پیام',
      removeChip: 'حذف {value}',
    },
    calls: {
      title: 'افزونه‌های استفاده‌شده',
      duration: '{value} میلی‌ثانیه',
      truncated: 'نتیجه کوتاه شد',
      resultToggle: 'آنچه افزونه برگرداند',
      status: {
        ok: 'انجام شد',
        error: 'ناموفق',
        consentRequired: 'نیاز به تأیید شما دارد',
        blocked: 'مسدود شد',
        rateLimited: 'تعداد درخواست‌ها زیاد است',
        quotaExceeded: 'سقف طرح پر شده است',
      },
    },
    notices: {
      serviceUnavailable: 'دسترسی به افزونه‌ها ممکن نشد، بنابراین این پاسخ بدون آن‌ها نوشته شد.',
      noTools:
        'افزونه‌ای که نام بردید اکنون ابزار قابل‌استفاده‌ای ندارد، بنابراین پاسخ بدون آن نوشته شد.',
      consentNotAvailable:
        'یکی از کارهای افزونه به تأیید شما نیاز داشت که گفت‌وگو هنوز نمی‌تواند بخواهد. اجرا نشد.',
      limitReached:
        'سقف تعداد فراخوانی افزونه برای یک پیام پر شد، بنابراین مدل با همان چیزی که داشت پاسخ داد.',
    },
  },
  [Locale.ZH]: {
    mention: {
      listLabel: '可提及的插件',
      count: '有 {value} 个可用插件。用上下方向键选择，按 Enter 确认，按 Esc 关闭。',
      chipsLabel: '此消息的插件',
      removeChip: '移除 {value}',
    },
    calls: {
      title: '已使用的插件',
      duration: '{value} 毫秒',
      truncated: '结果已截短',
      resultToggle: '插件返回的内容',
      status: {
        ok: '已完成',
        error: '失败',
        consentRequired: '需要你的批准',
        blocked: '已被阻止',
        rateLimited: '调用过于频繁',
        quotaExceeded: '已达到套餐上限',
      },
    },
    notices: {
      serviceUnavailable: '无法连接插件，因此这条回答没有使用它们。',
      noTools: '你提到的插件目前没有可用的工具，因此这条回答没有使用它。',
      consentNotAvailable: '某个插件操作需要你的批准，但聊天暂时无法请求批准，因此未执行。',
      limitReached: '单条消息的插件调用次数已达上限，因此模型只用已有的信息作答。',
    },
  },
};
