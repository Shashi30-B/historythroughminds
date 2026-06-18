import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

dotenv.config();

const __dirname = process.cwd();
const db = new Database("travel_app.db");

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "undefined") {
    throw new Error("GEMINI_API_KEY is not defined. Please add Gemini API key in Settings > Secrets to enable this feature.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    google_id TEXT UNIQUE,
    photo TEXT,
    phone TEXT,
    is_premium INTEGER DEFAULT 0,
    language TEXT DEFAULT 'English',
    currency TEXT DEFAULT 'INR (₹)',
    theme TEXT DEFAULT 'light',
    notifications INTEGER DEFAULT 1
  );
  
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    start_location TEXT,
    location TEXT,
    duration INTEGER,
    style TEXT,
    budget TEXT,
    itinerary TEXT,
    status TEXT DEFAULT 'saved', -- 'upcoming', 'completed', 'saved'
    trip_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'destination', 'hotel'
    title TEXT,
    location TEXT,
    image TEXT,
    price TEXT,
    rating REAL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'hotel', 'flight', 'bus', 'train', 'cab'
    title TEXT,
    date TEXT,
    status TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    service_type TEXT,
    query TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

const offlineCities = [
  "Mumbai", "Pune", "Kolhapur", "Mahabaleshwar", "Lonavala", "Nashik", "Alibaug", "Shirdi", "Chhatrapati Sambhajinagar (Aurangabad)", "Nagpur", "Ratnagiri", "Khandala", "Panchgani", "Satara", "Solapur", "Sangli", "Thane", "Navi Mumbai", "Kolkata", "Kochi", "Kedarnath", "Kashmir", "Kanyakumari", "Kerala", "Kodaikanal", "Karwar", "Kanpur", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Goa", "Jaipur", "Udaipur", "Manali", "Shimla", "Dharamshala", "Leh Ladakh", "Agra", "Varanasi", "Amritsar", "Rishikesh"
];

function getOfflineItinerary(location: string, startLocation: string, duration: number, travelStyle: string, numPeople: number, language: string = "en", transportType: string = "self_drive_car") {
  const destName = location || "Uncharted Paradise";
  const numDur = duration && !isNaN(Number(duration)) ? Number(duration) : 3;
  const numP = numPeople && !isNaN(Number(numPeople)) ? Number(numPeople) : 1;
  const style = travelStyle || "Moderate";
  const approxCost = style.toLowerCase() === "luxury" ? (numDur * 8000 * numP) : (style.toLowerCase() === "budget" ? (numDur * 2000 * numP) : (numDur * 4000 * numP));
  
  // Choose language
  const isMarathi = language === "Marathi" || language === "mr" || language === "mr-IN";
  const isHindi = language === "Hindi" || language === "hi" || language === "hi-IN";

  function getCustomTransportTip(tMode: string, isMar: boolean, isHin: boolean) {
    if (isMar) {
      switch (tMode) {
        case "self_drive_car": return "स्वतः कार चालवताना रस्त्यावरचे सुंदर नजारे पाहा. पर्यटन स्थळ परिसरात कार पार्किंगची अधिकृत जागा निवडा.";
        case "cab": return "तुमच्या प्रायव्हेट टॅक्सी/कॅब ड्रायव्हरला आधीच बोलून ठेवा की मुख्य प्रेक्षणीय जागांवर थांबावे.";
        case "train": return "रेल्वे सफारीचा आनंद घेऊन जवळच्या मुख्य रेल्वे स्टेशनवरून लोकल रिक्षाने पर्यटन स्थळी जा.";
        case "bus": return "एसटी/खाजगी बसने स्वस्त आणि मस्त प्रवास करा आणि मध्यवर्ती ठिकाणांवरून पायी प्रवास करा.";
        case "flight": return "विमानतळावर उतरल्यानंतर थेट प्रीपेड टॅक्सी किंवा मेट्रो सेवा वापरून इच्छित हॉटेल गाठा.";
        default: return "अधिक चांगल्या अनुभवासाठी आणि पैशांच्या बचतीसाठी लोकल ऑटो-रिक्षा किंवा मेट्रो वापरा.";
      }
    } else if (isHin) {
      switch (tMode) {
        case "self_drive_car": return "खुद गाड़ी चलाकर आरामदायक सफर का मज़ा लें। पर्यटन क्षेत्रों में अधिकृत पार्किंग का उपयोग करें।";
        case "cab": return "अपनी प्राइवेट टूरिस्ट कैबिनेट में बैठकर आराम से सफर करें और मनचाही जगह रोक कर तस्वीरें लें।";
        case "train": return "मनोरम रेलवे ट्रैक का आनंद लेते हुए स्टेशन पर उतरें और वहां से स्थानीय सवारी बुक करें।";
        case "bus": return "क्षेत्रीय बस सेवा का उपयोग कर सफर को बजट अनुकूल बनाएं, और लोकल बाजारों में पैदल घूमें।";
        case "flight": return "हवाई अड्डे से प्रीपेड टैक्सी या मेट्रो रेल के ज़रिए बिना झंझट होटल तक पहुँचें।";
        default: return "सस्ते और प्रामाणिक अनुभव के लिए स्थानीय ऑटो-रिक्षा या मेट्रो का उपयोग करें।";
      }
    } else {
      switch (tMode) {
        case "self_drive_car": return "Enjoy the flexibility of driving your own car. Take scenic roadside stops and use official parking grounds.";
        case "cab": return "Relax in your personal chauffeur-driven cab. Feel free to request pit stops for snacks and photo moments.";
        case "train": return "Experience the traditional beauty of Indian Railways. Alight at the station and catch a prepaid station taxi.";
        case "bus": return "Save heavily with eco-friendly regional bus connections. Core spots are walkable from the main bus stand.";
        case "flight": return "Skip the fatigue with a fast flight, then hop on an airport shuttle or metro to arrive smoothly at your resort.";
        default: return "Use local auto-rickshaws, shared cabs or local metro for a cost-effective and authentic experience.";
      }
    }
  }

  // Custom headers in local languages
  let title = `🌍 ${destName} Travel Itinerary (via ${transportType.replace(/_/g, ' ').toUpperCase()})`;
  let durationText = `⏱️ Duration: ${numDur} Days`;
  let budgetText = `💰 Budget Category: ${style.toUpperCase()} | Approx Cost: ₹${approxCost.toLocaleString("en-IN")} INR`;
  let dayPlanText = `🗓️ Day-by-Day Plan:`;
  let transportTipTitle = `🚕 Transport Tip:`;
  let proTipsTitle = `💡 Travolor Pro-Tips for ${destName}:`;
  let localFoodTitle = `🍽️ Local food recommendation:`;
  
  if (isMarathi) {
    const showMode = transportType === "self_drive_car" ? "स्वतः कार चालवून" : (transportType === "cab" ? "कॅबने" : (transportType === "train" ? "रेल्वेने" : (transportType === "bus" ? "बसने" : "विमानाने")));
    title = `🌍 ${destName} प्रवासाची रूपरेषा (${showMode} प्रवास)`;
    durationText = `⏱️ कालावधी: ${numDur} दिवस`;
    budgetText = `💰 बजेट श्रेणी: ${style.toLowerCase() === "budget" ? "बजेट (स्वस्त)" : (style.toLowerCase() === "luxury" ? "लक्झरी (आलिशान)" : "मध्यम (Moderate)")} | अंदाजे खर्च: ₹${approxCost.toLocaleString("en-IN")} INR`;
    dayPlanText = `🗓️ दिवसनिहाय प्रवास योजना (Day-by-Day Plan):`;
    transportTipTitle = `🚕 वाहतूक सल्ला (Transport Tip):`;
    proTipsTitle = `💡 ${destName} साठी ट्रॅव्होलर प्रो-टिप्स (Pro-Tips):`;
    localFoodTitle = `🍽️ स्थानिक खाद्यपदार्थ शिफारसी (Local Food):`;
  } else if (isHindi) {
    const showMode = transportType === "self_drive_car" ? "सेल्फ-ड्राइव कार" : (transportType === "cab" ? "कैब" : (transportType === "train" ? "ट्रेन" : (transportType === "bus" ? "बस" : "फ्लाइट")));
    title = `🌍 ${destName} यात्रा कार्यक्रम (${showMode} द्वारा)`;
    durationText = `⏱️ अवधि: ${numDur} दिन`;
    budgetText = `💰 बजट श्रेणी: ${style.toLowerCase() === "budget" ? "बजट" : (style.toLowerCase() === "luxury" ? "लक्जरी" : "मध्यम")} | अनुमानित लागत: ₹${approxCost.toLocaleString("en-IN")} INR`;
    dayPlanText = `🗓️ दिन-प्रतिदिन की योजना (Day-by-Day Plan):`;
    transportTipTitle = `🚕 परिवहन टिप (Transport Tip):`;
    proTipsTitle = `💡 ${destName} के लिए ट्रैवलर प्रो-टिप्स (Pro-Tips):`;
    localFoodTitle = `🍽️ स्थानीय भोजन सिफारिशें (Local Food):`;
  }

  let markdown = `${title}\n${durationText}\n${budgetText}\n\n${dayPlanText}\n\n`;

  const genericActivities = [
    {
      m: "Morning visit to the iconic main square, local landmark exploration, and fresh local breakfast.",
      a: "Afternoon museum tour, heritage cultural center, and trying out famous local tea or snacks.",
      e: "Evening sunset view at a scenic point, lake ride or walking street tour, followed by a fine dinner.",
      t: "Use local auto-rickshaws, shared cabs or local metro for a cost-effective and authentic experience.",
      m_mr: "घोटाळा किंवा स्थानिक नाश्त्यासह मुख्य चौक आणि ऐतिहासिक वास्तूंची सफर.",
      a_mr: "दुपारी प्रसिद्ध म्युझियम, सांस्कृतिक केंद्र भेट आणि तिथला चहा व स्थानिक अल्पोपहार.",
      e_mr: "संध्याकाळी सूर्यास्त पॉईंट, तलाव सफर आणि चवदार रात्रीचे जेवण.",
      t_mr: "अधिक चांगल्या अनुभवासाठी आणि पैशांच्या बचतीसाठी लोकल ऑटो-रिक्षा किंवा मेट्रो वापरा.",
      m_hi: "स्थानिक नाश्ते के साथ मुख्य चौक और ऐतिहासिक पर्यटन स्थलों का दौरा।",
      a_hi: "दोपहर में प्रसिद्ध संग्रहालय, सांस्कृतिक केंद्र और वहाँ की प्रसिद्ध चाय व स्नैक्स।",
      e_hi: "शाम को सूर्यास्त बिंदु, झील की सवारी और स्वादिष्ट रात्रिभोज।",
      t_hi: "सस्ते और प्रामाणिक अनुभव के लिए स्थानीय ऑटो-रिक्षा या मेट्रो का उपयोग करें।"
    },
    {
      m: "Morning hike, nature trail walk, or visiting a pristine garden/national park with beautiful viewpoints.",
      a: "Afternoon shopping spree at the cultural handicraft market and a traditional thali lunch.",
      e: "Relaxing spa session or leisure walk by the promenade/riverfront, enjoying local live music.",
      t: "Renting a scooter or booking a reliable local cab for the day makes commuting extremely flexible.",
      m_mr: "सकाळी निसर्गरम्य ट्रेक, जंगलातील पायवाट किंवा सुबक पायऱ्यांच्या बागेला भेट.",
      a_mr: "दुपारी हस्तकला बाजारात खरेदी आणि पारंपारिक थाळी जेवणाचा आस्वाद.",
      e_mr: "संध्याकाळी नदीकाठचा रस्ता किंवा समुद्रकिनाऱ्यावर फेरफटका आणि फिरती गाणी.",
      t_mr: "स्कूटर भाड्याने घेणे किंवा खाजगी टॅक्सी करणे प्रवासासाठी सोयीस्कर ठरेल.",
      m_hi: "सुबह की चढ़ाई, प्रकृति की पगडंडी, या सुंदर उद्यानों/राष्ट्रीय उद्यानों का दौरा।",
      a_hi: "दोपहर में सांस्कृतिक हस्तशिल्प बाजार में खरीदारी और पारंपरिक थाली का भोजन।",
      e_hi: "नदी के किनारे या समुद्र तट पर शाम की सैर और स्थानीय संगीत का आनंद।",
      t_hi: "दिन के लिए स्कूटर किराए पर लेना या स्थानीय टैक्सी बुक करना अत्यधिक लचीला होगा।"
    },
    {
      m: "Early morning spiritual temple, church, or monastery visit for peaceful meditation and scenic views.",
      a: "Visiting adventure theme park, recreational lake sports, or local art gallery exhibitions.",
      e: "Niche street food crawling, visiting rooftop cafes with a panoramic skyline and souvenirs shopping.",
      t: "Walking around the central market is best; use local cycle rickshaws for short distances.",
      m_mr: "सकाळी ध्यानधारणा आणि शांततेसाठी धार्मिक स्थळ, मंदिर, चर्च किंवा मठाला भेट.",
      a_mr: "दुपारी स्थानिक मनोरंजन पार्क, साहसी खेळ किंवा कलादालनाचे प्रदर्शन.",
      e_mr: "संध्याकाळी प्रसिद्ध स्ट्रीट फूड खाणे, रुफटॉप कॅफे मधून शहराचे विहंगम दृश्य पाहणे आणि खरेदी.",
      t_mr: "मध्यवर्ती बाजारात पायी फिरणे उत्तम; कमी अंतरासाठी सायकल रिक्षा वापरा.",
      m_hi: "ध्यान और शांति के लिए सुबह-सुबह किसी मंदिर, चर्च या मठ का दौरा।",
      a_hi: "दोपहर में स्थानीय मनोरंजन पार्क, साहसिक खेल या कला दीर्घा की प्रदर्शनी।",
      e_hi: "शाम को प्रसिद्ध स्ट्रीट फूड का आनंद लेना, शानदार रूफटॉप कैफे जाना और खरीदारी।",
      t_hi: "केंद्रीय बाजार के चारों ओर पैदल घूमना सबसे अच्छा है; छोटी दूरी के लिए साइकिल रिक्षा का उपयोग करें।"
    }
  ];

  for (let i = 1; i <= numDur; i++) {
    const actIdx = (i - 1) % genericActivities.length;
    const act = genericActivities[actIdx];
    
    let mAct = act.m;
    let aAct = act.a;
    let eAct = act.e;
    let tTip = getCustomTransportTip(transportType, isMarathi, isHindi);
    let dayLabel = `Day ${i}: Exploring ${destName}`;

    if (isMarathi) {
      mAct = act.m_mr;
      aAct = act.a_mr;
      eAct = act.e_mr;
      dayLabel = `दिवस ${i}: ${destName} ची सफर आणि रहस्ये`;
    } else if (isHindi) {
      mAct = act.m_hi;
      aAct = act.a_hi;
      eAct = act.e_hi;
      dayLabel = `दिन ${i}: ${destName} की यात्रा और आनंद`;
    }

    markdown += `### ${dayLabel}\n\n`;
    markdown += `🌅 **Morning:** ${mAct} - Approx ₹${style.toLowerCase() === "budget" ? 150 : (style.toLowerCase() === "luxury" ? 800 : 400)}\n\n`;
    markdown += `☀️ **Afternoon:** ${aAct} - Approx ₹${style.toLowerCase() === "budget" ? 250 : (style.toLowerCase() === "luxury" ? 1500 : 700)}\n\n`;
    markdown += `🌆 **Evening:** ${eAct} - Approx ₹${style.toLowerCase() === "budget" ? 200 : (style.toLowerCase() === "luxury" ? 2000 : 800)}\n\n`;
    markdown += `🚕 **${transportTipTitle}** ${tTip}\n\n---\n\n`;
  }

  let tip1 = "Book attractions in advance online to secure your preferred slots and avoid long waiting lines.";
  let tip2 = "Keep sufficient local currency cash in hand, as small local vendors, auto drivers, and street markets might not accept digital UPI payment.";
  let foodRec = "Don't miss the local specialities, delicious street savory chats, artisanal sweets, and refreshing regional beverages.";

  if (isMarathi) {
    tip1 = "प्रवेश तिकिटे ऑनलाईन आधीच बुक करा, जेणेकरून वेळ वाचेल आणि गर्दीपासून सुटका होईल.";
    tip2 = "तुमच्यासोबत पुरेशी रोकड पैसे बाळगा, कारण लहान स्ट्रीट वेंडर किंवा रिक्षाचालक डिजिटल पेमेंट स्वीकारत नाहीत.";
    foodRec = "इथल्या प्रसिद्ध ताजेतवाने पेय, गरमागरम स्ट्रीट फूड आणि पारंपारिक गोड पदार्थांची चव घ्यायला विसरू नका.";
  } else if (isHindi) {
    tip1 = "प्रवेश टिकट ऑनलाइन पहले से बुक करें ताकि समय बचे और लंबी कतारों से बचा जा सके।";
    tip2 = "अपने पास पर्याप्त नकद रखें क्योंकि छोटे स्थानीय वेंडर या रिक्षा चालक डिजिटल यूपीआई भुगतान स्वीकार नहीं कर सकते।";
    foodRec = "यहाँ के स्थानीय प्रसिद्ध व्यंजनों, स्वादिष्ट चाट और मीठे पकवानों का स्वाद लेना न भूलें।";
  }

  markdown += `${proTipsTitle}\n\n`;
  markdown += `📌 **Tip 1:** ${tip1}\n\n`;
  markdown += `📌 **Tip 2:** ${tip2}\n\n`;
  markdown += `${localFoodTitle} ${foodRec}\n`;

  return markdown;
}

function getOfflineChatResponse(query: string, language: string = "English", botRole: string = "copilot"): string {
  const q = query.toLowerCase();
  const isMarathi = language === "Marathi" || language === "mr" || language === "mr-IN";
  const isHindi = language === "Hindi" || language === "hi" || language === "hi-IN";
  
  if (isMarathi) {
    if (q.includes("जेवण") || q.includes("हॉटेल") || q.includes("खाद्य") || q.includes("खा") || q.includes("food") || q.includes("eat") || q.includes("restaurant")) {
      return "मला खाद्यपदार्थांबद्दल सांगायला नक्कीच आवडेल! तुम्ही जर महाराष्ट्रात असाल, तर तिथली गरमागरम झणझणीत मिसळ पाव, साबुदाणा वडा आणि कोल्हापुरी तांबडा-पांढरा रस्सा चुकवू नका. गोड खाण्यासाठी पुरणपोळी उत्कृष्ट पर्याय आहे. तुम्हाला कोणत्या विशिष्ट ठिकाणाचे खाद्यपदार्थ शोधायचे आहेत का?";
    }
    if (q.includes("बजेट") || q.includes("पैसे") || q.includes("स्वस्त") || q.includes("budget") || q.includes("cheap") || q.includes("save")) {
      return "सर्वोत्तम बजेट प्रवासी सल्ला:\n1. स्थानिक सार्वजनिक बस किंवा मेट्रोचा वापर करा.\n2. महागड्या हॉटेल ऐवजी होमस्टे किंवा हॉस्टेलमध्ये राहा.\n3. स्थानिक लोकांकडून गल्लीबोळातील स्वस्त पण अतिशय चवदार भोजनालयांची माहिती घ्या.";
    }
    if (q.includes("इतिहास") || q.includes("किल्ला") || q.includes("fort") || q.includes("history") || q.includes("old") || q.includes("ancient")) {
      return "इतिहास आणि वारसा हा आपल्या प्रवासाचा गाभा आहे! जर तुम्ही महाराष्ट्रात असाल, तर छत्रपती शिवाजी महाराजांचे शौर्य दाखवणारे गड-किल्ले जसे की रायगड, प्रतापगड, सिंधुदुर्ग नक्की पहा. या किल्ल्यांभोवतीचा इतिहास थरारक आहे.";
    }
    return "नमस्कार! ट्रॅव्होलर प्रवासाचे तुमचे सह-प्रवासी सहचर (Co-pilot) म्हणून मी हजर आहे. मला सांगा, तुम्हाला प्रवासाचे नियोजन, बजेट हॉटेल्स, स्थानिक प्रेक्षणीय ठिकाणे किंवा स्वादिष्ट भोजनाची शिफारस हवी आहे का?";
  } else if (isHindi) {
    if (q.includes("भोजन") || q.includes("खाना") || q.includes("होटल") || q.includes("food") || q.includes("eat") || q.includes("restaurant")) {
      return "मुझे भोजन की सलाह देना बहुत पसंद है! आप जहाँ भी जा रहे हैं, वहाँ का प्रसिद्ध स्थानीय स्ट्रीट फूड, चाट और पारंपरिक प्रादेशिक थाली ज़रूर चखें। क्या आप किसी विशिष्ट व्यंजन या शहर के बारे में जानना चाहते हैं?";
    }
    if (q.includes("बजट") || q.includes("पैसे") || q.includes("सस्ता") || q.includes("budget") || q.includes("cheap") || q.includes("save")) {
      return "बजट यात्रा के मूल मंत्र:\n1. ऑटो या प्राइवेट टैक्सी के बजाय स्थानीय बसों और मेट्रो का उपयोग करें।\n2. स्थानीय स्ट्रीट फूड चौपाटी और ढाबों पर भोजन करें जो स्वादिष्ट और किफायती होते हैं।\n3. पहले से बुकिंग करके विशेष छूट प्राप्त करें।";
    }
    if (q.includes("इतिहास") || q.includes("किला") || q.includes("history") || q.includes("fort") || q.includes("ancient")) {
      return "ऐतिहासिक स्थलों की यात्रा का अपना ही मज़ा है! भारत में लाल किला, जयपुर के हवेलियां, और अजंता-एलोरा की गुफाएं अद्भुत सांस्कृतिक विरासत पेश करती हैं। क्या आप किसी महल या किले के इतिहास के बारे में जानना चाहते हैं?";
    }
    return "नमस्कार! ट्रैवलर को-पायलट में आपका स्वागत है। मैं आपकी यात्रा को आसान, किफायती और यादगार बनाने में मदद करूँगा। आप कहाँ की यात्रा की योजना बना रहे हैं?";
  } else {
    // English
    if (q.includes("food") || q.includes("eat") || q.includes("restaurant") || q.includes("culinary") || q.includes("dish")) {
      return "Culinary exploration is one of the best parts of travel! I highly recommend trying out local street food stalls, old heritage restaurants, and seasonal regional specialities. Let me know which city you're querying, and I'll find the absolute best options for you!";
    }
    if (q.includes("budget") || q.includes("cheap") || q.includes("cost") || q.includes("money") || q.includes("save")) {
      return "Traveling on a budget is extremely rewarding! Here are three golden rules:\n1. Prefer public transit (rail/buses) or renting shared scooters rather than private luxury cabs.\n2. Opt for well-reviewed homestays or boutique hostels instead of major chain hotels.\n3. Eat where the locals eat! Neighborhood street food complexes are clean, cheap, and unmatched in flavor.";
    }
    if (q.includes("history") || q.includes("fort") || q.includes("ancient") || q.includes("monument") || q.includes("museum")) {
      return "Every destination has a voice from the past! Exploring rich historical forts, ancient temples, or centuries-old monuments provides deep context. Let me know if you are planning to visit historic hubs like Jaipur, Rome, or Agra, and I can reveal their legendary tales!";
    }
    return "Hello! I'm Travolor Co-pilot, your personal AI travel assistant. Ask me anything about planning itineraries, local restaurant guides, budgeting hacks, or must-visit historical monuments!";
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Helper to log searches
  const logSearch = (userId: number | null, type: string, query: any) => {
    try {
      db.prepare("INSERT INTO searches (user_id, service_type, query) VALUES (?, ?, ?)").run(userId, type, JSON.stringify(query));
    } catch (e) {
      console.error("Failed to log search:", e);
    }
  };

  // Admin Routes
  app.get("/api/admin/config", (req, res) => {
    res.json({
      adminName: process.env.ADMIN_NAME || "Admin",
      adminEmail: process.env.ADMIN_EMAIL || "admin@travolor.com",
      adminPhone: process.env.ADMIN_PHONE || "+1 234 567 890",
      companyName: process.env.COMPANY_NAME || "Travolor",
      supportEmail: process.env.SUPPORT_EMAIL || "support@travolor.com",
      supportPhone: process.env.SUPPORT_PHONE || "+1 800 TRAVOLOR",
    });
  });

  app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL || "admin@travolor.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (email === adminEmail && password === adminPassword) {
      res.json({ success: true, token: "admin-token-123" }); // Simple token for demo
    } else {
      res.status(401).json({ success: false, message: "Invalid admin credentials" });
    }
  });

  app.get("/api/admin/stats", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer admin-token-123') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const totalSearches = db.prepare("SELECT COUNT(*) as count FROM searches").get() as any;
      const recentBookings = db.prepare("SELECT b.*, u.name as user_name FROM bookings b JOIN users u ON b.user_id = u.id ORDER BY b.id DESC LIMIT 10").all();
      
      // Mock API usage for now
      const apiUsage = {
        amadeus: Math.floor(Math.random() * 1000),
        googleMaps: Math.floor(Math.random() * 5000),
        gemini: Math.floor(Math.random() * 2000)
      };

      res.json({
        users: totalUsers.count,
        searches: totalSearches.count,
        apiUsage,
        recentBookings
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
  });

  // Google OAuth URL
  app.get("/api/auth/google/url", (req, res) => {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: `${process.env.APP_URL}/auth/google/callback`,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };
    const qs = new URLSearchParams(options);
    res.json({ url: `${rootUrl}?${qs.toString()}` });
  });

  // Google OAuth Callback
  app.get("/auth/google/callback", async (req, res) => {
    const code = req.query.code as string;
    const url = "https://oauth2.googleapis.com/token";
    const values = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.APP_URL}/auth/google/callback`,
      grant_type: "authorization_code",
    };

    try {
      const tokenRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(values),
      });
      const tokens = await tokenRes.json();

      if (!tokens.access_token) {
        throw new Error("Failed to get access token");
      }

      const userRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`);
      const googleUser = await userRes.json();

      // Upsert user
      let user = db.prepare("SELECT * FROM users WHERE google_id = ? OR email = ?").get(googleUser.id, googleUser.email) as any;
      if (!user) {
        const stmt = db.prepare("INSERT INTO users (name, email, google_id, photo) VALUES (?, ?, ?, ?)");
        const info = stmt.run(googleUser.name, googleUser.email, googleUser.id, googleUser.picture);
        user = { id: info.lastInsertRowid, name: googleUser.name, email: googleUser.email, photo: googleUser.picture };
      } else {
        // Update photo/name if changed
        db.prepare("UPDATE users SET name = ?, photo = ? WHERE id = ?").run(googleUser.name, googleUser.picture, user.id);
        user.name = googleUser.name;
        user.photo = googleUser.picture;
      }

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS',
                  user: ${JSON.stringify({ id: user.id, name: user.name, email: user.email, photo: user.photo })}
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Google Auth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { name, email, password } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
      const info = stmt.run(name, email, password);
      res.json({ success: true, user: { id: info.lastInsertRowid, name, email, is_premium: 0 } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message.includes("UNIQUE") ? "Email already exists" : "Signup failed" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (user) {
      res.json({ success: true, user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        photo: user.photo, 
        phone: user.phone, 
        is_premium: user.is_premium,
        language: user.language,
        currency: user.currency,
        theme: user.theme,
        notifications: user.notifications
      } });
    } else {
      res.status(401).json({ success: false, message: "Invalid email or password" });
    }
  });

  app.post("/api/auth/google", (req, res) => {
    const { name, email, google_id, photo } = req.body;
    let user = db.prepare("SELECT * FROM users WHERE google_id = ? OR email = ?").get(google_id, email) as any;
    
    if (!user) {
      const stmt = db.prepare("INSERT INTO users (name, email, google_id, photo) VALUES (?, ?, ?, ?)");
      const info = stmt.run(name, email, google_id, photo);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as any;
    } else {
      // Update photo if changed
      db.prepare("UPDATE users SET photo = ? WHERE id = ?").run(photo, user.id);
      user.photo = photo;
    }
    
    res.json({ success: true, user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      photo: user.photo, 
      phone: user.phone, 
      is_premium: user.is_premium,
      language: user.language,
      currency: user.currency,
      theme: user.theme,
      notifications: user.notifications
    } });
  });

  // Profile Routes
  app.post("/api/user/update", (req, res) => {
    const { id, name, phone, photo, language, currency, theme, notifications } = req.body;
    try {
      const sets = [];
      const params = [];
      if (name !== undefined) { sets.push("name = ?"); params.push(name); }
      if (phone !== undefined) { sets.push("phone = ?"); params.push(phone); }
      if (photo !== undefined) { sets.push("photo = ?"); params.push(photo); }
      if (language !== undefined) { sets.push("language = ?"); params.push(language); }
      if (currency !== undefined) { sets.push("currency = ?"); params.push(currency); }
      if (theme !== undefined) { sets.push("theme = ?"); params.push(theme); }
      if (notifications !== undefined) { sets.push("notifications = ?"); params.push(notifications ? 1 : 0); }
      
      if (sets.length > 0) {
        params.push(id);
        db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...params);
      }
      
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
      res.json({ success: true, user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        photo: user.photo, 
        phone: user.phone, 
        is_premium: user.is_premium,
        language: user.language,
        currency: user.currency,
        theme: user.theme,
        notifications: user.notifications
      } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post("/api/user/premium", (req, res) => {
    const { id } = req.body;
    db.prepare("UPDATE users SET is_premium = 1 WHERE id = ?").run(id);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, photo: user.photo, phone: user.phone, is_premium: user.is_premium } });
  });

  // Wishlist Routes
  app.get("/api/wishlist/:userId", (req, res) => {
    const items = db.prepare("SELECT * FROM wishlist WHERE user_id = ?").all(req.params.userId);
    res.json(items);
  });

  app.post("/api/wishlist", (req, res) => {
    const { user_id, type, title, location, image, price, rating } = req.body;
    const stmt = db.prepare("INSERT INTO wishlist (user_id, type, title, location, image, price, rating) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(user_id, type, title, location, image, price, rating);
    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.delete("/api/wishlist/:id", (req, res) => {
    db.prepare("DELETE FROM wishlist WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Trip Routes
  app.get("/api/trips/:userId", (req, res) => {
    const trips = db.prepare("SELECT * FROM trips WHERE user_id = ?").all(req.params.userId);
    res.json(trips);
  });

  app.post("/api/trips", (req, res) => {
    const { user_id, start_location, location, duration, style, budget, itinerary } = req.body;
    const stmt = db.prepare("INSERT INTO trips (user_id, start_location, location, duration, style, budget, itinerary) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(user_id, start_location, location, duration, style, budget, itinerary);
    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.delete("/api/trips/:id", (req, res) => {
    db.prepare("DELETE FROM trips WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Booking Routes
  app.get("/api/bookings/:userId", (req, res) => {
    const bookings = db.prepare("SELECT * FROM bookings WHERE user_id = ?").all(req.params.userId);
    res.json(bookings);
  });

  // Real Search APIs
  let amadeusToken: string | null = null;
  let amadeusTokenExpiry: number = 0;

  async function getAmadeusToken() {
    if (amadeusToken && Date.now() < amadeusTokenExpiry) {
      return amadeusToken;
    }
    try {
      const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: process.env.AMADEUS_CLIENT_ID || "",
          client_secret: process.env.AMADEUS_CLIENT_SECRET || "",
        }),
      });
      const data = await response.json();
      amadeusToken = data.access_token;
      amadeusTokenExpiry = Date.now() + (data.expires_in * 1000);
      return amadeusToken;
    } catch (error) {
      console.error("Amadeus Token Error:", error);
      return null;
    }
  }

  app.get("/api/search/hotels", async (req, res) => {
    const { city, userId } = req.query;
    logSearch(userId ? parseInt(userId as string) : null, 'hotels', { city });
    const token = await getAmadeusToken();

    if (!token) {
      return res.json([
        { id: 1, name: "Grand Palace", rating: 4.9, price: 4500, address: "Central Mall Road", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80" },
        { id: 2, name: "Ocean Resort", rating: 4.2, price: 2850, address: "Beach Side Avenue", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80" }
      ]);
    }

    try {
      // 1. Get City Code
      const cityRes = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${city}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const cityData = await cityRes.json();
      const cityCode = cityData.data?.[0]?.iataCode;

      if (!cityCode) throw new Error("City not found");

      // 2. Get Hotels by City
      const hotelsRes = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const hotelsData = await hotelsRes.json();
      
      // Amadeus reference data doesn't include prices/ratings directly in this endpoint
      // We'll take the first few hotels and add mock prices/ratings for the UI
      const hotels = (hotelsData.data || []).slice(0, 5).map((item: any) => ({
        id: item.hotelId,
        name: item.name.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
        rating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1),
        price: Math.floor(Math.random() * 6000) + 2500,
        address: `${item.iataCode} Area`,
        image: `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80`
      }));

      res.json(hotels.length > 0 ? hotels : [
        { id: 1, name: "Grand Palace", rating: 4.9, price: 4500, address: "Central Mall Road", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80" },
        { id: 2, name: "Ocean Resort", rating: 4.2, price: 2850, address: "Beach Side Avenue", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80" }
      ]);
    } catch (error) {
      console.error("Hotel Search Error:", error);
      res.json([
        { id: 1, name: "Grand Palace", rating: 4.9, price: 4500, address: "Central Mall Road", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80" },
        { id: 2, name: "Ocean Resort", rating: 4.2, price: 2850, address: "Beach Side Avenue", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80" }
      ]);
    }
  });

  app.get("/api/search/flights", async (req, res) => {
    const { from, to, date, passengers, userId } = req.query;
    logSearch(userId ? parseInt(userId as string) : null, 'flights', { from, to, date, passengers });
    const token = await getAmadeusToken();

    if (!token) {
      return res.json([
        { id: 1, name: "Air Connect", price: 4500, rating: 4.8, type: "Economy", departure: "10:00 AM", arrival: "12:30 PM", duration: "2h 30m" },
        { id: 2, name: "Sky Express", price: 6200, rating: 4.5, type: "Business", departure: "02:15 PM", arrival: "04:45 PM", duration: "2h 30m" }
      ]);
    }

    try {
      const getIATA = async (city: string) => {
        const res = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${city}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        return data.data?.[0]?.iataCode;
      };

      const fromIATA = await getIATA(from as string);
      const toIATA = await getIATA(to as string);

      if (!fromIATA || !toIATA) throw new Error("Invalid cities");

      const response = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${fromIATA}&destinationLocationCode=${toIATA}&departureDate=${date}&adults=${passengers || 1}&max=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      const AIRLINE_MAPPING: { [key: string]: string } = {
        'AI': 'Air India',
        '6E': 'IndiGo',
        'UK': 'Vistara',
        'SG': 'SpiceJet',
        'G8': 'Go First',
        'I5': 'AirAsia India',
        'LH': 'Lufthansa',
        'EK': 'Emirates',
        'BA': 'British Airways',
        'AF': 'Air France',
        'QR': 'Qatar Airways',
        'SQ': 'Singapore Airlines',
        'CX': 'Cathay Pacific',
        'AA': 'American Airlines',
        'DL': 'Delta Air Lines',
        'UA': 'United Airlines'
      };

      const flights = (data.data || []).map((item: any) => {
        const segment = item.itineraries[0].segments[0];
        const departure = new Date(segment.departure.at);
        const arrival = new Date(segment.arrival.at);
        const airlineCode = item.validatingAirlineCodes[0];
        
        return {
          id: item.id,
          name: AIRLINE_MAPPING[airlineCode] || `${airlineCode} Airways`,
          price: Math.floor(parseFloat(item.price.total) * 85), // Convert EUR to INR approx
          rating: 4.5,
          type: item.travelerPricings[0].fareDetailsBySegment[0].cabin || "Economy",
          departure: departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          arrival: arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: item.itineraries[0].duration.replace('PT', '').toLowerCase()
        };
      });

      res.json(flights.length > 0 ? flights : [
        { id: 1, name: "Air Connect", price: 4500, rating: 4.8, type: "Economy", departure: "10:00 AM", arrival: "12:30 PM", duration: "2h 30m" },
        { id: 2, name: "Sky Express", price: 6200, rating: 4.5, type: "Business", departure: "02:15 PM", arrival: "04:45 PM", duration: "2h 30m" }
      ]);
    } catch (error) {
      console.error("Flight Search Error:", error);
      res.json([
        { id: 1, name: "Air Connect", price: 4500, rating: 4.8, type: "Economy", departure: "10:00 AM", arrival: "12:30 PM", duration: "2h 30m" },
        { id: 2, name: "Sky Express", price: 6200, rating: 4.5, type: "Business", departure: "02:15 PM", arrival: "04:45 PM", duration: "2h 30m" }
      ]);
    }
  });

  app.get("/api/search/cabs", async (req, res) => {
    const { from, to, userId } = req.query;
    logSearch(userId ? parseInt(userId as string) : null, 'cabs', { from, to });
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

    try {
      let distance = 0;
      if (apiKey) {
        const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from}&destinations=${to}&key=${apiKey}`);
        const data = await response.json();
        if (data.rows?.[0]?.elements?.[0]?.distance) {
          distance = data.rows[0].elements[0].distance.value / 1000; // km
        }
      }

      // Fallback distance calculation if API fails or no key
      if (distance === 0) {
        distance = Math.floor(Math.random() * 500) + 100;
      }

      const basePrice = 15; // per km
      res.json([
        { id: 1, name: "Cab Prime", price: Math.floor(distance * basePrice * 1.2), rating: 4.9, type: "Sedan" },
        { id: 2, name: "Cab Mini", price: Math.floor(distance * basePrice), rating: 4.2, type: "Hatchback" }
      ]);
    } catch (error) {
      res.json([
        { id: 1, name: "Cab Prime", price: 1200, rating: 4.9, type: "Sedan" },
        { id: 2, name: "Cab Mini", price: 850, rating: 4.2, type: "Hatchback" }
      ]);
    }
  });

  app.get("/api/search/autocomplete", async (req, res) => {
    const { input } = req.query;
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!input) return res.json([]);
    if (!apiKey) {
      console.warn("Google Maps API key missing for autocomplete");
      return res.json([]);
    }

    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&types=(cities)&key=${apiKey}`);
      const data = await response.json();
      
      if (data.status === "REQUEST_DENIED") {
        console.error("Google Maps Autocomplete Request Denied:", data.error_message);
        return res.status(403).json({ error: "API key invalid or restricted" });
      }

      const suggestions = (data.predictions || []).map((item: any) => ({
        id: item.place_id,
        description: item.description,
        main_text: item.structured_formatting.main_text
      }));

      res.json(suggestions);
    } catch (error) {
      console.error("Autocomplete Error:", error);
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  app.get("/api/search/attractions", async (req, res) => {
    const { city } = req.query;
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) return res.json([]);

    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=tourist+attractions+in+${city}&key=${apiKey}`);
      const data = await response.json();
      
      const attractions = (data.results || []).slice(0, 6).map((item: any) => ({
        id: item.place_id,
        name: item.name,
        rating: item.rating || 4.5,
        address: item.formatted_address,
        image: item.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${item.photos[0].photo_reference}&key=${apiKey}` : "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=400&q=80"
      }));

      res.json(attractions);
    } catch (error) {
      res.json([]);
    }
  });

  app.get("/api/search/trains", async (req, res) => {
    const { from, to, userId } = req.query;
    logSearch(userId ? parseInt(userId as string) : null, 'trains', { from, to });
    // Mocking realistic train data based on distance
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    let distance = 500;
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from}&destinations=${to}&key=${apiKey}`);
      const data = await response.json();
      distance = data.rows[0].elements[0].distance.value / 1000;
    } catch (e) {}

    res.json([
      { id: 1, name: "Express A", price: Math.floor(distance * 2), rating: 4.9, type: "3AC" },
      { id: 2, name: "Express B", price: Math.floor(distance * 1.5), rating: 4.2, type: "Sleeper" }
    ]);
  });

  app.get("/api/search/buses", async (req, res) => {
    const { from, to, userId } = req.query;
    logSearch(userId ? parseInt(userId as string) : null, 'buses', { from, to });
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    let distance = 500;
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from}&destinations=${to}&key=${apiKey}`);
      const data = await response.json();
      distance = data.rows[0].elements[0].distance.value / 1000;
    } catch (e) {}

    res.json([
      { id: 1, name: "Sleeper AC", price: Math.floor(distance * 3), rating: 4.9, type: "AC" },
      { id: 2, name: "Sleeper Non-AC", price: Math.floor(distance * 2), rating: 4.2, type: "Non-AC" }
    ]);
  });

  // Gemini API Routes
  app.post("/api/gemini/generate-itinerary", async (req, res) => {
    const { startLocation, location, duration, travelStyle, numPeople, language = "en", enableThinking, useSearch, transportType = "self_drive_car" } = req.body;
    
    // Proactive check to fall back cleanly if API key is not yet set
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey === "undefined") {
      console.warn("GEMINI_API_KEY missing or empty. Activating offline itinerary engine.");
      const text = getOfflineItinerary(location, startLocation, duration, travelStyle, numPeople, language, transportType);
      return res.json({
        text,
        sources: [],
        modelUsed: "Travolor Local Engine (Offline Fallback - Key Unset)",
        grounded: false
      });
    }

    const prompt = `You are an expert AI Travel Planner for "Travolor". Your goal is to generate highly practical, exciting, and easy-to-read travel itineraries based on the user's input.

Do not use JSON. Output the response in beautifully formatted Markdown (plain text) using headings, bullet points, and bold text.

User Request Details:
- Starting Location: ${startLocation}
- Destination: ${location}
- Duration: ${duration} Days
- Travel Style / Budget Category: ${travelStyle} (e.g. Budget, Moderate, Luxury)
- Number of Travelers: ${numPeople}
- Mode of Transportation: ${transportType.replace(/_/g, ' ').toUpperCase()} (options: Self Drive Car, Cab, Train, Bus, Flight)
- Language Preference: Please write the entire response and itinerary ONLY in the ${language} language. Write all headings, descriptions, tip titles, and day names in ${language}.

IMPORTANT transport rules:
1. Since the user is travelling via ${transportType.replace(/_/g, ' ').toUpperCase()}, tailor all activities, daily schedules, commutes, and routes to align perfectly with this exact transport mode.
2. In the "Transport Tip" section for each day, write a custom paragraph tailored/specific to using ${transportType.replace(/_/g, ' ').toUpperCase()} (e.g. road-trip parking, driving scenery, train boarding at stations, taxi booking tips, flight arrivals, or regional bus dropoffs). Tell the user how to navigate using this chosen transport mode.

Follow this exact structure for every response:

🌍 [Destination Name] Travel Itinerary
⏱️ Duration: [Number of days]
💰 Budget Category: [Budget/Moderate/Luxury] | Approx Cost: [Amount in INR]

🗓️ Day-by-Day Plan:

Day 1: [Theme/Title of the Day]

Morning: [Activity name and short description] - [Approx Cost]

Afternoon: [Activity name and short description] - [Approx Cost]

Evening: [Activity name and short description] - [Approx Cost]

🚕 Transport Tip: [How to get around for the day using ${transportType.replace(/_/g, ' ').toUpperCase()}]

(Repeat the above structure for all ${duration} days. Do not skip any day.)

💡 Travolor Pro-Tips for [Destination]:

[Important travel tip 1]

[Important travel tip 2]

[Local food recommendation]

Rules:
1. Replace all bracketed items (like [Destination Name], [Amount in INR], [Activity name and short description]) with real, actual details for the requested trip. Do not keep the brackets in the final output.
2. Be direct, enthusiastic, and provide practical advice.
3. Do NOT add ANY conversational filler or introduction/conclusion commentary before or after the itinerary. Start immediately with "🌍 [Destination Name] Travel Itinerary" and end exactly after the local food recommendation.
4. Calculate approx costs in Indian Rupees (INR).`;

    // Configure model selection based on thinking/grounding requested
    const useHighThinking = enableThinking === true || travelStyle === "luxury";
    const model = useHighThinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
    
    // Configure tools: If search grounding is requested, or if standard-flash is utilized to ensure fresh sources
    const tools: any[] = [];
    if (useSearch === true || !useHighThinking) {
      tools.push({ googleSearch: {} });
    }

    const config: any = {};
    if (tools.length > 0) {
      config.tools = tools;
    }
    if (useHighThinking) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    try {
      const response = await getGeminiClient().models.generateContent({
        model: model,
        contents: prompt,
        config: config
      });

      // Extract search grounding metadata sources
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = groundingChunks?.map((chunk: any) => {
        if (chunk.web) {
          return { title: chunk.web.title, uri: chunk.web.uri };
        }
        return null;
      }).filter(Boolean) || [];

      res.json({ 
        text: response.text || "Sorry, I couldn't generate the plan.",
        sources: sources,
        modelUsed: model,
        grounded: sources.length > 0
      });
    } catch (error: any) {
      console.warn("Server error generating itinerary, falling back to local engine:", error.message || error);
      const text = getOfflineItinerary(location, startLocation, duration, travelStyle, numPeople, language, transportType);
      res.json({ 
        text,
        sources: [],
        modelUsed: "Travolor Local Engine (Offline Fallback - API Error)",
        grounded: false
      });
    }
  });

  // Multi-Turn Chatbot with Grounding and Mode configuration
  app.post("/api/gemini/chat", async (req, res) => {
    const { messages, userLocation, mode = "general", botRole = "copilot", language = "English" } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required." });
    }

    const lastUserMessage = messages[messages.length - 1]?.text || "";
    const lowerMessage = lastUserMessage.toLowerCase();

    // Check if key is available, if not, jump to offline fallback immediately
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey === "undefined") {
      console.warn("GEMINI_API_KEY missing or empty. Activating offline chatbot response engine.");
      const text = getOfflineChatResponse(lastUserMessage, language, botRole);
      return res.json({
        text,
        sources: [],
        modelUsed: "Travolor Chat Engine (Offline Fallback - Key Unset)",
        grounded: false
      });
    }

    // Determine model based on complexity mode requested
    // gemini-3.1-pro-preview for particularly complex tasks
    // gemini-3.5-flash for general tasks
    // gemini-3.1-flash-lite for tasks that should happen fast
    let selectedModel = "gemini-3.5-flash";
    if (mode === "complex" || mode === "reasoning") {
      selectedModel = "gemini-3.1-pro-preview";
    } else if (mode === "fast") {
      selectedModel = "gemini-3.1-flash-lite";
    }

    // Set specialized chatbot roles / system instruction
    let systemInstruction = "You are Travolor Travel Co-pilot, a friendly, ultra-knowledgeable, and professional travel assistant. Help the user plan journeys, suggest restaurants, advise on budgets, and provide local tips.";
    if (botRole === "foodie") {
      systemInstruction = "You are the Travolor Culinary Specialist. Your goal is to guide users to the finest local cuisines, street food, hidden restaurants, historical eateries, and dining tips for any city in the world.";
    } else if (botRole === "historian") {
      systemInstruction = "You are the Travolor Historical Guide. Share ancient tales, architectural secrets, monument histories, and cultural significance behind popular landmarks and cities the user asks about.";
    } else if (botRole === "budget") {
      systemInstruction = "You are the Travolor Budget Hack Advisor. Provide extreme money-saving tips, affordable transport alternatives, free attractions, cheap eats, and savvy itinerary optimizations.";
    }

    systemInstruction += ` CRITICAL: You must answer and write your responses ONLY in the ${language} language. Write all suggestions, travel advice, headings, and friendly comments in ${language}.`;

    // Configure tools: dynamic detection or explicit request
    const tools: any[] = [];
    const config: any = {
      systemInstruction
    };

    // Use Maps Grounding if query focuses on "places to visit, restaurants, hotels near, route, map, coordinates, directory, nearby"
    const requiresMaps = lowerMessage.includes("near me") || 
                         lowerMessage.includes("restaurant") || 
                         lowerMessage.includes("hotel") || 
                         lowerMessage.includes("place") || 
                         lowerMessage.includes("where is") || 
                         lowerMessage.includes("nearby") ||
                         lowerMessage.includes("map");

    if (requiresMaps && selectedModel !== "gemini-3.1-flash-lite") {
      tools.push({ googleMaps: {} });
      if (userLocation && userLocation.lat && userLocation.lng) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: Number(userLocation.lat),
              longitude: Number(userLocation.lng)
            }
          }
        };
      }
    } else if (selectedModel !== "gemini-3.1-flash-lite") {
      // Use Search Grounding as default for current events or real-time info
      tools.push({ googleSearch: {} });
    }

    if (tools.length > 0) {
      config.tools = tools;
    }

    // Enable high thinking mode for gemini-3.1-pro-preview if requested
    if (selectedModel === "gemini-3.1-pro-preview") {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    try {
      // Map frontend messages format to standard role-parts structure
      // role must be 'user' or 'model'
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" as const : "user" as const,
        parts: [{ text: m.text }]
      }));

      // Initialize stateless multi-turn chat using config
      const chat = getGeminiClient().chats.create({
        model: selectedModel,
        history: history,
        config: config
      });

      const response = await chat.sendMessage({ message: lastUserMessage });

      // Extract Grounding Chunks (URLs, Places, reviews, etc.)
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: any[] = [];
      if (groundingChunks) {
        for (const chunk of groundingChunks) {
          if (chunk.web) {
            sources.push({
              type: "web",
              title: chunk.web.title,
              uri: chunk.web.uri
            });
          } else if (chunk.maps) {
            sources.push({
              type: "maps",
              title: chunk.maps.title || "Directions / Place Link",
              uri: chunk.maps.uri,
              reviewSnippets: chunk.maps.placeAnswerSources?.reviewSnippets || []
            });
          }
        }
      }

      res.json({
        text: response.text || "I apologize, but I could not formulate a response at this moment.",
        sources: sources,
        modelUsed: selectedModel,
        grounded: sources.length > 0
      });
    } catch (error: any) {
      console.warn("Chatbot generation error, falling back to local chat engine:", error.message || error);
      const text = getOfflineChatResponse(lastUserMessage, language, botRole);
      res.json({
        text,
        sources: [],
        modelUsed: "Travolor Chat Engine (Offline Fallback - API Error)",
        grounded: false
      });
    }
  });

  app.post("/api/gemini/get-suggestions", async (req, res) => {
    const { letter } = req.body;
    const cleanLetter = (letter || "").trim().toLowerCase();
    
    // Proactive check to fall back clean if API key is not set
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey === "undefined") {
      console.warn("GEMINI_API_KEY missing or empty. Activating offline suggestions engine.");
      const matches = offlineCities.filter(c => c.toLowerCase().startsWith(cleanLetter));
      const backupList = matches.length > 0 ? matches : offlineCities.slice(0, 8);
      return res.json({ 
        text: `Suggested Destinations starting with ${letter || 'A'}: ` + backupList.slice(0, 8).join(', ') 
      });
    }

    const prompt = `You are a premium Travel Planner AI autocomplete engine.
The user typed the letter: "${letter}".
List 5-10 top travel destinations starting with this letter.
Format: "Suggested Destinations starting with ${letter}: City1, City2, City3, ..."
Keep it professional and high-end.`;

    try {
      const response = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.warn("Server error getting suggestions, falling back to offline suggestions list:", error.message || error);
      const matches = offlineCities.filter(c => c.toLowerCase().startsWith(cleanLetter));
      const backupList = matches.length > 0 ? matches : offlineCities.slice(0, 8);
      res.json({ 
        text: `Suggested Destinations starting with ${letter || 'A'}: ` + backupList.slice(0, 8).join(', ') 
      });
    }
  });

  // API 404 handler
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
