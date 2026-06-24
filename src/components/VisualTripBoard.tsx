import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Compass, Heart, ArrowRightLeft, Search, Star, Sparkles, X, Check, MapPin } from "lucide-react";

export interface Destination {
  id: string;
  name: string;
  region: "India" | "Asia" | "Europe" | "Americas" | "Middle East";
  image: string;
  cost: "Budget" | "Moderate" | "Luxury";
  season: string;
  rating: number;
  visa: string;
  safety: number;
  vibe: string;
  highlights: string[];
  description: string;
}

const DESTINATIONS: Destination[] = [
  {
    id: "mumbai-goa",
    name: "Goa, India",
    region: "India",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80",
    cost: "Budget",
    season: "November to February",
    rating: 4.8,
    visa: "Citizen / eVisa",
    safety: 4.5,
    vibe: "Sunkissed Beaches & Portuguese Heritage",
    highlights: ["Baga Beach", "Basilica of Bom Jesus", "Dudhsagar Falls", "Spicy Fish Curry"],
    description: "Goa is a coastal paradise combining stunning sandy beaches, thrilling water sports, historic churches, and pulsating night bazaars."
  },
  {
    id: "pune-manali",
    name: "Manali, Himachal Pradesh",
    region: "India",
    image: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&auto=format&fit=crop&q=80",
    cost: "Moderate",
    season: "March to June / Dec to Feb",
    rating: 4.9,
    visa: "Citizen / eVisa",
    safety: 4.7,
    vibe: "Snow-capped Peaks & Pine Forests",
    highlights: ["Solang Valley", "Hadimba Temple", "Rohtang Pass", "Paragliding"],
    description: "Nestled in the Beas River Valley, Manali is India's favorite gateway for skiing, paragliding, snow scaling, and pristine hiking trails."
  },
  {
    id: "paris",
    name: "Paris, France",
    region: "Europe",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80",
    cost: "Luxury",
    season: "April to October",
    rating: 4.7,
    visa: "Schengen Visa Required",
    safety: 4.2,
    vibe: "Art, High Fashion & Romantique Cafés",
    highlights: ["Eiffel Tower", "Louvre Museum", "Seine River Cruise", "Fresh Croissants"],
    description: "The global center for art, fashion, gastronomy, and culture. Paris's 19th-century cityscape is crisscrossed by wide boulevards and the River Seine."
  },
  {
    id: "tokyo",
    name: "Tokyo, Japan",
    region: "Asia",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80",
    cost: "Luxury",
    season: "March to May (Sakura Season)",
    rating: 4.95,
    visa: "eVisa / Visa Required",
    safety: 4.98,
    vibe: "Neon Skyscraper Lights & Ancient Shrines",
    highlights: ["Shibuya Crossing", "Senso-ji Temple", "Mount Fuji View", "Ramen & Sushi"],
    description: "Tokyo mixes neon-lit skyscrapers with historic temples. It offers an incredible culinary landscape, ultra-modern tech, and gorgeous cherry blossoms."
  },
  {
    id: "bali",
    name: "Bali, Indonesia",
    region: "Asia",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80",
    cost: "Budget",
    season: "April to October",
    rating: 4.85,
    visa: "Visa on Arrival",
    safety: 4.6,
    vibe: "Emerald Rice Terraces & Surf Swells",
    highlights: ["Ubud Monkey Forest", "Uluwatu Temple", "Tegalalang Rice Field", "Surf Seminyak"],
    description: "Bali is a tropical haven famed for its forested volcanic mountains, iconic rice paddies, sandy coral beaches, and vibrant religious temples."
  },
  {
    id: "singapore",
    name: "Singapore City",
    region: "Asia",
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&auto=format&fit=crop&q=80",
    cost: "Moderate",
    season: "Year-Round",
    rating: 4.8,
    visa: "Visa Required / eVisa",
    safety: 4.95,
    vibe: "Futuristic Supertrees & Skyline Glitz",
    highlights: ["Gardens by the Bay", "Marina Bay Sands", "Universal Studios", "Lau Pa Sat Food"],
    description: "A global financial hub famed for its pristine streets, incredible botanical gardens, futuristic architecture, and marvelous hawker food centers."
  },
  {
    id: "dubai",
    name: "Dubai, UAE",
    region: "Middle East",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop&q=80",
    cost: "Luxury",
    season: "November to March",
    rating: 4.75,
    visa: "eVisa Available",
    safety: 4.92,
    vibe: "Sky-high Burj Khalifa & Desert Dunes",
    highlights: ["Burj Khalifa", "Dubai Mall Aquarium", "Desert Safari Ride", "Palm Jumeirah"],
    description: "Famed for high-end luxury shopping, ultra-modern architecture, a lively nightlife scene, and expansive deserts with golden dunes."
  },
  {
    id: "kashmir",
    name: "Srinagar, Kashmir",
    region: "India",
    image: "https://images.unsplash.com/photo-1566228015668-4c45dbc4e2f5?w=800&auto=format&fit=crop&q=80",
    cost: "Moderate",
    season: "April to October / Dec to Feb",
    rating: 4.9,
    visa: "Citizen / eVisa",
    safety: 4.4,
    vibe: "Serene Dal Lake Shikaras & Tulip Gardens",
    highlights: ["Dal Lake Houseboat", "Gulmarg Gondola", "Shalimar Bagh", "Kahwa Tea"],
    description: "Often described as 'Heaven on Earth', Srinagar is famous for its majestic Mughal gardens, tranquil lakes, unique houseboats, and snow skiing."
  }
];

export default function VisualTripBoard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("travolor_wishlist") || "[]");
    } catch {
      return [];
    }
  });
  const [compareList, setCompareList] = useState<Destination[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const toggleWishlist = (id: string) => {
    let updated = [...wishlist];
    if (updated.includes(id)) {
      updated = updated.filter(x => x !== id);
    } else {
      updated.push(id);
    }
    setWishlist(updated);
    localStorage.setItem("travolor_wishlist", JSON.stringify(updated));
  };

  const toggleCompare = (dest: Destination) => {
    if (compareList.some(d => d.id === dest.id)) {
      setCompareList(compareList.filter(d => d.id !== dest.id));
    } else {
      if (compareList.length >= 2) {
        alert("You can only compare 2 destinations at a time.");
        return;
      }
      setCompareList([...compareList, dest]);
    }
  };

  const filteredDests = DESTINATIONS.filter((dest) => {
    const matchesSearch = dest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dest.vibe.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dest.highlights.some(h => h.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRegion = selectedRegion === "All" || dest.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-xl text-left flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search beaches, snow, cities..."
            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:border-[#1E90FF]/40 transition-all shadow-inner"
          />
        </div>

        {/* Region Pills */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none whitespace-nowrap">
          {["All", "India", "Asia", "Europe", "Middle East"].map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedRegion === reg
                  ? "bg-[#1E90FF] text-white shadow-md shadow-blue-500/15"
                  : "bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-100/10"
              }`}
            >
              {reg}
            </button>
          ))}
        </div>

        {/* Comparison floating trigger */}
        {compareList.length > 0 && (
          <button
            onClick={() => setShowCompareModal(true)}
            className="w-full md:w-auto px-5 py-3 rounded-2xl bg-[#000080] dark:bg-[#1E90FF] hover:opacity-90 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
          >
            <ArrowRightLeft size={14} />
            Compare ({compareList.length}/2 Selected)
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredDests.map((dest) => {
            const isSaved = wishlist.includes(dest.id);
            const isComparing = compareList.some(d => d.id === dest.id);
            return (
              <motion.div
                layout
                key={dest.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-md hover:shadow-xl transition-all group text-left relative"
              >
                {/* Image Container */}
                <div className="h-48 w-full overflow-hidden relative">
                  <img
                    src={dest.image}
                    alt={dest.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* Badges on image */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="bg-white/90 dark:bg-black/80 backdrop-blur px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase text-[#000080] dark:text-[#1E90FF] flex items-center gap-1">
                      <MapPin size={10} />
                      {dest.region}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleCompare(dest)}
                        title="Add to comparison board"
                        className={`w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur transition-all ${
                          isComparing
                            ? "bg-[#1E90FF] text-white"
                            : "bg-white/30 text-white hover:bg-white/50"
                        }`}
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                      <button
                        onClick={() => toggleWishlist(dest.id)}
                        title="Save to wishlist"
                        className="w-8 h-8 rounded-xl bg-white/30 hover:bg-white/50 text-white flex items-center justify-center backdrop-blur transition-all"
                      >
                        <Heart size={14} className={isSaved ? "fill-rose-500 text-rose-500 scale-110" : ""} />
                      </button>
                    </div>
                  </div>

                  {/* Rating / Season overlays on image bottom */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-1 bg-yellow-400/20 backdrop-blur px-2 py-0.5 rounded-lg text-[10px] font-black">
                      <Star size={10} className="fill-yellow-400 text-yellow-400" />
                      {dest.rating.toFixed(2)}
                    </div>
                    <span className="text-[10px] font-bold text-white/90 truncate max-w-[150px]">{dest.season}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col justify-between h-[210px]">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-slate-800 dark:text-white font-black text-lg tracking-tight">{dest.name}</h4>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        dest.cost === "Budget" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600" :
                        dest.cost === "Moderate" ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600" :
                        "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
                      }`}>
                        💵 {dest.cost}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#1E90FF] font-bold uppercase tracking-wider mb-2">{dest.vibe}</p>
                    <p className="text-gray-400 dark:text-gray-450 text-[11px] font-semibold leading-relaxed line-clamp-3">
                      {dest.description}
                    </p>
                  </div>

                  {/* Highlights Tags */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {dest.highlights.slice(0, 3).map((high, hIdx) => (
                      <span key={hIdx} className="bg-gray-50 dark:bg-slate-900 border border-gray-100/5 px-2 py-0.5 rounded-lg text-[9px] font-bold text-gray-500 dark:text-gray-400">
                        ✨ {high}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Comparison Modal */}
      <AnimatePresence>
        {showCompareModal && compareList.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              {/* Modal Head */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="text-[#1E90FF]" size={18} />
                  <h4 className="text-[#000080] dark:text-[#1E90FF] font-black text-lg">Destination Comparison</h4>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-slate-900 flex items-center justify-center transition-all cursor-pointer text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Compare Matrix Layout */}
              {compareList.length === 1 ? (
                <div className="text-center py-10">
                  <p className="text-xs text-gray-400 font-semibold mb-2">Please select one more destination to compare side-by-side.</p>
                  <button
                    onClick={() => setShowCompareModal(false)}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-all"
                  >
                    Select Another
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-left">
                  {compareList.map((dest, idx) => (
                    <div key={idx} className="p-4 rounded-3xl bg-gray-50/50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800">
                      <div className="h-32 rounded-2xl overflow-hidden mb-3">
                        <img src={dest.image} alt={dest.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </div>
                      <h5 className="font-black text-base text-slate-800 dark:text-white mb-0.5">{dest.name}</h5>
                      <span className="text-[10px] font-bold uppercase text-[#1E90FF] tracking-wider block mb-3">{dest.region}</span>

                      {/* Specs */}
                      <div className="space-y-3.5 text-xs font-semibold">
                        <div className="pb-2 border-b border-gray-100 dark:border-slate-800">
                          <span className="text-[9px] uppercase tracking-widest text-gray-400 block mb-0.5 font-bold">Vibe & Aesthetics</span>
                          <span className="text-slate-700 dark:text-slate-200">{dest.vibe}</span>
                        </div>

                        <div className="pb-2 border-b border-gray-100 dark:border-slate-800">
                          <span className="text-[9px] uppercase tracking-widest text-gray-400 block mb-0.5 font-bold">Budget & Cost</span>
                          <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-[#1E90FF] rounded text-[10px] font-bold">
                              {dest.cost}
                            </span>
                            Approx ₹15k - ₹60k/person
                          </span>
                        </div>

                        <div className="pb-2 border-b border-gray-100 dark:border-slate-800">
                          <span className="text-[9px] uppercase tracking-widest text-gray-400 block mb-0.5 font-bold">Best Weather Months</span>
                          <span className="text-slate-700 dark:text-slate-200">{dest.season}</span>
                        </div>

                        <div className="pb-2 border-b border-gray-100 dark:border-slate-800">
                          <span className="text-[9px] uppercase tracking-widest text-gray-400 block mb-0.5 font-bold">Visa Rule</span>
                          <span className="text-slate-700 dark:text-slate-200">{dest.visa}</span>
                        </div>

                        <div className="pb-2 border-b border-gray-100 dark:border-slate-800">
                          <span className="text-[9px] uppercase tracking-widest text-gray-400 block mb-0.5 font-bold">Safety Level</span>
                          <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1">
                            ⭐ {dest.safety.toFixed(2)} / 5.0
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-gray-400 block mb-1.5 font-bold">Must-Visit Spots</span>
                          <div className="flex flex-wrap gap-1">
                            {dest.highlights.map((h, hIdx) => (
                              <span key={hIdx} className="bg-white dark:bg-slate-800 border border-gray-100/10 px-2 py-0.5 rounded text-[10px] text-gray-600 dark:text-gray-300">
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleCompare(dest)}
                        className="mt-6 w-full py-2.5 rounded-xl border border-[#1E90FF]/20 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-500 hover:border-rose-500/20 text-xs text-[#1E90FF] transition-all font-bold"
                      >
                        Remove from board
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
