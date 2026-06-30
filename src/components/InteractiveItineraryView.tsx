import React from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, Compass, MapPin, Sparkles, Navigation, Info, ArrowUpRight, 
  Clock, Shield, Star, Wallet, Hotel, Utensils, ShoppingBag, Eye, 
  Heart, HelpCircle, Phone, Printer, CheckCircle2, ChevronRight, 
  Fuel, AlertTriangle, ExternalLink, Moon, Sun, Car
} from 'lucide-react';

interface InteractiveItineraryViewProps {
  structured: any;
  language: string;
  startLocation: string;
  locationInput: string;
  travelMode: string;
  travelDate: string;
  duration: number;
}

export function InteractiveItineraryView({ 
  structured, 
  language, 
  startLocation, 
  locationInput, 
  travelMode, 
  travelDate, 
  duration 
}: InteractiveItineraryViewProps) {
  if (!structured) {
    return (
      <div className="py-12 text-center text-gray-500 font-medium">
        Loading premium structured itinerary...
      </div>
    );
  }

  const { hero, day0, days, lastDay, budgetDashboard, aiFeatures, checklist, emergencyContacts } = structured;

  const isMarathi = language.toLowerCase().startsWith("mr") || language.toLowerCase().includes("marathi");
  const isHindi = language.toLowerCase().startsWith("hi") || language.toLowerCase().includes("hindi");

  const t = {
    dayPlan: isMarathi ? "दिवसनिहाय योजना" : isHindi ? "दिन-प्रतिदिन योजना" : "Day-by-Day Plan",
    routeInfo: isMarathi ? "प्रवास आणि मार्ग माहिती" : isHindi ? "यात्रा और मार्ग विवरण" : "Route & Transit Details",
    budgetOptimizer: isMarathi ? "बजेट ऑप्टिमायझर" : isHindi ? "बजट ऑप्टिमाइज़र" : "AI Budget Optimizer",
    hiddenGems: isMarathi ? "गुप्त पर्यटन स्थळे (Hidden Gems)" : isHindi ? "छिपे हुए खजाने (Hidden Gems)" : "Travolor Hidden Gems",
    localFood: isMarathi ? "स्थानिक खाद्यसंस्कृती" : isHindi ? "स्थानीय भोजन" : "Authentic Local Cuisine",
    safetyTips: isMarathi ? "सुरक्षा मार्गदर्शक" : isHindi ? "सुरक्षा निर्देश" : "Safety & Health Guidelines",
    checklist: isMarathi ? "अंतिम चेकलिस्ट" : isHindi ? "यात्रा चेकलिस्ट" : "Pre-Trip Checklist",
    emergency: isMarathi ? "आणीबाणी संपर्क" : isHindi ? "आपातकालीन संपर्क" : "Emergency Helpdesk",
    print: isMarathi ? "प्रिंट करा" : isHindi ? "प्रिंट करें" : "Print Itinerary",
    download: isMarathi ? "माहिती जतन करा" : isHindi ? "सुरक्षित रखें" : "Save Itinerary"
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-12 text-left">
      {/* 1. Day 0: Outbound Highway Route details */}
      {day0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#000080]/5 via-white to-orange-50/20 dark:from-slate-900/40 dark:via-slate-950 p-6 md:p-10 rounded-[3rem] border border-gray-100 dark:border-slate-800 shadow-lg"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-100 dark:border-slate-800/60 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Car size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">DAY 0 • TRANSIT JOURNEY</span>
                <h3 className="text-2xl font-black text-[#000080] dark:text-white tracking-tight">{t.routeInfo}</h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                {travelMode.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5 p-4 bg-white dark:bg-slate-900/60 rounded-2xl border border-gray-100 dark:border-slate-800/80">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase">Start & Route</span>
              <p className="text-sm font-bold text-[#000080] dark:text-blue-300">{day0.route || `${startLocation} to ${locationInput}`}</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock size={12} /> Depart: <span className="font-semibold text-gray-700 dark:text-gray-300">{day0.departureTime}</span>
              </div>
            </div>
            <div className="space-y-1.5 p-4 bg-white dark:bg-slate-900/60 rounded-2xl border border-gray-100 dark:border-slate-800/80">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase">Distance & Driving Time</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{day0.distance} • {day0.drivingTime}</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Fuel size={12} /> Fuel Est: <span className="font-semibold text-gray-700 dark:text-gray-300">{day0.fuel}</span>
              </div>
            </div>
            <div className="space-y-1.5 p-4 bg-white dark:bg-slate-900/60 rounded-2xl border border-gray-100 dark:border-slate-800/80">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase">Highway Toll Estimate</span>
              <p className="text-sm font-bold text-emerald-600">{day0.toll || "₹650"}</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin size={12} /> Arr: <span className="font-semibold text-gray-700 dark:text-gray-300">{day0.arrivalTime}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-5 bg-[#1E90FF]/5 rounded-2xl border border-[#1E90FF]/10 text-xs font-semibold text-gray-600 dark:text-gray-300 space-y-3">
            <span className="text-[10px] font-black uppercase text-[#1E90FF] tracking-wider block">🚗 Optimized Transit Pit-Stops:</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-normal">
              <div>🍳 <span className="font-bold">Breakfast Stop:</span> {day0.breakfastStop}</div>
              <div>🍲 <span className="font-bold">Lunch Stop:</span> {day0.lunchStop}</div>
              <div>☕ <span className="font-bold">Coffee/Tea Stop:</span> {day0.coffeeStop}</div>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-slate-800/60 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-gray-500">
              <span>🚻 <strong>Restrooms:</strong> {day0.restStops}</span>
              <span>⛰️ <strong>Scenic Viewpoints:</strong> {day0.scenicStops}</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-dashed border-gray-100 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2">
              <Hotel size={16} className="text-[#1E90FF] shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-gray-400 uppercase text-[9px] block">Accomodation Check-In</span>
                <span className="font-bold text-gray-700 dark:text-gray-200">{day0.hotelCheckIn}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Utensils size={16} className="text-[#1E90FF] shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-gray-400 uppercase text-[9px] block">Dinner Recommendation</span>
                <span className="font-bold text-gray-700 dark:text-gray-200">{day0.dinner}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. Day-by-Day Plan with detailed cards */}
      <div className="space-y-8">
        <h3 className="text-3xl font-black text-[#000080] dark:text-white tracking-tight flex items-center gap-2">
          <Calendar className="text-[#1E90FF]" size={28} />
          {t.dayPlan}
        </h3>

        {days && days.map((day: any, dIdx: number) => (
          <motion.div 
            key={dIdx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="bg-white dark:bg-slate-900/60 rounded-[3rem] p-6 md:p-10 border border-gray-100 dark:border-slate-800 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800/10 rounded-full -mr-16 -mt-16 opacity-40 pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-5 border-b border-gray-100 dark:border-slate-800/60">
              <div className="flex items-center gap-3.5">
                <div className="bg-[#000080] text-white text-xs font-black px-4 py-1.5 rounded-full tracking-wider uppercase shadow-md">
                  Day {day.dayNum}
                </div>
                <h4 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">{day.title}</h4>
              </div>
              <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                Optimal Sightseeing Order
              </span>
            </div>

            {/* Split Sights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Morning Sight */}
              {day.morning && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Sun size={18} />
                    <span className="text-xs font-black uppercase tracking-wider">Morning Sights & Breakfast</span>
                  </div>
                  <div className="p-5 bg-orange-50/10 dark:bg-slate-900 border border-orange-500/10 dark:border-slate-800 rounded-3xl space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="text-left">
                        <h5 className="font-extrabold text-base text-[#000080] dark:text-blue-300">{day.morning.place?.name}</h5>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1 font-medium">
                          <MapPin size={11} /> {day.morning.place?.navigation}
                        </p>
                      </div>
                      {day.morning.place?.rating && (
                        <div className="flex items-center gap-1 bg-amber-400 text-slate-950 px-2 py-0.5 rounded-lg text-xs font-black shadow-sm shrink-0">
                          <Star size={11} fill="currentColor" />
                          {day.morning.place.rating}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      <div className="text-gray-500 dark:text-gray-400">
                        ⏱️ <span className="font-bold text-gray-700 dark:text-gray-300">Timings:</span> {day.morning.place?.opening} - {day.morning.place?.closing}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        🎟️ <span className="font-bold text-gray-700 dark:text-gray-300">Entry Fee:</span> {day.morning.place?.fee}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        ⏱️ <span className="font-bold text-gray-700 dark:text-gray-300">Visit Time:</span> {day.morning.place?.visitTime}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        🅿️ <span className="font-bold text-gray-700 dark:text-gray-300">Parking:</span> {day.morning.place?.parking}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        🚻 <span className="font-bold text-gray-700 dark:text-gray-300">Restrooms:</span> {day.morning.place?.washroom}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        🏥 <span className="font-bold text-gray-700 dark:text-gray-300">Hospital:</span> {day.morning.place?.hospital}
                      </div>
                    </div>

                    {day.morning.place?.photoSpot && (
                      <div className="text-xs bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-300 font-medium">
                        📸 <strong>Signature Photo Spot:</strong> {day.morning.place.photoSpot}
                      </div>
                    )}

                    {day.morning.place?.aiTips && (
                      <div className="text-xs bg-amber-500/10 text-amber-800 dark:text-amber-400 p-3 rounded-2xl border border-amber-500/10 font-semibold leading-relaxed">
                        💡 <strong>Travolor Tip:</strong> {day.morning.place.aiTips}
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500">
                      🍳 <strong>Breakfast Suggestion:</strong> {day.morning.breakfast}
                    </div>
                  </div>
                </div>
              )}

              {/* Afternoon Sight */}
              {day.afternoon && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#1E90FF]">
                    <Sun size={18} />
                    <span className="text-xs font-black uppercase tracking-wider">Afternoon Sights & Lunch</span>
                  </div>
                  <div className="p-5 bg-blue-50/10 dark:bg-slate-900 border border-[#1E90FF]/10 dark:border-slate-800 rounded-3xl space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="text-left">
                        <h5 className="font-extrabold text-base text-[#000080] dark:text-blue-300">{day.afternoon.place?.name}</h5>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1 font-medium">
                          <MapPin size={11} /> {day.afternoon.place?.navigation}
                        </p>
                      </div>
                      {day.afternoon.place?.rating && (
                        <div className="flex items-center gap-1 bg-amber-400 text-slate-950 px-2 py-0.5 rounded-lg text-xs font-black shadow-sm shrink-0">
                          <Star size={11} fill="currentColor" />
                          {day.afternoon.place.rating}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      <div className="text-gray-500 dark:text-gray-400">
                        ⏱️ <span className="font-bold text-gray-700 dark:text-gray-300">Timings:</span> {day.afternoon.place?.opening} - {day.afternoon.place?.closing}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        🎟️ <span className="font-bold text-gray-700 dark:text-gray-300">Entry Fee:</span> {day.afternoon.place?.fee}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        ⏱️ <span className="font-bold text-gray-700 dark:text-gray-300">Visit Time:</span> {day.afternoon.place?.visitTime}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        🅿️ <span className="font-bold text-gray-700 dark:text-gray-300">Parking:</span> {day.afternoon.place?.parking}
                      </div>
                    </div>

                    {day.afternoon.shopping && (
                      <div className="text-xs bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-300 font-medium">
                        🛍️ <strong>Local Special Souvenirs:</strong> {day.afternoon.shopping}
                      </div>
                    )}

                    {day.afternoon.nearbyCafes && day.afternoon.nearbyCafes.length > 0 && (
                      <div className="text-xs text-gray-500 font-medium">
                        ☕ <strong>Regional Coffee Corners:</strong> {day.afternoon.nearbyCafes.join(", ")}
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500">
                      🍲 <strong>Lunch Suggestion:</strong> {day.afternoon.lunch}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Evening & Sunset Segment */}
            {day.evening && (
              <div className="mt-8 p-5 bg-purple-50/20 dark:bg-slate-900 border border-purple-500/10 dark:border-slate-800 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-600 font-bold">
                    <Sun size={14} className="animate-pulse" />
                    <span>Sunset Point</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{day.evening.sunsetPoint}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[#1E90FF] font-bold">
                    <Utensils size={14} />
                    <span>Native Snacks</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{day.evening.streetFood}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <Moon size={14} />
                    <span>Night Vibe</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{day.evening.nightWalk}</p>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* 3. Last Day Wrap Up */}
      {lastDay && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-gray-50 via-white to-sky-50/20 dark:from-slate-950 p-6 md:p-10 rounded-[3rem] border border-gray-100 dark:border-slate-800 shadow-lg text-left"
        >
          <div className="flex items-center gap-3.5 mb-6 border-b border-gray-100 dark:border-slate-800/60 pb-5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <Compass size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">DAY {duration} • WRAP UP</span>
              <h3 className="text-2xl font-black text-[#000080] dark:text-white tracking-tight">Checkout & Return Journey</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div className="space-y-4">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="text-emerald-500 mt-1 shrink-0" size={16} />
                <p className="text-gray-700 dark:text-gray-300 font-semibold">
                  <strong>Stay Checkout:</strong> {lastDay.hotelCheckout}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="text-emerald-500 mt-1 shrink-0" size={16} />
                <p className="text-gray-700 dark:text-gray-300 font-semibold">
                  <strong>Last-Minute Markets:</strong> {lastDay.shopping}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="text-emerald-500 mt-1 shrink-0" size={16} />
                <p className="text-gray-700 dark:text-gray-300 font-semibold">
                  <strong>Midday Lunch:</strong> {lastDay.lunch}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-2.5">
                <Navigation className="text-[#1E90FF] mt-1 shrink-0" size={16} />
                <p className="text-gray-700 dark:text-gray-300 font-semibold">
                  <strong>Transit Route Home:</strong> {lastDay.returnJourney}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Navigation className="text-[#1E90FF] mt-1 shrink-0" size={16} />
                <p className="text-gray-700 dark:text-gray-300 font-semibold">
                  <strong>Reach Back Home Address:</strong> {lastDay.arrival} (Estimated: {lastDay.reachHome})
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-emerald-500/10 rounded-2xl text-center font-bold text-emerald-800 dark:text-emerald-400 text-sm">
            🎉 {lastDay.tripCompleted || "Congratulations! Your Swadesh optimized route is fully completed."}
          </div>
        </motion.div>
      )}

      {/* 4. Action Buttons (Print / Save offline) */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-gray-100 dark:border-slate-800/60">
        <button 
          onClick={handlePrint}
          className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold px-8 py-4 rounded-2xl shadow-sm flex items-center gap-2.5 transition-all text-sm cursor-pointer"
        >
          <Printer size={18} /> {t.print}
        </button>
      </div>
    </div>
  );
}
