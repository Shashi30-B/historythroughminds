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

  const prompt = `You are BHATKANTIMITRA – a smart AI Global Travel Planner.
  Your role is to create a complete, AUTO-BUDGETED travel plan for any destination in the world, including travel options from the user's starting location.
  
  User Details:
  - Starting Location: ${startLocation}
  - Destination: ${location}
  - Duration: ${duration} days
  - Number of People: ${numPeople}
  - Travel Style: ${travelStyle}
  
  ${budgetInstructions}
  ${premiumInstructions}
  
  Language Rule:
  - If the user input is in Marathi or the requested language is Marathi, reply in Marathi.
  - Otherwise, reply in English.
  Current Language: ${language === "mr" ? "Marathi" : "English"}.
  
  AI TASK:
  1. TRAVEL OPTIONS FROM STARTING LOCATION:
     - Generate best travel options from ${startLocation} to ${location}.
     - Include:
       ✈️ Best flight options (estimated time & price)
       🚆 Train options (if applicable)
       🚌 Bus options (if applicable)
       🚗 Self-drive distance and travel time
     - Show:
       - Total travel distance
       - Total travel time
       - Estimated travel cost (add this to the total budget)
       - Best departure time
       - Nearest airport / railway station for both cities.

  2. AUTO-CALCULATE the budget for this trip based on the destination, travel style, and travel costs from ${startLocation}.
  
  3. Provide a structured travel plan with the following sections using Markdown headers:
  
  # 🌍 DESTINATION OVERVIEW
  - Best time to visit for lowest cost
  - Crowd level
  - Weather insight
  - Visa requirement (if international)
  - Currency used
  
  # ✈️ TRAVEL FROM ${startLocation.toUpperCase()} TO ${location.toUpperCase()}
  - Detailed travel options as requested above.
  - Total travel distance: [Distance]
  - Total travel time: [Time]
  - Estimated travel cost: [Amount]
  
  # 💰 BUDGET ESTIMATION (Auto-Calculated)
  - Budget Category: [Budget Trip / Standard Trip / Luxury Trip]
  - Estimated Total Cost: [Amount] (Including travel from ${startLocation})
  - Cost per person: [Amount]
  - Cost per day: [Amount]
  
  ## 📊 Cost Breakdown
  - ✈️ Travel from ${startLocation}: [Amount]
  - 🏨 Hotel cost: [Amount]
  - 🍽 Food cost: [Amount]
  - 🚕 Transport cost: [Amount]
  - 🎟 Activities & entry fees: [Amount]
  - ➕ Buffer amount: [Amount]
  
  # 💡 TRAVEL STRATEGY
  - [If Budget/Backpacking] Savings tips for budget travellers.
  - [If Luxury] Upgrade suggestions for a more premium experience.
  - [General] Optimization tips for this specific destination.
  
  # 🗓 DAY-WISE ITINERARY
  Create a clear plan for each day with:
  - Day 1: MUST mention travel from ${startLocation} to ${location}.
  - Morning, Afternoon, Evening, Night
  - Include: Travel route, estimated distance, and parking availability.
  
  # 📍 TOP ATTRACTIONS & EXPERIENCES
  - Must-visit places in the suggested budget.
  - Hidden gems.
  - Nearby experiences.
  
  # 🍜 FOOD TO TRY
  - Famous local food and best budget-friendly/premium eateries.
  
  # 🏨 HOTEL SUGGESTIONS (Within Budget)
  - Suggest 3 specific hotels that fit the calculated budget for ${numPeople} people.
  
  # 🚆 TRANSPORT GUIDE
  - Best transport options (Local/Intercity).
  
  # 📸 PHOTO SPOTS & 🛍 SHOPPING
  - Instagram-worthy locations.
  - What to buy.
  
  # ⚠️ SMART TRAVEL TIPS
  - Practical tips for this location.
  
  💎 OUTPUT STYLE:
  - Use emojis, headings, and proper spacing.
  - Use cards/tables for budget breakdown if possible.
  - Keep it structured and easy to read.`;

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
