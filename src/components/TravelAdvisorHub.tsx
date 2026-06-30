import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, Star, ThumbsUp, Heart, Bookmark, Share2, Plus, Plane, Search, 
  Compass, Shield, Users, Trophy, DollarSign, CloudSun, Calendar, 
  TrendingUp, Sparkles, Map as MapIcon, Bell, ArrowRight, Loader, 
  Hotel, Coffee, Landmark, Eye, Info
} from "lucide-react";
import { GoogleMap, MarkerF, InfoWindowF } from "@react-google-maps/api";

interface UserType {
  id: string;
  name: string;
  email: string;
  photo?: string;
  phone?: string;
  totalBudget?: number;
}

interface TravelAdvisorHubProps {
  user: UserType | null;
  isLoaded?: boolean;
}

// Predefined popular search values to make it easy to play around
const POPULAR_HOTELS = [
  "The Taj Mahal Palace, Mumbai",
  "The Oberoi Amarvilas, Agra",
  "Taj Lake Palace, Udaipur",
  "The Leela Palace, Bengaluru",
  "Grand Hyatt, Goa"
];

const POPULAR_CITIES = [
  "Goa",
  "Jaipur",
  "Agra",
  "Munnar",
  "Shimla",
  "Manali",
  "Mumbai",
  "Delhi"
];

interface TravelStory {
  id: number;
  user_id: string;
  user_name: string;
  user_photo: string;
  title: string;
  location: string;
  photo_url: string;
  experience: string;
  likes_count: number;
  saved_by_users: string[];
  created_at: string;
}

export default function TravelAdvisorHub({ user, isLoaded }: TravelAdvisorHubProps) {
  const [activeTab, setActiveTab] = useState<"advisor" | "skyscanner" | "copilot" | "stories">("advisor");
  
  // Loading states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Hotel Review Summary State
  const [hotelSearch, setHotelSearch] = useState<string>("The Taj Mahal Palace, Mumbai");
  const [hotelSummary, setHotelSummary] = useState<{
    overallSentiment: string;
    bestFor: string;
    pros: string[];
    cons: string[];
  } | null>(null);

  // 2. Attraction Review State
  const [attractionDest, setAttractionDest] = useState<string>("Jaipur");
  const [attractionsData, setAttractionsData] = useState<{
    attractions: { name: string; rating: number; description: string }[];
    aiSummary: string;
  } | null>(null);

  // 3. Restaurant Discovery State
  const [restDest, setRestDest] = useState<string>("Goa");
  const [restBudget, setRestBudget] = useState<string>("Mid-Range");
  const [restStyle, setRestStyle] = useState<string>("Couple Retreat");
  const [restaurantsData, setRestaurantsData] = useState<{
    topRestaurants: { name: string; cuisine: string; budget: string; rating: number; highlight: string }[];
    localFoodRecommendations: { dish: string; description: string; bestPlace: string }[];
    aiFoodSuggestions: string;
  } | null>(null);

  // 4. Travel Stories State
  const [stories, setStories] = useState<TravelStory[]>([]);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryLocation, setNewStoryLocation] = useState("");
  const [newStoryExperience, setNewStoryExperience] = useState("");
  const [newStoryPhoto, setNewStoryPhoto] = useState("");
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  // 5. Near Me Explorer State
  const [nearMeCategory, setNearMeCategory] = useState<"attractions" | "restaurants" | "cafes" | "temples" | "museums">("attractions");
  const [mapCenter, setMapCenter] = useState({ lat: 15.2993, lng: 74.1240 }); // Default Goa
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  
  // Prebaked Near Me Spots
  const NEAR_ME_SPOTS: Record<string, Array<{ name: string; lat: number; lng: number; rating: number; address: string; hours: string }>> = {
    attractions: [
      { name: "Baga Beach Shoreline", lat: 15.5539, lng: 73.7550, rating: 4.7, address: "Baga, Goa, India", hours: "Open 24 hours" },
      { name: "Fort Aguada Heritage Castle", lat: 15.4926, lng: 73.7736, rating: 4.6, address: "Candolim, Goa, India", hours: "9:30 AM - 6:00 PM" },
      { name: "Basilica of Bom Jesus", lat: 15.5009, lng: 73.9116, rating: 4.8, address: "Old Goa, India", hours: "9:00 AM - 6:30 PM" }
    ],
    restaurants: [
      { name: "The Fisherman's Wharf", lat: 15.5612, lng: 73.7645, rating: 4.6, address: "Calangute, Goa", hours: "12:00 PM - 11:00 PM" },
      { name: "Curlies Beach Shack", lat: 15.5442, lng: 73.7508, rating: 4.4, address: "Anjuna Beach, Goa", hours: "8:30 AM - 3:00 AM" }
    ],
    cafes: [
      { name: "Artjuna Cafe & Lifestyle", lat: 15.5815, lng: 73.7420, rating: 4.5, address: "Anjuna, Goa", hours: "7:30 AM - 10:00 PM" },
      { name: "Eva Cafe", lat: 15.5940, lng: 73.7330, rating: 4.6, address: "Anjuna Cliff, Goa", hours: "9:00 AM - 8:00 PM" }
    ],
    temples: [
      { name: "Mangueshi Temple", lat: 15.4437, lng: 73.9681, rating: 4.8, address: "Priol, Ponda, Goa", hours: "6:00 AM - 10:00 PM" },
      { name: "Shanta Durga Temple", lat: 15.4243, lng: 73.9214, rating: 4.7, address: "Kavalem, Goa", hours: "7:00 AM - 9:30 PM" }
    ],
    museums: [
      { name: "Museum of Christian Art", lat: 15.5022, lng: 73.9130, rating: 4.5, address: "Old Goa, India", hours: "9:30 AM - 5:00 PM" },
      { name: "Big Foot Goa Heritage Museum", lat: 15.3421, lng: 73.9875, rating: 4.3, address: "Loutolim, Goa", hours: "9:00 AM - 6:00 PM" }
    ]
  };

  // 6. Flight Comparison State
  const [flightFrom, setFlightFrom] = useState("Delhi");
  const [flightTo, setFlightTo] = useState("Mumbai");
  const [flightComparisonData, setFlightComparisonData] = useState<any | null>(null);

  // 7. Flight Price Alerts State
  const [alertDest, setAlertDest] = useState("Goa");
  const [alertDate, setAlertDate] = useState("2026-12-15");
  const [priceAlerts, setPriceAlerts] = useState<Array<{ id: number; dest: string; date: string; basePrice: number; tracking: boolean }>>([
    { id: 1, dest: "Paris", date: "2026-10-10", basePrice: 42000, tracking: true },
    { id: 2, dest: "Tokyo", date: "2026-11-20", basePrice: 51000, tracking: true }
  ]);

  // 8. Explore Anywhere State
  const [exploreBudget, setExploreBudget] = useState<number>(30000);
  const [exploreDays, setExploreDays] = useState<number>(4);
  const [exploreCity, setExploreCity] = useState<string>("Mumbai");
  const [exploreAnywhereData, setExploreAnywhereData] = useState<any | null>(null);

  // 9. Cheapest Month Predictor State
  const [cheapestDest, setCheapestDest] = useState("Goa");
  const [cheapestMonthData, setCheapestMonthData] = useState<any | null>(null);

  // 10. Destination Ranking State
  const [rankingFilter, setRankingFilter] = useState("Most Budget Friendly");
  const [rankingData, setRankingData] = useState<any | null>(null);

  // 11. Destination Comparison State
  const [compareDestA, setCompareDestA] = useState("Goa");
  const [compareDestB, setCompareDestB] = useState("Munnar");
  const [comparisonData, setComparisonData] = useState<any | null>(null);

  // 12. AI Travel Recommendation State
  const [recHistory, setRecHistory] = useState("Visited Goa and Jaipur");
  const [recStyle, setRecStyle] = useState("Adventure & Local Culture");
  const [recBudget, setRecBudget] = useState("₹25,000 - ₹50,000");
  const [recSeason, setRecSeason] = useState("Winter (Nov - Feb)");
  const [recommendationData, setRecommendationData] = useState<any | null>(null);

  // Initialize data
  useEffect(() => {
    fetchStories();
    // Pre-populate with first actions
    handleGetHotelSummary();
    handleGetAttractions();
    handleGetRestaurants();
    handleGetFlightComparison();
    handleGetExploreAnywhere();
    handleGetCheapestMonth();
    handleGetRankings();
    handleGetComparison();
    handleGetRecommendations();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch("/api/stories");
      if (res.ok) {
        const data = await res.json();
        setStories(data);
      }
    } catch (e) {
      console.error("Stories fetch failed:", e);
    }
  };

  const handleActionCall = async (action: string, payload: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gemini/travel-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload })
      });
      if (!res.ok) throw new Error("API call failed");
      const data = await res.json();
      setLoading(false);
      return data;
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch AI insights. Please try again.");
      setLoading(false);
      return null;
    }
  };

  // Action Triggers
  const handleGetHotelSummary = async () => {
    const data = await handleActionCall("hotel-reviews", { hotelName: hotelSearch });
    if (data) setHotelSummary(data);
  };

  const handleGetAttractions = async () => {
    const data = await handleActionCall("attraction-reviews", { destination: attractionDest });
    if (data) setAttractionsData(data);
  };

  const handleGetRestaurants = async () => {
    const data = await handleActionCall("restaurant-discovery", { 
      destination: restDest, 
      budget: restBudget, 
      style: restStyle 
    });
    if (data) setRestaurantsData(data);
  };

  const handleGetFlightComparison = async () => {
    const data = await handleActionCall("flight-comparison", { from: flightFrom, to: flightTo });
    if (data) setFlightComparisonData(data);
  };

  const handleGetExploreAnywhere = async () => {
    const data = await handleActionCall("explore-anywhere", { 
      budget: exploreBudget, 
      days: exploreDays, 
      departureCity: exploreCity 
    });
    if (data) setExploreAnywhereData(data);
  };

  const handleGetCheapestMonth = async () => {
    const data = await handleActionCall("cheapest-month", { destination: cheapestDest });
    if (data) setCheapestMonthData(data);
  };

  const handleGetRankings = async () => {
    const data = await handleActionCall("destination-ranking", { preferences: rankingFilter });
    if (data) setRankingData(data);
  };

  const handleGetComparison = async () => {
    const data = await handleActionCall("destination-comparison", { destA: compareDestA, destB: compareDestB });
    if (data) setComparisonData(data);
  };

  const handleGetRecommendations = async () => {
    const data = await handleActionCall("personalized-recommendation", {
      history: recHistory,
      style: recStyle,
      budget: recBudget,
      season: recSeason
    });
    if (data) setRecommendationData(data);
  };

  // Story Interactions
  const handleCreateStory = async () => {
    if (!newStoryTitle || !newStoryExperience) return;
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id || "guest_user",
          user_name: user?.name || "Anonymous Traveler",
          user_photo: user?.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
          title: newStoryTitle,
          location: newStoryLocation || "Global Spot",
          photo_url: newStoryPhoto || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80",
          experience: newStoryExperience
        })
      });
      if (res.ok) {
        setNewStoryTitle("");
        setNewStoryLocation("");
        setNewStoryExperience("");
        setNewStoryPhoto("");
        setStoryModalOpen(false);
        fetchStories();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLikeStory = async (id: number) => {
    try {
      const res = await fetch(`/api/stories/like/${id}`, { method: "POST" });
      if (res.ok) {
        fetchStories();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveStory = async (id: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/stories/save/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        fetchStories();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add virtual Alert
  const handleAddAlert = () => {
    const newAlert = {
      id: Date.now(),
      dest: alertDest,
      date: alertDate,
      basePrice: Math.floor(Math.random() * 8000) + 4000,
      tracking: true
    };
    setPriceAlerts([newAlert, ...priceAlerts]);
  };

  const toggleAlertTracking = (id: number) => {
    setPriceAlerts(priceAlerts.map(a => a.id === id ? { ...a, tracking: !a.tracking } : a));
  };

  return (
    <div className="space-y-8 text-[#000080] text-left">
      {/* Sub tabs specifically for TripAdvisor/Skyscanner suites */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 border-b border-gray-100 pb-4">
        {[
          { id: "advisor", label: "🦉 TripAdvisor Explorer", desc: "Reviews, Attractions, Restaurants" },
          { id: "skyscanner", label: "✈️ Skyscanner Comparison", desc: "Flights, Price Alerts, Predictors" },
          { id: "copilot", label: "🤖 AI Specials & Maps", desc: "Comparison, Rankings, Near Me" },
          { id: "stories", label: "📸 Travel Stories", desc: "User Community Feed" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3.5 rounded-2xl text-xs font-black transition-all flex flex-col items-start gap-0.5 cursor-pointer border ${
              activeTab === tab.id
                ? "bg-[#000080] text-white border-[#000080] shadow-md shadow-blue-900/15"
                : "bg-white border-gray-100 text-[#000080]/70 hover:bg-gray-50 hover:border-gray-200"
            }`}
          >
            <span className="text-sm">{tab.label}</span>
            <span className={`text-[10px] font-semibold ${activeTab === tab.id ? "text-sky-200" : "text-gray-400"}`}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-xs font-bold text-[#1E90FF]">
          <Loader size={16} className="animate-spin text-[#1E90FF]" />
          <span>Consulting Travel Co-Pilot database...</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl p-4 text-xs font-semibold">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* =====================================
            TAB 1: TRIPADVISOR EXPLORER
            ===================================== */}
        {activeTab === "advisor" && (
          <motion.div
            key="advisor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* 1. AI Review Summary for Hotels */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest">
                    <Hotel size={14} /> AI Hotel Review Summaries
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-[#000080]">Instantly Summarize Hotel Guest Reviews</h3>
                  <p className="text-xs text-gray-500 font-semibold">Gemini extracts core highlights, pros, and cons so you don't read long review lists.</p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {POPULAR_HOTELS.map((p) => (
                    <button 
                      key={p} 
                      onClick={() => { setHotelSearch(p); setTimeout(handleGetHotelSummary, 100); }}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all cursor-pointer"
                    >
                      {p.split(",")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 max-w-xl">
                <input
                  type="text"
                  value={hotelSearch}
                  onChange={(e) => setHotelSearch(e.target.value)}
                  placeholder="Enter hotel name (e.g. Taj Lake Palace)..."
                  className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[#1E90FF] focus:bg-white w-full transition-all"
                />
                <button
                  onClick={handleGetHotelSummary}
                  className="bg-[#000080] hover:bg-blue-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-3 rounded-2xl transition-all shrink-0 cursor-pointer"
                >
                  Analyze
                </button>
              </div>

              {hotelSummary && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#F8FAFC] border border-gray-100 rounded-3xl p-6 space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">AI Review Summary</span>
                      <h4 className="text-base font-black text-[#000080]">{hotelSearch}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[10px] px-3 py-1 rounded-full uppercase">
                        Sentiment: {hotelSummary.overallSentiment}
                      </span>
                      <span className="bg-blue-50 text-[#1E90FF] border border-blue-100 font-black text-[10px] px-3 py-1 rounded-full uppercase">
                        Best For: {hotelSummary.bestFor}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-emerald-50 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Core Pros
                      </div>
                      <ul className="space-y-2">
                        {hotelSummary.pros.map((p, idx) => (
                          <li key={idx} className="text-xs text-gray-600 font-semibold flex items-start gap-2 leading-relaxed">
                            <span className="text-emerald-500">✔</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white border border-amber-50 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase">
                        <span className="w-2 h-2 bg-amber-500 rounded-full" /> Guest Cons & Flags
                      </div>
                      <ul className="space-y-2">
                        {hotelSummary.cons.map((c, idx) => (
                          <li key={idx} className="text-xs text-gray-600 font-semibold flex items-start gap-2 leading-relaxed">
                            <span className="text-amber-500">⚠</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* 2. Destination Attraction Reviews */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest">
                  <Compass size={14} /> Attraction Reviews & AI Summaries
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#000080]">Top Sights & AI Ratings Summary</h3>
                <p className="text-xs text-gray-500 font-semibold">Select or search any destination to fetch major local attractions, their ratings, and overall custom summaries.</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CITIES.map((c) => (
                  <button 
                    key={c}
                    onClick={() => { setAttractionDest(c); setTimeout(handleGetAttractions, 100); }}
                    className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 cursor-pointer"
                  >
                    📍 {c}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 max-w-xl">
                <input
                  type="text"
                  value={attractionDest}
                  onChange={(e) => setAttractionDest(e.target.value)}
                  placeholder="Enter city (e.g. Munnar)..."
                  className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[#1E90FF] focus:bg-white w-full transition-all"
                />
                <button
                  onClick={handleGetAttractions}
                  className="bg-[#000080] hover:bg-blue-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-3 rounded-2xl transition-all shrink-0 cursor-pointer"
                >
                  Discover Sights
                </button>
              </div>

              {attractionsData && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex gap-4 text-left">
                    <Sparkles className="text-[#1E90FF] shrink-0" size={20} />
                    <div className="space-y-1">
                      <h5 className="font-bold text-xs text-[#000080] uppercase tracking-widest">AI Destination Summary</h5>
                      <p className="text-xs font-semibold text-gray-700 leading-relaxed">{attractionsData.aiSummary}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attractionsData.attractions?.map((a, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-100 p-5 rounded-3xl space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h6 className="font-bold text-sm text-[#000080] line-clamp-1">{a.name}</h6>
                          <div className="flex items-center gap-1 text-amber-500 font-extrabold text-xs bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            <span>{a.rating}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 font-medium line-clamp-3 leading-relaxed">{a.description}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* 3. Restaurant Discovery */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest">
                  <Coffee size={14} /> AI Food & Restaurant Discovery
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#000080]">Local Cuisines, Best Spots, and AI Advice</h3>
                <p className="text-xs text-gray-500 font-semibold">Personalized culinary maps generated based on budget level and travel style.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Destination City</label>
                  <input
                    type="text"
                    value={restDest}
                    onChange={(e) => setRestDest(e.target.value)}
                    placeholder="Enter city (e.g. Goa)..."
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#1E90FF] focus:bg-white w-full transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Budget Tier</label>
                  <select
                    value={restBudget}
                    onChange={(e) => setRestBudget(e.target.value)}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none w-full transition-all"
                  >
                    <option value="Budget-Friendly">Budget Friendly ($)</option>
                    <option value="Mid-Range">Mid Range ($$)</option>
                    <option value="Premium Luxury">Premium Luxury ($$$)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Travel Style</label>
                  <select
                    value={restStyle}
                    onChange={(e) => setRestStyle(e.target.value)}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none w-full transition-all"
                  >
                    <option value="Solo Explorer">Solo Explorer</option>
                    <option value="Couple Retreat">Couple Retreat</option>
                    <option value="Family Vacation">Family Vacation</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGetRestaurants}
                className="bg-[#000080] hover:bg-blue-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-3 rounded-2xl transition-all cursor-pointer"
              >
                Discover Culinary Gems
              </button>

              {restaurantsData && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 flex gap-4 text-left">
                    <Coffee className="text-amber-500 shrink-0" size={20} />
                    <div className="space-y-1">
                      <h5 className="font-bold text-xs text-amber-800 uppercase tracking-widest">AI Culinary Suggestions</h5>
                      <p className="text-xs font-semibold text-gray-700 leading-relaxed">{restaurantsData.aiFoodSuggestions}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Restaurants */}
                    <div className="space-y-3">
                      <h5 className="font-bold text-xs uppercase tracking-widest text-[#000080]">Recommended Restaurants</h5>
                      <div className="space-y-3">
                        {restaurantsData.topRestaurants?.map((r, idx) => (
                          <div key={idx} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h6 className="font-bold text-xs text-[#000080]">{r.name}</h6>
                              <p className="text-[11px] text-gray-500 font-semibold">{r.cuisine} • <span className="text-emerald-600 font-bold">{r.budget}</span></p>
                              <p className="text-[11px] text-gray-400 font-medium italic">"{r.highlight}"</p>
                            </div>
                            <div className="flex items-center gap-1 text-amber-500 font-extrabold text-[10px] bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">
                              <Star size={10} className="fill-amber-400 text-amber-400" />
                              <span>{r.rating}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Local Foods */}
                    <div className="space-y-3">
                      <h5 className="font-bold text-xs uppercase tracking-widest text-[#000080]">Local Dishes You Must Try</h5>
                      <div className="space-y-3">
                        {restaurantsData.localFoodRecommendations?.map((lf, idx) => (
                          <div key={idx} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <h6 className="font-bold text-xs text-[#000080]">{lf.dish}</h6>
                              <span className="text-[10px] bg-blue-50 text-[#1E90FF] border border-blue-100 px-2 py-0.5 rounded-lg font-bold">Best Spot: {lf.bestPlace}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">{lf.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* =====================================
            TAB 2: SKYSCANNER COMPARISON
            ===================================== */}
        {activeTab === "skyscanner" && (
          <motion.div
            key="skyscanner"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* 6. Flight Comparison */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#1E90FF] font-black text-xs uppercase tracking-widest">
                  <Plane size={14} /> Flight Pricing Engine (Skyscanner Inspired)
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#000080]">Compare Price, Duration, and Stops</h3>
                <p className="text-xs text-gray-500 font-semibold">Calculates dynamic route flight pricing, identifying the Cheapest, Fastest, and Best Value options.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Departure City</label>
                  <input
                    type="text"
                    value={flightFrom}
                    onChange={(e) => setFlightFrom(e.target.value)}
                    placeholder="E.g. Delhi (DEL)"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#1E90FF] focus:bg-white w-full transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Arrival Destination</label>
                  <input
                    type="text"
                    value={flightTo}
                    onChange={(e) => setFlightTo(e.target.value)}
                    placeholder="E.g. Goa (GOI)"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#1E90FF] focus:bg-white w-full transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleGetFlightComparison}
                className="bg-[#000080] hover:bg-blue-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-3 rounded-2xl transition-all cursor-pointer"
              >
                Compare Flights
              </button>

              {flightComparisonData && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Cheapest */}
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-5 space-y-3 relative overflow-hidden">
                      <span className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">Cheapest</span>
                      <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-widest">Lowest Fare</span>
                      <h4 className="text-2xl font-black text-emerald-600">₹{flightComparisonData.cheapest?.price}</h4>
                      <div className="text-xs text-gray-600 font-semibold space-y-1 pt-1">
                        <p>✈ Airline: {flightComparisonData.cheapest?.airline}</p>
                        <p>⏱ Duration: {flightComparisonData.cheapest?.duration}</p>
                        <p>🛑 Stops: {flightComparisonData.cheapest?.stops === 0 ? "Non-stop" : `${flightComparisonData.cheapest?.stops} stop`}</p>
                      </div>
                    </div>

                    {/* Fastest */}
                    <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-5 space-y-3 relative overflow-hidden">
                      <span className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">Fastest</span>
                      <span className="text-[10px] text-amber-800 font-bold uppercase tracking-widest">Saves Time</span>
                      <h4 className="text-2xl font-black text-amber-600">₹{flightComparisonData.fastest?.price}</h4>
                      <div className="text-xs text-gray-600 font-semibold space-y-1 pt-1">
                        <p>✈ Airline: {flightComparisonData.fastest?.airline}</p>
                        <p>⏱ Duration: {flightComparisonData.fastest?.duration}</p>
                        <p>🛑 Stops: {flightComparisonData.fastest?.stops === 0 ? "Non-stop" : `${flightComparisonData.fastest?.stops} stop`}</p>
                      </div>
                    </div>

                    {/* Best Value */}
                    <div className="bg-purple-50/50 border border-purple-100 rounded-3xl p-5 space-y-3 relative overflow-hidden">
                      <span className="absolute top-0 right-0 bg-purple-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">Best Value</span>
                      <span className="text-[10px] text-purple-800 font-bold uppercase tracking-widest">Most Preferred</span>
                      <h4 className="text-2xl font-black text-purple-600">₹{flightComparisonData.bestValue?.price}</h4>
                      <div className="text-xs text-gray-600 font-semibold space-y-1 pt-1">
                        <p>✈ Airline: {flightComparisonData.bestValue?.airline}</p>
                        <p>⏱ Duration: {flightComparisonData.bestValue?.duration}</p>
                        <p>🛑 Stops: {flightComparisonData.bestValue?.stops === 0 ? "Non-stop" : `${flightComparisonData.bestValue?.stops} stop`}</p>
                      </div>
                    </div>
                  </div>

                  {/* Alternatives */}
                  {flightComparisonData.alternativeFlights && flightComparisonData.alternativeFlights.length > 0 && (
                    <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-3">
                      <h5 className="font-bold text-xs uppercase tracking-widest text-[#000080]">Alternative Flight Options</h5>
                      <div className="divide-y divide-gray-100">
                        {flightComparisonData.alternativeFlights.map((alt: any, idx: number) => (
                          <div key={idx} className="py-3 flex items-center justify-between text-xs font-semibold text-gray-700">
                            <span className="font-bold text-[#000080]">{alt.airline}</span>
                            <span>⏱ {alt.duration}</span>
                            <span>{alt.stops === 0 ? "Non-stop" : `${alt.stops} stop`}</span>
                            <span className="font-black text-[#1E90FF]">₹{alt.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* 7. Flight Price Alerts */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest">
                  <Bell size={14} /> Flight Price Drop Alerts
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#000080]">Track Destinations & Get Notified</h3>
                <p className="text-xs text-gray-500 font-semibold">Save routes and dates. We will automatically monitor and alert you when prices dip.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Destination to Monitor</label>
                  <input
                    type="text"
                    value={alertDest}
                    onChange={(e) => setAlertDest(e.target.value)}
                    placeholder="E.g. London"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#1E90FF] focus:bg-white w-full transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Target Date</label>
                  <input
                    type="date"
                    value={alertDate}
                    onChange={(e) => setAlertDate(e.target.value)}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#1E90FF] focus:bg-white w-full transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleAddAlert}
                className="bg-[#000080] hover:bg-blue-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-3 rounded-2xl transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus size={14} /> Monitor Price
              </button>

              {/* Alerts List */}
              <div className="space-y-3">
                <h5 className="font-bold text-xs uppercase tracking-widest text-[#000080]">Your Active Trackers</h5>
                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 divide-y divide-gray-100">
                  {priceAlerts.map((al) => (
                    <div key={al.id} className="py-4 flex items-center justify-between text-xs font-bold">
                      <div className="space-y-0.5">
                        <p className="text-sm text-[#000080]">{al.dest}</p>
                        <p className="text-[11px] text-gray-400 font-semibold">Travel Date: {al.date}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 font-semibold">Trigger Price</p>
                          <p className="text-sm font-black text-emerald-600">₹{al.basePrice}</p>
                        </div>
                        <button
                          onClick={() => toggleAlertTracking(al.id)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                            al.tracking 
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {al.tracking ? "● Active Monitoring" : "Paused"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 8. Explore Anywhere */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#1E90FF] font-black text-xs uppercase tracking-widest">
                  <Compass size={14} /> Explore Anywhere, Any Budget
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#000080]">Search globally tailored to your pocket size</h3>
                <p className="text-xs text-gray-500 font-semibold">Enter your total budget and trip length. We discover, budget-split, and recommend matching destinations.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Departure City</label>
                  <input
                    type="text"
                    value={exploreCity}
                    onChange={(e) => setExploreCity(e.target.value)}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    <span>Trip Length (Days)</span>
                    <span className="text-[#1E90FF]">{exploreDays} days</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="14"
                    value={exploreDays}
                    onChange={(e) => setExploreDays(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#000080]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    <span>Max Budget</span>
                    <span className="text-emerald-600">₹{exploreBudget.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="150000"
                    step="5000"
                    value={exploreBudget}
                    onChange={(e) => setExploreBudget(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#000080]"
                  />
                </div>
              </div>

              <button
                onClick={handleGetExploreAnywhere}
                className="bg-[#000080] hover:bg-blue-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-3 rounded-2xl transition-all cursor-pointer"
              >
                Scan Destinations
              </button>

              {exploreAnywhereData && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {exploreAnywhereData.matchingDestinations?.map((dest: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 border border-gray-100 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                      <div className="h-44 relative">
                        <img src={dest.image} alt={dest.destination} className="w-full h-full object-cover" />
                        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-xs font-black shadow-sm text-[#000080]">
                          🏆 Top Match
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        <div className="space-y-1">
                          <h5 className="text-lg font-bold text-[#000080]">{dest.destination}</h5>
                          <p className="text-xs text-gray-500 font-semibold leading-relaxed">{dest.description}</p>
                        </div>

                        {/* Budget breakdown progress meters */}
                        <div className="space-y-2 bg-white p-4 rounded-2xl border border-gray-50">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Budget Breakdown (₹{dest.budgetBreakdown?.total})</p>
                          {[
                            { name: "Flights", val: dest.budgetBreakdown?.flight, color: "bg-blue-500" },
                            { name: "Stays & Hotels", val: dest.budgetBreakdown?.hotel, color: "bg-emerald-500" },
                            { name: "Food & Dining", val: dest.budgetBreakdown?.food, color: "bg-amber-500" },
                            { name: "Activities", val: dest.budgetBreakdown?.activities, color: "bg-purple-500" }
                          ].map((b, bIdx) => (
                            <div key={bIdx} className="space-y-1 text-xs font-bold">
                              <div className="flex justify-between items-center text-[10px] text-gray-500">
                                <span>{b.name}</span>
                                <span>₹{b.val}</span>
                              </div>
                              <div className="w-full bg-gray-50 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full ${b.color}`} style={{ width: `${(b.val / dest.budgetBreakdown?.total) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* 9. Cheapest Month Predictor */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-purple-500 font-black text-xs uppercase tracking-widest">
                  <TrendingUp size={14} /> Cheapest Month & Weather Predictor
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#000080]">Predict Flight Patterns & Weather Indexes</h3>
                <p className="text-xs text-gray-500 font-semibold">Forecasts the most cost-effective travel calendar months paired with average climate metrics.</p>
              </div>

              <div className="flex gap-2 max-w-xl">
                <input
                  type="text"
                  value={cheapestDest}
                  onChange={(e) => setCheapestDest(e.target.value)}
                  placeholder="Enter destination city (e.g. London)..."
                  className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[#1E90FF] focus:bg-white w-full transition-all"
                />
                <button
                  onClick={handleGetCheapestMonth}
                  className="bg-[#000080] hover:bg-blue-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-3 rounded-2xl transition-all shrink-0 cursor-pointer"
                >
                  Analyze Trends
                </button>
              </div>

              {cheapestMonthData && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-6"
                >
                  {/* Cards panel */}
                  <div className="md:col-span-4 space-y-4">
                    <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-800">Cheapest Month to Fly</span>
                      <h5 className="text-base font-black text-emerald-600 uppercase">{cheapestMonthData.cheapestMonth}</h5>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-blue-800">Best Season (Weather)</span>
                      <h5 className="text-base font-black text-[#1E90FF] uppercase">{cheapestMonthData.bestMonth}</h5>
                    </div>

                    <div className="bg-purple-50/50 border border-purple-100 p-5 rounded-2xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-purple-800">Peak Tourist Season</span>
                      <h5 className="text-base font-black text-purple-600 uppercase">{cheapestMonthData.peakSeason}</h5>
                    </div>
                  </div>

                  {/* Pricing chart panel */}
                  <div className="md:col-span-8 bg-gray-50 border border-gray-100 p-6 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-xs font-bold text-[#000080]">Monthly Average Price Variation</span>
                      <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-100 font-black">Weather Score: {cheapestMonthData.weatherScore}/10</span>
                    </div>

                    <div className="space-y-4">
                      {cheapestMonthData.monthlyDetails?.map((m: any, idx: number) => (
                        <div key={idx} className="space-y-1 text-xs font-bold">
                          <div className="flex justify-between items-center text-[10px] text-gray-500">
                            <span>{m.month}</span>
                            <span className="text-gray-400">{m.weatherStatus}</span>
                            <span className={m.avgPricePercent > 100 ? "text-amber-500 font-black" : "text-emerald-500 font-black"}>
                              {m.avgPricePercent}% of avg
                            </span>
                          </div>
                          <div className="w-full bg-white border border-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-full transition-all ${m.avgPricePercent > 100 ? "bg-amber-400" : "bg-emerald-400"}`} 
                              style={{ width: `${Math.min(m.avgPricePercent, 100)}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* =====================================
            TAB 3: AI SPECIALS & MAPS
            ===================================== */}
        {activeTab === "copilot" && (
          <motion.div
            key="copilot"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* 5. Near Me Explorer (Google Maps Platform) */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#1E90FF] font-black text-xs uppercase tracking-widest">
                  <MapIcon size={14} /> Near Me Explorer
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#000080]">Discover Nearby Places on Interactive Google Map</h3>
                <p className="text-xs text-gray-500 font-semibold">Find closest spots, cafes, historical temples, and cultural museums surrounding your local travel base.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: "attractions", label: "🎡 Attractions", icon: Landmark },
                  { id: "restaurants", label: "🍔 Restaurants", icon: Hotel },
                  { id: "cafes", label: "☕ Cafes", icon: Coffee },
                  { id: "temples", label: "🕌 Temples & Shrines", icon: Trophy },
                  { id: "museums", label: "🏛 Museums", icon: Compass }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setNearMeCategory(cat.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      nearMeCategory === cat.id 
                        ? "bg-[#000080] border-[#000080] text-white" 
                        : "bg-gray-50 border-gray-100 text-[#000080]/80 hover:bg-gray-100"
                    }`}
                  >
                    <cat.icon size={13} />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* List Sidebar */}
                <div className="lg:col-span-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  <h5 className="font-bold text-xs uppercase tracking-widest text-[#000080]">Nearby Discoveries</h5>
                  <div className="space-y-3">
                    {NEAR_ME_SPOTS[nearMeCategory]?.map((spot, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setMapCenter({ lat: spot.lat, lng: spot.lng });
                          setSelectedPlace(spot);
                        }}
                        className={`w-full text-left bg-gray-50 hover:bg-gray-100 p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-start ${
                          selectedPlace?.name === spot.name ? "border-[#1E90FF] bg-white shadow-sm" : "border-gray-100"
                        }`}
                      >
                        <div className="space-y-1">
                          <h6 className="font-bold text-xs text-[#000080]">{spot.name}</h6>
                          <p className="text-[11px] text-gray-400 font-semibold">{spot.address}</p>
                          <p className="text-[10px] text-[#1E90FF] font-semibold">🕒 {spot.hours}</p>
                        </div>
                        <span className="flex items-center gap-1 font-extrabold text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded">
                          <Star size={10} className="fill-amber-400 text-amber-400" />
                          {spot.rating}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Google Map Container */}
                <div className="lg:col-span-8 h-[400px] rounded-[2rem] overflow-hidden border border-gray-100 relative shadow-inner">
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={mapCenter}
                      zoom={12}
                    >
                      {NEAR_ME_SPOTS[nearMeCategory]?.map((spot, idx) => (
                        <MarkerF
                          key={idx}
                          position={{ lat: spot.lat, lng: spot.lng }}
                          onClick={() => setSelectedPlace(spot)}
                        />
                      ))}

                      {selectedPlace && (
                        <InfoWindowF
                          position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                          onCloseClick={() => setSelectedPlace(null)}
                        >
                          <div className="p-2 space-y-1 font-sans text-xs max-w-sm">
                            <h6 className="font-bold text-[#000080]">{selectedPlace.name}</h6>
                            <p className="text-gray-500">{selectedPlace.address}</p>
                            <div className="flex justify-between items-center gap-2 pt-1">
                              <span className="text-[10px] text-emerald-600 font-bold">{selectedPlace.hours}</span>
                              <span className="font-extrabold text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                                ⭐ {selectedPlace.rating}
                              </span>
                            </div>
                          </div>
                        </InfoWindowF>
                      )}
                    </GoogleMap>
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-6 text-center space-y-2">
                      <MapIcon size={32} className="text-[#000080]/30 animate-pulse" />
                      <h6 className="font-bold text-xs text-[#000080]">Google Maps Sandbox Mode</h6>
                      <p className="text-[11px] text-gray-400 max-w-xs leading-relaxed font-medium">To run the live Google Map, please configure your GOOGLE_MAPS_PLATFORM_KEY in Settings → Secrets.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 10. Destination Ranking Engine */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest">
                  <Trophy size={14} /> Destination Ranking Engine (AI Leaderboard)
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#000080]">Global Destination Smart Leaderboards</h3>
                <p className="text-xs text-gray-500 font-semibold">Ranks top destinations based on real-time factors like Crowd Density, Budget, and TripAdvisor Reviews.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "Most Budget Friendly",
                  "Best Weather Match",
                  "Lowest Crowd Density",
                  "Highest Safety Index",
                  "Best TripAdvisor Reviews"
                ].map((f) => (
                  <button
                    key={f}
                    onClick={() => { setRankingFilter(f); setTimeout(handleGetRankings, 100); }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                      rankingFilter === f 
                        ? "bg-[#000080] border-[#000080] text-white shadow-sm" 
                        : "bg-gray-50 border-gray-100 text-[#000080]/70 hover:bg-gray-100"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {rankingData && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="space-y-3">
                    {rankingData.rankedDestinations?.map((dest: any) => (
                      <div 
                        key={dest.rank} 
                        className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-white hover:shadow-sm"
                      >
                        <div className="flex items-center gap-4 text-left">
                          <span className="w-8 h-8 rounded-full bg-[#000080] text-white flex items-center justify-center font-black text-sm">
                            {dest.rank}
                          </span>
                          <div className="space-y-0.5">
                            <h6 className="font-bold text-sm text-[#000080]">{dest.name}</h6>
                            <p className="text-xs text-gray-500 font-semibold leading-relaxed">{dest.reviewsSummary}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 items-center">
                          <div className="text-left md:text-right">
                            <p className="text-[10px] uppercase text-gray-400 font-black">AI Match Score</p>
                            <p className="text-sm font-black text-[#1E90FF]">{dest.score}/10</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-lg">Budget: {dest.budget}</span>
                            <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold px-2.5 py-1 rounded-lg">Weather: {dest.weather}</span>
                            <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-bold px-2.5 py-1 rounded-lg">Safety: {dest.safety}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* 11. AI Destination Comparison */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-indigo-500 font-black text-xs uppercase tracking-widest">
                  <Shield size={14} /> Side-by-Side AI Comparison
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#000080]">Compare Two Destinations Side-by-Side</h3>
                <p className="text-xs text-gray-500 font-semibold">In-depth comparison of weather, average stay cost, travel time, and family friendly scores.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Destination A</label>
                  <input
                    type="text"
                    value={compareDestA}
                    onChange={(e) => setCompareDestA(e.target.value)}
                    placeholder="E.g. Goa"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Destination B</label>
                  <input
                    type="text"
                    value={compareDestB}
                    onChange={(e) => setCompareDestB(e.target.value)}
                    placeholder="E.g. Munnar"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none w-full"
                  />
                </div>
              </div>

              <button
                onClick={handleGetComparison}
                className="bg-[#000080] hover:bg-blue-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-3 rounded-2xl transition-all cursor-pointer"
              >
                Compare Destinations
              </button>

              {comparisonData && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 overflow-x-auto">
                    <table className="w-full text-xs text-left text-[#000080] border-collapse min-w-[500px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-3 font-black uppercase tracking-wider text-gray-400 w-1/4">Criteria</th>
                          <th className="py-3 font-black text-sm text-[#000080] w-3/8">{compareDestA}</th>
                          <th className="py-3 font-black text-sm text-[#000080] w-3/8">{compareDestB}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[
                          { criteria: "Average Costs", key: "cost" },
                          { criteria: "Commute & Travel Time", key: "travelTime" },
                          { criteria: "Weather & Vibe", key: "weather" },
                          { criteria: "Attractions highlight", key: "attractions" },
                          { criteria: "Cuisine & Dining", key: "food" }
                        ].map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-4 font-black uppercase text-[10px] text-gray-400">{row.criteria}</td>
                            <td className="py-4 pr-4 font-semibold text-gray-600 leading-relaxed">{comparisonData.comparison?.[row.key]?.a}</td>
                            <td className="py-4 pr-4 font-semibold text-gray-600 leading-relaxed">{comparisonData.comparison?.[row.key]?.b}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="py-4 font-black uppercase text-[10px] text-gray-400">Family Friendly Score</td>
                          <td className="py-4 font-black text-emerald-600 text-sm">{comparisonData.comparison?.familyFriendlyScore?.a}/10</td>
                          <td className="py-4 font-black text-emerald-600 text-sm">{comparisonData.comparison?.familyFriendlyScore?.b}/10</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex gap-4 text-left">
                    <Sparkles className="text-[#1E90FF] shrink-0" size={20} />
                    <div className="space-y-1">
                      <h5 className="font-bold text-xs text-[#000080] uppercase tracking-widest">AI Verdict Recommendation</h5>
                      <p className="text-xs font-semibold text-gray-700 leading-relaxed">{comparisonData.recommendationVerdict}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* 12. AI Travel Recommendation Engine */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#1E90FF] font-black text-xs uppercase tracking-widest">
                  <Sparkles size={14} /> AI Recommendation Co-Pilot
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#000080]">Get Highly Tailored Personal Suggestions</h3>
                <p className="text-xs text-gray-500 font-semibold">Utilizes your history, budget level, and travel style to generate unique co-pilot recommendations.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Your Travel History</label>
                  <input
                    type="text"
                    value={recHistory}
                    onChange={(e) => setRecHistory(e.target.value)}
                    placeholder="Cities you visited and liked..."
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Your Style</label>
                  <input
                    type="text"
                    value={recStyle}
                    onChange={(e) => setRecStyle(e.target.value)}
                    placeholder="Adventure, beaches, architecture, cafes..."
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Approx Budget Tier</label>
                  <input
                    type="text"
                    value={recBudget}
                    onChange={(e) => setRecBudget(e.target.value)}
                    placeholder="₹20k - ₹50k..."
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Target Travel Season</label>
                  <input
                    type="text"
                    value={recSeason}
                    onChange={(e) => setRecSeason(e.target.value)}
                    placeholder="E.g. December-February"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none w-full"
                  />
                </div>
              </div>

              <button
                onClick={handleGetRecommendations}
                className="bg-[#000080] hover:bg-blue-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-3 rounded-2xl transition-all cursor-pointer"
              >
                Compute Recommendations
              </button>

              {recommendationData && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-[#F8FAFC] border border-gray-100 rounded-3xl p-6 space-y-4">
                    <h5 className="font-bold text-xs uppercase tracking-widest text-[#000080]">Your Personalized Co-Pilot Letter</h5>
                    <p className="text-xs text-gray-600 font-semibold leading-relaxed whitespace-pre-wrap">{recommendationData.recommendation}</p>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-bold text-xs uppercase tracking-widest text-[#000080]">Suggested Highlights Just For You</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {recommendationData.suggestedSpots?.map((spot: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex gap-4 text-left">
                          <span className="text-2xl pt-1">✨</span>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 justify-between">
                              <h6 className="font-bold text-xs text-[#000080]">{spot.name}</h6>
                              <span className="text-emerald-600 font-extrabold text-[10px]">{spot.budgetIcon}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">{spot.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* =====================================
            TAB 4: TRAVEL STORIES
            ===================================== */}
        {activeTab === "stories" && (
          <motion.div
            key="stories"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#1E90FF] font-black text-xs uppercase tracking-widest">
                  <Users size={14} /> Swadesh Community Travel Stories
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#000080]">Discover real guest experiences & photos</h3>
                <p className="text-xs text-gray-500 font-semibold">User generated travel logs, tips, and direct social interactions.</p>
              </div>

              <button
                onClick={() => setStoryModalOpen(true)}
                className="bg-[#000080] hover:bg-blue-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-3.5 rounded-2xl transition-all cursor-pointer flex items-center gap-2 self-start"
              >
                <Plus size={14} /> Create A Story
              </button>
            </div>

            {/* Travel Stories Feed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((st) => (
                <div key={st.id} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between group">
                  <div className="h-48 relative overflow-hidden">
                    <img 
                      src={st.photo_url} 
                      alt={st.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black tracking-wider text-white flex items-center gap-1">
                      <MapPin size={10} /> {st.location}
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <img src={st.user_photo} alt={st.user_name} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                      <div className="text-left">
                        <p className="font-bold text-xs text-[#000080]">{st.user_name}</p>
                        <p className="text-[10px] text-gray-400 font-semibold">{new Date(st.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <h5 className="font-bold text-sm text-[#000080]">{st.title}</h5>
                      <p className="text-xs text-gray-500 font-semibold leading-relaxed line-clamp-3">{st.experience}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-50 pt-3 text-xs font-bold text-gray-400">
                      <button 
                        onClick={() => handleLikeStory(st.id)}
                        className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Heart size={14} className="fill-rose-500 text-rose-500" />
                        <span>{st.likes_count}</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleSaveStory(st.id)}
                          className={`flex items-center gap-1 hover:text-[#000080] transition-colors cursor-pointer ${
                            st.saved_by_users?.includes(user?.id || "") ? "text-[#1E90FF]" : "text-gray-400"
                          }`}
                        >
                          <Bookmark size={14} className={st.saved_by_users?.includes(user?.id || "") ? "fill-[#1E90FF]" : ""} />
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied! Share it with your friends.");
                          }}
                          className="flex items-center gap-1 hover:text-[#000080] transition-colors cursor-pointer"
                        >
                          <Share2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Story Modal popup */}
            {storyModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-left">
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-[#000080]">Share Your Swadesh Travel Story</h4>
                    <p className="text-xs text-gray-400 font-semibold">Post your experiences, notes, and tips with other travelers.</p>
                  </div>

                  <div className="space-y-3 text-xs font-bold">
                    <div className="space-y-1.5">
                      <label className="text-gray-400 uppercase tracking-wider text-[10px]">Story Title</label>
                      <input
                        type="text"
                        value={newStoryTitle}
                        onChange={(e) => setNewStoryTitle(e.target.value)}
                        placeholder="E.g. Sunrise Trek at Triund Hill"
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 w-full outline-none focus:border-[#1E90FF] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-400 uppercase tracking-wider text-[10px]">Location</label>
                      <input
                        type="text"
                        value={newStoryLocation}
                        onChange={(e) => setNewStoryLocation(e.target.value)}
                        placeholder="E.g. Dharamshala, India"
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 w-full outline-none focus:border-[#1E90FF] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-400 uppercase tracking-wider text-[10px]">Photo Unsplash URL (Optional)</label>
                      <input
                        type="text"
                        value={newStoryPhoto}
                        onChange={(e) => setNewStoryPhoto(e.target.value)}
                        placeholder="E.g. https://images.unsplash.com/photo-..."
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 w-full outline-none focus:border-[#1E90FF] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-400 uppercase tracking-wider text-[10px]">Your Experience Notes</label>
                      <textarea
                        value={newStoryExperience}
                        onChange={(e) => setNewStoryExperience(e.target.value)}
                        rows={4}
                        placeholder="What were the highlights? Any hidden spots, guides or budget tips?"
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 w-full outline-none focus:border-[#1E90FF] focus:bg-white transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setStoryModalOpen(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-wider py-3.5 rounded-2xl w-full transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateStory}
                      className="bg-[#000080] hover:bg-blue-900 text-white font-black uppercase text-[10px] tracking-wider py-3.5 rounded-2xl w-full transition-all cursor-pointer"
                    >
                      Post Story
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
