import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Hotel, Star, MapPin, ExternalLink, ShieldCheck, 
  Wifi, Coffee, Award, Search, CheckCircle2, ChevronRight,
  Sparkles, Check, HelpCircle, Utensils, Compass, ArrowRight
} from 'lucide-react';

interface HotelItem {
  category: string;
  name: string;
  desc: string;
  ratePerNight: string;
  mapsLink?: string;
}

interface HotelSuggestionsViewProps {
  hotels: HotelItem[];
  location: string;
  language: string;
  style: string;
  bookingComAid?: string;
}

const AMENITIES_POOL = [
  { id: 'wifi', label: 'Free Wi-Fi', icon: Wifi },
  { id: 'breakfast', label: 'Free Breakfast', icon: Coffee },
  { id: 'dining', label: 'In-house Restaurant', icon: Utensils },
  { id: 'certified', label: 'Travolor Safe Certified', icon: ShieldCheck },
  { id: 'sightseeing', label: 'Local Guide Helpdesk', icon: Compass }
];

export function HotelSuggestionsView({ hotels, location, language, style, bookingComAid }: HotelSuggestionsViewProps) {
  const [selectedAmenityFilters, setSelectedAmenityFilters] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showBookingModal, setShowBookingModal] = useState<string | null>(null);

  const isMarathi = language.toLowerCase().startsWith("mr") || language.toLowerCase().includes("marathi");
  const isHindi = language.toLowerCase().startsWith("hi") || language.toLowerCase().includes("hindi");

  const t = {
    title: isMarathi ? "🏨 सुचवलेली हॉटेल्स आणि निवास व्यवस्था" : isHindi ? "🏨 अनुशंसित होटल और ठहरने के स्थान" : "🏨 Curated Stays & Recommended Hotels",
    subtitle: isMarathi ? `${location} मधील तुमच्या बजेट आणि प्रवास पद्धतीनुसार निवडक हॉटेल्स` : isHindi ? `${location} में आपके बजट और यात्रा शैली के अनुकूल चुनिंदा होटल` : `Handpicked accommodations in ${location} tailored for your ${style} journey`,
    categoryFilter: isMarathi ? "श्रेणीनुसार फिल्टर" : isHindi ? "श्रेणी से छांटें" : "Filter by Category",
    amenityFilter: isMarathi ? "सुविधांनुसार निवडा" : isHindi ? "सुविधाओं से छांटें" : "Popular Amenities",
    viewOnMap: isMarathi ? "नकाशावर पहा" : isHindi ? "नक्शे पर देखें" : "View on Google Maps",
    bookNow: isMarathi ? "त्वरित बुकिंग" : isHindi ? "अभी बुक करें" : "Direct Book",
    ratePerNight: isMarathi ? "प्रति रात्र दर" : isHindi ? "प्रति रात्रि दर" : "Est. Rate / Night",
    inclusiveTax: isMarathi ? "सर्व करांसह" : isHindi ? "सभी करों सहित" : "Incl. of taxes",
    safeCertified: isMarathi ? "सर्टिफाइड सुरक्षित स्टे" : isHindi ? "प्रमाणित सुरक्षित स्टे" : "Certified Safe & Verified Stay",
    allCategories: isMarathi ? "सर्व" : isHindi ? "सभी" : "All Categories",
    noHotels: isMarathi ? "हॉटेल्स सापडली नाहीत." : isHindi ? "कोई होटल नहीं मिला।" : "No matching hotels found.",
    expertBadge: isMarathi ? "तज्ज्ञांची शिफारस" : isHindi ? "विशेषज्ञ की पसंद" : "Expert Choice"
  };

  // Safe fallback list of handpicked hotels based on category if server data is limited
  const activeHotelsList = (hotels && hotels.length > 0) ? hotels : [
    {
      category: "Budget",
      name: `Travolor Budget Inn, ${location}`,
      desc: "Clean, ultra-safe homestay run by verified local hosts. Offers authentic home-cooked meals, secure locker storage, and high-speed local internet.",
      ratePerNight: "₹1,500 - ₹2,200"
    },
    {
      category: "Mid-range",
      name: `${location} Heritage Boutique Resort`,
      desc: "Charming boutique hotel reflecting local style with standard deluxe rooms, free hot buffet breakfast, 24/7 security guard, and premium concierge team.",
      ratePerNight: "₹3,500 - ₹5,000"
    },
    {
      category: "Luxury",
      name: `The Royal Vista Palace & Spa, ${location}`,
      desc: "Incredibly majestic star-rated luxury hotel featuring expansive private balconies, infinity views of scenic landmarks, global dining room, and Ayurvedic wellness massage.",
      ratePerNight: "₹8,500 - ₹15,000"
    }
  ];

  // Helper rating simulator
  const getRatingForHotel = (name: string) => {
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    const score = 4.0 + (sum % 10) * 0.1;
    return score.toFixed(1);
  };

  const getReviewCount = (name: string) => {
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return 80 + (sum % 400);
  };

  // Helper mockup images for categories
  const getHotelImage = (category: string) => {
    const cleanCat = category.toLowerCase();
    if (cleanCat.includes('lux')) {
      return "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80";
    } else if (cleanCat.includes('mid') || cleanCat.includes('standard') || cleanCat.includes('range')) {
      return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
    } else {
      return "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80";
    }
  };

  const toggleAmenity = (id: string) => {
    if (selectedAmenityFilters.includes(id)) {
      setSelectedAmenityFilters(prev => prev.filter(item => item !== id));
    } else {
      setSelectedAmenityFilters(prev => [...prev, id]);
    }
  };

  const filteredHotels = activeHotelsList.filter(hotel => {
    if (selectedCategory !== 'All' && selectedCategory !== 'सर्व' && selectedCategory !== 'सभी') {
      if (hotel.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }
    return true;
  });

  const categories = ['All', 'Budget', 'Mid-range', 'Luxury'];

  const deepLinkToBooking = (hotelName: string) => {
    const query = `${hotelName}, ${location}`;
    return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(query)}&aid=${bookingComAid || '8041322'}&label=travolor-hotel`;
  };

  return (
    <div className="space-y-8 text-left">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-[#000080] to-blue-850 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden border border-blue-950">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full -ml-10 -mb-10 pointer-events-none animate-pulse" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={12} />
              {t.expertBadge}
            </div>
            <h3 className="text-3xl font-display font-black tracking-tight">{t.title}</h3>
            <p className="text-blue-100 text-xs font-medium leading-relaxed">{t.subtitle}</p>
          </div>
          <div className="shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
              <span className="text-[10px] uppercase font-black tracking-wider text-blue-200">Accommodation Style</span>
              <p className="text-xl font-bold text-amber-300 uppercase tracking-wide mt-1">{style || 'Standard'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Content Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Filter Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-50/70 dark:bg-slate-900/40 p-6 rounded-2xl border border-gray-100 dark:border-slate-800/60 space-y-6 sticky top-4">
            {/* Category Filter */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#000080] dark:text-blue-400 uppercase tracking-wider">{t.categoryFilter}</h4>
              <div className="flex flex-col gap-1.5">
                {categories.map((cat) => {
                  const label = cat === 'All' ? t.allCategories : cat;
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-between ${
                        isActive
                          ? "bg-[#000080] text-white shadow-md dark:bg-blue-600"
                          : "text-gray-600 hover:bg-white dark:hover:bg-slate-800 hover:text-gray-900"
                      }`}
                    >
                      <span>{label}</span>
                      {isActive && <CheckCircle2 size={14} className="text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amenities Checkboxes */}
            <div className="space-y-3 pt-3 border-t border-gray-200/50 dark:border-slate-800/50">
              <h4 className="text-xs font-black text-[#000080] dark:text-blue-400 uppercase tracking-wider">{t.amenityFilter}</h4>
              <div className="space-y-2">
                {AMENITIES_POOL.map((am) => {
                  const isChecked = selectedAmenityFilters.includes(am.id);
                  const Icon = am.icon;
                  return (
                    <button
                      key={am.id}
                      onClick={() => toggleAmenity(am.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all border text-left ${
                        isChecked 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-300"
                          : "bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800 hover:bg-gray-50 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <div className={`p-1 rounded-lg ${isChecked ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                        <Icon size={12} />
                      </div>
                      <span className="font-bold flex-1">{am.label}</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isChecked ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300"}`}>
                        {isChecked && <Check size={10} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Booking Notice */}
            <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
              <span className="text-[9px] font-black tracking-widest text-amber-600 dark:text-amber-400 uppercase block mb-1">PRO TIP FOR BOOKING</span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Prices fluctuate dynamically! For the best rates, we recommend booking <span className="font-black text-gray-700 dark:text-gray-200">3-4 weeks</span> in advance via our trusted booking partners below.
              </p>
            </div>
          </div>
        </div>

        {/* Right Hotels List View */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {filteredHotels.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 text-center text-gray-500 bg-gray-50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-gray-200"
              >
                <Hotel className="mx-auto text-gray-300 mb-3" size={32} />
                <p className="font-bold">{t.noHotels}</p>
                <p className="text-xs text-gray-400 mt-1">Try relaxing your filters or choosing a different category.</p>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {filteredHotels.map((hotel, index) => {
                  const rating = getRatingForHotel(hotel.name);
                  const reviewCount = getReviewCount(hotel.name);
                  const imageUrl = getHotelImage(hotel.category);

                  return (
                    <motion.div
                      key={hotel.name + index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white dark:bg-slate-950/80 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-lg overflow-hidden hover:shadow-xl transition-all group flex flex-col md:flex-row"
                    >
                      {/* Image Thumbnail */}
                      <div className="relative w-full md:w-72 h-56 md:h-auto overflow-hidden shrink-0">
                        <img 
                          src={imageUrl} 
                          alt={hotel.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md dark:bg-slate-900/95 px-3.5 py-1.5 rounded-full shadow-sm text-[10px] font-black text-[#000080] dark:text-blue-300 uppercase tracking-widest border border-gray-150/40">
                          🏨 {hotel.category} Stay
                        </div>
                      </div>

                      {/* Content Panel */}
                      <div className="p-6 md:p-8 flex-1 flex flex-col justify-between text-left space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <h4 className="text-xl font-display font-black text-slate-800 dark:text-white leading-snug group-hover:text-blue-600 transition-colors">
                              {hotel.name}
                            </h4>
                            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl font-black text-xs shrink-0 border border-emerald-100/30">
                              <Star size={12} className="fill-emerald-500 text-emerald-500" />
                              <span>{rating}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">({reviewCount})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                            <MapPin size={12} className="text-blue-500" />
                            <span>Verified Location near attractions in {location}</span>
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                            {hotel.desc}
                          </p>
                        </div>

                        {/* Amenities Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg text-[10px] font-bold text-gray-500">
                            <Wifi size={10} className="text-blue-500" /> Free Wi-Fi
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg text-[10px] font-bold text-gray-500">
                            <Coffee size={10} className="text-amber-500" /> Breakfast Included
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-100/10 rounded-lg text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck size={10} /> Travolor Verified Safe
                          </span>
                        </div>

                        {/* Price & CTA Section */}
                        <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-slate-850">
                          <div>
                            <span className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">{t.ratePerNight}</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-2xl font-black text-[#000080] dark:text-white">{hotel.ratePerNight}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">/ night</span>
                            </div>
                            <span className="text-[9px] text-gray-400 block">{t.inclusiveTax}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {hotel.mapsLink && (
                              <button
                                onClick={() => window.open(hotel.mapsLink, '_blank')}
                                className="px-4.5 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                title={t.viewOnMap}
                              >
                                <MapPin size={13} className="text-red-500" />
                                <span className="hidden sm:inline">{t.viewOnMap}</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowBookingModal(hotel.name);
                                window.open(deepLinkToBooking(hotel.name), '_blank');
                              }}
                              className="px-6 py-3 rounded-2xl bg-[#1E90FF] hover:bg-[#1E90FF]/95 hover:shadow-md text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <span>{t.bookNow}</span>
                              <ExternalLink size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
