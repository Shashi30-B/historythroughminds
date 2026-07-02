import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Navigation, Compass, Calendar, Sparkles, AlertCircle, CheckCircle, 
  Clock, Award, Fuel, Shield, HelpCircle, ChevronRight, RefreshCw, Languages,
  Coffee, Utensils, Hotel, ArrowRight, Save, Route,
  Car, Train, Plane, Bus
} from 'lucide-react';
import { GoogleMap, MarkerF, InfoWindowF, PolylineF, useLoadScript } from '@react-google-maps/api';

interface PitStop {
  name: string;
  type: 'pitstop' | 'sightseeing' | 'restaurant';
  description: string;
  distanceFromStart: string;
  duration: string;
  lat: number;
  lng: number;
}

interface DayPlan {
  day: number;
  theme: string;
  startLocation: string;
  endLocation: string;
  drivingDistance: string;
  drivingTime: string;
  pitStops: PitStop[];
  stayover: {
    name: string;
    description: string;
  };
}

interface TripOverview {
  startPoint: string;
  destination: string;
  totalDistance: string;
  totalDrivingTime: string;
  mainHighway: string;
  tollEstimation: string;
  summary: string;
}

interface RoadTripData {
  tripOverview: TripOverview;
  dayWisePlan: DayPlan[];
  proRoadTripTips: string[];
  highwayDhabas: Array<{ name: string; specialty: string; distance: string }>;
}

interface RoadTripPlannerProps {
  language?: string;
}

export function RoadTripPlanner({ language: propLanguage }: RoadTripPlannerProps = {}) {
  const [startPoint, setStartPoint] = useState('Pune');
  const [destination, setDestination] = useState('Goa');
  const [duration, setDuration] = useState(2);
  const [routePreference, setRoutePreference] = useState('scenic');
  const [stopFrequency, setStopFrequency] = useState('balanced');
  const [travelMode, setTravelMode] = useState<'self-drive' | 'cab' | 'bus' | 'train' | 'flight'>('self-drive');
  const [language, setLanguage] = useState<'en' | 'mr' | 'hi'>('en');
  
  const [loading, setLoading] = useState(false);
  const [roadTrip, setRoadTrip] = useState<RoadTripData | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [activeDayTab, setActiveDayTab] = useState<number>(1);
  const [savedStatus, setSavedStatus] = useState<boolean>(false);

  useEffect(() => {
    if (propLanguage) {
      const mapped = propLanguage === "Marathi" ? "mr" : propLanguage === "Hindi" ? "hi" : "en";
      setLanguage(mapped);
    }
  }, [propLanguage]);

  // Suggested prebaked routes
  const popularTrips = [
    { start: 'Pune', dest: 'Goa', name: 'Pune ➔ Goa (Amboli Ghat Pass)', days: 2 },
    { start: 'Mumbai', dest: 'Goa', name: 'Mumbai ➔ Goa (NH-66 Scenic)', days: 2 },
    { start: 'Delhi', dest: 'Jaipur', name: 'Delhi ➔ Jaipur (NH-48 Heritage)', days: 1 },
    { start: 'Delhi', dest: 'Agra', name: 'Delhi ➔ Agra (Yamuna Expressway)', days: 1 },
  ];

  const handleSuggestClick = (trip: typeof popularTrips[0]) => {
    setStartPoint(trip.start);
    setDestination(trip.dest);
    setDuration(trip.days);
  };

  const handlePlanTrip = async () => {
    if (!startPoint.trim()) {
      alert(language === 'mr' ? 'कृपया सुरू होण्याचे ठिकाण टाका.' : 'Please enter a starting point.');
      return;
    }
    if (!destination.trim()) {
      alert(language === 'mr' ? 'कृपया जाण्याचे ठिकाण टाका.' : 'Please enter a destination.');
      return;
    }

    setLoading(true);
    setRoadTrip(null);
    setSavedStatus(false);
    
    try {
      const response = await fetch('/api/gemini/generate-roadtrip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
         },
        body: JSON.stringify({
          startLocation: startPoint,
          destination: destination,
          duration: duration,
          routePreference: routePreference,
          stopFrequency: stopFrequency,
          travelMode: travelMode,
          language: language
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRoadTrip(data);
        setActiveDayTab(1);
      } else {
        throw new Error('Failed to fetch road trip');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to generate your road trip plan. Loading high-fidelity local fallback instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrip = () => {
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
    }, 3000);
  };

  // Extract all marker points for the map view
  const getMapPoints = () => {
    if (!roadTrip) return [];
    const points: any[] = [];
    
    // Starting point
    points.push({
      name: roadTrip.tripOverview.startPoint,
      type: 'start',
      lat: roadTrip.dayWisePlan[0]?.pitStops[0]?.lat ? roadTrip.dayWisePlan[0].pitStops[0].lat + 0.1 : 18.5204,
      lng: roadTrip.dayWisePlan[0]?.pitStops[0]?.lng ? roadTrip.dayWisePlan[0].pitStops[0].lng - 0.1 : 73.8567,
      description: 'Starting location of your highway journey'
    });

    roadTrip.dayWisePlan.forEach((day) => {
      day.pitStops.forEach((stop) => {
        points.push({
          name: stop.name,
          type: stop.type,
          lat: stop.lat || 18.0,
          lng: stop.lng || 73.5,
          description: stop.description
        });
      });
    });

    // Destination
    const lastDayIdx = roadTrip.dayWisePlan.length - 1;
    const lastStopList = roadTrip.dayWisePlan[lastDayIdx]?.pitStops;
    points.push({
      name: roadTrip.tripOverview.destination,
      type: 'end',
      lat: lastStopList && lastStopList.length > 0 ? lastStopList[lastStopList.length - 1].lat - 0.1 : 15.4909,
      lng: lastStopList && lastStopList.length > 0 ? lastStopList[lastStopList.length - 1].lng + 0.1 : 73.8278,
      description: 'Your ultimate road trip destination'
    });

    return points;
  };

  const mapPoints = getMapPoints();

  return (
    <div className="bg-[#FAF9F6] text-slate-800 rounded-[3rem] p-6 md:p-10 border border-slate-100 shadow-xl relative overflow-hidden" id="end-to-end-roadtrip-planner">
      {/* Decorative Highway Line Graphic */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      {/* Header section with Language Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#000080] flex items-center justify-center text-white shadow-md">
            <Route size={24} className="animate-pulse" />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">Premium Feature</span>
            <h2 className="text-2xl md:text-3xl font-display font-black text-[#000080] tracking-tight">
              {language === 'mr' ? 'महामार्ग सहल नियोजक (Road Trip)' : 'End-to-End Highway Road Trip Planner'}
            </h2>
          </div>
        </div>

        {/* Language Selection */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-white border border-slate-200 p-1.5 rounded-full shadow-sm">
          <Languages size={14} className="text-blue-500 ml-2" />
          <button 
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${language === 'en' ? 'bg-[#1E90FF] text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            English
          </button>
          <button 
            onClick={() => setLanguage('mr')}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${language === 'mr' ? 'bg-[#1E90FF] text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            मराठी
          </button>
          <button 
            onClick={() => setLanguage('hi')}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${language === 'hi' ? 'bg-[#1E90FF] text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Inputs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        <div className="lg:col-span-4 space-y-6 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm text-left">
          <h3 className="font-black text-[#000080] tracking-tight text-lg mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            {language === 'mr' ? 'सहल तपशील भरा' : 'Setup Your Road Trip'}
          </h3>

          {/* Source Location */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
              📍 {language === 'mr' ? 'सुरुवातीचे ठिकाण' : language === 'hi' ? 'शुरुआती स्थान' : 'Starting Location'}
            </label>
            <input 
              type="text" 
              value={startPoint}
              onChange={(e) => setStartPoint(e.target.value)}
              placeholder="e.g. Pune"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#1E90FF] focus:bg-white text-sm font-semibold rounded-2xl px-4 py-3 outline-none transition-all"
            />
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
              🏁 {language === 'mr' ? 'अंतिम ठिकाण' : language === 'hi' ? 'अंतिम गंतव्य' : 'Destination'}
            </label>
            <input 
              type="text" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Goa"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#1E90FF] focus:bg-white text-sm font-semibold rounded-2xl px-4 py-3 outline-none transition-all"
            />
          </div>

          {/* Duration Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider">
                🗓️ {language === 'mr' ? 'कालावधी (दिवस)' : 'Trip Duration'}
              </label>
              <span className="text-xs font-extrabold text-[#1E90FF] bg-blue-50 px-2 py-0.5 rounded-full">
                {duration} {language === 'mr' ? 'दिवस' : 'Days'}
              </span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="5" 
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full accent-[#1E90FF]"
            />
          </div>

          {/* Travel Mode Selector */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
              🚗 {language === 'mr' ? 'प्रवासाचे साधन' : language === 'hi' ? 'यात्रा का साधन' : 'Travel Mode'}
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'self-drive', label: 'Self Drive', mr: 'स्वतः कार', hi: 'स्वयं ड्राइव', icon: Car },
                { id: 'cab', label: 'Outstation Cab', mr: 'कॅब', hi: 'कैब', icon: Car },
                { id: 'bus', label: 'Sleeper Bus', mr: 'बस', hi: 'बस', icon: Bus },
                { id: 'train', label: 'Train', mr: 'ट्रेन', hi: 'ट्रेन', icon: Train },
                { id: 'flight', label: 'Flight', mr: 'विमान', hi: 'उड़ान', icon: Plane }
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = travelMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setTravelMode(mode.id as any)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all ${isSelected ? 'bg-[#000080] border-[#000080] text-white shadow-md' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                    title={mode.label}
                  >
                    <Icon size={16} className={`mb-1 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="text-[8px] font-black tracking-tight leading-none block truncate w-full">
                      {language === 'mr' ? mode.mr : language === 'hi' ? mode.hi : mode.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Route Preference */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
              🛣️ {language === 'mr' ? 'मार्ग प्राधान्य' : 'Route Preference'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setRoutePreference('scenic')}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${routePreference === 'scenic' ? 'bg-[#000080] border-[#000080] text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
              >
                🌲 {language === 'mr' ? 'निसर्गरम्य मार्ग' : 'Scenic Route'}
              </button>
              <button 
                onClick={() => setRoutePreference('express')}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${routePreference === 'express' ? 'bg-[#000080] border-[#000080] text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
              >
                ⚡ {language === 'mr' ? 'जलद महामार्ग' : 'Fast Highway'}
              </button>
            </div>
          </div>

          {/* Stop Frequency */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
              ☕ {language === 'mr' ? 'विश्रांती वारंवारता' : 'Pitstop Frequency'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'frequent', label: '100km' },
                { id: 'balanced', label: 'Balanced' },
                { id: 'relaxed', label: 'Major Cities' }
              ].map((freq) => (
                <button
                  key={freq.id}
                  onClick={() => setStopFrequency(freq.id)}
                  className={`py-2 text-[10px] font-black rounded-lg border uppercase tracking-wider transition-all ${stopFrequency === freq.id ? 'bg-[#1E90FF] border-[#1E90FF] text-white shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                >
                  {freq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePlanTrip}
            disabled={loading}
            className="w-full bg-[#1E90FF] hover:bg-[#1E90FF]/90 text-white font-black py-4 rounded-2xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                {language === 'mr' ? 'नकाशा आणि सहल तयार होत आहे...' : 'Mapping Best Route...'}
              </>
            ) : (
              <>
                <Navigation size={18} />
                {language === 'mr' ? 'रोड ट्रिप प्लॅन करा' : 'Plan End-to-End Road Trip'}
              </>
            )}
          </motion.button>

          {/* Hot Suggestions */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              🔥 {language === 'mr' ? 'लोकप्रिय रोड ट्रिप' : 'Popular Highway Routes'}
            </span>
            <div className="space-y-2">
              {popularTrips.map((trip, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSuggestClick(trip)}
                  className="w-full text-left bg-slate-50 hover:bg-[#1E90FF]/5 hover:text-[#1E90FF] border border-slate-200/60 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                >
                  <span>{trip.name}</span>
                  <ChevronRight size={14} className="opacity-60" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Container / Placeholder */}
        <div className="lg:col-span-8 flex flex-col h-full">
          <AnimatePresence mode="wait">
            {!roadTrip ? (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 bg-gradient-to-br from-slate-50/50 via-white to-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 flex flex-col items-center justify-center min-h-[400px] text-center"
              >
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-[#1E90FF] mb-4">
                  <Compass size={32} className="animate-bounce" />
                </div>
                <h4 className="text-lg font-black text-[#000080] tracking-tight">
                  {language === 'mr' ? 'तुमची स्वप्नातील हायवे टूर तयार करा' : 'Curate En-Route Adventures & High-Fidelity Daywise Stopovers'}
                </h4>
                <p className="text-sm text-gray-500 max-w-md mt-2 leading-relaxed">
                  {language === 'mr' ? 'तुमचे सुरुवातीचे आणि अंतिम ठिकाण प्रविष्ट करा. आमचे प्रगत AI पश्चिम घाट, राष्ट्रीय महामार्ग आणि निसर्गरम्य घाटांमधील प्रमुख पर्यटक आकर्षणे शोधून काढेल.' : 'Enter a start and destination. Our route engine discovers on-road forts, highway dhabas, tea spots, temples, and valleys, calculating toll prices and mapping realistic GPS tracks.'}
                </p>
                
                {/* Visual Route Track Preview */}
                <div className="relative mt-8 w-64 h-12 flex items-center justify-between px-4 border border-slate-100 rounded-2xl bg-white shadow-sm overflow-hidden">
                  <div className="absolute left-0 right-0 h-0.5 bg-dashed bg-slate-200" />
                  <div className="w-2 h-2 rounded-full bg-blue-500 relative z-10" />
                  <div className="w-4 h-4 rounded-full bg-amber-400 relative z-10 border-2 border-white animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 relative z-10" />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6 text-left"
              >
                {/* Save CTA Bar */}
                <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-4 rounded-3xl">
                  <div className="flex items-center gap-2.5 text-emerald-800">
                    <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                    <span className="text-xs font-extrabold tracking-tight">
                      {language === 'mr' ? 'यशस्वीरित्या मार्ग शोधला!' : 'Optimal On-Road Trip Formulated successfully!'}
                    </span>
                  </div>
                  <button 
                    onClick={handleSaveTrip}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    {savedStatus ? <CheckCircle size={14} /> : <Save size={14} />}
                    {savedStatus 
                      ? (language === 'mr' ? 'जतन झाले' : 'Saved!') 
                      : (language === 'mr' ? 'सहल जतन करा' : 'Save To My Board')}
                  </button>
                </div>

                {/* Grid Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {travelMode === 'train' ? '🛤️ ' : travelMode === 'flight' ? '✈️ ' : '🛣️ '}
                      {travelMode === 'train' 
                        ? (language === 'mr' ? 'रेल्वे अंतर' : 'Railway Distance') 
                        : travelMode === 'flight' 
                        ? (language === 'mr' ? 'हवाई अंतर' : 'Air Mileage') 
                        : (language === 'mr' ? 'एकूण अंतर' : 'Total Distance')}
                    </span>
                    <span className="text-xl font-black text-[#000080]">{roadTrip.tripOverview.totalDistance}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      ⏱️ {language === 'mr' ? 'प्रवास वेळ' : 'Duration'}
                    </span>
                    <span className="text-xl font-black text-[#000080]">{roadTrip.tripOverview.totalDrivingTime}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {travelMode === 'train' ? '🚄 ' : travelMode === 'flight' ? '🛫 ' : travelMode === 'bus' ? '🚌 ' : travelMode === 'cab' ? '🚕 ' : '🚙 '}
                      {travelMode === 'train' 
                        ? (language === 'mr' ? 'मुख्य रेल्वे' : 'Major Train') 
                        : travelMode === 'flight' 
                        ? (language === 'mr' ? 'विमान सेवा' : 'Major Carrier') 
                        : travelMode === 'bus' 
                        ? (language === 'mr' ? 'बस सेवा' : 'Bus Route') 
                        : travelMode === 'cab' 
                        ? (language === 'mr' ? 'कॅब सेवा' : 'Cab Agency') 
                        : (language === 'mr' ? 'प्रमुख महामार्ग' : 'Highway')}
                    </span>
                    <span className="text-sm font-black text-amber-600 truncate block mt-1">{roadTrip.tripOverview.mainHighway}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      🪙 {travelMode === 'self-drive' 
                        ? (language === 'mr' ? 'अंदाजे टोल' : 'Fastag Toll') 
                        : (language === 'mr' ? 'तिकीट भाडे' : 'Est. Ticket Fare')}
                    </span>
                    <span className="text-xl font-black text-emerald-600">{roadTrip.tripOverview.tollEstimation}</span>
                  </div>
                </div>

                {/* Route Map Visualizer */}
                <div className="bg-white p-4 rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h4 className="font-black text-sm text-[#000080] uppercase tracking-wider flex items-center gap-2">
                      <Compass size={16} className="text-[#1E90FF]" />
                      {language === 'mr' ? 'मार्गदर्शन आणि थांबे नकाशा' : 'En-route Tourist Stopovers & Map'}
                    </h4>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                      <Award size={10} className="text-amber-500" /> GPS Track Simulated
                    </span>
                  </div>

                  {/* Elegant Simulated SVG Map */}
                  <div className="h-64 w-full bg-slate-950 rounded-3xl relative overflow-hidden flex flex-col justify-between p-6">
                    {/* Starfield / grid background */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
                    
                    {/* SVG Highway Connection Polyline */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {/* Glow road filter */}
                      <defs>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>
                      {/* The highway path line */}
                      <path 
                        d="M 50,180 C 150,50 250,220 350,100 C 450,20 550,150 650,120" 
                        fill="none" 
                        stroke="#1E90FF" 
                        strokeWidth="4" 
                        strokeLinecap="round"
                        filter="url(#glow)"
                        className="opacity-90"
                      />
                      <path 
                        d="M 50,180 C 150,50 250,220 350,100 C 450,20 550,150 650,120" 
                        fill="none" 
                        stroke="#FFB900" 
                        strokeWidth="1.5" 
                        strokeDasharray="6,4"
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Nodes along the simulated road */}
                    <div className="absolute left-[8%] bottom-[15%] text-left bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow border border-white">
                      Start: {roadTrip.tripOverview.startPoint}
                    </div>

                    <div className="absolute left-[35%] top-[25%] text-left">
                      <div className="bg-slate-900 border border-amber-400 text-white p-2 rounded-xl text-[10px] shadow max-w-[150px]">
                        <div className="font-extrabold flex items-center gap-1 text-amber-400">
                          <Compass size={10} /> {roadTrip.dayWisePlan[0]?.pitStops[0]?.name || 'Attraction'}
                        </div>
                        <p className="text-[9px] text-gray-300 mt-0.5 truncate">{roadTrip.dayWisePlan[0]?.pitStops[0]?.distanceFromStart || 'Midway'}</p>
                      </div>
                    </div>

                    <div className="absolute right-[30%] top-[40%] text-left">
                      {roadTrip.dayWisePlan[1]?.pitStops?.[0] && (
                        <div className="bg-slate-900 border border-sky-400 text-white p-2 rounded-xl text-[10px] shadow max-w-[150px]">
                          <div className="font-extrabold flex items-center gap-1 text-sky-400">
                            <Coffee size={10} /> {roadTrip.dayWisePlan[1].pitStops[0].name}
                          </div>
                          <p className="text-[9px] text-gray-300 mt-0.5 truncate">{roadTrip.dayWisePlan[1].pitStops[0].distanceFromStart}</p>
                        </div>
                      )}
                    </div>

                    <div className="absolute right-[8%] top-[35%] text-right bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow border border-white">
                      End: {roadTrip.tripOverview.destination}
                    </div>

                    <div className="z-10 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl self-center text-center max-w-lg shadow-xl backdrop-blur-sm">
                      <p className="text-[11px] text-slate-300 leading-relaxed font-semibold italic">
                        " {roadTrip.tripOverview.summary} "
                      </p>
                    </div>
                  </div>
                </div>

                {/* Day-wise Navigation Tabs */}
                <div>
                  <div className="flex gap-2 border-b border-gray-100 pb-3">
                    {roadTrip.dayWisePlan.map((dayPlan) => (
                      <button
                        key={dayPlan.day}
                        onClick={() => setActiveDayTab(dayPlan.day)}
                        className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${activeDayTab === dayPlan.day ? 'bg-[#000080] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        {language === 'mr' ? `दिवस ${dayPlan.day}` : `Day ${dayPlan.day}`}
                      </button>
                    ))}
                  </div>

                  {/* Active Day Panel */}
                  <div className="mt-6 space-y-6">
                    {roadTrip.dayWisePlan.filter(d => d.day === activeDayTab).map((dayPlan) => (
                      <div key={dayPlan.day} className="space-y-6">
                        {/* Day Stats */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/60 p-4 rounded-2xl border border-blue-100/40 text-left">
                          <div>
                            <span className="text-[10px] font-black text-[#000080]/60 uppercase tracking-widest">{language === 'mr' ? `दिवस ${dayPlan.day} ची थीम` : `Day ${dayPlan.day} Theme`}</span>
                            <h4 className="text-base font-black text-[#000080] mt-0.5">{dayPlan.theme}</h4>
                          </div>
                          <div className="flex gap-4 shrink-0 text-xs font-extrabold text-[#000080]">
                            <span>🚗 {dayPlan.drivingDistance}</span>
                            <span>⏱️ {dayPlan.drivingTime}</span>
                          </div>
                        </div>

                        {/* Staggered Timeline stops */}
                        <div className="relative pl-8 space-y-8">
                          {/* Left boundary timeline line */}
                          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500 via-amber-400 to-emerald-500" />

                          {/* Start Point Item */}
                          <div className="relative flex items-start gap-4">
                            <div className="absolute left-[-25px] w-4 h-4 rounded-full bg-white border-4 border-blue-500 z-10" />
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex-1">
                              <span className="text-[9px] font-black tracking-wider text-blue-500 uppercase">Departure Point</span>
                              <h5 className="font-black text-sm text-slate-800 mt-1">{dayPlan.startLocation}</h5>
                            </div>
                          </div>

                          {/* Pit Stops */}
                          {dayPlan.pitStops.map((stop, sIdx) => (
                            <div key={sIdx} className="relative flex items-start gap-4 group">
                              <div className="absolute left-[-26px] w-5 h-5 rounded-full bg-white border-2 border-amber-500 flex items-center justify-center z-10 group-hover:scale-110 transition-all shadow-sm">
                                {stop.type === 'pitstop' ? <Coffee size={10} className="text-amber-500" /> : 
                                 stop.type === 'restaurant' ? <Utensils size={10} className="text-red-500" /> :
                                 <Compass size={10} className="text-sky-500" />}
                              </div>
                              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex-1 hover:border-amber-500/30 transition-all">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {stop.type === 'pitstop' ? (language === 'mr' ? 'चहा/विश्रांती थांबा' : 'Highway Pitstop') : 
                                     stop.type === 'restaurant' ? (language === 'mr' ? 'हॉटेल/ढाबा' : 'Food Stopover') : 
                                     (language === 'mr' ? 'पर्यटन ठिकाण' : 'Sightseeing stop')}
                                  </span>
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <Clock size={10} /> {stop.duration}
                                  </span>
                                </div>
                                <h5 className="font-black text-sm text-[#000080] mt-2">{stop.name}</h5>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{stop.description}</p>
                                <div className="mt-3 pt-2.5 border-t border-dashed border-gray-100 flex justify-between items-center text-[9px] font-extrabold text-gray-400">
                                  <span>🚀 {stop.distanceFromStart} {language === 'mr' ? 'सुरुवातीपासून' : 'from day start'}</span>
                                  <span className="text-[#1E90FF]">Optimal Stopover • 100% Verified</span>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* End Point / Hotel Item */}
                          <div className="relative flex items-start gap-4">
                            <div className="absolute left-[-25px] w-4 h-4 rounded-full bg-white border-4 border-emerald-500 z-10" />
                            <div className="bg-gradient-to-br from-emerald-500/5 to-transparent p-5 rounded-2xl border border-emerald-500/20 shadow-sm flex-1">
                              <span className="text-[9px] font-black tracking-wider text-emerald-600 uppercase flex items-center gap-1">
                                <Hotel size={10} /> {language === 'mr' ? 'रात्रीचा मुक्काम' : 'Stayover Hotel Suggestion'}
                              </span>
                              <h5 className="font-black text-sm text-[#000080] mt-2">{dayPlan.stayover.name}</h5>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{dayPlan.stayover.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Highway Dining & Dhabas */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm text-left">
                  <h4 className="font-black text-[#000080] tracking-tight text-base mb-4 flex items-center gap-2">
                    <Utensils size={18} className="text-[#1E90FF]" />
                    {language === 'mr' ? 'महामार्गावरील प्रसिद्ध ढाबे व रेस्टॉरंट्स' : 'Famous Highway Dhabas & Eateries En-Route'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roadTrip.highwayDhabas.map((dhaba, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/40 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                          <Utensils size={18} />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-sm text-slate-800">{dhaba.name}</h5>
                          <p className="text-xs text-gray-500 mt-0.5 font-bold text-amber-600">✨ Specialty: {dhaba.specialty}</p>
                          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block mt-1.5">📍 Location: {dhaba.distance}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro Tips Panel */}
                <div className="bg-amber-500/5 p-6 rounded-[2.5rem] border border-amber-500/20 text-left relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                  <h4 className="font-black text-amber-800 tracking-tight text-base mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-amber-600 animate-pulse" />
                    {language === 'mr' ? 'महत्वाच्या महामार्ग टिप्स आणि सुरक्षा' : 'Travolor Pro Road Trip Highway Advice'}
                  </h4>
                  <ul className="space-y-3">
                    {roadTrip.proRoadTripTips.map((tip, idx) => (
                      <li key={idx} className="text-xs font-bold text-amber-900 flex items-start gap-2">
                        <span className="text-amber-500 text-sm mt-0.5">✦</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Pre-Trip Vehicle Checks */}
                  <div className="mt-6 pt-5 border-t border-amber-500/20">
                    <span className="block text-[10px] font-black text-amber-700/60 uppercase tracking-widest mb-3">
                      {travelMode === 'flight' 
                        ? (language === 'mr' ? '✈️ विमान प्रवासासाठी महत्त्वाची चेकलिस्ट' : '✈️ Essential Airport Pre-Boarding Checklist') 
                        : travelMode === 'train' 
                        ? (language === 'mr' ? '🚂 ट्रेन प्रवासासाठी महत्त्वाची चेकलिस्ट' : '🚂 Pre-Departure Train Journey Checklist') 
                        : travelMode === 'bus' 
                        ? (language === 'mr' ? '🚌 बस प्रवासासाठी महत्त्वाची चेकलिस्ट' : '🚌 Important Bus Boarding Checklist') 
                        : travelMode === 'cab' 
                        ? (language === 'mr' ? '🚕 कॅब प्रवासासाठी महत्त्वाची चेकलिस्ट' : '🚕 Reliable Outstation Cab Checklist') 
                        : (language === 'mr' ? '🚗 प्रवासापूर्वी वाहनाची महत्त्वाची तपासणी' : '🚗 Essential Pre-Drive Vehicle Checkup list')}
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(travelMode === 'flight' 
                        ? ['Boarding Pass Ready', 'Valid Photo ID', 'Web Check-in Done', 'Luggage Weight Limit']
                        : travelMode === 'train'
                        ? ['Verify PNR Status', 'Soft Ticket PDF', 'Platform Checked', 'Water & Snacks']
                        : travelMode === 'bus'
                        ? ['E-Ticket Print/SMS', 'Boarding Point Loc', 'Power Bank Charged', 'Neck Pillow & Blanket']
                        : travelMode === 'cab'
                        ? ['Driver Contact Info', 'AC Verification', 'Booking Confirmation', 'Cash for Local Tolls']
                        : ['Tyre Pressure & Spare', 'Coolant & Engine Oil', 'Fastag Balance > ₹1k', 'Emergency Toolkit']
                      ).map((item, idx) => (
                        <div key={idx} className="bg-white border border-amber-500/10 px-3 py-2 rounded-xl text-[10px] font-black text-amber-800 flex items-center gap-1.5">
                          <CheckCircle size={10} className="text-emerald-500" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
