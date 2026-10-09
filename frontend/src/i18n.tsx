import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'hi' | 'mr'
export type Theme = 'light' | 'dark'

export const LANGS: { id: Lang; short: string; name: string }[] = [
  { id: 'en', short: 'EN', name: 'English' },
  { id: 'hi', short: 'हिं', name: 'हिंदी' },
  { id: 'mr', short: 'मरा', name: 'मराठी' },
]

/* [English, हिंदी, मराठी] */
const D: Record<string, [string, string, string]> = {
  // ---------- shell ----------
  'skip': ['Skip to content', 'सामग्री पर जाएं', 'मुख्य मजकुराकडे जा'],
  'brand.sub': ['Pune city intelligence', 'पुणे की स्मार्ट जानकारी', 'पुण्याची स्मार्ट माहिती'],
  'nav.city': ['City', 'शहर', 'शहर'],
  'nav.explore': ['Explore', 'खोजें', 'शोधा'],
  'nav.safety': ['Safe Route', 'सुरक्षित रास्ता', 'सुरक्षित मार्ग'],
  'nav.report': ['Report', 'रिपोर्ट', 'कळवा'],
  'nav.compare': ['Compare', 'तुलना', 'तुलना'],
  'ai.live': ['Gemini live', 'Gemini चालू', 'Gemini सुरू'],
  'ai.rules': ['Rules mode', 'नियम मोड', 'नियम मोड'],
  'ai.liveTitle': ['Gemini connected', 'Gemini जुड़ा है', 'Gemini जोडलेले आहे'],
  'ai.rulesTitle': ['No AI key configured: rule-based mode', 'AI कुंजी नहीं: नियम-आधारित मोड', 'AI की नाही: नियमाधारित मोड'],
  'theme.toDark': ['Switch to dark mode', 'डार्क मोड चालू करें', 'डार्क मोड सुरू करा'],
  'theme.toLight': ['Switch to light mode', 'लाइट मोड चालू करें', 'लाइट मोड सुरू करा'],
  'lang.label': ['Language', 'भाषा', 'भाषा'],
  'err.api': ['{msg}. Start the API server and refresh.', '{msg}। API सर्वर चालू करें और रीफ़्रेश करें।', '{msg}. API सर्व्हर सुरू करा आणि रिफ्रेश करा.'],
  'footer.tagline': ['"What\'s happening in Pune?" Feel the city. Read the signals. Move smarter.', '"पुणे में क्या चल रहा है?" शहर को महसूस करें, संकेत पढ़ें, समझदारी से चलें।', '"पुण्यात काय चाललंय?" शहर अनुभवा, संकेत ओळखा, हुशारीने फिरा.'],
  'footer.event': ['Built for PromptWars x BRAIN DYPCOEI.', 'PromptWars x BRAIN DYPCOEI के लिए बनाया गया।', 'PromptWars x BRAIN DYPCOEI साठी तयार केले.'],
  'footer.data': [
    'Places are real; ratings, prices and accessibility are illustrative demo values. Seed incidents are labelled demo records. Weather: Open-Meteo · Routing: OSRM · Map © OpenStreetMap contributors · Photos: Wikimedia Commons (dish and area photos are representative). No score here ever means "safe".',
    'जगहें असली हैं; रेटिंग, कीमतें और सुलभता डेमो मान हैं। शुरुआती घटनाएँ डेमो रिकॉर्ड के रूप में चिह्नित हैं। मौसम: Open-Meteo · रूटिंग: OSRM · नक्शा © OpenStreetMap योगदानकर्ता · फ़ोटो: Wikimedia Commons (व्यंजन व इलाके की फ़ोटो प्रतीकात्मक हैं)। यहाँ कोई भी स्कोर "सुरक्षित" का मतलब नहीं है।',
    'ठिकाणे खरी आहेत; रेटिंग, किमती आणि सुलभता हे डेमो आकडे आहेत. सुरुवातीच्या घटना डेमो नोंदी म्हणून दर्शवल्या आहेत. हवामान: Open-Meteo · मार्ग: OSRM · नकाशा © OpenStreetMap योगदानकर्ते · फोटो: Wikimedia Commons (पदार्थ व परिसराचे फोटो प्रातिनिधिक). इथला कोणताही स्कोर म्हणजे "सुरक्षित" असा नाही.',
  ],

  // ---------- common ----------
  'common.demo': ['demo record', 'डेमो रिकॉर्ड', 'डेमो नोंद'],
  'common.demoValues': ['demo values', 'डेमो मान', 'डेमो आकडे'],
  'common.trust': ['Trust {n}/100', 'भरोसा {n}/100', 'विश्वास {n}/100'],
  'common.noReports': ['No reports yet.', 'अभी कोई रिपोर्ट नहीं।', 'अजून कोणतीही नोंद नाही.'],
  'common.photo': ['photo', 'फ़ोटो', 'फोटो'],
  'common.voice': ['voice', 'आवाज़', 'आवाज'],
  'source.community': ['community', 'समुदाय', 'समुदाय'],
  'source.official': ['official', 'आधिकारिक', 'अधिकृत'],
  'trust.Corroborated': ['Corroborated', 'पुष्ट', 'पुष्टी झालेले'],
  'trust.Partially verified': ['Partially verified', 'आंशिक सत्यापित', 'अंशतः पडताळलेले'],
  'trust.Official': ['Official', 'आधिकारिक', 'अधिकृत'],
  'trust.Unverified': ['Unverified', 'असत्यापित', 'न पडताळलेले'],
  'cat.waterlogging': ['Waterlogging', 'जलभराव', 'पाणी साचणे'],
  'cat.pothole': ['Pothole / road hazard', 'गड्ढा / सड़क खतरा', 'खड्डा / रस्त्यावरील धोका'],
  'cat.traffic': ['Traffic disruption', 'ट्रैफ़िक बाधा', 'वाहतूक कोंडी'],
  'cat.accident': ['Accident', 'दुर्घटना', 'अपघात'],
  'cat.streetlight': ['Streetlight out', 'स्ट्रीटलाइट बंद', 'पथदिवा बंद'],
  'cat.accessibility': ['Accessibility barrier', 'सुलभता बाधा', 'सुलभतेतील अडथळा'],
  'cat.other': ['Other', 'अन्य', 'इतर'],
  'pcat.all': ['All', 'सभी', 'सर्व'],
  'pcat.heritage': ['Heritage', 'विरासत', 'वारसा'],
  'pcat.food': ['Food', 'खाना', 'खाद्य'],
  'pcat.cafe': ['Cafes', 'कैफ़े', 'कॅफे'],
  'pcat.attraction': ['Attractions', 'दर्शनीय स्थल', 'प्रेक्षणीय स्थळे'],
  'pcat.hotel': ['Hotels', 'होटल', 'हॉटेल'],
  'pcat.saved': ['Saved', 'सहेजे गए', 'जतन केलेले'],
  'pcat.views': ['Views & forts', 'नज़ारे और किले', 'दृश्ये आणि किल्ले'],
  'engine.rules': ['Rule-based (AI unavailable)', 'नियम-आधारित (AI उपलब्ध नहीं)', 'नियमाधारित (AI उपलब्ध नाही)'],
  'engine.gemini': ['Gemini · Pune dataset', 'Gemini · पुणे डेटासेट', 'Gemini · पुणे डेटासेट'],
  'engine.maps': ['Gemini · grounded in Google Maps', 'Gemini · Google Maps आधारित', 'Gemini · Google Maps आधारित'],
  'gm.open': ['Google Maps', 'Google Maps', 'Google Maps'],
  'gm.street': ['Street View', 'स्ट्रीट व्यू', 'स्ट्रीट व्ह्यू'],
  'conf.low': ['low', 'कम', 'कमी'],
  'conf.medium': ['medium', 'मध्यम', 'मध्यम'],
  'conf.high': ['high', 'उच्च', 'उच्च'],

  // ---------- landing ----------
  'land.kicker': ['PromptWars × BRAIN DYPCOEI · Pune, India', 'PromptWars × BRAIN DYPCOEI · पुणे, भारत', 'PromptWars × BRAIN DYPCOEI · पुणे, भारत'],
  'land.meaning': ['"What\'s happening in Pune?"', '"पुणे में क्या चल रहा है?"', '"पुण्यात काय चाललंय?"'],
  'land.lede': ['Hidden places, verified city signals and smarter routes. One living map of Pune that learns from its people.', 'छिपी जगहें, सत्यापित शहरी संकेत और समझदार रास्ते। पुणे का एक जीवंत नक्शा जो अपने लोगों से सीखता है।', 'लपलेली ठिकाणे, पडताळलेले शहर-संकेत आणि हुशार मार्ग. पुण्याचा एक जिवंत नकाशा, जो इथल्या लोकांकडून शिकतो.'],
  'land.ask': ['Ask:', 'पूछिए:', 'विचारा:'],
  'land.q1': ['Where is the best misal under ₹150?', '₹150 से कम में सबसे अच्छी मिसळ कहाँ है?', '₹150 च्या आत सर्वोत्तम मिसळ कुठे?'],
  'land.q2': ['Is Swargate flooded right now?', 'क्या स्वारगेट में अभी पानी भरा है?', 'स्वारगेटला आत्ता पाणी साचलंय का?'],
  'land.q3': ['Which route is smarter at 11 PM?', 'रात 11 बजे कौन-सा रास्ता बेहतर है?', 'रात्री 11 वाजता कोणता मार्ग योग्य?'],
  'land.q4': ['Plan a heritage walk in Kasba Peth', 'कसबा पेठ में विरासत सैर बनाइए', 'कसबा पेठेत वारसा फेरी आखा'],
  'land.cta': ['Enter the city', 'शहर में चलें', 'शहरात चला'],
  'land.cta2': ['Plan a safer route', 'सुरक्षित रास्ता चुनें', 'सुरक्षित मार्ग निवडा'],
  'land.scroll': ['Scroll', 'नीचे देखें', 'खाली पहा'],
  'land.stat.places': ['real Pune places', 'पुणे की असली जगहें', 'पुण्यातील खरी ठिकाणे'],
  'land.stat.learned': ['reports the model learned from', 'रिपोर्ट जिनसे मॉडल ने सीखा', 'नोंदी ज्यांच्यावरून मॉडेल शिकले'],
  'land.stat.corridors': ['accident corridors mapped', 'दुर्घटना-प्रवण मार्ग चिह्नित', 'अपघातप्रवण पट्टे नोंदवले'],
  'land.stat.langs': ['languages, one city', 'भाषाएँ, एक शहर', 'भाषा, एक शहर'],
  'land.bento.k': ['What it does', 'यह क्या करता है', 'हे काय करते'],
  'land.bento.t': ['Five lenses. One city.', 'पाँच नज़रिए। एक शहर।', 'पाच दृष्टी. एक शहर.'],
  'land.b1.t': ['Trust Engine', 'भरोसा इंजन', 'विश्वास इंजिन'],
  'land.b1.d': ['Every report earns a 0–100 trust score from evidence, neighbours, weather and accident data, with every reason shown.', 'हर रिपोर्ट को सबूत, पड़ोसियों, मौसम और दुर्घटना डेटा से 0–100 भरोसा स्कोर मिलता है, हर कारण के साथ।', 'प्रत्येक नोंदीला पुरावा, शेजारी, हवामान आणि अपघात माहितीवरून 0–100 विश्वास गुण मिळतात, प्रत्येक कारणासह.'],
  'land.b2.t': ['Fastest vs smartest', 'सबसे तेज़ बनाम सबसे समझदार', 'सर्वात जलद विरुद्ध सर्वात हुशार'],
  'land.b2.d': ['Routes scored for the hour you travel, then handed to Google Maps so turn-by-turn follows the safer path.', 'आपके सफ़र के समय के हिसाब से रास्तों का स्कोर, फिर Google Maps में वही सुरक्षित रास्ता।', 'प्रवासाच्या वेळेनुसार मार्गांचे गुण, मग Google Maps मध्ये तोच सुरक्षित मार्ग.'],
  'land.b3.t': ['Report in your language', 'अपनी भाषा में रिपोर्ट करें', 'तुमच्या भाषेत कळवा'],
  'land.b3.d': ['Speak, snap or type in Marathi, Hindi or English. Gemini turns it into a structured incident on the map.', 'मराठी, हिंदी या अंग्रेज़ी में बोलें, फ़ोटो लें या लिखें। Gemini उसे नक्शे पर व्यवस्थित घटना बना देता है।', 'मराठी, हिंदी किंवा इंग्रजीत बोला, फोटो काढा किंवा लिहा. Gemini ते नकाशावरील नोंदीत बदलतो.'],
  'land.b4.t': ['A city that learns', 'सीखने वाला शहर', 'शिकणारे शहर'],
  'land.b4.d': ['Votes build reporter reputation. History reveals where and when problems recur.', 'वोट से रिपोर्टर की साख बनती है। इतिहास बताता है कि समस्याएँ कहाँ और कब दोहराती हैं।', 'मतांमुळे नोंदकर्त्याची विश्वासार्हता ठरते. इतिहास सांगतो की समस्या कुठे आणि केव्हा पुन्हा येतात.'],
  'land.b5.t': ['Best vs worst, your way', 'सबसे अच्छा बनाम बुरा, आपके तरीके से', 'सर्वोत्तम विरुद्ध वाईट, तुमच्या पद्धतीने'],
  'land.b5.d': ['Set your priorities. Bayesian ratings expose thin or gamed reviews.', 'अपनी प्राथमिकताएँ चुनें। बायेसियन रेटिंग कम या नकली रिव्यू उजागर करती है।', 'तुमचे प्राधान्य ठरवा. बायेशियन रेटिंग कमी किंवा बनावट परीक्षणे उघड करते.'],
  'land.b6.t': ['Heritage and hidden gems', 'विरासत और छिपे रत्न', 'वारसा आणि लपलेली रत्ने'],
  'land.b6.d': ['From Shaniwar Wada to the coppersmiths of Tambat Ali.', 'शनिवार वाडा से ताम्बट आली के ठठेरों तक।', 'शनिवारवाड्यापासून तांबट आळीतल्या कारागिरांपर्यंत.'],
  'land.how.k': ['How it works', 'यह कैसे काम करता है', 'हे कसे चालते'],
  'land.how.t': ['From rumour to verified signal.', 'अफ़वाह से सत्यापित संकेत तक।', 'अफवेपासून पडताळलेल्या संकेतापर्यंत.'],
  'land.how.1': ['Someone reports', 'कोई रिपोर्ट करता है', 'कोणीतरी कळवतो'],
  'land.how.2': ['Gemini structures it', 'Gemini उसे व्यवस्थित करता है', 'Gemini त्याची रचना करतो'],
  'land.how.3': ['City data cross-checks', 'शहरी डेटा जाँच करता है', 'शहराची माहिती पडताळते'],
  'land.how.4': ['Neighbours confirm', 'पड़ोसी पुष्टि करते हैं', 'शेजारी पुष्टी करतात'],
  'land.how.5': ['Routes adapt', 'रास्ते बदल जाते हैं', 'मार्ग बदलतात'],
  'land.live': ['Live from the city', 'शहर से लाइव', 'शहरातून थेट'],
  'land.finalSub': ['Let\'s explore Pune, the smart way.', 'चलिए, पुणे को समझदारी से जानें।', 'चला, पुणे नव्या नजरेने पाहूया.'],

  // ---------- city (home dashboard) ----------
  'home.t.pre': ['Your city has ', 'आपके शहर का ', 'तुमच्या शहराची '],
  'home.t.em': ['another side.', 'एक और रूप', 'दुसरी बाजू'],
  'home.t.post': ['', ' है।', ' आहे.'],
  'home.sub': ['Hidden places, verified city signals and smarter routes across Pune, all in one place.', 'पुणे भर की छिपी जगहें, सत्यापित संकेत और समझदार रास्ते, सब एक जगह।', 'पुण्यातील लपलेली ठिकाणे, पडताळलेले संकेत आणि हुशार मार्ग, सगळं एकाच ठिकाणी.'],
  'home.search.ph': ['Find a place, plan a trip, or ask about your city...', 'जगह खोजें, यात्रा बनाएं या शहर के बारे में पूछें...', 'ठिकाण शोधा, सहल आखा किंवा शहराबद्दल विचारा...'],
  'home.ask': ['Ask', 'पूछें', 'विचारा'],
  'home.ex1': ['Best street food under ₹200 near FC Road', 'FC रोड के पास ₹200 से कम में बढ़िया स्ट्रीट फ़ूड', 'FC रोडजवळ ₹200 च्या आत उत्तम स्ट्रीट फूड'],
  'home.ex2': ['Plan a three-hour Pune heritage walk', 'तीन घंटे की पुणे विरासत सैर बनाइए', 'तीन तासांची पुणे वारसा फेरी आखा'],
  'home.ex3': ['Show recent road hazards near my route', 'मेरे रास्ते के पास हाल के सड़क खतरे दिखाएं', 'माझ्या मार्गाजवळचे अलीकडचे रस्ते-धोके दाखवा'],
  'home.ex4': ['Find wheelchair-accessible cafes', 'व्हीलचेयर-सुलभ कैफ़े खोजें', 'व्हीलचेअरसाठी सुलभ कॅफे शोधा'],
  'home.minChars': ['Type at least two characters.', 'कम से कम दो अक्षर लिखें।', 'किमान दोन अक्षरे लिहा.'],
  'home.answer': ['पुण्यात काय? answer', 'पुण्यात काय? का जवाब', 'पुण्यात काय? उत्तर'],
  'home.answered': ['Answered {time}', '{time} पर जवाब', '{time} ला उत्तर'],
  'home.highlighted': ['{n} place(s) highlighted on the map', 'नक्शे पर {n} जगहें चिह्नित', 'नकाशावर {n} ठिकाणे ठळक'],
  'home.seeAll': ['See all {n} places', 'सभी {n} जगहें देखें', 'सर्व {n} ठिकाणे पहा'],
  'home.reviewsDemo': ['{n} reviews (demo)', '{n} रिव्यू (डेमो)', '{n} परीक्षणे (डेमो)'],
  'home.priceDemo': ['Price level (demo)', 'कीमत स्तर (डेमो)', 'किंमत पातळी (डेमो)'],
  'home.planRoute': ['Plan a route', 'रास्ता बनाएं', 'मार्ग आखा'],
  'home.layer': ['Map layer', 'नक्शे की परत', 'नकाशाचा थर'],
  'home.tab.places': ['Places ({n})', 'जगहें ({n})', 'ठिकाणे ({n})'],
  'home.tab.reports': ['City reports ({n})', 'शहर रिपोर्ट ({n})', 'शहर नोंदी ({n})'],
  'home.tab.corridors': ['Accident corridors ({n})', 'दुर्घटना मार्ग ({n})', 'अपघात पट्टे ({n})'],
  'home.tab.routes': ['Safe routes', 'सुरक्षित रास्ते', 'सुरक्षित मार्ग'],
  'home.latest': ['Latest signal · {age}', 'ताज़ा संकेत · {age}', 'ताजा संकेत · {age}'],
  'home.lenses': ['Five lenses on one city', 'एक शहर, पाँच नज़रिए', 'एक शहर, पाच दृष्टी'],
  'home.chaos': ['Everything the chaos hides.', 'जो कुछ भीड़-भाड़ में छिप जाता है।', 'गोंधळात दडलेलं सगळं.'],
  'home.p1.t': ['Explore & Hospitality', 'खोज और आतिथ्य', 'शोध आणि आदरातिथ्य'],
  'home.p1.d': ['Food, cafes, stays and budget finds, filtered by what matters to you.', 'खाना, कैफ़े, ठहरने की जगहें और बजट विकल्प, आपकी पसंद के हिसाब से।', 'खाद्य, कॅफे, राहण्याची ठिकाणे आणि बजेट पर्याय, तुमच्या गरजेनुसार.'],
  'home.p2.t': ['History & Culture', 'इतिहास और संस्कृति', 'इतिहास आणि संस्कृती'],
  'home.p2.d': ['Peshwa wadas, rock-cut caves and living craft lanes like Tambat Ali.', 'पेशवा वाड़े, चट्टान-काटी गुफाएँ और ताम्बट आली जैसी जीवित शिल्प गलियाँ।', 'पेशवेकालीन वाडे, कोरीव लेणी आणि तांबट आळीसारख्या जिवंत कारागीर गल्ल्या.'],
  'home.p3.t': ['Safety & Security', 'सुरक्षा', 'सुरक्षा'],
  'home.p3.d': ['Fastest vs fewest-known-risks route, scored for the hour you travel.', 'सबसे तेज़ बनाम सबसे कम ज्ञात जोखिम वाला रास्ता, आपके समय के अनुसार।', 'सर्वात जलद विरुद्ध सर्वात कमी ज्ञात धोक्याचा मार्ग, तुमच्या वेळेनुसार.'],
  'home.p4.t': ['Best vs Worst', 'सबसे अच्छा बनाम बुरा', 'सर्वोत्तम विरुद्ध वाईट'],
  'home.p4.d': ['Your priorities, transparent dimensions, no black-box "best".', 'आपकी प्राथमिकताएँ, पारदर्शी पैमाने, कोई छिपा "बेस्ट" नहीं।', 'तुमचे प्राधान्य, पारदर्शक निकष, लपवलेले "सर्वोत्तम" नाही.'],
  'home.p5.t': ['Smart City Signals', 'स्मार्ट सिटी संकेत', 'स्मार्ट शहर संकेत'],
  'home.p5.d': ['Photo, voice or text reports, verified by the Trust Engine.', 'फ़ोटो, आवाज़ या टेक्स्ट रिपोर्ट, भरोसा इंजन से सत्यापित।', 'फोटो, आवाज किंवा मजकूर नोंदी, विश्वास इंजिनद्वारे पडताळलेल्या.'],
  'home.signals': ['Community signals', 'समुदाय के संकेत', 'समुदायाचे संकेत'],
  'home.signalsTitle': ['What people report, and how much to trust it.', 'लोग क्या बता रहे हैं, और उस पर कितना भरोसा करें।', 'लोक काय कळवतात आणि त्यावर किती विश्वास ठेवावा.'],
  'home.reportBtn': ['Report an issue', 'समस्या रिपोर्ट करें', 'समस्या कळवा'],

  // ---------- city pulse ----------
  'pulse.title': ['City Pulse · Pune', 'सिटी पल्स · पुणे', 'शहराची नाडी · पुणे'],
  'pulse.hint': ['Outer ring = corroborated, inner = unverified. Click a signal to inspect it.', 'बाहरी घेरा = पुष्ट, भीतरी = असत्यापित। देखने के लिए संकेत पर क्लिक करें।', 'बाहेरचे वर्तुळ = पुष्टी झालेले, आतले = न पडताळलेले. तपासण्यासाठी संकेतावर क्लिक करा.'],
  'pulse.chaos': ['Chaos index', 'अव्यवस्था सूचकांक', 'गोंधळ निर्देशांक'],
  'pulse.calm': ['Calm', 'शांत', 'शांत'],
  'pulse.moderate': ['Moderate', 'मध्यम', 'मध्यम'],
  'pulse.elevated': ['Elevated', 'बढ़ा हुआ', 'वाढलेला'],
  'pulse.rain': ['Rain last 3 h: {a} mm · next 6 h: {b} mm', 'पिछले 3 घंटे बारिश: {a} मिमी · अगले 6 घंटे: {b} मिमी', 'मागील 3 तास पाऊस: {a} मिमी · पुढील 6 तास: {b} मिमी'],
  'pulse.noWeather': ['Weather unavailable', 'मौसम उपलब्ध नहीं', 'हवामान उपलब्ध नाही'],
  'pulse.reports': ['Reports in 24 h ({n} corroborated)', '24 घंटे में रिपोर्ट ({n} पुष्ट)', '24 तासांतील नोंदी ({n} पुष्टी झालेल्या)'],
  'pulse.types': ['Active issue types', 'सक्रिय समस्या प्रकार', 'सक्रिय समस्या प्रकार'],
  'pulse.latest': ['Latest report · traffic feed: not connected', 'ताज़ा रिपोर्ट · ट्रैफ़िक फ़ीड: जुड़ा नहीं', 'ताजी नोंद · वाहतूक माहिती: जोडलेली नाही'],
  'pulse.foot': ['Weather: {src}{obs}. {n} of the 24 h reports are labelled demo records.', 'मौसम: {src}{obs}। 24 घंटे की {n} रिपोर्ट डेमो रिकॉर्ड हैं।', 'हवामान: {src}{obs}. 24 तासांतील {n} नोंदी डेमो आहेत.'],
  'pulse.observed': [' (observed {t})', ' ({t} पर दर्ज)', ' ({t} ला नोंद)'],
  'pulse.signal': ['{cat} report, {label}, {age}. Open on safety map', '{cat} रिपोर्ट, {label}, {age}। सुरक्षा नक्शे पर खोलें', '{cat} नोंद, {label}, {age}. सुरक्षा नकाशावर उघडा'],

  // ---------- explore ----------
  'exp.eyebrow': ['Explore & Hospitality · History & Culture', 'खोज और आतिथ्य · इतिहास और संस्कृति', 'शोध आणि आदरातिथ्य · इतिहास आणि संस्कृती'],
  'exp.title': ['Find your Pune.', 'अपना पुणे खोजें।', 'तुमचं पुणे शोधा.'],
  'exp.sub': ['Heritage lanes, legendary snacks, quiet cafes. Every filter changes what you see. Distances are from the city centre.', 'विरासत की गलियाँ, मशहूर नाश्ते, शांत कैफ़े। हर फ़िल्टर नतीजे बदलता है। दूरी शहर के केंद्र से है।', 'वारसा गल्ल्या, प्रसिद्ध खाऊ, शांत कॅफे. प्रत्येक फिल्टर निकाल बदलतो. अंतर शहराच्या मध्यापासून आहे.'],
  'exp.view': ['View mode', 'दृश्य मोड', 'दृश्य प्रकार'],
  'exp.split': ['Split', 'विभाजित', 'विभाग'],
  'exp.list': ['List', 'सूची', 'यादी'],
  'exp.map': ['Map', 'नक्शा', 'नकाशा'],
  'exp.category': ['Category', 'श्रेणी', 'प्रकार'],
  'exp.search': ['Search', 'खोजें', 'शोधा'],
  'exp.searchPh': ['misal, peshwa, bun maska...', 'मिसळ, पेशवा, बन मस्का...', 'मिसळ, पेशवे, बन मस्का...'],
  'exp.maxPrice': ['Max price: {p}', 'अधिकतम कीमत: {p}', 'कमाल किंमत: {p}'],
  'exp.minRating': ['Min rating: {r}★', 'न्यूनतम रेटिंग: {r}★', 'किमान रेटिंग: {r}★'],
  'exp.within': ['Within {n} km', '{n} किमी के भीतर', '{n} किमीच्या आत'],
  'exp.wheelchair': ['Wheelchair access', 'व्हीलचेयर सुलभ', 'व्हीलचेअर सुलभ'],
  'exp.count': ['{a} of {b} places · ratings, prices and access are demo values · opening hours not available in this dataset', '{b} में से {a} जगहें · रेटिंग, कीमत और सुलभता डेमो मान हैं · खुलने का समय उपलब्ध नहीं', '{b} पैकी {a} ठिकाणे · रेटिंग, किंमत आणि सुलभता डेमो आकडे · वेळा उपलब्ध नाहीत'],
  'exp.empty': ['Nothing matches these filters. Try widening price or distance.', 'इन फ़िल्टर से कुछ नहीं मिला। कीमत या दूरी बढ़ाकर देखें।', 'या फिल्टरनुसार काहीच सापडले नाही. किंमत किंवा अंतर वाढवून पहा.'],
  'exp.mapLabel': ['Map of filtered places', 'फ़िल्टर की गई जगहों का नक्शा', 'निवडलेल्या ठिकाणांचा नकाशा'],

  // ---------- place card ----------
  'pc.showMap': ['Show on map', 'नक्शे पर दिखाएं', 'नकाशावर दाखवा'],
  'pc.wheelYes': ['Wheelchair access', 'व्हीलचेयर सुलभ', 'व्हीलचेअर सुलभ'],
  'pc.wheelNo': ['Steps / no ramp', 'सीढ़ियाँ / रैंप नहीं', 'पायऱ्या / रॅम्प नाही'],
  'pc.wheelUnknown': ['Access unknown', 'सुलभता अज्ञात', 'सुलभता अज्ञात'],
  'pc.save': ['Save {name}', '{name} सहेजें', '{name} जतन करा'],
  'pc.unsave': ['Remove {name} from saved', '{name} को हटाएं', '{name} जतनमधून काढा'],
  'pc.saved': ['Saved {name}', '{name} सहेजा गया', '{name} जतन केले'],
  'pc.removed': ['Removed {name}', '{name} हटाया गया', '{name} काढले'],
  'pc.price': ['Price level {n} of 4', 'कीमत स्तर 4 में से {n}', 'किंमत पातळी 4 पैकी {n}'],

  // ---------- safety ----------
  'saf.eyebrow': ['Safety & Security', 'सुरक्षा', 'सुरक्षा'],
  'saf.title': ['Fastest isn\'t always smartest.', 'सबसे तेज़ हमेशा सबसे समझदार नहीं।', 'सर्वात जलद नेहमीच हुशार नसते.'],
  'saf.sub': ['Compare routes by the risks we actually know about at the hour you travel: accident-prone corridors, trusted community reports, learned hotspots and distance from help. No data? We say so.', 'आपके सफ़र के समय ज्ञात जोखिमों से रास्तों की तुलना करें: दुर्घटना-प्रवण मार्ग, भरोसेमंद रिपोर्ट, सीखे गए हॉटस्पॉट और मदद से दूरी। डेटा नहीं? हम साफ़ बताते हैं।', 'तुमच्या प्रवासाच्या वेळी माहीत असलेल्या धोक्यांवरून मार्गांची तुलना करा: अपघातप्रवण पट्टे, विश्वासार्ह नोंदी, शिकलेले हॉटस्पॉट आणि मदतीपासूनचे अंतर. माहिती नसेल तर आम्ही तसं सांगतो.'],
  'saf.plan': ['Plan a route', 'रास्ता बनाएं', 'मार्ग आखा'],
  'saf.from': ['From', 'कहाँ से', 'कुठून'],
  'saf.to': ['To', 'कहाँ तक', 'कुठपर्यंत'],
  'saf.time': ['Travel time: {h}:00', 'यात्रा समय: {h}:00', 'प्रवासाची वेळ: {h}:00'],
  'saf.day': ['day', 'दिन', 'दिवस'],
  'saf.night': ['night', 'रात', 'रात्र'],
  'saf.compare': ['Compare routes', 'रास्तों की तुलना करें', 'मार्गांची तुलना करा'],
  'saf.distinct': ['Pick two different places.', 'दो अलग जगहें चुनें।', 'दोन वेगळी ठिकाणे निवडा.'],
  'saf.fail': ['Routing failed', 'रास्ता नहीं मिला', 'मार्ग मिळाला नाही'],
  'saf.fallbackToast': ['Road router unreachable: showing a straight-line estimate', 'रोड राउटर उपलब्ध नहीं: सीधी रेखा का अनुमान', 'रस्ता राउटर उपलब्ध नाही: सरळ रेषेचा अंदाज'],
  'saf.whyGemini': ['Gemini explains', 'Gemini समझाता है', 'Gemini समजावतो'],
  'saf.whyRules': ['Why (rule-based)', 'क्यों (नियम-आधारित)', 'का (नियमाधारित)'],
  'saf.route': ['Route {x}', 'रास्ता {x}', 'मार्ग {x}'],
  'saf.fastest': ['Fastest', 'सबसे तेज़', 'सर्वात जलद'],
  'saf.safest': ['Fewest known risks', 'सबसे कम ज्ञात जोखिम', 'सर्वात कमी ज्ञात धोके'],
  'saf.insufficient': ['Insufficient data', 'अपर्याप्त डेटा', 'अपुरी माहिती'],
  'saf.scoreLabel': ['known-risk score · {c} confidence', 'ज्ञात-जोखिम स्कोर · {c} विश्वास', 'ज्ञात-धोका गुण · {c} खात्री'],
  'saf.navigate': ['Navigate this route in Google Maps', 'यह रास्ता Google Maps में चलाएं', 'हा मार्ग Google Maps मध्ये सुरू करा'],
  'saf.routingNote': ['Routing: {src}. A higher score means fewer known risks, never "safe". Google Maps navigation follows this route via waypoints.', 'रूटिंग: {src}। ज़्यादा स्कोर का मतलब कम ज्ञात जोखिम है, "सुरक्षित" नहीं। Google Maps इसी रास्ते पर वेपॉइंट से चलता है।', 'मार्ग: {src}. जास्त गुण म्हणजे कमी ज्ञात धोके, "सुरक्षित" नव्हे. Google Maps हाच मार्ग वेपॉइंट्सद्वारे पाळतो.'],
  'saf.osrm': ['OSRM public demo (driving)', 'OSRM पब्लिक डेमो (ड्राइविंग)', 'OSRM सार्वजनिक डेमो (वाहन)'],
  'saf.straight': ['straight-line fallback', 'सीधी रेखा विकल्प', 'सरळ रेषेचा पर्याय'],
  'saf.model': ['Self-learning model', 'खुद सीखने वाला मॉडल', 'स्वतः शिकणारे मॉडेल'],
  'saf.showMap': ['Show on map', 'नक्शे पर दिखाएं', 'नकाशावर दाखवा'],
  'saf.learned': ['reports learned from', 'रिपोर्ट से सीखा', 'नोंदींमधून शिकले'],
  'saf.hotspotsAt': ['hotspots at {h}:00', '{h}:00 पर हॉटस्पॉट', '{h}:00 ला हॉटस्पॉट'],
  'saf.recurring': ['Recurring {cat} · {n} reports', 'बार-बार {cat} · {n} रिपोर्ट', 'वारंवार {cat} · {n} नोंदी'],
  'saf.noPattern': ['No recurring pattern learned for this time of day.', 'इस समय के लिए कोई दोहराव पैटर्न नहीं मिला।', 'या वेळेसाठी वारंवार घडणारा नमुना आढळला नाही.'],
  'saf.retrained': ['Retrained {t} on every report and vote · {d}-day memory · community votes and reporter accuracy adjust trust. Includes labelled demo history.', 'हर रिपोर्ट और वोट पर दोबारा प्रशिक्षित ({t}) · {d}-दिन की याददाश्त · समुदाय के वोट और रिपोर्टर की सटीकता भरोसा बदलते हैं। इसमें डेमो इतिहास शामिल है।', 'प्रत्येक नोंद व मतानंतर पुन्हा प्रशिक्षित ({t}) · {d}-दिवसांची स्मृती · समुदायाची मते आणि नोंदकर्त्याची अचूकता विश्वास ठरवतात. डेमो इतिहास समाविष्ट.'],
  'saf.legendSafest': ['Selected · fewest known risks', 'चुना गया · सबसे कम ज्ञात जोखिम', 'निवडलेला · सर्वात कमी ज्ञात धोके'],
  'saf.legendSelected': ['Selected route', 'चुना गया रास्ता', 'निवडलेला मार्ग'],
  'saf.legendReport': ['Community report', 'समुदाय रिपोर्ट', 'समुदाय नोंद'],
  'saf.legendSevere': ['Severe / accident corridor', 'गंभीर / दुर्घटना मार्ग', 'गंभीर / अपघात पट्टा'],
  'saf.legendHotspot': ['Learned hotspot (this hour)', 'सीखा गया हॉटस्पॉट (इस समय)', 'शिकलेला हॉटस्पॉट (या वेळी)'],
  'saf.timeline': ['Incident timeline', 'घटना समयरेखा', 'घटनांचा कालक्रम'],
  'saf.timelineTitle': ['Evidence, not rumours.', 'सबूत, अफ़वाहें नहीं।', 'पुरावा, अफवा नव्हे.'],
  'saf.hideUnverified': ['Hide unverified', 'असत्यापित छिपाएं', 'न पडताळलेले लपवा'],
  'saf.filterAria': ['Filter reports', 'रिपोर्ट फ़िल्टर करें', 'नोंदी फिल्टर करा'],
  'saf.f.pothole': ['Road hazards', 'सड़क खतरे', 'रस्त्यावरील धोके'],
  'saf.f.waterlogging': ['Waterlogging', 'जलभराव', 'पाणी साचणे'],
  'saf.f.traffic': ['Traffic', 'ट्रैफ़िक', 'वाहतूक'],
  'saf.f.accident': ['Accidents', 'दुर्घटनाएँ', 'अपघात'],
  'saf.f.streetlight': ['Streetlights', 'स्ट्रीटलाइट', 'पथदिवे'],
  'saf.f.accessibility': ['Accessibility', 'सुलभता', 'सुलभता'],
  'saf.notice': ['Official = published by an authority. Corroborated / Partially verified / Unverified = community reports scored by the Trust Engine (evidence, independent nearby reports, weather and corridor cross-checks, votes, reporter track record). No reports in an area does not mean it is safe.', 'आधिकारिक = किसी प्राधिकरण द्वारा प्रकाशित। पुष्ट / आंशिक सत्यापित / असत्यापित = भरोसा इंजन द्वारा स्कोर की गई समुदाय रिपोर्ट (सबूत, आस-पास की स्वतंत्र रिपोर्ट, मौसम व मार्ग जाँच, वोट, रिपोर्टर का रिकॉर्ड)। किसी इलाके में रिपोर्ट न होने का मतलब वह सुरक्षित नहीं है।', 'अधिकृत = प्रशासनाने प्रसिद्ध केलेले. पुष्टी झालेले / अंशतः पडताळलेले / न पडताळलेले = विश्वास इंजिनने गुण दिलेल्या समुदाय नोंदी (पुरावा, जवळच्या स्वतंत्र नोंदी, हवामान व पट्टा तपासणी, मते, नोंदकर्त्याचा इतिहास). एखाद्या भागात नोंद नसणे म्हणजे तो सुरक्षित आहे असे नाही.'],
  'saf.empty': ['Insufficient data: no reports match these filters.', 'अपर्याप्त डेटा: इन फ़िल्टर से कोई रिपोर्ट नहीं।', 'अपुरी माहिती: या फिल्टरनुसार नोंदी नाहीत.'],
  'saf.mapLabel': ['Safety map with routes, reports and accident-prone corridors', 'रास्तों, रिपोर्ट और दुर्घटना मार्गों वाला सुरक्षा नक्शा', 'मार्ग, नोंदी आणि अपघात पट्ट्यांसह सुरक्षा नकाशा'],

  // ---------- votes ----------
  'vote.nearby': ['Are you nearby?', 'क्या आप पास हैं?', 'तुम्ही जवळ आहात का?'],
  'vote.confirm': ['Still there', 'अभी भी है', 'अजून आहे'],
  'vote.dispute': ['Not there', 'नहीं है', 'नाही'],
  'vote.resolved': ['Resolved', 'सुलझ गया', 'सुटले'],
  'vote.thanks': ['Thanks! Trust is now {n}/100', 'धन्यवाद! भरोसा अब {n}/100', 'धन्यवाद! विश्वास आता {n}/100'],
  'vote.closed': ['Marked resolved by the community', 'समुदाय ने सुलझा हुआ माना', 'समुदायाने सुटले म्हणून नोंदवले'],
  'vote.fail': ['Vote failed', 'वोट नहीं हुआ', 'मत नोंदले गेले नाही'],
  'vote.aria': ['Verify this report', 'इस रिपोर्ट की पुष्टि करें', 'ही नोंद पडताळा'],

  // ---------- report ----------
  'rep.eyebrow': ['Smart City Signals', 'स्मार्ट सिटी संकेत', 'स्मार्ट शहर संकेत'],
  'rep.title': ['Report what you see.', 'जो दिखे, रिपोर्ट करें।', 'जे दिसतं, ते कळवा.'],
  'rep.sub': ['Text, photo or voice in English, Marathi or Hindi. AI structures it, the Trust Engine checks it against other reports and live weather, and it\'s on the map instantly.', 'अंग्रेज़ी, मराठी या हिंदी में टेक्स्ट, फ़ोटो या आवाज़। AI उसे व्यवस्थित करता है, भरोसा इंजन उसे दूसरी रिपोर्ट और लाइव मौसम से जाँचता है, और वह तुरंत नक्शे पर आ जाती है।', 'इंग्रजी, मराठी किंवा हिंदीत मजकूर, फोटो किंवा आवाज. AI त्याची रचना करतो, विश्वास इंजिन इतर नोंदी व थेट हवामानाशी पडताळतो आणि ती लगेच नकाशावर दिसते.'],
  'rep.progress': ['Progress', 'प्रगति', 'प्रगती'],
  'rep.s1': ['Details', 'विवरण', 'तपशील'],
  'rep.s2': ['Review', 'समीक्षा', 'तपासणी'],
  'rep.s3': ['Verification', 'सत्यापन', 'पडताळणी'],
  'rep.category': ['Issue category', 'समस्या की श्रेणी', 'समस्येचा प्रकार'],
  'rep.desc': ['Description', 'विवरण', 'वर्णन'],
  'rep.descPh': ['e.g. Water above the ankle near the bus stop, two-wheelers stuck', 'जैसे: बस स्टॉप के पास टखने तक पानी, दोपहिया फँसे', 'उदा. बस स्टॉपजवळ घोट्यापर्यंत पाणी, दुचाकी अडकल्या'],
  'rep.location': ['Location', 'स्थान', 'ठिकाण'],
  'rep.tapMap': ['Tap the map to drop a pin', 'पिन लगाने के लिए नक्शे पर टैप करें', 'पिन लावण्यासाठी नकाशावर टॅप करा'],
  'rep.addPhoto': ['Add a photo (optional, under 5 MB)', 'फ़ोटो जोड़ें (वैकल्पिक, 5 MB से कम)', 'फोटो जोडा (ऐच्छिक, 5 MB पेक्षा कमी)'],
  'rep.preview': ['Selected evidence preview', 'चुने गए सबूत की झलक', 'निवडलेल्या पुराव्याची झलक'],
  'rep.record': ['Record voice note', 'वॉइस नोट रिकॉर्ड करें', 'व्हॉइस नोट रेकॉर्ड करा'],
  'rep.stop': ['Stop', 'रोकें', 'थांबवा'],
  'rep.removeVoice': ['Remove voice note', 'वॉइस नोट हटाएं', 'व्हॉइस नोट काढा'],
  'rep.privacy': ['We store only the category, text, pin, whether media was attached, and an anonymous device id (so your accuracy can earn trust). Photos and audio are analysed once and not kept. No account, no name.', 'हम केवल श्रेणी, टेक्स्ट, पिन, मीडिया था या नहीं, और एक गुमनाम डिवाइस आईडी (ताकि आपकी सटीकता से भरोसा बने) सहेजते हैं। फ़ोटो और ऑडियो एक बार जाँचे जाते हैं, रखे नहीं जाते। न खाता, न नाम।', 'आम्ही फक्त प्रकार, मजकूर, पिन, माध्यम जोडले होते का, आणि एक निनावी डिव्हाइस आयडी (ज्यामुळे तुमच्या अचूकतेने विश्वास वाढतो) जतन करतो. फोटो व ऑडिओ एकदाच तपासले जातात, ठेवले जात नाहीत. खाते नाही, नाव नाही.'],
  'rep.reviewBtn': ['Review report', 'रिपोर्ट देखें', 'नोंद तपासा'],
  'rep.evidence': ['Evidence', 'सबूत', 'पुरावा'],
  'rep.timestamp': ['Timestamp', 'समय', 'वेळ'],
  'rep.textOnly': ['Text only (lower starting trust)', 'केवल टेक्स्ट (शुरुआती भरोसा कम)', 'फक्त मजकूर (सुरुवातीचा विश्वास कमी)'],
  'rep.photo': ['Photo', 'फ़ोटो', 'फोटो'],
  'rep.voice': ['Voice note', 'वॉइस नोट', 'व्हॉइस नोट'],
  'rep.edit': ['Edit', 'बदलें', 'बदला'],
  'rep.submit': ['Submit report', 'रिपोर्ट भेजें', 'नोंद पाठवा'],
  'rep.analysing': ['Analysing…', 'जाँच हो रही है…', 'तपासणी सुरू…'],
  'rep.live': ['Report live on the map', 'रिपोर्ट नक्शे पर लाइव', 'नोंद नकाशावर दिसू लागली'],
  'rep.geminiSummary': ['Gemini summary', 'Gemini सारांश', 'Gemini सारांश'],
  'rep.input': [' · input: {l}', ' · इनपुट: {l}', ' · इनपुट: {l}'],
  'rep.noAi': ['AI analysis unavailable: scored on evidence and corroboration only.', 'AI विश्लेषण उपलब्ध नहीं: केवल सबूत और पुष्टि से स्कोर।', 'AI विश्लेषण उपलब्ध नाही: फक्त पुरावा व पुष्टीवर गुण.'],
  'rep.pending': ['Verification pending: trust rises automatically if others report the same issue nearby, confirm it, or weather data confirms it.', 'सत्यापन बाकी: अगर दूसरे लोग पास में यही समस्या बताएं, पुष्टि करें या मौसम डेटा पुष्टि करे तो भरोसा अपने-आप बढ़ता है।', 'पडताळणी बाकी: इतरांनी जवळपास हीच समस्या कळवली, पुष्टी केली किंवा हवामान माहितीने पुष्टी केली तर विश्वास आपोआप वाढतो.'],
  'rep.another': ['Report another', 'एक और रिपोर्ट करें', 'आणखी एक कळवा'],
  'rep.seeMap': ['See it on the safety map', 'सुरक्षा नक्शे पर देखें', 'सुरक्षा नकाशावर पहा'],
  'rep.tapHint': ['Tap the map to pin the issue', 'समस्या पिन करने के लिए नक्शे पर टैप करें', 'समस्या पिन करण्यासाठी नकाशावर टॅप करा'],
  'rep.err.desc': ['Describe the issue in at least 5 characters.', 'समस्या कम से कम 5 अक्षरों में बताएं।', 'समस्या किमान 5 अक्षरांत लिहा.'],
  'rep.err.point': ['Tap the map to mark where it is.', 'जगह चिह्नित करने के लिए नक्शे पर टैप करें।', 'ठिकाण दाखवण्यासाठी नकाशावर टॅप करा.'],
  'rep.err.city': ['Location must be within Pune.', 'स्थान पुणे के भीतर होना चाहिए।', 'ठिकाण पुण्याच्या हद्दीत असावे.'],
  'rep.err.photoType': ['Use a JPEG, PNG or WebP image.', 'JPEG, PNG या WebP फ़ोटो लगाएं।', 'JPEG, PNG किंवा WebP फोटो वापरा.'],
  'rep.err.photoSize': ['Image must be under 5 MB.', 'फ़ोटो 5 MB से कम होनी चाहिए।', 'फोटो 5 MB पेक्षा कमी असावा.'],
  'rep.err.mic': ['Microphone unavailable or permission denied', 'माइक्रोफ़ोन उपलब्ध नहीं या अनुमति नहीं मिली', 'मायक्रोफोन उपलब्ध नाही किंवा परवानगी नाकारली'],
  'rep.err.long': ['Recording too long (over 5 MB)', 'रिकॉर्डिंग बहुत लंबी (5 MB से अधिक)', 'रेकॉर्डिंग खूप मोठे (5 MB पेक्षा जास्त)'],
  'rep.ok': ['Report received and scored by the Trust Engine', 'रिपोर्ट मिली और भरोसा इंजन ने स्कोर किया', 'नोंद मिळाली आणि विश्वास इंजिनने गुण दिले'],
  'rep.fail': ['Submission failed', 'भेजना विफल रहा', 'पाठवणे अयशस्वी'],
  'rep.mapLabel': ['Tap to choose report location', 'रिपोर्ट स्थान चुनने के लिए टैप करें', 'नोंदीचे ठिकाण निवडण्यासाठी टॅप करा'],

  // ---------- compare ----------
  'cmp.eyebrow': ['Best vs Worst', 'सबसे अच्छा बनाम बुरा', 'सर्वोत्तम विरुद्ध वाईट'],
  'cmp.title': ['Your priorities. Your ranking.', 'आपकी प्राथमिकताएँ। आपकी रैंकिंग।', 'तुमचे प्राधान्य. तुमची क्रमवारी.'],
  'cmp.sub': ['Pick 2–4 places and tell us what matters. Ratings are Bayesian-adjusted so a handful of glowing reviews can\'t beat thousands of honest ones. Missing data is shown as missing, never guessed.', '2–4 जगहें चुनें और बताएं क्या ज़रूरी है। रेटिंग बायेसियन तरीके से समायोजित है ताकि मुट्ठी भर तारीफ़ें हज़ारों ईमानदार रिव्यू पर भारी न पड़ें। गायब डेटा गायब ही दिखता है, अंदाज़ा नहीं।', '2–4 ठिकाणे निवडा आणि काय महत्त्वाचं ते सांगा. रेटिंग बायेशियन पद्धतीने समायोजित असल्याने काही मोजकी स्तुती हजारो प्रामाणिक परीक्षणांवर भारी पडत नाही. नसलेली माहिती नसलेलीच दाखवली जाते, अंदाज नाही.'],
  'cmp.add': ['Add a place ({n}/4)', 'जगह जोड़ें ({n}/4)', 'ठिकाण जोडा ({n}/4)'],
  'cmp.choose': ['Choose…', 'चुनें…', 'निवडा…'],
  'cmp.remove': ['Remove {name}', '{name} हटाएं', '{name} काढा'],
  'cmp.matters': ['What matters to you', 'आपके लिए क्या ज़रूरी है', 'तुमच्यासाठी काय महत्त्वाचं'],
  'cmp.ignore': ['ignore', 'अनदेखा', 'दुर्लक्ष'],
  'dim.affordability': ['Affordability', 'किफ़ायत', 'परवडणारे'],
  'dim.rating': ['Rating (Bayesian)', 'रेटिंग (बायेसियन)', 'रेटिंग (बायेशियन)'],
  'dim.accessibility': ['Accessibility', 'सुलभता', 'सुलभता'],
  'dim.cleanliness': ['Cleanliness', 'स्वच्छता', 'स्वच्छता'],
  'dim.safety': ['Nearby reports', 'आस-पास की रिपोर्ट', 'जवळच्या नोंदी'],
  'cmp.nearbyNote': ['"Nearby reports" counts verified community reports within 400 m. It is not a crime or safety rating.', '"आस-पास की रिपोर्ट" 400 मीटर के भीतर सत्यापित समुदाय रिपोर्ट गिनती है। यह अपराध या सुरक्षा रेटिंग नहीं है।', '"जवळच्या नोंदी" म्हणजे 400 मीटरमधील पडताळलेल्या समुदाय नोंदी. हे गुन्हे किंवा सुरक्षा रेटिंग नाही.'],
  'cmp.needTwo': ['Add at least two places to compare.', 'तुलना के लिए कम से कम दो जगहें जोड़ें।', 'तुलनेसाठी किमान दोन ठिकाणे जोडा.'],
  'cmp.place': ['Place', 'जगह', 'ठिकाण'],
  'cmp.weighted': ['Weighted', 'भारित', 'भारित'],
  'cmp.adjusted': ['{a}★ raw → {b} adjusted', '{a}★ मूल → {b} समायोजित', '{a}★ मूळ → {b} समायोजित'],
  'cmp.foot': ['Weighted = average of available dimensions using your weights. Missing dimensions are excluded and listed, not filled in. All values are demo data.', 'भारित = आपके भार से उपलब्ध पैमानों का औसत। गायब पैमाने हटाए जाते हैं, भरे नहीं जाते। सभी मान डेमो हैं।', 'भारित = तुमच्या भारानुसार उपलब्ध निकषांची सरासरी. नसलेले निकष वगळले जातात, भरले जात नाहीत. सर्व आकडे डेमो आहेत.'],
  'cmp.rank': ['Rank {n}: {name}', 'रैंक {n}: {name}', 'क्रमांक {n}: {name}'],
  'cmp.fail': ['Compare failed', 'तुलना विफल', 'तुलना अयशस्वी'],

  // ---------- puneri ----------
  'pati.k': ['Puneri Patya', 'पुणेरी पाट्या', 'पुणेरी पाट्या'],
  'pati.t': ['Pune speaks in signboards.', 'पुणे तख्तियों में बात करता है।', 'पुणं पाट्यांतून बोलतं.'],
  'pati.sub': ['Pune\'s famously blunt signboards, each one opens a real feature. Tap a board.', 'पुणे की मशहूर दो-टूक तख्तियाँ, हर एक एक असली फ़ीचर खोलती है। किसी तख्ती पर टैप करें।', 'पुण्याच्या प्रसिद्ध स्पष्टवक्त्या पाट्या, प्रत्येक पाटी एक खरी सुविधा उघडते. पाटीवर टॅप करा.'],
  'utsav.on': ['Utsav mode: on', 'उत्सव मोड: चालू', 'उत्सव मोड: सुरू'],
  'utsav.off': ['Utsav mode: off', 'उत्सव मोड: बंद', 'उत्सव मोड: बंद'],
  'utsav.k': ['Ganeshotsav mode', 'गणेशोत्सव मोड', 'गणेशोत्सव मोड'],
  'utsav.d': ['Walk the five Manache Ganpati in their traditional order, then Dagdusheth. During the festival the old-city peths are pedestrian-heavy and many roads close to vehicles in the evening, so walk, and check official traffic notices.', 'पाँचों मानाचे गणपति को पारंपरिक क्रम में, फिर दगडूशेठ के दर्शन करें। उत्सव के दौरान पुराने शहर की पेठों में भारी भीड़ रहती है और शाम को कई सड़कें वाहनों के लिए बंद होती हैं, इसलिए पैदल चलें और आधिकारिक ट्रैफ़िक सूचना देखें।', 'पाच मानाचे गणपती पारंपरिक क्रमाने, नंतर दगडूशेठ. उत्सवात जुन्या शहरातील पेठांमध्ये प्रचंड गर्दी असते आणि संध्याकाळी अनेक रस्ते वाहनांसाठी बंद असतात, म्हणून पायी जा आणि अधिकृत वाहतूक सूचना पहा.'],
  'utsav.cta': ['Open the darshan route', 'दर्शन मार्ग खोलें', 'दर्शन मार्ग उघडा'],
  'utsav.toggle': ['Turn on Utsav mode', 'उत्सव मोड चालू करें', 'उत्सव मोड सुरू करा'],
  'home.tab.festival': ['Ganeshotsav darshan', 'गणेशोत्सव दर्शन', 'गणेशोत्सव दर्शन'],
  'utsav.panel': ['Manache Ganpati walk · about {km} km on foot · locations approximate', 'मानाचे गणपति पैदल यात्रा · लगभग {km} किमी · स्थान अनुमानित', 'मानाचे गणपती पायी फेरी · सुमारे {km} किमी · ठिकाणे अंदाजे'],
  'nap.d': ['Classic Puneri afternoon break: many old-city shops close between 1 and 4 PM. Plan food and shopping around it.', 'पुणे का मशहूर दोपहर का विराम: पुराने शहर की कई दुकानें 1 से 4 बजे तक बंद रहती हैं। उसी हिसाब से योजना बनाएं।', 'पुणेरी दुपारची विश्रांती: जुन्या शहरातील अनेक दुकाने १ ते ४ बंद असतात. खाणं-खरेदी त्यानुसार आखा.'],

  // ---------- chat ----------
  'chat.greeting': ['Namaskar! Ask me about places, food, heritage, or what people are reporting around Pune right now.', 'नमस्ते! जगहों, खाने, विरासत या पुणे में अभी लोग क्या बता रहे हैं, कुछ भी पूछिए।', 'नमस्कार! ठिकाणे, खाद्य, वारसा किंवा पुण्यात आत्ता लोक काय कळवत आहेत, काहीही विचारा.'],
  'chat.sub': ['Gemini city assistant', 'Gemini शहर सहायक', 'Gemini शहर सहाय्यक'],
  'chat.subRules': ['Rule-based assistant (no AI key)', 'नियम-आधारित सहायक (AI कुंजी नहीं)', 'नियमाधारित सहाय्यक (AI की नाही)'],
  'chat.ph': ['Ask about Pune…', 'पुणे के बारे में पूछें…', 'पुण्याबद्दल विचारा…'],
  'chat.s1': ['Misal under ₹150?', '₹150 से कम में मिसळ?', '₹150 च्या आत मिसळ?'],
  'chat.s2': ['Evening heritage walk', 'शाम की विरासत सैर', 'संध्याकाळची वारसा फेरी'],
  'chat.s3': ['Any waterlogging now?', 'अभी कहीं जलभराव?', 'आत्ता कुठे पाणी साचलंय?'],
  'chat.s4': ['Quiet cafe near Deccan', 'डेक्कन के पास शांत कैफ़े', 'डेक्कनजवळ शांत कॅफे'],
  'chat.open': ['Open city assistant', 'शहर सहायक खोलें', 'शहर सहाय्यक उघडा'],
  'chat.close': ['Close city assistant', 'शहर सहायक बंद करें', 'शहर सहाय्यक बंद करा'],
  'chat.send': ['Send', 'भेजें', 'पाठवा'],
  'chat.msg': ['Message', 'संदेश', 'संदेश'],
  'chat.thinking': ['Thinking', 'सोच रहा है', 'विचार करत आहे'],
  'chat.error': ['Something went wrong. Try again.', 'कुछ गड़बड़ हुई। फिर कोशिश करें।', 'काहीतरी चुकलं. पुन्हा प्रयत्न करा.'],
}

const IDX: Record<Lang, number> = { en: 0, hi: 1, mr: 2 }
export type TFn = (key: string, vars?: Record<string, string | number>) => string

interface Prefs {
  lang: Lang
  setLang: (l: Lang) => void
  theme: Theme
  toggleTheme: () => void
  utsav: boolean
  toggleUtsav: () => void
  t: TFn
}

const Ctx = createContext<Prefs | null>(null)

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  // Shareable links: ?lang=mr&theme=dark&utsav=on override stored preferences.
  const fromUrl = new URLSearchParams(window.location.search).get(key.replace('pk.', '')) as T | null
  if (fromUrl && allowed.includes(fromUrl)) return fromUrl
  try {
    const v = localStorage.getItem(key) as T | null
    return v && allowed.includes(v) ? v : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch { /* storage unavailable: keep in memory */ }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => read('pk.lang', ['en', 'hi', 'mr'] as const, 'en'))
  const [theme, setTheme] = useState<Theme>(() => {
    const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    return read('pk.theme', ['light', 'dark'] as const, prefersDark ? 'dark' : 'light')
  })

  const [utsav, setUtsav] = useState<boolean>(() => read('pk.utsav', ['on', 'off'] as const, 'on') === 'on')

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.utsav = utsav ? 'on' : 'off'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c0c10' : '#faf7ec')
  }, [lang, theme, utsav])

  const setLang = useCallback((l: Lang) => { setLangState(l); write('pk.lang', l) }, [])
  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      write('pk.theme', next)
      return next
    })
  }, [])

  const toggleUtsav = useCallback(() => {
    setUtsav((u) => {
      write('pk.utsav', u ? 'off' : 'on')
      return !u
    })
  }, [])

  const t = useCallback<TFn>((key, vars) => {
    const row = D[key]
    let s = row ? row[IDX[lang]] || row[0] : key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
    return s
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, theme, toggleTheme, utsav, toggleUtsav, t }), [lang, setLang, theme, toggleTheme, utsav, toggleUtsav, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): Prefs {
  const v = useContext(Ctx)
  if (!v) throw new Error('useI18n must be used inside PrefsProvider')
  return v
}
