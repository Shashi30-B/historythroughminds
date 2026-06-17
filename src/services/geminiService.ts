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
      model: "gemini-3.5-flash",
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

  const prompt = `You are an expert AI Travel Planner for "Travolor". Your goal is to generate highly practical, exciting, and easy-to-read travel itineraries based on the user's input.

Do not use JSON. Output the response in beautifully formatted Markdown (plain text) using headings, bullet points, and bold text.

User Request Details:
- Starting Location: ${startLocation}
- Destination: ${location}
- Duration: ${duration} Days
- Travel Style / Budget Category: ${travelStyle} (e.g. Budget, Moderate, Luxury)
- Number of Travelers: ${numPeople}
- Language Preference: ${language === "mr" ? "Marathi-English Mix/Marathi" : "Hinglish/English"}

Follow this exact structure for every response:

🌍 [Destination Name] Travel Itinerary
⏱️ Duration: [Number of days]
💰 Budget Category: [Budget/Moderate/Luxury] | Approx Cost: [Amount in INR]

🗓️ Day-by-Day Plan:

Day 1: [Theme/Title of the Day]

Morning: [Activity name and short description] - [Approx Cost]

Afternoon: [Activity name and short description] - [Approx Cost]

Evening: [Activity name and short description] - [Approx Cost]

🚕 Transport Tip: [How to get around for the day]

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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return response.text || "Sorry, I couldn't generate the plan.";
  } catch (error) {
    console.error("Error generating itinerary:", error);
    return "Something went wrong. Please try again.";
  }
}

export interface Attraction {
  name: string;
  rating: number;
  description: string;
}

export async function getTopAttractions(destination: string): Promise<Attraction[]> {
  const ai = getGenAI();
  const prompt = `You are a professional travel assistant for "Travolor".
  For the destination: "${destination}", identify 5 top-rated attractions/places to visit.
  Return a valid JSON array of objects conforming to the schema:
  [
    {
      "name": "Attraction Name",
      "rating": 4.8,
      "description": "Short description of what makes it special and why it's top-rated."
    }
  ]
  Respond ONLY with the JSON array, no commentary, no markdown formatting blocks, no extra text.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    const text = response.text || "";
    // Clean potential markdown blocks
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedText) as Attraction[];
  } catch (error) {
    console.error("Error getting top attractions:", error);
    return [];
  }
}


