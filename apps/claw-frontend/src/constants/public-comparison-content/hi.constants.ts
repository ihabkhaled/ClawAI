import { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import type { ComparisonDictionary } from '@/types/public-comparison.types';

export const HI_COMPARISON_CONTENT: ComparisonDictionary = {
  labels: {
    onThisPage: 'इस पेज पर',
    atAGlance: 'एक नज़र में',
    tableCaption: 'ClawAI और {rival} की क्षमता-दर-क्षमता तुलना',
    capabilityColumn: 'क्षमता',
    clawColumn: 'ClawAI',
    strengthTitle: '{rival} कहाँ मज़बूत है',
    differenceTitle: 'ClawAI कहाँ अलग तरह से काम करता है',
    chooseTitle: 'कौन-सा चुनें',
    chooseRivalLabel: '{rival} चुनें अगर',
    chooseClawLabel: 'ClawAI चुनें अगर',
    faqTitle: 'अक्सर पूछे जाने वाले सवाल',
    lastReviewed: 'सार्वजनिक जानकारी के आधार पर तुलना, अंतिम जाँच',
    independence:
      'ClawAI एक स्वतंत्र उत्पाद है। इस पेज पर बताए गए किसी भी असिस्टेंट से इसका कोई संबंध नहीं है, न ही उनका समर्थन प्राप्त है, न ही यह उन्हें पुनः बेचता है। हर दावा ऊपर दी गई तारीख पर उस प्रदाता के सार्वजनिक दस्तावेज़ों से लिया गया है, और ये उत्पाद तेज़ी से बदलते हैं — निर्णय से पहले प्रदाता के अपने पेज देखें।',
    otherComparisons: 'ClawAI की तुलना किसी और असिस्टेंट से करें',
    startFree: 'मुफ़्त प्लान से शुरू करें',
    seePricing: 'कीमतें देखें',
  },
  hub: {
    eyebrow: 'तुलनाएँ',
    intro:
      'ClawAI कोई बेहतर अकेला असिस्टेंट बनने की कोशिश नहीं करता। यह नौ अग्रणी मॉडल परिवारों को एक ही सदस्यता के पीछे रखता है और हर संदेश उसी मॉडल को भेजता है जो उसके लिए उपयुक्त है। ये पेज उसे उन असिस्टेंट के सामने रखते हैं जिन्हें लोग पहले से इस्तेमाल करते हैं — हर बार उन्हीं आठ क्षमताओं पर।',
    cardsTitle: 'तुलना के लिए एक असिस्टेंट चुनें',
    cardCta: '{rival} से तुलना करें',
    coversTitle: 'हर तुलना में क्या शामिल है',
    coversBody:
      'हर पेज पर वही आठ क्षमताएँ, उसी क्रम में: मॉडल चुनाव, रूटिंग, साथ-साथ जवाब, लोकल मॉडल, सेल्फ-होस्टिंग, मेमोरी और फ़ाइलें, वर्कस्पेस कनेक्टर, और हर जवाब का उपयोग रिकॉर्ड। सबके लिए वही सवाल, ताकि दो पेज साथ-साथ पढ़े जा सकें।',
  },
  dimensionLabels: {
    [ComparisonDimension.MODEL_CHOICE]: 'मॉडल चुनाव',
    [ComparisonDimension.ROUTING]: 'रूटिंग',
    [ComparisonDimension.SIDE_BY_SIDE]: 'साथ-साथ जवाब',
    [ComparisonDimension.LOCAL_MODELS]: 'लोकल और ओपन-वेट मॉडल',
    [ComparisonDimension.SELF_HOSTING]: 'सेल्फ-होस्टिंग',
    [ComparisonDimension.MEMORY_AND_FILES]: 'मेमोरी और फ़ाइलें',
    [ComparisonDimension.CONNECTORS]: 'वर्कस्पेस कनेक्टर',
    [ComparisonDimension.RECEIPTS]: 'उपयोग रिकॉर्ड',
  },
  clawCells: {
    [ComparisonDimension.MODEL_CHOICE]: 'एक ही सदस्यता में नौ अग्रणी मॉडल परिवार',
    [ComparisonDimension.ROUTING]:
      'पाँच रूटिंग मोड, जिनमें हर संदेश के लिए स्वचालित रूटिंग शामिल है',
    [ComparisonDimension.SIDE_BY_SIDE]: 'एक ही प्रॉम्प्ट कई मॉडलों को एक साथ, जवाब साथ-साथ',
    [ComparisonDimension.LOCAL_MODELS]:
      'आपके अपने GPU पर ओपन-वेट मॉडल, Ollama या llama.cpp के ज़रिए',
    [ComparisonDimension.SELF_HOSTING]: 'पूरा स्टैक आपके सर्वर पर चलता है, सोर्स GitHub पर',
    [ComparisonDimension.MEMORY_AND_FILES]:
      'बातचीत के बीच बनी रहने वाली मेमोरी, साथ में फ़ाइल संदर्भ',
    [ComparisonDimension.CONNECTORS]: 'बारह वर्कस्पेस कनेक्टर',
    [ComparisonDimension.RECEIPTS]: 'हर जवाब अपना मॉडल, लागत और खर्च हुई सीमा दर्ज करता है',
  },
  rivals: {
    [ComparisonRival.CHATGPT]: {
      name: 'ChatGPT',
      vendor: 'OpenAI',
      eyebrow: 'ClawAI बनाम ChatGPT',
      intro:
        'जब ज़्यादातर लोग «AI» कहते हैं तो उनका मतलब ChatGPT होता है — परिष्कृत, तेज़ और OpenAI के अपने अग्रणी मॉडलों पर टिका हुआ। ClawAI का आकार अलग है: एक सदस्यता जो OpenAI के मॉडलों तक आठ और परिवारों के साथ पहुँचती है, और हर संदेश उसी को भेजती है जो उसके लिए ठीक है।',
      theirStrength:
        'एक अकेला, बेहद अच्छी तरह बना उत्पाद। आवाज़, इमेज जनरेशन, कोड निष्पादन और गहन शोध भीतर ही मौजूद हैं और साथ काम करते हैं, मोबाइल ऐप बेहतरीन हैं, और नीचे का मॉडल कोई समझौता नहीं बल्कि अग्रणी मॉडल है।',
      ourDifference:
        'ClawAI बेहतर अकेला असिस्टेंट बनने की कोशिश नहीं करता; वह एकल-प्रदाता का सवाल ही हटा देता है: एक ही बातचीत OpenAI, Anthropic, Google और छह अन्य परिवारों के बीच घूम सकती है, जब डेटा नेटवर्क से बाहर नहीं जा सकता तो लोकल ओपन-वेट मॉडल पर उतर सकती है, और दर्ज कर सकती है कि जवाब किस मॉडल ने दिया।',
      chooseRival:
        'आप एक परिष्कृत असिस्टेंट चाहते हैं, OpenAI के मॉडल आपका लगभग सारा काम कवर करते हैं, और भीतर बने आवाज़ व इमेज टूल आपके लिए मायने रखते हैं।',
      chooseClaw:
        'आप बार-बार एक ही प्रदाता की सीमा से टकराते हैं, चाहते हैं कि दूसरा मॉडल पहले को जाँचे, या कुछ काम आपके अपने हार्डवेयर पर ही रहना चाहिए।',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'केवल OpenAI मॉडल',
        [ComparisonDimension.ROUTING]: 'OpenAI की अपनी रेंज के भीतर स्वचालित चुनाव',
        [ComparisonDimension.SIDE_BY_SIDE]: 'एक बार में एक जवाब',
        [ComparisonDimension.LOCAL_MODELS]: 'केवल क्लाउड',
        [ComparisonDimension.SELF_HOSTING]: 'उपलब्ध नहीं',
        [ComparisonDimension.MEMORY_AND_FILES]: 'मेमोरी, प्रोजेक्ट और फ़ाइल अपलोड',
        [ComparisonDimension.CONNECTORS]: 'पेड प्लान पर ऐप और कनेक्टर',
        [ComparisonDimension.RECEIPTS]: 'प्लान स्तर पर उपयोग, प्रति-जवाब लागत नहीं',
      },
      faq: [
        {
          question: 'क्या ClawAI वही OpenAI मॉडल इस्तेमाल कर सकता है जो ChatGPT करता है?',
          answer:
            'ClawAI अपनी सूची के नौ परिवारों में से एक के रूप में OpenAI के मॉडलों तक रूट करता है। न कोई OpenAI खाता बनाना है, न कोई API कुंजी चिपकानी है — मॉडल तक पहुँच सदस्यता के साथ आती है।',
        },
        {
          question: 'क्या ClawAI एक ChatGPT क्लाइंट है?',
          answer:
            'नहीं। ClawAI अपनी रूटिंग, मेमोरी, तुलना और ऑर्केस्ट्रेशन परतों वाला स्वतंत्र प्लेटफ़ॉर्म है। OpenAI उन प्रदाताओं में से एक है जिन्हें वह संदेश भेज सकता है, वह उत्पाद नहीं जिस पर यह टिका हो।',
        },
        {
          question: 'क्या मैं ClawAI को OpenAI को कुछ भेजे बिना चला सकता हूँ?',
          answer:
            'हाँ। बातचीत को किसी लोकल ओपन-वेट मॉडल पर पिन करें, या पूरा स्टैक खुद होस्ट करें और केवल अपने GPU पर मॉडल चलाएँ, बिना किसी बाहरी कॉल के।',
        },
      ],
    },
    [ComparisonRival.CLAUDE]: {
      name: 'Claude',
      vendor: 'Anthropic',
      eyebrow: 'ClawAI बनाम Claude',
      intro:
        'जब काम लंबा, सावधान और लिखित हो तो बहुत लोग Claude की ओर जाते हैं। ClawAI भी Anthropic के मॉडलों तक पहुँचता है — आठ अन्य परिवारों के साथ — और दूसरे मॉडल को पहले की कही बात जाँचने देता है।',
      theirStrength:
        'लंबे दस्तावेज़ों पर सावधान तर्क, इस क्षेत्र में सबसे भरोसेमंद निर्देश-पालन, और मज़बूत कोड समीक्षा। प्रोजेक्ट, आर्टिफ़ैक्ट और MCP कनेक्टर इसे लंबे लेखन कार्य के लिए वाकई अच्छी जगह बनाते हैं।',
      ourDifference:
        'ClawAI Anthropic को एक मज़बूत विकल्प मानता है, इकलौता नहीं। एक ही थ्रेड प्रॉम्प्ट को Claude और चार अन्य मॉडलों को एक साथ भेज सकता है, एक मॉडल से दूसरे के जवाब का आकलन करा सकता है, और प्रदाता के गिरने पर अपने आप बदल सकता है।',
      chooseRival: 'आपका लगभग सारा काम लंबा तर्क या कोड समीक्षा है और एक उत्कृष्ट मॉडल काफ़ी है।',
      chooseClaw:
        'आप Claude का जवाब और दूसरी राय दोनों चाहते हैं, संवेदनशील काम के लिए लोकल मॉडल चाहिए, या हर प्रदाता की अलग सदस्यता नहीं रखना चाहते।',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'केवल Anthropic मॉडल',
        [ComparisonDimension.ROUTING]: 'मॉडल आप खुद चुनते हैं',
        [ComparisonDimension.SIDE_BY_SIDE]: 'एक बार में एक जवाब',
        [ComparisonDimension.LOCAL_MODELS]: 'केवल क्लाउड',
        [ComparisonDimension.SELF_HOSTING]: 'उपलब्ध नहीं',
        [ComparisonDimension.MEMORY_AND_FILES]: 'प्रोजेक्ट, फ़ाइलें और मेमोरी',
        [ComparisonDimension.CONNECTORS]: 'MCP कनेक्टर और डेस्कटॉप एक्सटेंशन',
        [ComparisonDimension.RECEIPTS]: 'प्लान स्तर पर उपयोग, प्रति-जवाब लागत नहीं',
      },
      faq: [
        {
          question: 'क्या ClawAI में Claude मॉडल शामिल हैं?',
          answer:
            'हाँ। Anthropic सूची के नौ मॉडल परिवारों में से एक है, जो किसी भी बातचीत से बिना अलग Anthropic खाते या कुंजी के उपलब्ध है।',
        },
        {
          question: 'क्या एक मॉडल दूसरे के जवाब की जाँच कर सकता है?',
          answer:
            'हाँ। Verify, Judge और Critic पहले मॉडल के आउटपुट पर दूसरा मॉडल लगाते हैं। इससे आत्मविश्वास से भरे ग़लत जवाब का जोखिम घटता है, ख़त्म नहीं होता — महत्वपूर्ण हर चीज़ को अब भी इंसानी नज़र चाहिए।',
        },
        {
          question: 'क्या ClawAI का Anthropic से कोई संबंध है?',
          answer:
            'नहीं। ClawAI स्वतंत्र है। यह Anthropic के मॉडलों तक वैसे ही रूट करता है जैसे आठ अन्य प्रदाताओं तक, और किसी का समर्थित या साझेदार नहीं है।',
        },
      ],
    },
    [ComparisonRival.GEMINI]: {
      name: 'Gemini',
      vendor: 'Google',
      eyebrow: 'ClawAI बनाम Gemini',
      intro:
        'Gemini उन दस्तावेज़ों के सबसे नज़दीक बैठा असिस्टेंट है जो आपके पास पहले से हैं — बशर्ते वे Google Workspace में हों। ClawAI दूसरी ओर से आता है: प्रदाता-तटस्थ, जहाँ Google के मॉडल नौ परिवारों में से एक हैं।',
      theirStrength:
        'बहुत बड़ी संदर्भ विंडो, इमेज, ऑडियो और वीडियो की मूल हैंडलिंग, तेज़ जवाब, और Gmail, Drive तथा Docs के साथ ऐसा एकीकरण जिसकी बराबरी कोई तीसरा पक्ष नहीं कर सकता।',
      ourDifference:
        'ClawAI न किसी एक ऑफ़िस सुइट से बंधा है, न किसी एक प्रदाता के रोडमैप से। यह एक की जगह बारह कार्य-उपकरणों से जुड़ता है, हर संदेश को काम के हिसाब से रूट करता है, और संवेदनशील काम को लोकल ओपन-वेट मॉडल पर रख सकता है।',
      chooseRival:
        'आपका संगठन Google Workspace में रहता है और आप असिस्टेंट को सीधे उसी के भीतर चाहते हैं।',
      chooseClaw:
        'आप कई विक्रेताओं के उपकरण इस्तेमाल करते हैं, प्रतिबद्ध होने से पहले मॉडल तुलना करना चाहते हैं, या ऐसी तैनाती चाहिए जिसमें कोई बाहरी कॉल न हो।',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'केवल Google मॉडल',
        [ComparisonDimension.ROUTING]: 'Google की अपनी रेंज के भीतर स्वचालित चुनाव',
        [ComparisonDimension.SIDE_BY_SIDE]: 'एक बार में एक जवाब',
        [ComparisonDimension.LOCAL_MODELS]: 'केवल Google पर होस्टेड',
        [ComparisonDimension.SELF_HOSTING]: 'उपलब्ध नहीं',
        [ComparisonDimension.MEMORY_AND_FILES]: 'फ़ाइलें, Drive और Workspace संदर्भ',
        [ComparisonDimension.CONNECTORS]: 'गहरा Google Workspace एकीकरण',
        [ComparisonDimension.RECEIPTS]: 'प्लान स्तर पर उपयोग, प्रति-जवाब लागत नहीं',
      },
      faq: [
        {
          question: 'क्या ClawAI Gemini मॉडल इस्तेमाल कर सकता है?',
          answer:
            'हाँ। Google सूची के नौ मॉडल परिवारों में से एक है, जो उसी सदस्यता के तहत किसी भी बातचीत में उपलब्ध है।',
        },
        {
          question: 'क्या ClawAI Google Workspace से जुड़ता है?',
          answer:
            'ClawAI बारह कनेक्टर देता है जो इशू ट्रैकर, चैट और दस्तावेज़ों को कवर करते हैं। Google के साथ इसका एकीकरण एक कनेक्टर है, कोई मूल सतह नहीं — विक्रेताओं के आर-पार व्यापक, Google के भीतर कम गहरा।',
        },
        {
          question: 'बहुत लंबे दस्तावेज़ों के लिए कौन बेहतर है?',
          answer:
            'दोनों अच्छे हैं, और Google की सबसे बड़ी संदर्भ विंडो उपलब्ध विकल्पों में सबसे बड़ी में से हैं। ClawAI का अंतर यह है कि आप वही दस्तावेज़ दो मॉडलों को भेजकर उनके निष्कर्ष मिला सकते हैं।',
        },
      ],
    },
    [ComparisonRival.PERPLEXITY]: {
      name: 'Perplexity',
      vendor: 'Perplexity AI',
      eyebrow: 'ClawAI बनाम Perplexity',
      intro:
        'Perplexity एक ही काम के इर्द-गिर्द बना है: लाइव वेब से सवाल का जवाब देना, स्रोतों के साथ। ClawAI दूसरे काम के इर्द-गिर्द बना है: जो काम आपके सामने है उस पर सही मॉडल लगाना — शोध भी उसी में शामिल।',
      theirStrength:
        'खोज-जैसे सवालों के लिए सबसे अच्छा गढ़ा गया उत्पाद। जवाब स्रोतों के साथ आते हैं, आगे के सवाल सिलसिला बनाए रखते हैं, और पूरा इंटरफ़ेस इसी के लिए बना है कि कोई दावा कहाँ से आया यह जाँचा जा सके।',
      ourDifference:
        'ClawAI एक वर्कस्पेस है, उत्तर-इंजन नहीं। शोध कई मोड में से एक है — मॉडल तुलना, स्थायी मेमोरी, फ़ाइल संदर्भ, कोडिंग एजेंट और लोकल मॉडलों के बगल में — और हर जवाब यह दर्ज करता है कि उसे किस मॉडल ने बनाया।',
      chooseRival: 'आपके ज़्यादातर सवाल «अभी क्या सच है, और कौन कहता है» वाले हों।',
      chooseClaw:
        'शोध काम का सिर्फ़ एक हिस्सा हो और आपको कोड, लंबा लेखन, मॉडल तुलना या अपने हार्डवेयर पर चलने वाला मॉडल भी चाहिए।',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'ऊँचे प्लान पर कई विक्रेताओं के मॉडल',
        [ComparisonDimension.ROUTING]: 'खोज और जवाब की गुणवत्ता के आधार पर चुना गया',
        [ComparisonDimension.SIDE_BY_SIDE]: 'एक बार में एक जवाब',
        [ComparisonDimension.LOCAL_MODELS]: 'केवल क्लाउड',
        [ComparisonDimension.SELF_HOSTING]: 'उपलब्ध नहीं',
        [ComparisonDimension.MEMORY_AND_FILES]: 'स्पेस, थ्रेड और फ़ाइल अपलोड',
        [ComparisonDimension.CONNECTORS]: 'बिज़नेस प्लान पर कनेक्टर',
        [ComparisonDimension.RECEIPTS]: 'प्लान स्तर पर उपयोग, प्रति-जवाब लागत नहीं',
      },
      faq: [
        {
          question: 'क्या ClawAI वेब पर खोजता है?',
          answer:
            'हाँ। शोध कई चरणों वाली वेब खोज चलाता है और स्रोतों सहित जवाब लौटाता है। यह वर्कस्पेस के भीतर एक क्षमता है, पूरा उत्पाद नहीं।',
        },
        {
          question: 'स्रोत बेहतर कौन देता है?',
          answer:
            'Perplexity स्रोत-सहित जवाबों के लिए ही बना है और लगभग हर दावे के लिए स्रोत दिखाता है। ClawAI अपने शोध के स्रोत देता है; शुद्ध «खोजो और उद्धृत करो» सवाल के लिए समर्पित उत्तर-इंजन ज़्यादा धारदार औज़ार है।',
        },
        {
          question: 'क्या मैं दोनों इस्तेमाल कर सकता हूँ?',
          answer:
            'बहुत लोग करते हैं। असली सवाल यह है कि आपको विशेषज्ञ उत्तर-इंजन चाहिए, सामान्य बहु-मॉडल वर्कस्पेस, या दोनों।',
        },
      ],
    },
    [ComparisonRival.COPILOT]: {
      name: 'Microsoft Copilot',
      vendor: 'Microsoft',
      eyebrow: 'ClawAI बनाम Microsoft Copilot',
      intro:
        'Copilot यानी Microsoft 365 जिसमें असिस्टेंट बुना हुआ है। ClawAI एक स्वतंत्र वर्कस्पेस है जो नौ मॉडल परिवारों तक पहुँचता है और पूरी तरह आपके अपने सर्वर पर चल सकता है।',
      theirStrength:
        'किसी संगठन के पहले से मौजूद Microsoft डेटा के इतने पास और कुछ नहीं बैठता। Word, Excel, Outlook और Teams का संदर्भ बिना कॉन्फ़िगरेशन आ जाता है, और लाइसेंसिंग, टेनेंसी तथा अनुपालन उसी Microsoft 365 अनुबंध से चलते हैं जो IT के पास पहले से है।',
      ourDifference:
        'ClawAI विक्रेता-तटस्थ है और कहीं भी तैनात हो सकता है। यह एक आपूर्तिकर्ता के चयन की जगह नौ मॉडल परिवारों पर रूट करता है, हर जवाब की लागत दिखाता है, और ओपन-वेट मॉडलों के साथ आपके नेटवर्क के भीतर बिना किसी बाहरी कॉल के स्थापित हो सकता है।',
      chooseRival:
        'आपका संगठन Microsoft 365 पर चलता है और मूल्य इसी में है कि असिस्टेंट पहले से मौजूद दस्तावेज़ों के भीतर रहे।',
      chooseClaw:
        'आप प्रदाता चुनने की आज़ादी, प्रति-जवाब लागत की स्पष्टता, या ऐसी तैनाती चाहते हैं जो कभी आपके इन्फ़्रास्ट्रक्चर से बाहर न जाए।',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'OpenAI मॉडल और Microsoft के अपने मॉडल',
        [ComparisonDimension.ROUTING]: 'हर सतह के लिए Microsoft चुनता है',
        [ComparisonDimension.SIDE_BY_SIDE]: 'एक बार में एक जवाब',
        [ComparisonDimension.LOCAL_MODELS]: 'केवल क्लाउड',
        [ComparisonDimension.SELF_HOSTING]: 'उपलब्ध नहीं',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Microsoft 365 फ़ाइलें और संगठन संदर्भ',
        [ComparisonDimension.CONNECTORS]: 'सबसे गहरा Microsoft 365 एकीकरण',
        [ComparisonDimension.RECEIPTS]: 'प्रति-सीट लाइसेंस, प्रति-जवाब लागत नहीं',
      },
      faq: [
        {
          question: 'क्या ClawAI हमारे अपने नेटवर्क के भीतर तैनात हो सकता है?',
          answer:
            'हाँ। पूरा स्टैक आपके सर्वर पर चलता है, आपके GPU पर ओपन-वेट मॉडलों के साथ और बिना किसी बाहरी प्रदाता कॉल के। यह एक निर्धारित दायरे वाला काम है, ऑनलाइन ख़रीदा जाने वाला प्लान नहीं।',
        },
        {
          question: 'क्या ClawAI Microsoft 365 से जुड़ता है?',
          answer:
            'ClawAI बारह कनेक्टर देता है जो इशू ट्रैकर, चैट और दस्तावेज़ों को कवर करते हैं — Copilot से विक्रेताओं के आर-पार व्यापक, और Microsoft के अपने ऐप्लिकेशन के भीतर कम गहरा।',
        },
        {
          question: 'उपयोग का बिल कैसे बनता है?',
          answer:
            'लागत-सामान्यीकृत टोकन के हिसाब से, दैनिक और मासिक सीमा के विरुद्ध — प्रति सीट नहीं। हर जवाब मॉडल, लागत और खर्च हुई सीमा दिखाता है।',
        },
      ],
    },
  },
};
