import { GoogleGenAI } from "@google/genai";

// Use VITE_ prefix for client-side environment variables in Vite
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

export interface ItineraryRequest {
  location: string;
  startLocation: string;
  duration: number;
  numPeople: number;
  travelStyle: string;
  language?: string;
  budgetData?: any;
  isPremium?: boolean;
}

const FALLBACK_ITINERARY = `
# 🌍 DESTINATION OVERVIEW
- Best time to visit: October to March
- Crowd level: Moderate
- Weather: Pleasant (20°C - 28°C)
- Visa: Check local requirements
- Currency: Local Currency

# 💰 BUDGET ESTIMATION (Estimated)
- Budget Category: Standard Trip
- Estimated Total Cost: ₹25,000 - ₹40,000
- Cost per person: ₹12,500
- Cost per day: ₹4,000

# 🗓 DAY-WISE ITINERARY
- Day 1: Arrival and Local Sightseeing. Explore the city center and enjoy local cuisine.
- Day 2: Visit top landmarks and historical sites.
- Day 3: Leisure day, shopping, and departure.

# ⚠️ SMART TRAVEL TIPS
- Book in advance for better rates.
- Use local transport for an authentic experience.
- Keep a digital copy of your documents.
`;

export async function generateItinerary(request: ItineraryRequest) {
  const { location, startLocation, duration, numPeople, travelStyle, language = "en", budgetData, isPremium = false } = request;

  if (!apiKey) {
    console.error("Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your environment.");
    return FALLBACK_ITINERARY;
  }

  const ai = new GoogleGenAI({ apiKey });

  let budgetInstructions = "";
  if (budgetData) {
    budgetInstructions = `
    CRITICAL: For the budget section, you MUST use the following pre-calculated data to ensure consistency:
    - Total Trip Cost: ${budgetData.totalCost}
    - Travel Cost from ${startLocation}: ${budgetData.travelCost}
    - Hotel Cost: ${budgetData.hotelCost}
    - Food Cost: ${budgetData.foodCost}
    - Local Transport Cost: ${budgetData.localTransport}
    - Distance: ${budgetData.distance} km
    - Duration: ${budgetData.tripDays} days
    - Travelers: ${budgetData.travelers}
    Do not recalculate these values. Use them exactly as provided.
    `;
  }

  const premiumInstructions = isPremium 
    ? "The user is a PREMIUM member. Provide a full, detailed, and comprehensive itinerary with all sections."
    : "The user is a FREE member. Provide a BRIEF overview and the first 2 days of the itinerary ONLY. At the end, add a note: '[PREMIUM_ONLY] Upgrade to unlock the full day-wise plan, hidden gems, and local secrets.'";

  const prompt = `You are a professional travel planner.
  Create a COMPLETE and VERY DETAILED travel itinerary.

  Trip Details:
  From: ${startLocation}
  To: ${location}
  Days: ${duration}
  Travelers: ${numPeople}
  Travel Style: ${travelStyle}

  ${budgetInstructions}
  ${premiumInstructions}

  IMPORTANT INSTRUCTIONS:
  - Give VERY detailed output (minimum 1200 words if premium)
  - Do NOT give short summary
  - Write in structured format with headings
  - Include all details clearly
  - Language Rule: If the user input is in Marathi or the requested language is Marathi, reply in Marathi. Otherwise, reply in English. Current Language: ${language === "mr" ? "Marathi" : "English"}.

  FORMAT:

  # 🌍 Overview of the trip
  Provide a comprehensive overview of the destination, best time to visit, and what to expect.

  # 🗓 Day-wise detailed itinerary
  - Detailed plan for each day (Morning, Afternoon, Evening)
  - Exact places to visit with descriptions
  - MUST mention travel from ${startLocation} to ${location} on Day 1.

  # 🚆 Transport
  - Flight, Train, Bus options from ${startLocation} to ${location}
  - Time + price estimate for each
  - Nearest airport / railway station for both cities.

  # 🏨 Hotels
  - Budget, Standard, and Luxury suggestions
  - Specific area suggestions for staying

  # 🍜 Food
  - Famous local dishes
  - Best places to eat (budget-friendly and premium)

  # 💎 Hidden gems
  - Less crowded places
  - Unique local experiences

  # 💰 Budget breakdown
  - Travel cost
  - Hotel cost
  - Food cost
  - Local transport
  - Total estimate (Use the pre-calculated values if provided in instructions)

  # ⚠️ Travel tips
  - Practical advice, safety tips, and cultural etiquette.

  Make it detailed like a professional travel guide. Use emojis and clear Markdown formatting.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini API");
    }

    return response.text;
  } catch (error: any) {
    console.error("Error generating itinerary:", error);
    
    // Check for specific error types if needed
    if (error.message?.includes("expired") || error.status === 400) {
      console.warn("Gemini API key might be expired or invalid. Using fallback.");
    }

    return FALLBACK_ITINERARY;
  }
}

export async function getChatResponse(message: string, history: { role: string; text: string }[], location?: string) {
  if (!apiKey) return "I'm sorry, but I'm having trouble connecting to my brain right now. Please try again later.";

  const ai = new GoogleGenAI({ apiKey });
  const context = location ? `The user is currently planning a trip to ${location}. ` : "";
  
  const prompt = `You are Travolor AI, a helpful travel assistant. ${context}
  Answer the user's question concisely and helpfully.
  
  Chat History:
  ${history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n')}
  
  User: ${message}
  Assistant:`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "I'm not sure how to answer that. Could you rephrase?";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Oops! Something went wrong. Let's try that again.";
  }
}
