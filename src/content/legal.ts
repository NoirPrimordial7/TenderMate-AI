import type { AppLocale } from "@/i18n/config";

export const LEGAL_SLUGS = [
  "terms",
  "privacy",
  "ai-disclaimer",
  "refunds",
  "credits",
  "acceptable-use",
  "cookies",
  "data-retention",
  "third-party-processors",
  "grievance"
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

type Localized = Record<AppLocale, string>;
type LegalSection = { title: Localized; body: Localized };
type LegalDocument = { title: Localized; summary: Localized; sections: LegalSection[] };

const l = (en: string, hi: string, mr: string): Localized => ({ en, hi, mr });
const s = (title: Localized, body: Localized): LegalSection => ({ title, body });

const termsBodies = {
  service: l(
    "NividaIQ is a public-beta, AI-assisted tender analysis and decision-support service. Features may change and outputs can be incomplete, outdated or incorrect; the original tender, corrigenda, authority instructions and official portal always prevail.",
    "NividaIQ सार्वजनिक बीटा में उपलब्ध AI-सहायित निविदा विश्लेषण और निर्णय-सहायता सेवा है। सुविधाएँ बदल सकती हैं और परिणाम अधूरे, पुराने या गलत हो सकते हैं; मूल निविदा, शुद्धिपत्र, प्राधिकरण के निर्देश और आधिकारिक पोर्टल हमेशा मान्य होंगे।",
    "NividaIQ ही सार्वजनिक बीटामधील AI-सहायित निविदा विश्लेषण आणि निर्णय-सहाय्य सेवा आहे. वैशिष्ट्ये बदलू शकतात आणि निष्कर्ष अपूर्ण, कालबाह्य किंवा चुकीचे असू शकतात; मूळ निविदा, शुद्धिपत्रके, प्राधिकरणाच्या सूचना आणि अधिकृत पोर्टल यांनाच प्राधान्य राहील."
  ),
  responsibility: l(
    "You must have authority to use the account and permission to upload each document. You remain responsible for account security, independent verification, compliance, submission decisions and all actions taken on the analysis.",
    "खाते उपयोग करने का अधिकार और प्रत्येक दस्तावेज़ अपलोड करने की अनुमति आपके पास होनी चाहिए। खाते की सुरक्षा, स्वतंत्र सत्यापन, अनुपालन, जमा करने के निर्णय और विश्लेषण पर की गई कार्रवाई की जिम्मेदारी आपकी है।",
    "खाते वापरण्याचा अधिकार आणि प्रत्येक दस्तऐवज अपलोड करण्याची परवानगी तुमच्याकडे असणे आवश्यक आहे. खाते सुरक्षा, स्वतंत्र पडताळणी, अनुपालन, सादरीकरणाचे निर्णय आणि विश्लेषणावर केलेल्या कृतींची जबाबदारी तुमची आहे."
  ),
  limits: l(
    "NividaIQ does not provide legal, financial, tax, procurement or bid-submission advice and does not guarantee accuracy, eligibility, compliance, bid validity, acceptance, award, savings, profit or any particular result.",
    "NividaIQ कानूनी, वित्तीय, कर, खरीद या बोली-जमा सलाह नहीं देता और सटीकता, पात्रता, अनुपालन, बोली की वैधता, स्वीकृति, पुरस्कार, बचत, लाभ या किसी परिणाम की गारंटी नहीं देता।",
    "NividaIQ कायदेशीर, आर्थिक, कर, खरेदी किंवा बोली-सादरीकरण सल्ला देत नाही आणि अचूकता, पात्रता, अनुपालन, बोलीची वैधता, स्वीकार, कंत्राट, बचत, नफा किंवा कोणत्याही निकालाची हमी देत नाही."
  ),
  usage: l(
    "Usage entitlements, fair-use limits, question limits and future paid credits are governed by the current product display and the Credit and Refund Policies. Failed extraction, provider failure, schema failure and non-tender rejection must not consume an analysis credit.",
    "उपयोग अधिकार, उचित-उपयोग सीमाएँ, प्रश्न सीमाएँ और भविष्य के सशुल्क क्रेडिट वर्तमान उत्पाद प्रदर्शन तथा क्रेडिट और रिफंड नीतियों के अनुसार होंगे। निष्कर्षण, प्रदाता या स्कीमा विफलता और गैर-निविदा अस्वीकृति पर विश्लेषण क्रेडिट नहीं कटना चाहिए।",
    "वापर हक्क, न्याय्य-वापर मर्यादा, प्रश्न मर्यादा आणि भविष्यातील सशुल्क क्रेडिट हे सध्याच्या उत्पादन प्रदर्शनानुसार तसेच क्रेडिट व परतावा धोरणांनुसार असतील. एक्स्ट्रॅक्शन, प्रदाता किंवा स्कीमा अपयश आणि निविदा नसलेला दस्तऐवज नाकारल्यास विश्लेषण क्रेडिट वापरले जाऊ नये."
  ),
  governance: l(
    "We may maintain, change, suspend or terminate the service or these terms with reasonable notice where practicable. Rights that cannot lawfully be excluded remain unaffected; liability limitations apply only to the maximum extent permitted by applicable law.",
    "जहाँ संभव हो उचित सूचना देकर हम सेवा या शर्तों में बदलाव, रखरखाव, निलंबन या समाप्ति कर सकते हैं। कानूनन जो अधिकार हटाए नहीं जा सकते वे अप्रभावित रहेंगे; दायित्व सीमाएँ केवल लागू कानून द्वारा अनुमत अधिकतम सीमा तक लागू होंगी।",
    "शक्य असेल तेथे वाजवी सूचना देऊन आम्ही सेवा किंवा अटी बदलू, देखभाल करू, निलंबित किंवा समाप्त करू शकतो. कायद्याने वगळता न येणारे हक्क अबाधित राहतील; दायित्व मर्यादा लागू कायद्याने परवानगी दिलेल्या कमाल मर्यादेपर्यंतच लागू होतील."
  )
};

const termTopics: Array<[Localized, keyof typeof termsBodies]> = [
  [l("1. Service operator", "1. सेवा संचालक", "1. सेवा संचालक"), "governance"],
  [l("2. Acceptance of terms", "2. शर्तों की स्वीकृति", "2. अटींची स्वीकृती"), "governance"],
  [l("3. User eligibility and company authority", "3. उपयोगकर्ता पात्रता और कंपनी अधिकार", "3. वापरकर्ता पात्रता आणि कंपनी अधिकार"), "responsibility"],
  [l("4. AI-assisted service", "4. AI-सहायित सेवा", "4. AI-सहायित सेवा"), "service"],
  [l("5. Public beta", "5. सार्वजनिक बीटा", "5. सार्वजनिक बीटा"), "service"],
  [l("6. Account responsibilities", "6. खाते की जिम्मेदारियाँ", "6. खात्याच्या जबाबदाऱ्या"), "responsibility"],
  [l("7. Permitted tender documents", "7. अनुमत निविदा दस्तावेज़", "7. अनुमत निविदा दस्तऐवज"), "responsibility"],
  [l("8. Upload ownership and permission", "8. अपलोड स्वामित्व और अनुमति", "8. अपलोड मालकी आणि परवानगी"), "responsibility"],
  [l("9. No professional advice", "9. पेशेवर सलाह नहीं", "9. व्यावसायिक सल्ला नाही"), "limits"],
  [l("10. AI limitations", "10. AI की सीमाएँ", "10. AI मर्यादा"), "limits"],
  [l("11. Official sources prevail", "11. आधिकारिक स्रोत सर्वोपरि", "11. अधिकृत स्रोतांना प्राधान्य"), "service"],
  [l("12. User verification", "12. उपयोगकर्ता सत्यापन", "12. वापरकर्ता पडताळणी"), "responsibility"],
  [l("13. No eligibility or award guarantee", "13. पात्रता या पुरस्कार की गारंटी नहीं", "13. पात्रता किंवा कंत्राटाची हमी नाही"), "limits"],
  [l("14. No accuracy or completeness guarantee", "14. सटीकता या पूर्णता की गारंटी नहीं", "14. अचूकता किंवा पूर्णतेची हमी नाही"), "limits"],
  [l("15. Credits and entitlements", "15. क्रेडिट और अधिकार", "15. क्रेडिट आणि हक्क"), "usage"],
  [l("16. Free trial", "16. निःशुल्क परीक्षण", "16. विनामूल्य चाचणी"), "usage"],
  [l("17. Future payment processing", "17. भविष्य का भुगतान प्रसंस्करण", "17. भविष्यातील पेमेंट प्रक्रिया"), "usage"],
  [l("18. Failed-analysis credit protection", "18. विफल विश्लेषण क्रेडिट सुरक्षा", "18. अयशस्वी विश्लेषण क्रेडिट संरक्षण"), "usage"],
  [l("19. Refunds and cancellation", "19. रिफंड और रद्दीकरण", "19. परतावा आणि रद्द करणे"), "usage"],
  [l("20. Fair use", "20. उचित उपयोग", "20. न्याय्य वापर"), "usage"],
  [l("21. Question limits", "21. प्रश्न सीमाएँ", "21. प्रश्न मर्यादा"), "usage"],
  [l("22. PDF export limitations", "22. PDF निर्यात सीमाएँ", "22. PDF निर्यात मर्यादा"), "limits"],
  [l("23. Indicative market estimates", "23. सांकेतिक बाजार अनुमान", "23. सूचक बाजार अंदाज"), "limits"],
  [l("24. Third-party services", "24. तृतीय-पक्ष सेवाएँ", "24. तृतीय-पक्ष सेवा"), "service"],
  [l("25. AI-provider processing", "25. AI प्रदाता प्रसंस्करण", "25. AI प्रदाता प्रक्रिया"), "service"],
  [l("26. User feedback", "26. उपयोगकर्ता प्रतिक्रिया", "26. वापरकर्ता अभिप्राय"), "responsibility"],
  [l("27. Optional training consent", "27. वैकल्पिक प्रशिक्षण सहमति", "27. ऐच्छिक प्रशिक्षण संमती"), "responsibility"],
  [l("28. Intellectual property", "28. बौद्धिक संपदा", "28. बौद्धिक संपदा"), "responsibility"],
  [l("29. Prohibited use", "29. निषिद्ध उपयोग", "29. प्रतिबंधित वापर"), "responsibility"],
  [l("30. Suspension and termination", "30. निलंबन और समाप्ति", "30. निलंबन आणि समाप्ती"), "governance"],
  [l("31. Availability and maintenance", "31. उपलब्धता और रखरखाव", "31. उपलब्धता आणि देखभाल"), "governance"],
  [l("32. Warranties", "32. वारंटी", "32. हमी"), "governance"],
  [l("33. Limitation of liability", "33. दायित्व की सीमा", "33. दायित्व मर्यादा"), "governance"],
  [l("34. Non-waivable rights", "34. न छोड़े जा सकने वाले अधिकार", "34. न सोडता येणारे हक्क"), "governance"],
  [l("35. Changes to terms", "35. शर्तों में बदलाव", "35. अटींमधील बदल"), "governance"],
  [l("36. Governing law and jurisdiction", "36. लागू कानून और अधिकार क्षेत्र", "36. लागू कायदा आणि अधिकारक्षेत्र"), "governance"],
  [l("37. Grievance and contact", "37. शिकायत और संपर्क", "37. तक्रार आणि संपर्क"), "governance"],
  [l("38. Translation consistency", "38. अनुवाद की संगति", "38. भाषांतर सुसंगती"), "governance"]
];

const verification = l(
  "Always compare important dates, corrigenda, amounts, taxes, EMD, fees, eligibility, required documents, specifications, delivery conditions, penalties, submission procedures and portal instructions with official sources before acting.",
  "कार्रवाई से पहले महत्वपूर्ण तिथियों, शुद्धिपत्रों, राशियों, करों, EMD, शुल्क, पात्रता, आवश्यक दस्तावेज़ों, विनिर्देशों, डिलीवरी शर्तों, दंड, जमा प्रक्रियाओं और पोर्टल निर्देशों की आधिकारिक स्रोतों से तुलना करें।",
  "कृती करण्यापूर्वी महत्त्वाच्या तारखा, शुद्धिपत्रके, रक्कम, कर, EMD, शुल्क, पात्रता, आवश्यक दस्तऐवज, तपशील, वितरण अटी, दंड, सादरीकरण प्रक्रिया आणि पोर्टल सूचना अधिकृत स्रोतांशी पडताळा."
);

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  terms: {
    title: l("Terms of Service", "सेवा की शर्तें", "सेवा अटी"),
    summary: l("Rules for using the NividaIQ public beta.", "NividaIQ सार्वजनिक बीटा उपयोग करने के नियम।", "NividaIQ सार्वजनिक बीटा वापरण्याचे नियम."),
    sections: termTopics.map(([title, body]) => s(title, termsBodies[body]))
  },
  privacy: {
    title: l("Privacy Policy", "गोपनीयता नीति", "गोपनीयता धोरण"),
    summary: l("How account, tender, analysis, question, feedback and technical data are handled.", "खाता, निविदा, विश्लेषण, प्रश्न, प्रतिक्रिया और तकनीकी डेटा कैसे संभाला जाता है।", "खाते, निविदा, विश्लेषण, प्रश्न, अभिप्राय आणि तांत्रिक डेटा कसा हाताळला जातो."),
    sections: [
      s(l("Information we process", "हम कौन-सी जानकारी संसाधित करते हैं", "आम्ही कोणती माहिती प्रक्रिया करतो"), l("We may process account and business-profile data, uploaded tender files, extracted text, analyses, tender questions and answers, feedback, future payment metadata, and security logs to provide, secure and improve the service.", "सेवा देने, सुरक्षित रखने और सुधारने के लिए हम खाता व व्यवसाय-प्रोफ़ाइल डेटा, अपलोड की निविदाएँ, निकाला गया पाठ, विश्लेषण, प्रश्न-उत्तर, प्रतिक्रिया, भविष्य का भुगतान मेटाडेटा और सुरक्षा लॉग संसाधित कर सकते हैं।", "सेवा पुरवण्यासाठी, सुरक्षित ठेवण्यासाठी आणि सुधारण्यासाठी आम्ही खाते व व्यवसाय-प्रोफाइल डेटा, अपलोड निविदा, काढलेला मजकूर, विश्लेषण, प्रश्नोत्तरे, अभिप्राय, भविष्यातील पेमेंट मेटाडेटा आणि सुरक्षा लॉग प्रक्रिया करू शकतो.")),
      s(l("Storage, providers and transfers", "भंडारण, प्रदाता और स्थानांतरण", "साठवण, प्रदाते आणि हस्तांतरण"), l("Data may be stored with configured cloud infrastructure and processed by hosting, database, email and AI providers. Cross-border processing may occur according to provider locations and applicable safeguards.", "डेटा कॉन्फ़िगर किए गए क्लाउड ढाँचे में संग्रहीत और होस्टिंग, डेटाबेस, ईमेल व AI प्रदाताओं द्वारा संसाधित हो सकता है। प्रदाता स्थान और लागू सुरक्षा उपायों के अनुसार सीमा-पार प्रसंस्करण हो सकता है।", "डेटा कॉन्फिगर केलेल्या क्लाउड पायाभूत सुविधांमध्ये साठवला जाऊ शकतो आणि होस्टिंग, डेटाबेस, ईमेल व AI प्रदात्यांद्वारे प्रक्रिया केला जाऊ शकतो. प्रदाता स्थान व लागू संरक्षणानुसार सीमापार प्रक्रिया होऊ शकते.")),
      s(l("Retention, access and deletion", "अवधारण, पहुँच और हटाना", "धारणा, प्रवेश आणि हटवणे"), l("We retain data only as long as reasonably needed for the service, security, legal duties and dispute handling. Users may request access, correction or deletion; some records may be retained where law or security requires it.", "सेवा, सुरक्षा, कानूनी दायित्व और विवाद निपटान के लिए उचित अवधि तक ही डेटा रखा जाता है। उपयोगकर्ता पहुँच, सुधार या हटाने का अनुरोध कर सकते हैं; कानून या सुरक्षा की आवश्यकता पर कुछ रिकॉर्ड रखे जा सकते हैं।", "सेवा, सुरक्षा, कायदेशीर कर्तव्ये आणि वाद हाताळणीसाठी वाजवी काळापुरताच डेटा ठेवला जातो. वापरकर्ते प्रवेश, दुरुस्ती किंवा हटवण्याची विनंती करू शकतात; कायदा किंवा सुरक्षेसाठी काही नोंदी ठेवाव्या लागू शकतात.")),
      s(l("Security, minors and training", "सुरक्षा, नाबालिग और प्रशिक्षण", "सुरक्षा, अल्पवयीन आणि प्रशिक्षण"), l("We use reasonable technical and organizational safeguards, but no system is risk-free. The service is not intended for children. Normal use does not grant permission to train models on private tender content; training requires a separate opt-in, anonymization and review, and never automatically includes raw documents.", "हम उचित तकनीकी और संगठनात्मक सुरक्षा उपाय अपनाते हैं, पर कोई प्रणाली जोखिम-मुक्त नहीं है। सेवा बच्चों के लिए नहीं है। सामान्य उपयोग निजी निविदा सामग्री पर मॉडल प्रशिक्षण की अनुमति नहीं देता; इसके लिए अलग ऑप्ट-इन, अनामकरण और समीक्षा आवश्यक है तथा कच्चे दस्तावेज़ स्वतः शामिल नहीं होते।", "आम्ही वाजवी तांत्रिक व संघटनात्मक संरक्षण वापरतो, परंतु कोणतीही प्रणाली जोखमरहित नाही. सेवा मुलांसाठी नाही. सामान्य वापरामुळे खासगी निविदा मजकुरावर मॉडेल प्रशिक्षणाची परवानगी मिळत नाही; त्यासाठी स्वतंत्र ऑप्ट-इन, अनामिकरण आणि पुनरावलोकन आवश्यक आहे आणि मूळ दस्तऐवज आपोआप समाविष्ट होत नाहीत."))
    ]
  },
  "ai-disclaimer": {
    title: l("AI Analysis Disclaimer", "AI विश्लेषण अस्वीकरण", "AI विश्लेषण अस्वीकरण"),
    summary: l("Important limits of AI-assisted tender analysis and decision support.", "AI-सहायित निविदा विश्लेषण और निर्णय सहायता की महत्वपूर्ण सीमाएँ।", "AI-सहायित निविदा विश्लेषण आणि निर्णय सहाय्याच्या महत्त्वाच्या मर्यादा."),
    sections: [
      s(l("Decision support, not advice", "निर्णय सहायता, सलाह नहीं", "निर्णय सहाय्य, सल्ला नाही"), termsBodies.limits),
      s(l("Independent verification required", "स्वतंत्र सत्यापन आवश्यक", "स्वतंत्र पडताळणी आवश्यक"), verification),
      s(l("Sources that prevail", "मान्य स्रोत", "प्राधान्य स्रोत"), termsBodies.service),
      s(l("No guaranteed result", "परिणाम की गारंटी नहीं", "निकालाची हमी नाही"), termsBodies.limits)
    ]
  },
  refunds: {
    title: l("Refund Policy", "रिफंड नीति", "परतावा धोरण"),
    summary: l("Draft rules for later billing; payments are not active.", "भविष्य की बिलिंग के प्रारूप नियम; भुगतान सक्रिय नहीं है।", "भविष्यातील बिलिंगचे मसुदा नियम; पेमेंट सक्रिय नाही."),
    sections: [s(l("Payments are not active", "भुगतान सक्रिय नहीं है", "पेमेंट सक्रिय नाही"), l("NividaIQ does not currently collect payment. When billing launches, duplicate charges, provider errors and disputes will be reviewed and applicable consumer rights will be preserved.", "NividaIQ अभी भुगतान नहीं लेता। बिलिंग शुरू होने पर दोहरे शुल्क, प्रदाता त्रुटियों और विवादों की समीक्षा होगी तथा लागू उपभोक्ता अधिकार सुरक्षित रहेंगे।", "NividaIQ सध्या पेमेंट घेत नाही. बिलिंग सुरू झाल्यावर दुबार शुल्क, प्रदाता त्रुटी आणि वादांचे पुनरावलोकन केले जाईल व लागू ग्राहक हक्क राखले जातील.")), s(l("Credit restoration", "क्रेडिट बहाली", "क्रेडिट पुनर्स्थापना"), termsBodies.usage)]
  },
  credits: {
    title: l("Credit Policy", "क्रेडिट नीति", "क्रेडिट धोरण"),
    summary: l("How trial and future paid analysis entitlements are intended to work.", "ट्रायल और भविष्य के सशुल्क विश्लेषण अधिकार कैसे काम करेंगे।", "चाचणी आणि भविष्यातील सशुल्क विश्लेषण हक्क कसे काम करतील."),
    sections: [s(l("Trial credits", "ट्रायल क्रेडिट", "चाचणी क्रेडिट"), l("Three trial tender credits are planned for each verified new account at public launch. They have no cash value, are non-transferable and are not withdrawable money.", "सार्वजनिक लॉन्च पर प्रत्येक सत्यापित नए खाते के लिए तीन ट्रायल निविदा क्रेडिट नियोजित हैं। उनका नकद मूल्य नहीं है, वे हस्तांतरणीय नहीं हैं और निकाले नहीं जा सकते।", "सार्वजनिक लाँचवेळी प्रत्येक पडताळलेल्या नवीन खात्यासाठी तीन चाचणी निविदा क्रेडिट नियोजित आहेत. त्यांना रोख मूल्य नाही, ते हस्तांतरणीय नाहीत आणि पैसे म्हणून काढता येत नाहीत.")), s(l("When a credit is consumed", "क्रेडिट कब कटता है", "क्रेडिट केव्हा वापरले जाते"), termsBodies.usage), s(l("Questions and repeat exports", "प्रश्न और दोबारा निर्यात", "प्रश्न आणि पुनर्निर्यात"), l("Assistant questions do not consume analysis credits. Repeated export of an existing report must not consume another analysis credit; separate fair-use question limits may apply.", "सहायक प्रश्न विश्लेषण क्रेडिट नहीं लेते। मौजूदा रिपोर्ट को दोबारा निर्यात करने पर नया विश्लेषण क्रेडिट नहीं कटना चाहिए; अलग उचित-उपयोग प्रश्न सीमाएँ लागू हो सकती हैं।", "सहाय्यक प्रश्नांसाठी विश्लेषण क्रेडिट वापरले जात नाही. विद्यमान अहवाल पुन्हा निर्यात केल्यास नवीन विश्लेषण क्रेडिट वापरले जाऊ नये; स्वतंत्र न्याय्य-वापर प्रश्न मर्यादा लागू होऊ शकतात."))]
  },
  "acceptable-use": {
    title: l("Acceptable Use Policy", "स्वीकार्य उपयोग नीति", "स्वीकार्य वापर धोरण"),
    summary: l("Rules that protect users, documents and the service.", "उपयोगकर्ताओं, दस्तावेज़ों और सेवा की सुरक्षा के नियम।", "वापरकर्ते, दस्तऐवज आणि सेवा सुरक्षित ठेवण्याचे नियम."),
    sections: [s(l("Permitted use", "अनुमत उपयोग", "अनुमत वापर"), termsBodies.responsibility), s(l("Prohibited use", "निषिद्ध उपयोग", "प्रतिबंधित वापर"), l("Do not upload unlawful, malicious, infringing or unauthorized material; evade limits; probe security; automate abusive traffic; impersonate others; or use outputs to mislead a procuring authority.", "गैरकानूनी, दुर्भावनापूर्ण, उल्लंघनकारी या अनधिकृत सामग्री अपलोड न करें; सीमाएँ न तोड़ें; सुरक्षा जाँच न करें; दुरुपयोगी ट्रैफ़िक न चलाएँ; किसी और का रूप न लें; या प्राधिकरण को गुमराह करने के लिए परिणामों का उपयोग न करें।", "बेकायदेशीर, दुर्भावनायुक्त, हक्कभंग करणारी किंवा अनधिकृत सामग्री अपलोड करू नका; मर्यादा टाळू नका; सुरक्षा तपासू नका; गैरवापराचे स्वयंचलित ट्रॅफिक करू नका; दुसऱ्याचे सोंग घेऊ नका; किंवा प्राधिकरणाची दिशाभूल करण्यासाठी निष्कर्ष वापरू नका."))]
  },
  cookies: {
    title: l("Cookie Notice", "कुकी सूचना", "कुकी सूचना"),
    summary: l("Essential authentication and preference storage used by NividaIQ.", "NividaIQ द्वारा उपयोग की जाने वाली आवश्यक प्रमाणीकरण और प्राथमिकता स्टोरेज।", "NividaIQ वापरत असलेले आवश्यक प्रमाणीकरण आणि प्राधान्य साठवण."),
    sections: [s(l("Essential storage", "आवश्यक स्टोरेज", "आवश्यक साठवण"), l("NividaIQ uses essential storage for language and performance preferences and secure account operation. No advertising trackers are added in this release, so a non-essential consent banner is not shown.", "NividaIQ भाषा व प्रदर्शन प्राथमिकताओं और सुरक्षित खाते के संचालन के लिए आवश्यक स्टोरेज उपयोग करता है। इस रिलीज़ में विज्ञापन ट्रैकर नहीं हैं, इसलिए गैर-आवश्यक सहमति बैनर नहीं दिखाया जाता।", "NividaIQ भाषा व कार्यप्रदर्शन प्राधान्ये आणि सुरक्षित खाते संचालनासाठी आवश्यक साठवण वापरते. या आवृत्तीत जाहिरात ट्रॅकर नाहीत, म्हणून अनावश्यक संमती बॅनर दाखवला जात नाही.")), s(l("Your controls", "आपके नियंत्रण", "तुमचे नियंत्रण"), l("You may change language and performance preferences in the interface. Blocking essential storage may prevent sign-in or preference persistence.", "आप इंटरफ़ेस में भाषा और प्रदर्शन प्राथमिकताएँ बदल सकते हैं। आवश्यक स्टोरेज रोकने पर साइन-इन या प्राथमिकताएँ सुरक्षित नहीं रह सकतीं।", "तुम्ही इंटरफेसमध्ये भाषा आणि कार्यप्रदर्शन प्राधान्ये बदलू शकता. आवश्यक साठवण रोखल्यास साइन-इन किंवा प्राधान्ये टिकू शकणार नाहीत."))]
  },
  "data-retention": {
    title: l("Data Retention Policy", "डेटा अवधारण नीति", "डेटा धारणा धोरण"),
    summary: l("Why records are kept and how deletion requests are handled.", "रिकॉर्ड क्यों रखे जाते हैं और हटाने के अनुरोध कैसे संभाले जाते हैं।", "नोंदी का ठेवल्या जातात आणि हटवण्याच्या विनंत्या कशा हाताळल्या जातात."),
    sections: [s(l("Retention principles", "अवधारण सिद्धांत", "धारणा तत्त्वे"), l("Account, tender, analysis, question, feedback, legal-acceptance and security records are retained only for product operation, user access, legal obligations, abuse prevention and dispute handling, according to documented schedules before launch.", "खाता, निविदा, विश्लेषण, प्रश्न, प्रतिक्रिया, कानूनी स्वीकृति और सुरक्षा रिकॉर्ड उत्पाद संचालन, उपयोगकर्ता पहुँच, कानूनी दायित्व, दुरुपयोग रोकथाम और विवाद निपटान के लिए लॉन्च से पहले तय कार्यक्रम के अनुसार रखे जाते हैं।", "खाते, निविदा, विश्लेषण, प्रश्न, अभिप्राय, कायदेशीर स्वीकृती आणि सुरक्षा नोंदी उत्पादन संचालन, वापरकर्ता प्रवेश, कायदेशीर कर्तव्ये, गैरवापर प्रतिबंध आणि वाद हाताळणीसाठी लाँचपूर्वी ठरवलेल्या वेळापत्रकानुसार ठेवल्या जातात.")), s(l("Deletion", "हटाना", "हटवणे"), l("Deletion requests are authenticated and processed subject to legal, security, backup and dispute-retention duties. Private content is not made publicly available offline.", "हटाने के अनुरोध का प्रमाणीकरण किया जाता है और कानूनी, सुरक्षा, बैकअप तथा विवाद-अवधारण दायित्वों के अधीन संसाधित किया जाता है। निजी सामग्री सार्वजनिक ऑफ़लाइन उपलब्ध नहीं कराई जाती।", "हटवण्याच्या विनंत्या प्रमाणित केल्या जातात आणि कायदेशीर, सुरक्षा, बॅकअप व वाद-धारणा कर्तव्यांनुसार प्रक्रिया केल्या जातात. खासगी सामग्री सार्वजनिकरीत्या ऑफलाइन उपलब्ध केली जात नाही."))]
  },
  "third-party-processors": {
    title: l("Third-party Processors", "तृतीय-पक्ष संसाधक", "तृतीय-पक्ष प्रक्रिया प्रदाते"),
    summary: l("Provider categories that may support the service.", "सेवा में सहायता करने वाली प्रदाता श्रेणियाँ।", "सेवेला सहाय्य करणाऱ्या प्रदाता श्रेणी."),
    sections: [s(l("Provider categories", "प्रदाता श्रेणियाँ", "प्रदाता श्रेणी"), l("Depending on deployment configuration, NividaIQ may use cloud hosting, database and object storage, authentication, email, observability and AI-model providers. The final launch list and processing locations must be published after infrastructure review.", "तैनाती कॉन्फ़िगरेशन के अनुसार NividaIQ क्लाउड होस्टिंग, डेटाबेस व ऑब्जेक्ट स्टोरेज, प्रमाणीकरण, ईमेल, ऑब्ज़र्वेबिलिटी और AI मॉडल प्रदाताओं का उपयोग कर सकता है। बुनियादी ढाँचे की समीक्षा के बाद अंतिम सूची और प्रसंस्करण स्थान प्रकाशित किए जाएंगे।", "तैनाती संरचनेनुसार NividaIQ क्लाउड होस्टिंग, डेटाबेस व ऑब्जेक्ट स्टोरेज, प्रमाणीकरण, ईमेल, निरीक्षण आणि AI मॉडेल प्रदाते वापरू शकते. पायाभूत पुनरावलोकनानंतर अंतिम यादी आणि प्रक्रिया ठिकाणे प्रकाशित केली जातील.")), s(l("Provider safeguards", "प्रदाता सुरक्षा उपाय", "प्रदाता संरक्षण"), l("Providers receive only the data reasonably needed for their function and remain subject to applicable contracts, access controls and retention settings. Provider use does not remove the user’s verification obligations.", "प्रदाताओं को उनके कार्य के लिए आवश्यक डेटा ही दिया जाता है और वे लागू अनुबंध, पहुँच नियंत्रण व अवधारण सेटिंग्स के अधीन रहते हैं। प्रदाता उपयोग से उपयोगकर्ता की सत्यापन जिम्मेदारी समाप्त नहीं होती।", "प्रदात्यांना त्यांच्या कार्यासाठी वाजवीरीत्या आवश्यक डेटा दिला जातो आणि ते लागू करार, प्रवेश नियंत्रण व धारणा सेटिंग्जच्या अधीन राहतात. प्रदाता वापरामुळे वापरकर्त्याची पडताळणी जबाबदारी संपत नाही."))]
  },
  grievance: {
    title: l("Grievance Process", "शिकायत प्रक्रिया", "तक्रार प्रक्रिया"),
    summary: l("How to raise privacy, account, analysis or service concerns.", "गोपनीयता, खाता, विश्लेषण या सेवा संबंधी चिंता कैसे उठाएँ।", "गोपनीयता, खाते, विश्लेषण किंवा सेवा चिंता कशा मांडाव्यात."),
    sections: [s(l("Submit a grievance", "शिकायत जमा करें", "तक्रार सादर करा"), l("Use the published grievance email and include your account email, relevant tender identifier where safe, a concise description and the resolution requested. Do not email passwords, access tokens or full private tender text.", "प्रकाशित शिकायत ईमेल का उपयोग करें और अपना खाता ईमेल, जहाँ सुरक्षित हो वहाँ निविदा पहचान, संक्षिप्त विवरण और अपेक्षित समाधान दें। पासवर्ड, एक्सेस टोकन या पूरा निजी निविदा पाठ ईमेल न करें।", "प्रकाशित तक्रार ईमेल वापरा आणि तुमचा खाते ईमेल, सुरक्षित असल्यास निविदा ओळख, संक्षिप्त वर्णन आणि अपेक्षित निराकरण द्या. पासवर्ड, प्रवेश टोकन किंवा संपूर्ण खासगी निविदा मजकूर ईमेल करू नका.")), s(l("Review and escalation", "समीक्षा और आगे की कार्रवाई", "पुनरावलोकन आणि पुढील कार्यवाही"), l("We will acknowledge, investigate and respond within the period required by applicable law or the published support standard. Statutory escalation rights remain available.", "हम लागू कानून या प्रकाशित सहायता मानक में अपेक्षित अवधि में शिकायत स्वीकार, जाँच और उत्तर देंगे। वैधानिक आगे की कार्रवाई के अधिकार बने रहेंगे।", "आम्ही लागू कायदा किंवा प्रकाशित सहाय्य मानकातील कालावधीत तक्रार स्वीकारू, तपासू आणि उत्तर देऊ. वैधानिक पुढील कार्यवाहीचे हक्क कायम राहतील."))]
  }
};

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}
