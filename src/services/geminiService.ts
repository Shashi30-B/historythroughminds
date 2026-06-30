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
  language?: string;
  enableThinking?: boolean;
  useSearch?: boolean;
  travelMode?: string;
  travelDate?: string;
  budget?: number;
  includeHiddenGems?: boolean;
  includeLocalExperiences?: boolean;
}

export interface ItineraryResponse {
  text: string;
  sources?: Array<{ title: string; uri: string }>;
  modelUsed?: string;
  grounded?: boolean;
  structured?: any;
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
  } catch (error: any) {
    console.warn("Client-side getSuggestions fallback warning:", error.message || error);
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
        grounded: data.grounded,
        structured: data.structured
      };
    }
  } catch (error) {
    console.warn("Server-side generateItinerary not available, falling back to client-side. Error:", error);
  }

  // Fallback to client-side API
  const { location, startLocation, duration, numPeople, travelStyle, language = "en", travelMode, travelDate, budget } = request;
  
  try {
    const ai = getGenAI();
    const targetBudget = budget || (duration * 5000 * numPeople);
    const prompt = `You are an expert AI Travel Planner for "Travolor", the leading Indian professional travel platform. Your goal is to generate extremely detailed, high-fidelity, highly practical, and beautiful end-to-end travel itineraries starting from the user's Departure City to the final return home.

Do not use JSON in your response. Output the response in beautifully formatted Markdown (plain text) using headings, bullet points, and bold text.

CRITICAL REQUIREMENT:
1. COMPLETE DETAIL FOR ALL SPOTS: Do not list limited or generic spots (like just "historical place" or "garden"). You must provide the actual REAL names of every attraction, monument, temple, lake, beach, heritage site, park, local bazaar, or activity (e.g., "Nishat Bagh", "Golden Temple", "Taj Mahal", "Marina Beach", "Colaba Causeway").
2. REAL TIMINGS AND TICKET PRICES: You must include the exact REAL opening and closing hours (e.g., "9:00 AM - 5:30 PM", "Sunrise to Sunset", "Open 24 Hours") and the exact REAL ticket/entry fees in Indian Rupees (e.g., "₹50 for adults, children under 5 free", "No Entry Fee", "₹250 with Camera"). Do not write generic placeholders like "[Amount in INR]" or "₹[Amount]" - use real estimated numbers based on actual rates!
3. NO SHORTCUTS OR GROUPING OF DAYS: You must generate a completely detailed schedule individually for every single day from Day 1 to Day ${duration - 1}. You are strictly forbidden from grouping days (e.g., "Day 2 & Day 3: Local sightseeing") or using shortcuts (e.g., "Repeat Day 1 schedule"). Every single day must have its own unique Morning, Afternoon, Evening, and Night detailed points with full descriptions, transport notes, restaurants, and prices.

User Request Details:
- Departure City (Start): ${startLocation}
- Destination (To): ${location}
- Travel Date: ${travelDate || "upcoming date"}
- Duration: ${duration} Days
- Selected Mode of Travel: ${travelMode || "any convenient transit (flight/train/bus/car)"}
- Number of Travelers: ${numPeople}
- Target Budget: ₹${targetBudget.toLocaleString('en-IN')} INR (Style: ${travelStyle})
- Language Preference: Please write the entire response and itinerary ONLY in the ${language} language. Write all headings, descriptions, tip titles, and day names in ${language}.

Follow this EXACT structure and order for every response. Fill in every detail with real, highly practical information. Do not output any bracketed text, placeholders, or template tags.

🌍 ${location} End-to-End Travel Itinerary
⏱️ Duration: ${duration} Days | Travel Date: ${travelDate || "Upcoming"}
💰 Budget Category: ${travelStyle.toUpperCase()} | Target Budget: ₹${targetBudget.toLocaleString('en-IN')}

🗓️ Day-by-Day Plan:

---
Day 0: Leave & Travel to Destination
- **Home / Departure City**:
  - **Departure City/Address**: Start from the exact location: ${startLocation}.
  - **Departure Time**: [Realistic recommended departure time, e.g. 06:00 AM]
  - **Distance to Transit Terminal**: [State real road distance to airport/station or "Not Applicable" if self-driving]
  - **Cab / Self-Drive Recommendation**: [Give professional recommendation: e.g. self-drive vs pre-booked outstation cab]
  - **Google Maps Route Link**: [Link](https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startLocation)}&destination=${encodeURIComponent(location)})
- **Journey to Destination**:
  - **Real Highway Route**: [E.g., scenic highway or optimized toll expressway route]
  - **Road Distance**: [State road distance in km]
  - **Estimated Travel Duration**: [State driving hours, e.g., 6 hours 15 mins]
  - **Toll Estimate**: ₹[Realistic toll charges in INR, e.g. ₹650]
  - **Fuel Cost / EV Charging**: ₹[Fuel estimate in INR or EV charging stop details]
  - **Rest Stop Suggestions (every 2-3 hours)**: [List specific, real highway food plazas/cities, e.g. Highway Food Court, Expressway Plaza]
  - **Food Stops**: [E.g., specific dhabas or restaurants along the way]
  - **Washroom Stops**: [E.g., Clean toilets at specific toll plazas or petroleum stations]
  - **EV Charging Stations**: [List specific EV stations or note availability along the highway]
- **Arrival & Settling In**:
  - **Estimated Arrival Time**: [Realistic arrival time, e.g. 02:30 PM]
  - **Hotel Check-In**: check-in at [Recommended Hotel name matching ${travelStyle} style]
  - **Nearby Restaurants**: [List 2-3 top restaurants near the hotel]
  - **Nearby Medical Facilities**: [Specific local hospital/clinic name]
  - **Emergency Contacts**: [Provide real emergency phone numbers for ${location}]

---
Day 1: Discovering ${location}
- **Morning**:
  - **Attraction / Sightseeing**: [Real attraction name] — [Brief description]
  - **Opening/Closing Time**: [E.g., 9:00 AM - 6:00 PM]
  - **Time Required**: [E.g., 2 hours]
  - **Google Maps Navigation Link**: [Link](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}+[Attraction Name])
  - **Entry Fee**: ₹[Amount in INR]
  - **Best Time to Visit**: [E.g., Early morning]
  - **Crowd Level**: [E.g., Low]
  - **Weather Suitability**: [E.g., Ideal for sunny/cloudy days]
  - **Nearby Restaurants**: [E.g., Local eatery name]
  - **Nearby Washrooms**: [State availability/locations]
  - **Nearby Parking**: [State availability/parking charges]
- **Afternoon**:
  - **Attraction / Sightseeing / Lunch**: [Real lunch cafe or sightseeing spot] — [Brief description]
  - **Opening/Closing Time**: [E.g., 11:30 AM - 10:00 PM]
  - **Time Required**: [E.g., 1.5 hours]
  - **Google Maps Navigation Link**: [Link](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}+[Lunch Cafe Name])
  - **Entry Fee**: ₹[Amount in INR]
  - **Best Time to Visit**: [E.g., Lunch hours]
  - **Crowd Level**: [E.g., Medium]
  - **Weather Suitability**: [E.g., Indoor AC]
  - **Nearby Restaurants**: [E.g., Neighboring sweet shop]
  - **Nearby Washrooms**: [State availability]
  - **Nearby Parking**: [State availability]
- **Evening**:
  - **Attraction / Sightseeing / Sunset**: [Real sightseeing spot or sunset point] — [Brief description]
  - **Opening/Closing Time**: [E.g., 24 hours or sunset hours]
  - **Time Required**: [E.g., 2 hours]
  - **Google Maps Navigation Link**: [Link](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}+[Sunset Point Name])
  - **Entry Fee**: ₹[Amount in INR]
  - **Best Time to Visit**: [E.g., 5:00 PM - 6:30 PM]
  - **Crowd Level**: [E.g., High]
  - **Weather Suitability**: [E.g., Outdoor open air]
  - **Nearby Restaurants**: [E.g., Tea stalls]
  - **Nearby Washrooms**: [State availability]
  - **Nearby Parking**: [State availability]
- **Night**:
  - **Attraction / Dinner / Leisure**: [Real dinner restaurant or evening market] — [Brief description]
  - **Opening/Closing Time**: [E.g., 7:00 PM - 11:30 PM]
  - **Time Required**: [E.g., 2 hours]
  - **Google Maps Navigation Link**: [Link](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}+[Dinner Place Name])
  - **Entry Fee**: ₹[Amount in INR]
  - **Best Time to Visit**: [E.g., 8:00 PM onwards]
  - **Crowd Level**: [E.g., Medium]
  - **Weather Suitability**: [E.g., Cozy night atmosphere]
  - **Nearby Restaurants**: [E.g., Local street food carts]
  - **Nearby Washrooms**: [State availability]
  - **Nearby Parking**: [State availability]
- **Daily Budget Breakdown**:
  - **Hotel**: ₹[Estimated night stay cost in INR]
  - **Food**: ₹[Estimated breakfast, lunch, dinner cost in INR]
  - **Local Transport**: ₹[Local auto/cab transport cost in INR]
  - **Attraction Tickets**: ₹[Total entrance/activities fees in INR]
  - **Shopping**: ₹[Shopping estimate in INR]
  - **Total Day Cost**: ₹[Total sum for today in INR]

(CRITICAL: You MUST repeat this EXACT Morning/Afternoon/Evening/Night and Daily Budget structure for Day 2, Day 3, up to Day ${duration - 1}. Each day must be listed SEPARATELY under its own Day header with completely unique, real local attractions, sightseeing activities, timing slots, and food places suited for ${location}. Under NO circumstances are you allowed to group multiple days or skip any days!)

---
Day ${duration} (Last Day): Checkout & Return Journey
- **Hotel Checkout**: Complete hotel checkout and clear any bills.
- **Travel to Transit Terminal**: Head to local airport/railway station (or pack bags and load the car/cab).
- **Return Transport / Journey**: Leave ${location} to return back to ${startLocation} via ${travelMode || "convenient transit"}.
- **Arrival back to Departure City**: Safe arrival back at ${startLocation}.
- **Travel back Home**: Commute from arrival terminal / drop point back to your home address.
- **Trip Completed**: Congratulations, your Swadesh travel plan is fully completed!

---
### Travolor Pro-Tips, Suggestions & Safety Info:

- **Smart AI Suggestions**:
  - **Hidden Gems**: [Describe 2 lesser-known, non-crowded secret places in ${location}]
  - **Local Food Recommendations**: [Describe 2-3 traditional culinary dishes and best local joints to taste them]
  - **Photography Spots**: [List 2 ideal spots for capturing memorable travel moments or sunset photos]
  - **Sunset & Sunrise Points**: [List best sunset and sunrise viewpoints]
  - **Local Markets**: [List 1-2 local markets for authentic spices, handicrafts, or souvenirs]
  - **Festivals & Cultural Experiences**: [Mention any local festival, dance, or traditional experience]

- **Safety Information**:
  - **Emergency Numbers**: Emergency Helpline: 112, Police: 100, Ambulance: 102
  - **Hospitals / Clinics**: [Name and address of 1-2 major hospitals/emergency clinics in ${location}]
  - **Police Station**: [Name and contact number of primary Police Station in ${location}]
  - **Tourist Help Center**: [Details of official tourist helpdesk or state tourism office]

- **💳 Trip Summary & Financial Report (for ${numPeople} travelers)**:
  - **Total Distance**: [Total round-trip road distance in km]
  - **Total Driving Time**: [Total driving duration each way]
  - **Total Fuel / Charging Cost**: ₹[Calculated Fuel cost in INR]
  - **Total Toll Cost**: ₹[Calculated Toll cost in INR]
  - **Total Hotel Cost**: ₹[ Lodging for ${duration} days in INR]
  - **Total Food Cost**: ₹[Food budget for the entire trip in INR]
  - **Shopping Estimate**: ₹[Suggested shopping allowance in INR]
  - **Grand Total Budget**: ₹[Grand total sum of all costs, ensuring it is realistic and matches the target budget of ₹${targetBudget.toLocaleString('en-IN')}]

Rules:
1. Every trip must start from the departure city ${startLocation} and end back at ${startLocation}.
2. Replace all bracketed items (like [Real attraction name], [Amount in INR]) with real, actual details for the requested trip. Do not keep the brackets or template text in the final output.
3. Be direct, enthusiastic, and provide extremely practical advice. No placeholder or bracketed templates should remain.
4. Do NOT add ANY conversational filler or introduction/conclusion commentary before or after the itinerary. Start immediately with "🌍 [Destination Name]" and end exactly at the Trip Summary.
5. Calculate approx costs in Indian Rupees (INR). Ensure the total estimated cost is within or close to the target budget of ₹${targetBudget.toLocaleString('en-IN')}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return { text: response.text || "Sorry, I couldn't generate the plan." };
  } catch (error: any) {
    console.warn("Client-side generateItinerary fallback warning. Triggering high-fidelity local generator:", error.message || error);
    const fallbackText = generateLocalItineraryClient(request);
    return { 
      text: fallbackText,
      modelUsed: "Travolor-Local-Agent",
      grounded: false
    };
  }
}

function generateLocalItineraryClient(request: ItineraryRequest): string {
  const duration = parseInt(request.duration as any) || 3;
  const startLocation = request.startLocation || "Mumbai";
  const location = request.location || "Goa";
  const numPeople = request.numPeople || 1;
  const travelStyle = (request.travelStyle || "moderate").toLowerCase();
  const travelMode = request.travelMode || "train";
  const travelDate = request.travelDate || "Upcoming";
  const language = request.language || "English";
  const targetBudget = request.budget || (duration * 5000 * numPeople);

  const costPerPersonPerDay = travelStyle === "budget" ? 1800 : travelStyle === "luxury" ? 8500 : 3800;
  const baseDailyCost = costPerPersonPerDay * numPeople;
  const totalCost = targetBudget > 0 ? targetBudget : baseDailyCost * duration;

  const attractions = [
    "Historic Fort & Local Heritage Sites",
    "Scenic Lake View & Botanical Gardens",
    "Vibrant Local Market & Old Town Quarter",
    "Ancient Temple & Cultural Experience Center",
    "Sunset Point & Nature Hiking Trails",
    "Signature Regional Restaurant & Culinary Tour"
  ];

  const isMarathi = language.toLowerCase().startsWith("mr") || language.toLowerCase().includes("marathi");
  const isHindi = language.toLowerCase().startsWith("hi") || language.toLowerCase().includes("hindi");

  const travelModeName = travelMode === "self-drive" ? "Self-Drive Car" : travelMode === "flight" ? "Flight" : travelMode === "train" ? "Scenic Train" : travelMode === "bus" ? "Sleeper Bus" : "Outstation Cab";

  let out = "";
  
  if (isMarathi) {
    out += `🌍 **${location} सहल नियोजन (Travolor Itinerary)**\n`;
    out += `⏱️ कालावधी: ${duration} दिवस | प्रवासाची तारीख: ${travelDate}\n`;
    out += `💰 बजेट श्रेणी: ${travelStyle.toUpperCase()} | एकूण बजेट: ₹${totalCost.toLocaleString('en-IN')}\n\n`;
    out += `🗓️ **दिवसनिहाय नियोजन (Day-by-Day Plan):**\n\n`;
    
    out += `**दिवस ०: प्रवास आणि आगमन (Travel & Arrival)**\n`;
    out += `- **Leave from Departure City**: **${startLocation}** मधून प्रवासाला सुरुवात.\n`;
    out += `- **Travel Details**: **${location}** कडे प्रवास. (साधन: ${travelModeName}, अंदाजे वेळ: ८ तास)\n`;
    out += `- **Estimated Arrival Time**: दुपारी ३:०० वाजता आगमन.\n`;
    out += `- **Hotel Check-in**: हॉटेल चेक-इन आणि थोडी विश्रांती.\n\n`;

    for (let d = 1; d < duration; d++) {
      const morningAttr = attractions[(d * 3 - 3) % attractions.length];
      const afternoonAttr = attractions[(d * 3 - 2) % attractions.length];
      const eveningAttr = attractions[(d * 3 - 1) % attractions.length];
      out += `**दिवस ${d}: ${location} मधील मुख्य आकर्षणे**\n`;
      out += `- **Attractions / Sightseeing**: सकाळी **${morningAttr}** आणि दुपारी **${afternoonAttr}** ला भेट द्या. - ₹${Math.round(baseDailyCost * 0.15)}\n`;
      out += `- **Food / Restaurants**: स्थानिक खानावळीत चवदार जेवणाचा आस्वाद घ्या. - ₹${Math.round(baseDailyCost * 0.25)}\n`;
      out += `- **Activities**: संध्याकाळी **${eveningAttr}** येथे सुंदर सूर्यास्त पहा आणि तिथल्या स्थानिक बाजारात खरेदी करा. - ₹${Math.round(baseDailyCost * 0.2)}\n`;
      out += `- **Local transport / Commute**: ऑटोरिक्षा किंवा स्थानिक टॅक्सीने प्रवास करा.\n\n`;
    }

    out += `**दिवस ${duration} (अंतिम दिवस): चेकआऊट आणि परतीचा प्रवास**\n`;
    out += `- **Hotel Checkout**: सकाळी हॉटेलमधून चेकआऊट करा.\n`;
    out += `- **Return Transport / Journey**: **${location}** मधून **${startLocation}** कडे परतीचा प्रवास.\n`;
    out += `- **Arrival back to Departure City**: **${startLocation}** वर सुरक्षित आगमन.\n\n`;

    out += `💳 **अंदाजे सहल बजेट तपशील (Estimated Trip Budget Breakdown) (एकूण ${numPeople} लोकांसाठी):**\n`;
    out += `- **Transportation**: ₹${Math.round(totalCost * 0.3).toLocaleString('en-IN')}\n`;
    out += `- **Hotels**: ₹${Math.round(totalCost * 0.35).toLocaleString('en-IN')}\n`;
    out += `- **Food**: ₹${Math.round(totalCost * 0.15).toLocaleString('en-IN')}\n`;
    out += `- **Local Transport**: ₹${Math.round(totalCost * 0.1).toLocaleString('en-IN')}\n`;
    out += `- **Activities**: ₹${Math.round(totalCost * 0.1).toLocaleString('en-IN')}\n`;
    out += `- **Total Estimated Cost**: ₹${totalCost.toLocaleString('en-IN')}\n\n`;

    out += `💡 **स्थानिक टिप्स (Travolor Pro-Tips):**\n`;
    out += `- स्थानिक चव नक्की करून पहा आणि सुरक्षित प्रवास करा!\n`;
    out += `- आपल्या सामानाची काळजी घ्या आणि फोटो काढायला विसरू नका.`;
  } else if (isHindi) {
    out += `🌍 **${location} यात्रा योजना (Travolor Itinerary)**\n`;
    out += `⏱️ अवधि: ${duration} दिन | यात्रा तिथि: ${travelDate}\n`;
    out += `💰 बजट श्रेणी: ${travelStyle.toUpperCase()} | कुल बजट: ₹${totalCost.toLocaleString('en-IN')}\n\n`;
    out += `🗓️ **दिन-प्रतिदिन योजना (Day-by-Day Plan):**\n\n`;
    
    out += `**दिन ०: यात्रा और आगमन (Travel & Arrival)**\n`;
    out += `- **Leave from Departure City**: **${startLocation}** से प्रस्थान करें।\n`;
    out += `- **Travel Details**: **${location}** की यात्रा। (साधन: ${travelModeName}, अनुमानित समय: ८ घंटे)\n`;
    out += `- **Estimated Arrival Time**: दोपहर ३:०० बजे आगमन।\n`;
    out += `- **Hotel Check-in**: होटल चेक-इन और विश्राम।\n\n`;

    for (let d = 1; d < duration; d++) {
      const morningAttr = attractions[(d * 3 - 3) % attractions.length];
      const afternoonAttr = attractions[(d * 3 - 2) % attractions.length];
      const eveningAttr = attractions[(d * 3 - 1) % attractions.length];
      out += `**दिन ${d}: ${location} के मुख्य आकर्षण**\n`;
      out += `- **Attractions / Sightseeing**: सुबह **${morningAttr}** और दोपहर को **${afternoonAttr}** का भ्रमण करें। - ₹${Math.round(baseDailyCost * 0.15)}\n`;
      out += `- **Food / Restaurants**: स्थानीय रेस्तरां में स्वादिष्ट भोजन का आनंद लें। - ₹${Math.round(baseDailyCost * 0.25)}\n`;
      out += `- **Activities**: शाम को **${eveningAttr}** पर सुंदर सूर्यास्त देखें और खरीदारी करें। - ₹${Math.round(baseDailyCost * 0.2)}\n`;
      out += `- **Local transport / Commute**: ऑटो-रिक्शा या स्थानीय कैब का उपयोग करें।\n\n`;
    }

    out += `**दिन ${duration} (अंतिम दिन): चेकआउट और वापसी यात्रा**\n`;
    out += `- **Hotel Checkout**: सुबह होटल से चेकआउट करें।\n`;
    out += `- **Return Transport / Journey**: **${location}** से **${startLocation}** के लिए वापसी यात्रा।\n`;
    out += `- **Arrival back to Departure City**: **${startLocation}** पर सुरक्षित वापसी।\n\n`;

    out += `💳 **अनुमानित यात्रा बजट विवरण (Estimated Trip Budget Breakdown) (कुल ${numPeople} लोगों के लिए):**\n`;
    out += `- **Transportation**: ₹${Math.round(totalCost * 0.3).toLocaleString('en-IN')}\n`;
    out += `- **Hotels**: ₹${Math.round(totalCost * 0.35).toLocaleString('en-IN')}\n`;
    out += `- **Food**: ₹${Math.round(totalCost * 0.15).toLocaleString('en-IN')}\n`;
    out += `- **Local Transport**: ₹${Math.round(totalCost * 0.1).toLocaleString('en-IN')}\n`;
    out += `- **Activities**: ₹${Math.round(totalCost * 0.1).toLocaleString('en-IN')}\n`;
    out += `- **Total Estimated Cost**: ₹${totalCost.toLocaleString('en-IN')}\n\n`;

    out += `💡 **ट्रेवलर प्रो-टिप्स (Travolor Pro-Tips):**\n`;
    out += `- स्थानीय व्यंजनों का स्वाद लें और सुरक्षित यात्रा करें!\n`;
    out += `- अपने कैमरा गियर और आवश्यक दवाएं साथ रखना न भूलें।`;
  } else {
    out += `🌍 **${location} Travel Itinerary (Travolor Plan)**\n`;
    out += `⏱️ Duration: ${duration} Days | Travel Date: ${travelDate}\n`;
    out += `💰 Budget Category: ${travelStyle.toUpperCase()} | Target Budget: ₹${totalCost.toLocaleString('en-IN')} INR\n\n`;
    out += `🗓️ **Day-by-Day Plan:**\n\n`;
    
    out += `**Day 0: Travel & Arrival**\n`;
    out += `- **Leave from Departure City**: Depart from **${startLocation}**\n`;
    out += `- **Travel Details**: Travel to **${location}** via ${travelModeName}.\n`;
    out += `- **Estimated Arrival Time**: Check-in at your stay around 3:00 PM.\n`;
    out += `- **Hotel Check-In**: Premium stay matching ${travelStyle} style.\n\n`;

    for (let d = 1; d < duration; d++) {
      const morningAttr = attractions[(d * 3 - 3) % attractions.length];
      const afternoonAttr = attractions[(d * 3 - 2) % attractions.length];
      const eveningAttr = attractions[(d * 3 - 1) % attractions.length];
      out += `**Day ${d}: Discover ${location}**\n`;
      out += `- **Attractions / Sightseeing**: Explore **${morningAttr}** in the morning and **${afternoonAttr}** in the afternoon. - ₹${Math.round(baseDailyCost * 0.15)}\n`;
      out += `- **Food / Restaurants**: Experience signature regional cuisine at highly rated local diners. - ₹${Math.round(baseDailyCost * 0.25)}\n`;
      out += `- **Activities**: Enjoy the serene sunset at **${eveningAttr}** followed by a leisure walk. - ₹${Math.round(baseDailyCost * 0.2)}\n`;
      out += `- **Local transport / Commute**: Best navigated via local rideshares or rental scooters.\n\n`;
    }

    out += `**Day ${duration} (Last Day): Checkout & Return Journey**\n`;
    out += `- **Day ${duration} Checkout**: Complete stay checkout\n`;
    out += `- **Return Transport / Journey**: Leave **${location}** to return to **${startLocation}** via ${travelModeName}.\n`;
    out += `- **Arrival back to Departure City**: Arrive safely back at **${startLocation}**.\n\n`;

    out += `💳 **Estimated Trip Budget Breakdown (for ${numPeople} travelers):**\n`;
    out += `- **Transportation**: ₹${Math.round(totalCost * 0.3).toLocaleString('en-IN')}\n`;
    out += `- **Hotels**: ₹${Math.round(totalCost * 0.35).toLocaleString('en-IN')}\n`;
    out += `- **Food**: ₹${Math.round(totalCost * 0.15).toLocaleString('en-IN')}\n`;
    out += `- **Local Transport**: ₹${Math.round(totalCost * 0.1).toLocaleString('en-IN')}\n`;
    out += `- **Activities**: ₹${Math.round(totalCost * 0.1).toLocaleString('en-IN')}\n`;
    out += `- **Total Estimated Cost**: ₹${totalCost.toLocaleString('en-IN')} INR\n\n`;

    out += `💡 **Travolor Pro-Tips for ${location}:**\n`;
    out += `- Pack comfortable walking shoes as local exploration involves strolls.\n`;
    out += `- Keep a offline map handy and carry local currency for quick transactions.`;
  }

  return out;
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
    console.warn("sendChatMessage fallback warning:", error.message || error);
    return {
      text: "I'm having trouble matching your connection at the moment. Please ensure your Gemini API Key is available in Secrets.",
      grounded: false
    };
  }
}
