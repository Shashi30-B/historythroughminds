import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Compass, Sparkles, MapPin, ShieldAlert, CloudRain, ShieldCheck, PhoneCall, ChevronRight, Activity, Info, RefreshCw } from "lucide-react";

interface CityData {
  city: string;
  hiddenGems: string[];
  localFood: string[];
  localMarkets: string[];
  culturalEvents: string[];
  emergency: {
    hospital: string;
    police: string;
    atm: string;
    pharmacy: string;
    petrol: string;
  };
  weather: {
    temp: string;
    condition: string;
    alertLevel: "Green" | "Yellow" | "Orange" | "Red";
    alertDesc: string;
    packingAdvice: string;
  };
}

const CITY_RECOMMENDATIONS: Record<string, CityData> = {
  goa: {
    city: "Goa (North & South)",
    hiddenGems: ["Kakolem Secluded Beach", "Cola Sweet-Water Lagoon", "Tambdi Surla ancient 12th-century Mahadev Temple", "Arvalem Rock-Cut Caves"],
    localFood: ["Goan Fish Curry", "Pork Vindaloo", "Bebinca traditional layered dessert", "Feni authentic cashew drink"],
    localMarkets: ["Anjuna Wednesday Flea Market", "Mapusa Local Spices Market", "Arpora Saturday Night Bazaar"],
    culturalEvents: ["Shigmo Cultural Parade", "St. Francis Xavier Feast", "Bonderam Flag Festival"],
    emergency: {
      hospital: "Manipal Hospital, Panaji (0832-3048800)",
      police: "Calangute Police Station (0832-2278284)",
      atm: "State Bank of India ATM, Candolim Bypass",
      pharmacy: "Wellness Forever 24/7 Chemist, Panaji",
      petrol: "Indian Oil Pump, Mapusa Crossing"
    },
    weather: {
      temp: "29°C",
      condition: "Tropical Monsoon Season",
      alertLevel: "Orange",
      alertDesc: "Heavy rainfall warning. High tide wave warnings along North beaches. Avoid deep swimming.",
      packingAdvice: "Quick-dry nylon clothing, full-size umbrellas, windcheaters, waterproof footwear."
    }
  },
  mumbai: {
    city: "Mumbai (The Dream City)",
    hiddenGems: ["Kanheri Buddhist Caves inside forest", "Sassoon Docks raw fish auction docks", "Gilbert Hill ancient 60-million year old basalt column", "Sewri Flamingo Mudflats"],
    localFood: ["Vada Pav at Ashok", "Keema Pav at Cafe Leopold", "Pav Bhaji at Sardar", "Misal Pav at Mamledar"],
    localMarkets: ["Colaba Causeway vintage stalls", "Crawford wholesale dry fruits market", "Chor Bazaar antique streets"],
    culturalEvents: ["Lalbaugcha Raja Ganeshotsav", "Kala Ghoda Art Fair", "Banganga Sacred Water Tank Music Festival"],
    emergency: {
      hospital: "Lilavati Hospital, Bandra West (022-26751000)",
      police: "Colaba Police Headquarters (022-22852811)",
      atm: "HDFC Bank ATM, Marine Drive Plaza",
      pharmacy: "Noble Plus 24/7 Pharmacy, Bandra",
      petrol: "HP Petrol Pump, Worli Seaface"
    },
    weather: {
      temp: "32°C",
      condition: "Humid & Sun Showers",
      alertLevel: "Yellow",
      alertDesc: "Sudden thunderstorm showers. Temporary waterlogging possible in low-lying suburban corridors.",
      packingAdvice: "Pocket umbrellas, breathable cotton outfits, high-grade power banks, waterproof backpack covers."
    }
  },
  delhi: {
    city: "Delhi (NCR)",
    hiddenGems: ["Agrasen ki Baoli stepwell", "Sunder Nursery landscaped Mughal gardens", "Majnu ka Tilla Tibetan Quarter", "Bhuli Bhatiyari Ka Mahal haunted ruins"],
    localFood: ["Butter Chicken at Moti Mahal", "Chole Bhature at Rama Chole", "Daulat ki Chaat sweet soufflé", "Paranthe Wali Gali pan fried breads"],
    localMarkets: ["Chandni Chowk spice streets", "Dilli Haat traditional handicraft stalls", "Khan Market premium lanes"],
    culturalEvents: ["Qutub Sacred Music Festival", "India Gate Republic Day Parade", "Phool Walon Ki Sair floral parade"],
    emergency: {
      hospital: "Max Healthcare Super Speciality, Saket (011-26515050)",
      police: "Connaught Place Police Chowki (011-23351100)",
      atm: "ICICI Bank ATM, Rajiv Chowk",
      pharmacy: "Apollo Pharmacy 24 Hours, Green Park",
      petrol: "IOCL Station, Chanakyapuri"
    },
    weather: {
      temp: "39°C",
      condition: "Summer Heatwave Dry Winds",
      alertLevel: "Red",
      alertDesc: "Severe heatwave. Peak afternoon UV Index is extreme. Keep heavily hydrated and stay indoors during 12 PM - 4 PM.",
      packingAdvice: "SPF 50+ Sunscreen lotion, wide-brim hats, polarized sunglasses, light linen outfits, insulated water flasks."
    }
  },
  srinagar: {
    city: "Srinagar (Kashmir)",
    hiddenGems: ["Dachigam National Park raw habitat", "Nigeen Lake silent floating garden", "Pari Mahal ancient astrology school", "Aru Valley high altitude meadows"],
    localFood: ["Roganjosh slow cooked mutton", "Gustaba pounded meatballs", "Kahwa sweet saffron green tea", "Yakhni thick yogurt curry"],
    localMarkets: ["Lal Chowk wool embroidery shops", "Floating Vegetable Boat Market on Dal Lake"],
    culturalEvents: ["Indira Gandhi Tulip Festival", "Kashmiri Sufi Music Night", "Winter Snow Carnival Gulmarg"],
    emergency: {
      hospital: "SMHS State Government Hospital, Srinagar (0194-2504791)",
      police: "Shergarhi Police Station, Srinagar (0194-2452093)",
      atm: "J&K Bank ATM, Dal Lake Boulevard",
      pharmacy: "Kashmir Medicos 24/7, Residency Road",
      petrol: "HP Petrol Station, Lal Chowk"
    },
    weather: {
      temp: "11°C",
      condition: "Winter Snow Frost",
      alertLevel: "Orange",
      alertDesc: "Snowfall warning on higher passes like Solang / Gulmarg. Risk of slippery roads and fog delays.",
      packingAdvice: "Heavy wool thermal inner layers, fleece winter coats, woolen gloves, thick snow boots, lip-balms."
    }
  }
};

export default function SmartRecommender() {
  const [selectedCity, setSelectedCity] = useState("goa");
  const [showSOS, setShowSOS] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const cityData = CITY_RECOMMENDATIONS[selectedCity];

  // AI Custom Deep Scan Simulation
  const handleAIScan = () => {
    setAiScanning(true);
    setAiResponse(null);
    setTimeout(() => {
      setAiScanning(false);
      setAiResponse(
        `### ✨ AI Deep Scan Result for ${cityData.city}\n\n` +
        `Our Travolor Deep Scan Engine has located further real-time, highly exclusive entries:\n\n` +
        `*   **Secret Spot**: *Chorla Ghat Forest Trail* - Quiet jungle border paths with beautiful canopy trees, perfect to escape Goa crowds.\n` +
        `*   **Curated Diners**: *Mum's Kitchen (Panaji)* - Serving authentic, historic Hindu-Goan family recipes prepared by local home-chefs.\n` +
        `*   **Culture Tip**: Ensure you try *Urak* (first distillation of Cashew Feni) if traveling in late spring - it is highly sweet and safe to sip!\n` +
        `*   **Local Secret**: Visit *St. Jacinto Island* via the stone bridge during late evenings for completely untouched Portuguese chapels.`
      );
    }, 2000);
  };

  return (
    <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-xl text-left space-y-6">
      {/* Top Selector Panel */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF] flex items-center justify-center">
            <Compass size={20} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-[#000080] dark:text-[#1E90FF] font-black text-lg">Smart Recommendation Engine</h4>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Hidden Gems, Local Food & Emergency Safety</p>
          </div>
        </div>

        {/* SOS button */}
        <button
          onClick={() => setShowSOS(true)}
          className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-500/10 cursor-pointer animate-pulse"
        >
          <ShieldAlert size={14} />
          Emergency SOS
        </button>
      </div>

      {/* Select Location */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(CITY_RECOMMENDATIONS).map((key) => (
          <button
            key={key}
            onClick={() => {
              setSelectedCity(key);
              setAiResponse(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCity === key
                ? "bg-[#1E90FF] text-white shadow-md shadow-blue-500/15"
                : "bg-gray-50 dark:bg-slate-900 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-100/10"
            }`}
          >
            📍 {CITY_RECOMMENDATIONS[key].city.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Grid: Hidden Gems vs Local Experiences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Hidden Gems */}
        <div className="p-5 rounded-[2rem] bg-indigo-50/20 dark:bg-slate-900/40 border border-gray-100/5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-[#1E90FF]" size={16} />
            <h5 className="font-extrabold text-sm text-[#000080] dark:text-blue-400 uppercase tracking-wider">
              🏞️ Hidden Gems & Off-Beat Spots
            </h5>
          </div>
          <p className="text-[11px] text-gray-400 font-bold uppercase leading-none">Uncrowded, Authentic experiences</p>

          <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {cityData.hiddenGems.map((gem, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                <ChevronRight size={14} className="text-[#1E90FF] shrink-0 mt-0.5" />
                <span>{gem}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Local Experience AI */}
        <div className="p-5 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="text-amber-500" size={16} />
            <h5 className="font-extrabold text-sm text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              🍲 Local Food & Cultural Experiences
            </h5>
          </div>
          <p className="text-[11px] text-gray-400 font-bold uppercase leading-none">Cuisines, Festivals & Markets</p>

          <div className="space-y-3.5 text-xs font-semibold">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1 font-extrabold">Must-Sip Cuisines:</span>
              <div className="flex flex-wrap gap-1">
                {cityData.localFood.map((food, idx) => (
                  <span key={idx} className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-gray-100/10 text-slate-700 dark:text-slate-300">
                    🍢 {food}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1 font-extrabold">Heritage Markets:</span>
              <div className="flex flex-wrap gap-1">
                {cityData.localMarkets.map((mkt, idx) => (
                  <span key={idx} className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-gray-100/10 text-slate-700 dark:text-slate-300">
                    👜 {mkt}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1 font-extrabold">Cultural Festivities:</span>
              <div className="flex flex-wrap gap-1">
                {cityData.culturalEvents.map((evt, idx) => (
                  <span key={idx} className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-gray-100/10 text-slate-700 dark:text-slate-300">
                    🏮 {evt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI scan trigger / details */}
      <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
        {!aiResponse ? (
          <button
            onClick={handleAIScan}
            disabled={aiScanning}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Sparkles size={14} className={aiScanning ? "animate-spin" : "animate-bounce"} />
            {aiScanning ? "AI Deep Scanning City Database..." : "AI Custom Deep Scan Gems & Experiences"}
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-[2rem] bg-orange-500/5 border border-orange-500/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed relative"
          >
            <button
              onClick={() => setAiResponse(null)}
              className="absolute top-4 right-4 text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
            <p className="whitespace-pre-line font-semibold">{aiResponse}</p>
          </motion.div>
        )}
      </div>

      {/* Weather Alert Panel */}
      <div className="p-5 rounded-[2rem] bg-sky-500/5 border border-sky-500/10 flex flex-col md:flex-row gap-5 justify-between items-start md:items-center text-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1E90FF]/15 text-[#1E90FF] flex items-center justify-center shrink-0">
            <CloudRain size={20} className="animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="font-black text-[#000080] dark:text-blue-400 text-sm">Active Weather Warning</h5>
              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                cityData.weather.alertLevel === "Green" ? "bg-emerald-500/10 text-emerald-600" :
                cityData.weather.alertLevel === "Yellow" ? "bg-yellow-500/10 text-yellow-600" :
                cityData.weather.alertLevel === "Orange" ? "bg-orange-500/10 text-orange-600" :
                "bg-rose-500/10 text-rose-600"
              }`}>
                {cityData.weather.alertLevel} Alert
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold font-mono mt-0.5">Current Temp: {cityData.weather.temp} | Condition: {cityData.weather.condition}</p>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold mt-2 max-w-xl">
              ⚠️ {cityData.weather.alertDesc}
            </p>
          </div>
        </div>

        {/* Packing Advice */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0A0E2B] border border-gray-100 dark:border-slate-850 shrink-0 max-w-xs font-semibold">
          <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#1E90FF] block mb-1">Tailored Packing Advice</span>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
            🎒 {cityData.weather.packingAdvice}
          </p>
        </div>
      </div>

      {/* SOS Drawer Overlay */}
      <AnimatePresence>
        {showSOS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#0B0F2B] border border-rose-500/30 rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl"
            >
              {/* Head */}
              <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-slate-800 mb-5">
                <ShieldAlert className="text-rose-500 animate-bounce" size={24} />
                <div className="text-left">
                  <h5 className="font-black text-rose-500 text-lg leading-tight">Emergency Assistant</h5>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Localized Helpline & Safety Directory</span>
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-3.5 text-xs text-left font-semibold">
                <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-between">
                  <div>
                    <h6 className="text-[10px] text-rose-500 uppercase tracking-wider font-extrabold">National Helpline</h6>
                    <span className="text-slate-800 dark:text-slate-100 text-sm font-black">Call 112</span>
                  </div>
                  <a href="tel:112" className="w-9 h-9 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-md">
                    <PhoneCall size={14} />
                  </a>
                </div>

                <div className="pb-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-[9px] uppercase text-gray-400 block font-bold mb-0.5">Nearest Multi-Speciality Hospital</span>
                  <span className="text-slate-700 dark:text-slate-200">{cityData.emergency.hospital}</span>
                </div>

                <div className="pb-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-[9px] uppercase text-gray-400 block font-bold mb-0.5">Local Police Station</span>
                  <span className="text-slate-700 dark:text-slate-200">{cityData.emergency.police}</span>
                </div>

                <div className="pb-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-[9px] uppercase text-gray-400 block font-bold mb-0.5">Emergency ATM Spot</span>
                  <span className="text-slate-700 dark:text-slate-200">{cityData.emergency.atm}</span>
                </div>

                <div className="pb-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-[9px] uppercase text-gray-400 block font-bold mb-0.5">24/7 Pharmacy</span>
                  <span className="text-slate-700 dark:text-slate-200">{cityData.emergency.pharmacy}</span>
                </div>

                <div>
                  <span className="text-[9px] uppercase text-gray-400 block font-bold mb-0.5">Highway Petrol Pump</span>
                  <span className="text-slate-700 dark:text-slate-200">{cityData.emergency.petrol}</span>
                </div>
              </div>

              <button
                onClick={() => setShowSOS(false)}
                className="mt-6 w-full py-3 bg-gray-50 hover:bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl text-xs font-bold transition-all border border-gray-100/10 cursor-pointer"
              >
                Close Safety Assistant
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
