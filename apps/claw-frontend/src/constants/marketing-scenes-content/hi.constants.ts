import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const HI_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: 'ऐप में देखें',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: 'ClawAI की एक चैट, जिसमें एक सवाल, लिखा हुआ जवाब, जवाब देने वाले मॉडल का बैज और जवाब के नीचे रूटिंग की जानकारी दिख रही है।',
      caption: 'हर जवाब बताता है कि उसे किस मॉडल ने और क्यों लिखा।',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: 'ClawAI का संदेश बॉक्स, जिसमें मॉडल चुनने वाली सूची खुली है और चुने जा सकने वाले मॉडल दिख रहे हैं।',
      caption: 'मॉडल खुद चुनें, या AUTO को चुनने दें।',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: 'संदेश बॉक्स, जिसमें वेब रिसर्च चालू है और सर्च प्रदाता चुनने का विकल्प दिख रहा है।',
      caption: 'वेब रिसर्च चालू करें और चुनें कि वह कैसे खोजे।',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: 'संदेश बॉक्स, जिसमें कॉन्टेक्स्ट मेन्यू खुला है और आपकी मेमोरी व कॉन्टेक्स्ट पैक दिख रहे हैं।',
      caption: 'अपनी मेमोरी और कॉन्टेक्स्ट पैक किसी भी चैट में लाएँ।',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: 'एक बातचीत के ऊपर खुला «यह चैट साझा करें» डायलॉग, जिसमें साझा करने के विकल्प हैं।',
      caption: 'अपनी शर्तों पर, लिंक से चैट साझा करें।',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: 'तुलना पेज, जिसमें तीन मॉडल चुने गए हैं और भेजने के लिए तैयार एक प्रॉम्प्ट लिखा है।',
      caption: 'एक सवाल पूछें और तीन मॉडलों को साथ-साथ जवाब देते देखें।',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: 'सहमति पेज, जहाँ कई मॉडल एक ही सवाल का जवाब देते हैं और एक साझा नतीजे की ओर बढ़ते हैं।',
      caption: 'कई मॉडलों को जवाब देने दें, फिर एक सर्वसम्मत जवाब पाएँ।',
    },
    [MarketingSceneId.FILES]: {
      alt: 'फ़ाइलें पेज, जिसमें आपकी अपलोड की गई फ़ाइलें और ClawAI की बनाई फ़ाइलें सूचीबद्ध हैं।',
      caption: 'आपके अपलोड और बनाई गई फ़ाइलें, एक ही जगह।',
    },
    [MarketingSceneId.MEMORY]: {
      alt: 'मेमोरी पेज, जो दिखाता है कि ClawAI आपके बारे में क्या याद रखता है, जिसे आप देख और बदल सकते हैं।',
      caption: 'देखें और तय करें कि ClawAI क्या याद रखे।',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: 'कॉन्टेक्स्ट पेज, जिसमें दोबारा इस्तेमाल होने वाले कॉन्टेक्स्ट पैक सूचीबद्ध हैं जिन्हें आप चैट से जोड़ सकते हैं।',
      caption: 'बार-बार होने वाले काम के लिए दोबारा इस्तेमाल होने वाले कॉन्टेक्स्ट पैक।',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: 'कनेक्टर पेज, जिसमें वे सेवाएँ सूचीबद्ध हैं जिन्हें आप अपने वर्कस्पेस से जोड़ सकते हैं।',
      caption: 'अपने टूल जोड़ें ताकि AI उनके साथ काम कर सके।',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: 'बिलिंग पेज, जिसमें उपलब्ध प्लान और मौजूदा प्लान दिख रहा है।',
      caption: 'साफ़ प्लान, और आप हमेशा जानते हैं कि कौन-सा चल रहा है।',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: 'प्लान पेज, जो दिखाता है कि आपके प्लान में क्या शामिल है और आपने कितना इस्तेमाल किया है।',
      caption: 'ठीक-ठीक देखें कि आपके प्लान में क्या शामिल है।',
    },
    [MarketingSceneId.USAGE]: {
      alt: 'उपयोग पेज, जिसमें समय के साथ इस्तेमाल किए गए टोकन के चार्ट दिख रहे हैं।',
      caption: 'अपना उपयोग उसी समय देखते रहें।',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: 'सेटिंग्स पेज, जो नीचे स्क्रॉल होकर सूचनाओं वाले कार्ड और उसके स्विच तक पहुँचा है।',
      caption: 'चुनें कि आपको कौन-सी सूचनाएँ मिलें।',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'Threads पेज, जिसमें आपके Threads की सूची और हर एक की स्थिति दिख रही है।',
      caption: 'आपके सभी Threads, और हर एक कहाँ तक पहुँचा।',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: 'समीक्षा पेज पर खुला एक Thread ड्राफ़्ट, प्रकाशित होने से पहले।',
      caption: 'कुछ भी सार्वजनिक होने से पहले ड्राफ़्ट की समीक्षा करें।',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: 'घंटी से खुला सूचना पैनल, जिसमें कुछ हाल की सूचनाएँ हैं।',
      caption: 'कुछ तैयार होते ही जान जाएँ।',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: 'चैट पेज पर खुला एक छोटा प्रोडक्ट टूर कार्ड, जो एक फ़ीचर की ओर इशारा करता है।',
      caption: 'एक छोटा टूर आपको ऐप दिखाता है।',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: 'ClawAI का डैशबोर्ड, जिसमें आपकी हाल की गतिविधि और उपयोग का सार है।',
      caption: 'आपका वर्कस्पेस एक नज़र में।',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: 'एडमिन का ऑब्ज़र्वेबिलिटी व्यू, खपत टैब पर, जिसमें मॉडलों के इस्तेमाल के चार्ट हैं।',
      caption: 'एडमिन खपत को चार्ट में देखते हैं।',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: 'फ़ोन की स्क्रीन पर ClawAI की एक चैट बातचीत।',
      caption: 'वही चैट, आपके फ़ोन पर।',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: 'फ़ोन की स्क्रीन पर ClawAI का डैशबोर्ड।',
      caption: 'आपका डैशबोर्ड छोटी स्क्रीन पर भी फ़िट होता है।',
    },
  },
};
