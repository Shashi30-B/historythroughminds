import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Car, Fuel, Sparkles, MapPin, Landmark, BookOpen, Star, Utensils, Award, Info, Heart, ChevronRight } from "lucide-react";

interface RoadTripPreset {
  route: string;
  distance: number; // in km
  toll: number; // in INR
  scenicViews: string[];
  restStops: string[];
  petrolPumps: string[];
  foodStops: string[];
  description: string;
}

const ROAD_PRESETS: Record<string, RoadTripPreset> = {
  mumbai_goa: {
    route: "Mumbai to Goa (via NH 48 / AH 47)",
    distance: 590,
    toll: 980,
    scenicViews: ["Amboli Ghat Waterfall", "Kolhapur Sugarcane Fields", "Nipani Green Slopes"],
    restStops: ["Satara Plaza Stop", "Kawathe Mahankal Layby", "Sawantwadi Handicraft Hub"],
    petrolPumps: ["Indian Oil Satara Bypass", "HP Fuel Nipani Corner", "Shell Kolhapur City"],
    foodStops: ["Prithvi Shivraj Dhaba (Kolhapur)", "Abhiruchi Veg (Satara)", "Sandhya Pure Veg (Sawantwadi)"],
    description: "The NH 48 highway route is wide, smooth, and highly comfortable, twisting through picturesque mountain passes and rich Maharashtrian agricultural plains."
  },
  pune_manali: {
    route: "Pune to Manali Highway Corridor",
    distance: 1840,
    toll: 3450,
    scenicViews: ["Sukhna Lake Bypass", "Chandigarh Plain Vistas", "Beas River Valleys"],
    restStops: ["Rajasthan Border Plaza", "Delhi Outer Layby", "Kiratpur Sahib Rest Area"],
    petrolPumps: ["BPCL Jaipur Bypass", "IOCL Delhi-Karnal Highway", "HP Fuel Bilaspur"],
    foodStops: ["Sukhdev Dhaba (Murthal)", "Karnal Haveli Restaurant", "Zorba Cafe (Old Manali)"],
    description: "An ultimate North-South driving adventure transitioning from the golden deserts of Rajasthan to the fertile plains of Punjab, up into the high-altitude pine valleys of Himachal."
  },
  kolhapur_kashmir: {
    route: "Kolhapur to Srinagar (The Crown Corridor)",
    distance: 2350,
    toll: 4900,
    scenicViews: ["Narmada River Bridge", "Aravalli Range Cliffs", "Patnitop Snow Slopes"],
    restStops: ["Indore Ring Road Plaza", "Gwalior Highway Rest", "Jalandhar Express Layby"],
    petrolPumps: ["Shell Indore Bypass", "IOCL Ludhiana Highway", "HP Fuel Banihal"],
    foodStops: ["Sher-e-Punjab Dhaba (Ludhiana)", "Naivedyam South-Indian (Indore)", "Kashmiri Wazwan House (Srinagar)"],
    description: "The dream grand trunk road trip from Southern Maharashtra's sugarcane belt up to the literal crown of India. Passes through majestic Mughal routes and the jaw-dropping Jawahar Tunnel."
  }
};

const FESTIVALS = [
  {
    id: "ganesh",
    name: "Ganesh Festival (Ganeshotsav)",
    vibe: "Divine Energy & Dhols",
    primaryCities: ["Pune", "Mumbai", "Diveagar"],
    bestMonths: "August / September",
    rituals: ["Pranapratishtha Aarti", "Dhol Tasha Pathak Dance", "Visarjan Processions"],
    itinerary: [
      "Day 1: Darshan of Lalbaugcha Raja (Mumbai) or Shreemant Dagdusheth Halwai Ganpati (Pune). See spectacular floral decorations.",
      "Day 2: Join local street processions and watch highly synchronized Dhol Tasha drum performances.",
      "Day 3: Take a scenic coastal drive to Diveagar Ganpati Beach Temple for a peaceful sunset."
    ]
  },
  {
    id: "diwali",
    name: "Diwali (Festival of Lights)",
    vibe: "Millions of Diyas & Sweets",
    primaryCities: ["Ayodhya", "Varanasi", "Jaipur"],
    bestMonths: "October / November",
    rituals: ["Ganga Aarti in Varanasi", "Deepotsav (Lighting of 5 Lakh+ Diyas)", "Jaipur Palace Light Show"],
    itinerary: [
      "Day 1: Arrive in Ayodhya. Take a holy dip in Sarayu River and join the world-record breaking deepotsav (millions of clay lamps).",
      "Day 2: Take a scenic express train to Varanasi. Witness the divine Dev Deepawali Ganga Aarti from an evening boat ride.",
      "Day 3: Explore Jaipur's ancient pink city bazaars, completely lit up in warm golden lighting."
    ]
  },
  {
    id: "wari",
    name: "Pandharpur Wari Pilgrimage",
    vibe: "Ecstatic Bhakti Chants & Bhajans",
    primaryCities: ["Alandi", "Dehu", "Pandharpur"],
    bestMonths: "June / July (Ashadhi Ekadashi)",
    rituals: ["Palkhi Processions", "Holy dip in Chandrabhaga River", "Ringan Ceremony (Circular Horse Gallop)"],
    itinerary: [
      "Day 1: Join the lakhs of barefoot Warkari pilgrims in Alandi chanting Tukaram-Dnyaneshwar hymns.",
      "Day 2: Witness the high-energy 'Ringan' ritual in Pune district where decorated horses gallop around the circle.",
      "Day 3: Reach Pandharpur. Take a holy bath in Chandrabhaga river and obtain Darshan of Lord Vitthal."
    ]
  }
];

const PILGRIMAGES = [
  {
    name: "Tirupati Balaji Sacred Loop",
    states: "Andhra Pradesh",
    duration: "3 Days",
    primaryDeity: "Lord Venkateswara",
    route: "Chennai / Bengaluru -> Tirupati Town -> Tirumala Hills",
    guide: "Book Special Entry Darshan (₹300) online at least 60 days in advance. Ensure traditional dress code (Dhoti for men, Saree for women).",
    bestMonths: "September to March"
  },
  {
    name: "Char Dham Himalayan Circuit",
    states: "Uttarakhand",
    duration: "12 Days",
    primaryDeity: "Yamunotri, Gangotri, Kedarnath, Badrinath",
    route: "Haridwar -> Rishikesh -> Barkot -> Uttarkashi -> Guptkashi -> Kedarnath -> Badrinath -> Rishikesh",
    guide: "Requires compulsory biometric travel registration on Uttarakhand Tourism website. Carry heavy woolens and obtain fitness certificates for high-altitude trekking.",
    bestMonths: "May to June / September to October"
  },
  {
    name: "Shirdi Saibaba & Shani Shingnapur",
    states: "Maharashtra",
    duration: "2 Days",
    primaryDeity: "Sai Baba & Lord Shani",
    route: "Pune/Mumbai -> Shirdi -> Shani Shingnapur -> Pune/Mumbai",
    guide: "Online VIP Pass is highly recommended for Kakad Aarti. Visit Shani Shingnapur, the unique lockless village with no doors on houses.",
    bestMonths: "October to March"
  }
];

export default function IndiaSpecialPlanner() {
  const [subTab, setSubTab] = useState<"road" | "festival" | "spiritual">("road");
  
  // Road Trip State
  const [selectedRoad, setSelectedRoad] = useState<string>("mumbai_goa");
  const roadData = ROAD_PRESETS[selectedRoad];

  // Fuel Price assumption
  const FUEL_PRICE = 104; // INR
  const MILEAGE = 15; // km per liter
  const fuelCost = Math.round((roadData.distance / MILEAGE) * FUEL_PRICE);

  return (
    <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-xl text-left">
      {/* Sub tabs switcher */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center">
            <Sparkles size={20} className="animate-spin" />
          </div>
          <div>
            <h4 className="text-[#000080] dark:text-[#1E90FF] font-black text-lg">India Special Planners</h4>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Premium Routes, Festivals & Pilgrim Circuits</p>
          </div>
        </div>

        {/* Sub menu */}
        <div className="bg-gray-50 dark:bg-slate-900 p-0.5 rounded-xl flex items-center text-[10px] font-extrabold border border-gray-100/10">
          {[
            { id: "road", label: "🚗 Road Trip AI", icon: Car },
            { id: "festival", label: "🏮 Festivals", icon: Sparkles },
            { id: "spiritual", label: "🧘 Pilgrimages", icon: Landmark }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === tab.id
                  ? "bg-white dark:bg-slate-800 text-[#1E90FF] shadow-sm font-black"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {subTab === "road" && (
          <motion.div
            key="road"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Route selection dropdown */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#1E90FF] font-extrabold block">Select Scenic Highway</span>
                <select
                  value={selectedRoad}
                  onChange={(e) => setSelectedRoad(e.target.value)}
                  className="mt-1 text-sm bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 outline-none border border-gray-100 dark:border-slate-800 font-bold"
                >
                  <option value="mumbai_goa">🌴 Mumbai to Goa Corridor</option>
                  <option value="pune_manali">🏔️ Pune to Manali Highway</option>
                  <option value="kolhapur_kashmir">👑 Kolhapur to Kashmir Roadway</option>
                </select>
              </div>

              {/* Live Cost estimation badge */}
              <div className="flex gap-3">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl flex items-center gap-2.5">
                  <Fuel size={18} className="text-emerald-500" />
                  <div>
                    <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider block">Est. Fuel Cost</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">₹{fuelCost.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl flex items-center gap-2.5">
                  <Fuel size={18} className="text-amber-500" />
                  <div>
                    <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider block">Est. Toll Cost</span>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">₹{roadData.toll.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
              {roadData.description}
            </p>

            {/* Stops grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-3xl border border-gray-100/10 text-xs">
                <h5 className="font-extrabold text-[#1E90FF] uppercase tracking-widest text-[9px] mb-3 flex items-center gap-1">
                  🏞️ Scenic Views
                </h5>
                <ul className="space-y-2 font-semibold text-slate-700 dark:text-slate-300">
                  {roadData.scenicViews.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <ChevronRight size={12} className="text-[#1E90FF] shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-3xl border border-gray-100/10 text-xs">
                <h5 className="font-extrabold text-orange-500 uppercase tracking-widest text-[9px] mb-3 flex items-center gap-1">
                  🍲 Traditional Dhabas
                </h5>
                <ul className="space-y-2 font-semibold text-slate-700 dark:text-slate-300">
                  {roadData.foodStops.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <ChevronRight size={12} className="text-orange-500 shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-3xl border border-gray-100/10 text-xs">
                <h5 className="font-extrabold text-teal-600 uppercase tracking-widest text-[9px] mb-3 flex items-center gap-1">
                  🅿️ Rest Plazas
                </h5>
                <ul className="space-y-2 font-semibold text-slate-700 dark:text-slate-300">
                  {roadData.restStops.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <ChevronRight size={12} className="text-teal-600 shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-3xl border border-gray-100/10 text-xs">
                <h5 className="font-extrabold text-rose-500 uppercase tracking-widest text-[9px] mb-3 flex items-center gap-1">
                  ⛽ Petrol Pumps
                </h5>
                <ul className="space-y-2 font-semibold text-slate-700 dark:text-slate-300">
                  {roadData.petrolPumps.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <ChevronRight size={12} className="text-rose-500 shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === "festival" && (
          <motion.div
            key="festival"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FESTIVALS.map((fest) => (
                <div key={fest.id} className="p-5 rounded-[2rem] bg-gray-50/50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 text-xs flex flex-col justify-between h-[300px]">
                  <div>
                    <span className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/5 px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest">
                      📅 {fest.bestMonths}
                    </span>
                    <h5 className="font-black text-base text-slate-800 dark:text-white mt-2 mb-0.5">{fest.name}</h5>
                    <p className="text-[#1E90FF] font-bold text-[10px] uppercase tracking-wider mb-3">{fest.vibe}</p>
                    
                    <div className="space-y-2 mt-2">
                      <div>
                        <span className="text-[8px] uppercase text-gray-400 font-extrabold">Primary Hubs:</span>
                        <div className="flex gap-1.5 flex-wrap mt-0.5">
                          {fest.primaryCities.map((c, cIdx) => (
                            <span key={cIdx} className="bg-white dark:bg-slate-800 border border-gray-100/10 px-2 py-0.5 rounded text-[9px] font-bold">
                              📍 {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[8px] uppercase text-gray-400 font-extrabold">Essential Rituals:</span>
                        <p className="text-[10px] text-gray-500 mt-0.5 font-bold">{fest.rituals.join(" • ")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Curated quick itineraries */}
                  <div className="pt-3 border-t border-gray-100/50">
                    <span className="text-[8px] uppercase tracking-wider text-amber-500 font-black block mb-1">AI Curated 3-Day Plan</span>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-normal line-clamp-3">
                      {fest.itinerary.join(" ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === "spiritual" && (
          <motion.div
            key="spiritual"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {PILGRIMAGES.map((pilg, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-gray-50/50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#000080]/10 dark:bg-[#1E90FF]/15 text-[#000080] dark:text-[#1E90FF] flex items-center justify-center font-black shrink-0 font-mono text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <h5 className="font-black text-sm text-slate-800 dark:text-white leading-snug">{pilg.name}</h5>
                    <div className="flex flex-wrap gap-2 items-center mt-1 text-[10px] font-bold">
                      <span className="text-[#1E90FF]">📍 {pilg.states}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">⏰ {pilg.duration}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-amber-600">🍂 {pilg.bestMonths}</span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-3">
                      <strong className="text-gray-400 font-extrabold text-[9px] uppercase block">Pilgrimage Road Path:</strong>
                      {pilg.route}
                    </p>

                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-2 flex items-start gap-1.5">
                      <Info size={12} className="text-[#1E90FF] shrink-0 mt-0.5" />
                      {pilg.guide}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
