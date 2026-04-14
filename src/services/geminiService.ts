import { GoogleGenAI, Type } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it to your environment variables.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export interface ItineraryRequest {
  location: string;
  startLocation: string;
  duration: number;
  numPeople: number;
  travelStyle: string;
  language?: string;
}

export async function getSuggestions(letter: string) {
  const ai = getGenAI();
  const prompt = `You are a premium Travel Planner AI autocomplete engine.
  The user typed the letter: "${letter}".
  List 5-10 top travel destinations starting with this letter.
  Format: "Suggested Destinations starting with ${letter}: City1, City2, City3, ..."
  Keep it professional and high-end.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return "";
  }
}

export async function generateItinerary(request: ItineraryRequest) {
  const { location, startLocation, duration, numPeople, travelStyle, language = "en" } = request;
  const ai = getGenAI();

  const prompt = `You are a premium Travel Planner AI. Your interface style is inspired by MakeMyTrip, using a Navy Blue (#000080) and White professional theme.

  User Details:
  - Starting Location: ${startLocation}
  - Destination: ${location}
  - Duration: ${duration} days
  - Number of People: ${numPeople}
  - Travel Style: ${travelStyle}
  
  Language Rule:
  - Tone: Professional, minimalist, and luxury-focused.
  - Respond in a natural Hinglish (Hindi-English) or Marathi-English mix as requested by the user.
  - Keep technical terms in English for a premium feel.
  - Current Language: ${language === "mr" ? "Marathi-English Mix" : "Hinglish"}.

  UI & CONTENT RULES:
  1. NO GENERIC CONTENT: Do not show "Trending Destinations", "Inspiration", or "Special Deals" unless explicitly asked. Focus only on the trip requested by the user.
  2. NAVY BLUE THEME FOCUS: Present information in a way that suits a dark navy blue UI. Use bold white text for headers and clear lists.
  3. BUTTON DESIGN: Assume the 'Start Journey' button is a "Gradient Royal Blue" color.
  4. HYPER-LOCAL: For Maharashtra trips, suggest specific local spots and food.
  5. NO FLUFF: Keep the response clean, professional, and direct. Use professional icons like ✈️, 🏨, 🍴.

  STRUCTURE:
  - # 🌍 Trip Overview
    - Destination: **${location}**
    - Duration: **${duration} Days**
    - Style: **${travelStyle}**

  - # ✈️ Flights
    | Airline | Departure | Arrival | Price | Link |
    |---------|-----------|---------|-------|------|
    | [Airline Name] | [Time] | [Time] | [Price] | [Book](https://www.skyscanner.com/transport/flights/${startLocation}/${location}) |

  - # 🏨 Hotels
    | Category | Hotel Name | Rating | USP | Link |
    |----------|------------|--------|-----|------|
    | Budget | [Name] | [Rating] | [USP] | [Book](https://www.booking.com/searchresults.html?ss=${location}) |
    | Mid-range | [Name] | [Rating] | [USP] | [Book](https://www.booking.com/searchresults.html?ss=${location}) |
    | Luxury | [Name] | [Rating] | [USP] | [Book](https://www.booking.com/searchresults.html?ss=${location}) |

  - # 🗓 Day-by-Day Itinerary
    | Day | Time | Activity | Local Food |
    |-----|------|----------|------------|
    | Day 1 | Morning | [Activity] | [Dish] |
    | Day 1 | Afternoon | [Activity] | [Dish] |
    | Day 1 | Evening | [Activity] | [Dish] |

  - # 💰 Total Cost Estimate
    | Category | Estimated Cost |
    |----------|----------------|
    | Flights | [Amount] |
    | Hotels | [Amount] |
    | Food | [Amount] |
    | Activities | [Amount] |
    | **Total** | **[Total Amount]** |

  💎 OUTPUT STYLE:
  - Use **Markdown tables** for itineraries, flights, and hotels.
  - Use **bold headers** for sections.
  - Professional icons only.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Sorry, I couldn't generate the plan.";
  } catch (error) {
    console.error("Error generating itinerary:", error);
    return "Something went wrong. Please try again.";
  }
}
