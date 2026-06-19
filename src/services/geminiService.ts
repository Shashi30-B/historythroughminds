import { GoogleGenAI } from "@google/genai";

function getGenAI() {
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('travolor_user_api_key') : null;
  const apiKey = localKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined. Please add it to your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
}

export interface ItineraryRequest {
  location: string;
  startLocation: string;
  duration: number;
  numPeople: number;
  travelStyle: string;
  transportType?: string;
  language?: string;
  enableThinking?: boolean;
  useSearch?: boolean;
  customInstructions?: string;
  cravingFilter?: string;
  travelMood?: string;
  unlockHiddenGems?: boolean;
}

export interface ItineraryResponse {
  text: string;
  sources?: Array<{ title: string; uri: string }>;
  modelUsed?: string;
  grounded?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  text: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  userLocation?: { lat: number; lng: number };
  mode?: 'general' | 'fast' | 'complex' | 'reasoning';
  botRole?: 'copilot' | 'foodie' | 'historian' | 'budget';
  language?: string;
}

export interface ChatResponse {
  text: string;
  sources?: Array<{
    type: 'web' | 'maps';
    title: string;
    uri: string;
    reviewSnippets?: string[];
  }>;
  modelUsed?: string;
  grounded?: boolean;
}

export async function getSuggestions(letter: string): Promise<string> {
  // First, try to call the server-side API
  try {
    const response = await fetch("/api/gemini/get-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letter }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.text || "";
    }
  } catch (error) {
    console.warn("Server-side getSuggestions not available, falling back to client-side. Error:", error);
  }

  // Fallback to client-side API
  try {
    const ai = getGenAI();
    const prompt = `You are a premium Travel Planner AI autocomplete engine.
The user typed the letter: "${letter}".
List 5-10 top travel destinations starting with this letter.
Format: "Suggested Destinations starting with ${letter}: City1, City2, City3, ..."
Keep it professional and high-end.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    console.error("Client-side getSuggestions error:", error);
    return "";
  }
}

export async function generateItinerary(request: ItineraryRequest): Promise<ItineraryResponse> {
  // First, try to call the server-side API
  try {
    const response = await fetch("/api/gemini/generate-itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        text: data.text || "Sorry, I couldn't generate the plan.",
        sources: data.sources,
        modelUsed: data.modelUsed,
        grounded: data.grounded
      };
    }
  } catch (error) {
    console.warn("Server-side generateItinerary not available, falling back to client-side. Error:", error);
  }

  // Fallback to client-side API
  const { location, startLocation, duration, numPeople, travelStyle, language = "en", transportType = "self_drive_car", customInstructions, cravingFilter, travelMood, unlockHiddenGems } = request;
  
  try {
    const ai = getGenAI();
    let prompt = `You are an expert AI Travel Planner for "Travolor". Your goal is to generate highly practical, exciting, and easy-to-read travel itineraries based on the user's input.

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

    if (customInstructions && customInstructions.trim()) {
      prompt += `\n\n- ADDITIONAL CUSTOM PREFERENCES / INSTRUCTIONS: ${customInstructions}\nIMPORTANT: Please customize and adapt the activities, locations, and timings in the generated plan to fulfill these user instructions perfectly!`;
    }

    if (cravingFilter && cravingFilter.trim()) {
      prompt += `\n\n- STREET FOOD / SNACK CRAVING CRITERIA (Hyper-Local Food Trails): Focus heavily on finding local, hyper-local street food stalls, snug snack trails, hidden lanes, or famous roadside spots matching: "${cravingFilter}". Explicitly list specific small street-food joints, stalls (e.g. for crispy vadapav, samosa, ghee-toast, sweet or savory toppings/farsan) and tell the user where to find them and what to order there!`;
    }

    if (travelMood && travelMood !== 'standard') {
      prompt += `\n\n- TRAVEL MOOD SPECIALIZATION: The traveler is in a "${travelMood}" mood (options: peaceful_relaxed, adventure_thrills, nature_scenic, heritage_history, foodie_culinary). Customize the daily itinerary activities, sights, pacing, and locations to specifically fit this mood vibe beautifully (e.g., recommend quiet, serene spots for peaceful; thrilling hikes/sports for adventure; scenic viewpoints/parks for nature; fort/museum walk for heritage; multiple food tours/stalls for foodie).`;
    }

    if (unlockHiddenGems === true) {
      prompt += `\n\n- OF-BEAT HIDDEN GEMS (Hidden Gems Unlocker): Actively search for and prioritize highly uncommon, off-beat, lesser-known secret sights (e.g. peaceful non-touristy lakes, ancient old libraries, local artisans' alleyways, hidden old quarters, secret sunrise vista points) that are NOT crowded commercial tourist spots. The traveler wants to feel like a true local explorer!`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return { text: response.text || "Sorry, I couldn't generate the plan." };
  } catch (error: any) {
    console.warn("Client-side generateItinerary had an error or lacks an API key, executing premium local engine fallback.", error);
    const fallbackText = getClientOfflineItinerary(
      location, 
      startLocation, 
      duration, 
      travelStyle, 
      numPeople, 
      language, 
      transportType
    );
    return {
      text: fallbackText,
      sources: [],
      modelUsed: "Travolor Local Engine (Offline Fallback - Client)",
      grounded: false
    };
  }
}

function getClientOfflineItinerary(
  location: string, 
  startLocation: string, 
  duration: number, 
  travelStyle: string, 
  numPeople: number, 
  language: string = "en", 
  transportType: string = "self_drive_car"
): string {
  const destName = location || "Goa";
  const numDur = duration && !isNaN(Number(duration)) ? Number(duration) : 3;
  const numP = numPeople && !isNaN(Number(numPeople)) ? Number(numPeople) : 1;
  const style = travelStyle || "Moderate";
  const approxCost = style.toLowerCase() === "luxury" ? (numDur * 8000 * numP) : (style.toLowerCase() === "budget" ? (numDur * 2000 * numP) : (numDur * 4000 * numP));
  
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

  const transportTip = getCustomTransportTip(transportType, isMarathi, isHindi);

  if (isMarathi) {
    let itineraryMarkdown = `🌍 **${destName} सहल नियोजन पत्रक**\n\n⏱️ **कालावधी:** ${numDur} दिवस\n💰 **बजेट श्रेणी:** ${style} | **अंदाजे खर्च:** ₹${approxCost.toLocaleString("en-IN")}\n\n🗓️ **दिवस-निहाय सविस्तर आराखडा:**\n\n`;
    for (let i = 1; i <= numDur; i++) {
      itineraryMarkdown += `### **दिवस ${i}: ${destName} मधील मुख्य आकर्षणे**\n\n`;
      itineraryMarkdown += `- **सकाळ:** ${destName} चे सुंदर प्रेक्षणीय निसर्ग सौंदर्य किंवा मुख्य मंदिर दर्शन - *₹${Math.floor(approxCost / numDur * 0.2)}*\n`;
      itineraryMarkdown += `- **दुपार:** स्थानिक चवदार जेवणाचा आस्वाद आणि बाजारात फेरफटका - *₹${Math.floor(approxCost / numDur * 0.3)}*\n`;
      itineraryMarkdown += `- **संध्याकाळ:** प्रसिद्ध सनसेट पॉइंट किंवा स्थानिक चौपाटीवरून निसर्गाचा आनंद - *₹${Math.floor(approxCost / numDur * 0.1)}*\n\n`;
      itineraryMarkdown += `🚕 **प्रवास टीप (Transport Tip):** ${transportTip}\n\n`;
    }
    itineraryMarkdown += `💡 **${destName} साठी ट्रॅव्होलर प्रो-टिप्स (Travolor Pro-Tips):**\n\n`;
    itineraryMarkdown += `1. **हवामान:** प्रवासापूर्वी स्थानिक ठिकाणचे हवामान तपासा आणि त्यानुसार सुती किंवा उबदार योग्य कपडे सोबत ठेवा.\n`;
    itineraryMarkdown += `2. **लोकल बुकिंग:** स्थानिक फिरण्यासाठी अधिकृत सरकारी ड्रायव्हर किंवा मीटर असलेल्या रिक्षाचाच वापर करा.\n`;
    itineraryMarkdown += `3. **खाद्यसंस्कृती:** स्थानिक पातळीवर प्रसिद्ध असलेले पारंपरिक खाद्यपदार्थ नक्की ट्राय करा, ते खूप चवदार असतात!`;
    return itineraryMarkdown;
  } else if (isHindi) {
    let itineraryMarkdown = `🌍 **${destName} यात्रा कार्यक्रम**\n\n⏱️ **अवधि:** ${numDur} दिन\n💰 **बजट श्रेणी:** ${style} | **अनुमानित लागत:** ₹${approxCost.toLocaleString("en-IN")}\n\n🗓️ **दिन-प्रतिदिन की योजना:**\n\n`;
    for (let i = 1; i <= numDur; i++) {
      itineraryMarkdown += `### **दिन ${i}: ${destName} के प्रमुख आकर्षण और भ्रमण**\n\n`;
      itineraryMarkdown += `- **सुबह:** ${destName} के प्राचीन मंदिर या सुंदर प्राकृतिक स्थलों की सैर - *₹${Math.floor(approxCost / numDur * 0.2)}*\n`;
      itineraryMarkdown += `- **दोपहर:** पारंपरिक भोजनालय में स्वादिष्ट भोजन और लोकल शॉपिंग - *₹${Math.floor(approxCost / numDur * 0.3)}*\n`;
      itineraryMarkdown += `- **शाम:** प्रसिद्ध सनसेट व्यू पॉइंट या लोकल नदी किनारे टहलना - *₹${Math.floor(approxCost / numDur * 0.1)}*\n\n`;
      itineraryMarkdown += `🚕 **परिवहन टिप (Transport Tip):** ${transportTip}\n\n`;
    }
    itineraryMarkdown += `💡 **${destName} के लिए ट्रेवलोर प्रो-टिप्स:**\n\n`;
    itineraryMarkdown += `1. **मौसम:** यात्रा शुरू करने से पहले स्थानीय मौसम की जानकारी ज़रूर लें ताकि उपयुक्त कपड़े अपने साथ रखें।\n`;
    itineraryMarkdown += `2. **स्थानीय परिवहन:** हमेशा सरकारी अधिकृत कार या प्रीपेड ऑटो का उपयोग करें ताकि अतिरिक्त खर्च न हो।\n`;
    itineraryMarkdown += `3. **भोजन:** वहाँ के स्थानीय पारंपरिक व्यंजनों का स्वाद ज़रूर चखें, यह आपकी यात्रा को यादगार बनाएगा!`;
    return itineraryMarkdown;
  } else {
    let itineraryMarkdown = `🌍 **${destName} Travel Itinerary**\n\n⏱️ **Duration:** ${numDur} Days\n💰 **Budget Category:** ${style} | **Approx Cost:** ₹${approxCost.toLocaleString("en-IN")}\n\n🗓️ **Day-by-Day Plan:**\n\n`;
    for (let i = 1; i <= numDur; i++) {
      itineraryMarkdown += `### **Day ${i}: Exploring the Best of ${destName}**\n\n`;
      itineraryMarkdown += `- **Morning:** Iconic sightseeing of highly-rated attractions in ${destName} - *₹${Math.floor(approxCost / numDur * 0.2)}*\n`;
      itineraryMarkdown += `- **Afternoon:** Indulge in traditional local recipes and stroll through ethnic markets - *₹${Math.floor(approxCost / numDur * 0.3)}*\n`;
      itineraryMarkdown += `- **Evening:** Witness the jaw-dropping sunset or relax at a clean waterfront park - *₹${Math.floor(approxCost / numDur * 0.1)}*\n\n`;
      itineraryMarkdown += `🚕 **Transport Tip:** ${transportTip}\n\n`;
    }
    itineraryMarkdown += `💡 **Travolor Pro-Tips for ${destName}:**\n\n`;
    itineraryMarkdown += `1. **Local Weather:** Check the forecast beforehand and pack appropriate layering items.\n`;
    itineraryMarkdown += `2. **Transport Bookings:** Rely on licensed local cabs or verified travel desks for hiring regional transport.\n`;
    itineraryMarkdown += `3. **Culinary Scene:** Don't miss out on authentic local neighborhood eateries for genuine regional flavors!`;
    return itineraryMarkdown;
  }
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        text: data.text,
        sources: data.sources,
        modelUsed: data.modelUsed,
        grounded: data.grounded
      };
    }
    const errData = await response.json();
    throw new Error(errData.error || "Failed to communicate with chat API");
  } catch (error: any) {
    console.error("sendChatMessage error:", error);
    return {
      text: "I'm having trouble matching your connection at the moment. Please ensure your Gemini API Key is available in Secrets.",
      grounded: false
    };
  }
}

export async function refineItinerary(
  originalItinerary: string,
  refinementPrompt: string,
  language: string = "English"
): Promise<string> {
  // Try server-side first
  try {
    const res = await fetch("/api/gemini/refine-itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalItinerary, refinementPrompt, language })
    });
    if (res.ok) {
      const data = await res.json();
      return data.text || originalItinerary;
    }
  } catch (err) {
    console.warn("Server-side refineItinerary failed, trying client-side fallback:", err);
  }

  // Client-side fallback
  try {
    const ai = getGenAI();
    const prompt = `You are an expert itinerary editor. Your task is to update or customize an existing travel itinerary based on the user's refinement instructions.

ORIGINAL ITINERARY:
${originalItinerary}

REFINEMENT INSTRUCTIONS:
"${refinementPrompt}"

LANGUAGE CONFIGURATION:
- Return the ENTIRE updated itinerary in ${language} language.

INSTRUCTIONS:
1. Revise the itinerary carefully to incorporate the user's requested changes. Keep the core travel structure (Days, Morning, Afternoon, Evening, transport tips, etc.) but update the activities, budgets, or destinations as requested.
2. Maintain the beautiful Markdown formatting.
3. Return only the revised markdown itinerary without any introductory or concluding sentences. Start directly with the itinerary heading.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return response.text || originalItinerary;
  } catch (err) {
    console.error("Client-side refineItinerary error:", err);
    // Simple mock edit if both fail: Append instruction notice
    return originalItinerary + `\n\n*(Note: Could not run AI adjustment. Self-applied change instruction: ${refinementPrompt})*`;
  }
}

