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
        grounded: data.grounded
      };
    }
  } catch (error) {
    console.warn("Server-side generateItinerary not available, falling back to client-side. Error:", error);
  }

  // Fallback to client-side API
  const { location, startLocation, duration, numPeople, travelStyle, language = "en" } = request;
  
  try {
    const ai = getGenAI();
    const prompt = `You are an expert AI Travel Planner for "Travolor". Your goal is to generate highly practical, exciting, and easy-to-read travel itineraries based on the user's input.

Do not use JSON. Output the response in beautifully formatted Markdown (plain text) using headings, bullet points, and bold text.

User Request Details:
- Starting Location: ${startLocation}
- Destination: ${location}
- Duration: ${duration} Days
- Travel Style / Budget Category: ${travelStyle} (e.g. Budget, Moderate, Luxury)
- Number of Travelers: ${numPeople}
- Language Preference: Please write the entire response and itinerary ONLY in the ${language} language. Write all headings, descriptions, tip titles, and day names in ${language}.

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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return { text: response.text || "Sorry, I couldn't generate the plan." };
  } catch (error: any) {
    console.warn("Client-side generateItinerary fallback warning:", error.message || error);
    return { text: "Something went wrong. Please try again." };
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
    console.warn("sendChatMessage fallback warning:", error.message || error);
    return {
      text: "I'm having trouble matching your connection at the moment. Please ensure your Gemini API Key is available in Secrets.",
      grounded: false
    };
  }
}
