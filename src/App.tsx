/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Calendar, Wallet, Search, Map as MapIcon, 
  Utensils, Hotel, Navigation, Sparkles, Loader2, 
  User, Users, Heart, Users2, Church, Trees, Castle,
  Clock, Thermometer, Info, ExternalLink, Compass,
  Mountain, Briefcase, Crown, Wallet as WalletIcon,
  Home, Globe, Briefcase as BookingIcon, User as ProfileIcon,
  ArrowRight, ArrowLeft, Camera, ShoppingBag, Lightbulb,
  Bell, Moon, Sun, Languages, LogOut, Settings, HelpCircle, ShieldCheck, Phone,
  AlertTriangle, Check,
  Mail, Lock, Eye, EyeOff, Github, Share2,
  Plane, TrainFront, Bus, Car, Package,
  GripVertical, MapPin as MapPinIcon, Navigation2, Zap
} from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { generateItinerary, getSuggestions } from './services/geminiService';
import { TRAVEL_STYLES } from './constants';

const libraries: ("places")[] = ["places"];

import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile as firebaseUpdateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  updateDoc,
  orderBy
} from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const StyleColors: Record<string, { bg: string; text: string; border: string; light: string }> = {
  budget: { bg: "bg-emerald-600", text: "text-emerald-600", border: "border-emerald-200", light: "bg-emerald-50" },
  standard: { bg: "bg-[#000080]", text: "text-[#000080]", border: "border-blue-200", light: "bg-blue-50" },
  luxury: { bg: "bg-purple-600", text: "text-purple-600", border: "border-purple-200", light: "bg-purple-50" },
  backpacking: { bg: "bg-orange-600", text: "text-orange-600", border: "border-orange-200", light: "bg-orange-50" },
  family: { bg: "bg-teal-600", text: "text-teal-600", border: "border-teal-200", light: "bg-teal-50" },
  honeymoon: { bg: "bg-pink-600", text: "text-pink-600", border: "border-pink-200", light: "bg-pink-50" },
  adventure: { bg: "bg-red-600", text: "text-red-600", border: "border-red-200", light: "bg-red-50" },
  spiritual: { bg: "bg-amber-600", text: "text-amber-600", border: "border-amber-200", light: "bg-amber-50" },
};

const IconMap: Record<string, any> = {
  Wallet: WalletIcon,
  Briefcase,
  Crown,
  Compass,
  Heart,
  Users,
  Sparkles,
  Mountain
};

const BOOKING_SERVICES = [
  { id: 'hotels', label: 'Hotels', icon: Hotel, color: 'bg-[#1E90FF]', link: (from: string, to: string) => `https://www.makemytrip.com/hotels/hotel-listing/?city=${encodeURIComponent(to)}` },
  { id: 'flights', label: 'Flights', icon: Plane, color: 'bg-[#000080]', link: (from: string, to: string) => `https://www.makemytrip.com/flight/search?itinerary=${encodeURIComponent(from)}-${encodeURIComponent(to)}-${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E` },
  { id: 'trains', label: 'Trains', icon: TrainFront, color: 'bg-red-600', link: (from: string, to: string) => `https://www.makemytrip.com/railways/listing?srcCity=${encodeURIComponent(from)}&destCity=${encodeURIComponent(to)}&date=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}` },
  { id: 'buses', label: 'Buses', icon: Bus, color: 'bg-rose-500', link: (from: string, to: string) => `https://www.redbus.in/search?fromCityName=${encodeURIComponent(from)}&toCityName=${encodeURIComponent(to)}` },
  { id: 'cabs', label: 'Cabs', icon: Car, color: 'bg-amber-500', link: (from: string, to: string) => `https://www.makemytrip.com/cabs/listing/?fromCity=${encodeURIComponent(from)}&toCity=${encodeURIComponent(to)}` },
  { id: 'packages', label: 'Packages', icon: Package, color: 'bg-purple-600', link: (from: string, to: string) => `https://www.makemytrip.com/holiday-packages/search?dest=${encodeURIComponent(to)}` },
];

const TRENDING_DESTINATIONS = [
  { id: 'goa', title: 'Goa', desc: 'Beaches & Parties', img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80' },
  { id: 'dubai', title: 'Dubai', desc: 'Luxury & Desert', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=400&q=80' },
  { id: 'bali', title: 'Bali', desc: 'Tropical Paradise', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=400&q=80' },
  { id: 'manali', title: 'Manali', desc: 'Snowy Peaks', img: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=400&q=80' },
  { id: 'ladakh', title: 'Ladakh', desc: 'Mountain Adventure', img: 'https://images.unsplash.com/photo-1581791534721-e599df4417f7?auto=format&fit=crop&w=400&q=80' },
];

const SPECIAL_DEALS = [
  { id: 1, title: 'Cheap Flights', desc: 'Up to 30% off on international flights', icon: Plane, color: 'bg-blue-500' },
  { id: 2, title: 'Hotel Deals', desc: 'Stay 3 nights, pay for 2 in luxury resorts', icon: Hotel, color: 'bg-emerald-500' },
  { id: 3, title: 'Weekend Trips', desc: 'Exclusive packages for short getaways', icon: Mountain, color: 'bg-orange-500' },
];

const TRAVEL_INSPIRATION = [
  { id: 'beach', title: 'Beach Trips', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80' },
  { id: 'adventure', title: 'Adventure Trips', img: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?auto=format&fit=crop&w=400&q=80' },
  { id: 'family', title: 'Family Trips', img: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=400&q=80' },
  { id: 'budget', title: 'Budget Trips', img: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&w=400&q=80' },
];

const TRAVEL_STATS = [
  { label: 'Trips Planned', value: '50K+' },
  { label: 'Destinations', value: '100+' },
  { label: 'Happy Travelers', value: '20K+' },
];

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("shimmer bg-white/10 rounded-xl", className)} />
);

const SkeletonCard = () => (
  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-6 space-y-4">
    <Skeleton className="h-48 w-full rounded-[2rem]" />
    <div className="space-y-2">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-10 flex-1 rounded-xl" />
      <Skeleton className="h-10 w-12 rounded-xl" />
    </div>
  </div>
);

const SkeletonPlan = () => (
  <div className="space-y-8">
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[3rem] p-8 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  </div>
);

const FALLBACK_CITIES = [
  { description: 'Mumbai, Maharashtra, India', place_id: 'mumbai', structured_formatting: { main_text: 'Mumbai', secondary_text: 'Maharashtra, India' } },
  { description: 'Delhi, India', place_id: 'delhi', structured_formatting: { main_text: 'Delhi', secondary_text: 'India' } },
  { description: 'Bangalore, Karnataka, India', place_id: 'bangalore', structured_formatting: { main_text: 'Bangalore', secondary_text: 'Karnataka, India' } },
  { description: 'Hyderabad, Telangana, India', place_id: 'hyderabad', structured_formatting: { main_text: 'Hyderabad', secondary_text: 'Telangana, India' } },
  { description: 'Chennai, Tamil Nadu, India', place_id: 'chennai', structured_formatting: { main_text: 'Chennai', secondary_text: 'Tamil Nadu, India' } },
  { description: 'Kolkata, West Bengal, India', place_id: 'kolkata', structured_formatting: { main_text: 'Kolkata', secondary_text: 'West Bengal, India' } },
  { description: 'Goa, India', place_id: 'goa', structured_formatting: { main_text: 'Goa', secondary_text: 'India' } },
  { description: 'Dubai, United Arab Emirates', place_id: 'dubai', structured_formatting: { main_text: 'Dubai', secondary_text: 'United Arab Emirates' } },
  { description: 'Bali, Indonesia', place_id: 'bali', structured_formatting: { main_text: 'Bali', secondary_text: 'Indonesia' } },
  { description: 'London, United Kingdom', place_id: 'london', structured_formatting: { main_text: 'London', secondary_text: 'United Kingdom' } },
  { description: 'New York, USA', place_id: 'newyork', structured_formatting: { main_text: 'New York', secondary_text: 'USA' } },
  { description: 'Paris, France', place_id: 'paris', structured_formatting: { main_text: 'Paris', secondary_text: 'France' } },
];

const LocationInput = ({ 
  value, 
  onChange, 
  onPlaceSelect, 
  placeholder, 
  label, 
  icon: Icon, 
  isLoaded,
  showLocationButton,
  onLocationDetect,
  isLocating
}: any) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [service, setService] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<any>(null);

  React.useEffect(() => {
    if (isLoaded && !service && window.google) {
      setService(new google.maps.places.AutocompleteService());
      setSessionToken(new google.maps.places.AutocompleteSessionToken());
    }
  }, [isLoaded]);

  React.useEffect(() => {
    if (value && value.length === 1) {
      const fetchAiSuggestions = async () => {
        setIsAiLoading(true);
        const result = await getSuggestions(value);
        if (result) {
          // Parse "Suggested Destinations starting with M: Mumbai, Mahabaleshwar, ..."
          const citiesPart = result.split(':')[1];
          if (citiesPart) {
            const cities = citiesPart.split(',').map(c => c.trim());
            setAiSuggestions(cities);
            setShowSuggestions(true);
          }
        }
        setIsAiLoading(false);
      };
      fetchAiSuggestions();
    } else {
      setAiSuggestions([]);
    }

    if (service && value && value.length > 1 && !value.includes(',')) {
      const timeoutId = setTimeout(() => {
        service.getPlacePredictions(
          { 
            input: value, 
            types: ['(cities)'],
            sessionToken: sessionToken || undefined
          },
          (predictions: any, status: any) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              setSuggestions(predictions);
              setShowSuggestions(true);
            } else {
              // Fallback to local search if API fails or returns no results
              const filtered = FALLBACK_CITIES.filter(c => 
                c.description.toLowerCase().includes(value.toLowerCase())
              );
              setSuggestions(filtered);
              setShowSuggestions(filtered.length > 0);
            }
          }
        );
      }, 200);
      return () => clearTimeout(timeoutId);
    } else if (!service && value && value.length > 0 && !value.includes(',')) {
      // Fallback if service is not available
      const filtered = FALLBACK_CITIES.filter(c => 
        c.description.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value, service, sessionToken]);

  const handleSelect = (suggestion: any) => {
    onChange(suggestion.description);
    setShowSuggestions(false);
    
    if (isLoaded && window.google) {
      const placesService = new google.maps.places.PlacesService(document.createElement('div'));
      placesService.getDetails(
        { 
          placeId: suggestion.place_id,
          fields: ['geometry', 'formatted_address', 'name'],
          sessionToken: sessionToken || undefined
        },
        (place: any, status: any) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            onPlaceSelect(place);
            setSessionToken(new google.maps.places.AutocompleteSessionToken());
          }
        }
      );
    }
  };

  return (
    <div className="relative group w-full">
      <div className="absolute top-3 left-5 z-10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
      </div>
      <div className="absolute inset-y-0 left-5 flex items-center pt-5 pointer-events-none">
        <Icon className="text-gray-300 group-focus-within:text-[#1E90FF] transition-colors" size={20} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value && suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        className="input-premium pl-14 pr-12 pt-8 pb-4 text-lg font-semibold"
      />
      
      {showLocationButton && (
        <button 
          onClick={onLocationDetect}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-100 transition-all",
            isLocating ? "animate-spin text-[#1E90FF]" : "text-gray-300 hover:text-[#000080]"
          )}
        >
          <Navigation2 size={18} />
        </button>
      )}

      <AnimatePresence>
        {showSuggestions && (suggestions.length > 0 || aiSuggestions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] overflow-hidden max-h-64 overflow-y-auto"
          >
            {isAiLoading && (
              <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-50">
                <Loader2 size={16} className="animate-spin text-[#1E90FF]" />
                <span className="text-gray-400 text-xs font-medium">AI is thinking...</span>
              </div>
            )}
            {aiSuggestions.map((city, idx) => (
              <div
                key={`ai-${idx}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(city);
                  setShowSuggestions(false);
                }}
                className="px-6 py-4 hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
              >
                <Sparkles size={16} className="text-[#1E90FF]" />
                <div className="flex flex-col">
                  <span className="text-[#000080] font-bold text-sm">{city}</span>
                  <span className="text-gray-400 text-[10px] font-medium">Premium Suggestion</span>
                </div>
              </div>
            ))}
            {suggestions.map((s) => (
              <div
                key={s.place_id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
                className="px-6 py-4 hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
              >
                <MapPin size={16} className="text-gray-400" />
                <div className="flex flex-col">
                  <span className="text-[#000080] font-bold text-sm">{s.structured_formatting.main_text}</span>
                  <span className="text-gray-400 text-[10px] font-medium">{s.structured_formatting.secondary_text}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function AppContent({ isLoaded }: { isLoaded: boolean }) {
  const [activeTab, setActiveTab] = useState("explore");
  const [user, setUser] = useState<{id: string, name: string, email: string, photo?: string, phone?: string} | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [headlineIndex, setHeadlineIndex] = useState(0);

  const headlines = ["Explore the World with Travolor", "Plan Your Perfect Journey", "Discover Hidden Gems", "Travel with Confidence"];

  useEffect(() => {
    if (activeTab === 'explore') {
      const interval = setInterval(() => {
        setHeadlineIndex((prev) => (prev + 1) % headlines.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const [locationInput, setLocationInput] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [duration, setDuration] = useState(3);
  const [numPeople, setNumPeople] = useState(2);
  const [travelStyle, setTravelStyle] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<{distance: string, time: string, mode: string} | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('travolor_theme');
    return saved === 'dark';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language, setLanguage] = useState(() => localStorage.getItem('travolor_lang') || "English");
  const [currency, setCurrency] = useState(() => localStorage.getItem('travolor_currency') || "INR (₹)");
  const [savedTrips, setSavedTrips] = useState<{id: string, start_location?: string, location: string, duration: number, style: string, budget?: string, itinerary: string, created_at?: string}[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', photo: '' });
  const [isLocating, setIsLocating] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [startAutocomplete, setStartAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [endAutocomplete, setEndAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [startCoords, setStartCoords] = useState<{lat: number, lng: number} | null>(null);
  const [endCoords, setEndCoords] = useState<{lat: number, lng: number} | null>(null);
  const [userTotalBudget, setUserTotalBudget] = useState<number>(50000);
  const [transportType, setTransportType] = useState("public"); // public, private, flight
  const [accommodationType, setAccommodationType] = useState("standard"); // hostel, standard, luxury

  const liveBudget = useMemo(() => {
    const transportRates: Record<string, number> = { public: 500, private: 2000, flight: 5000 };
    const hotelRates: Record<string, number> = { hostel: 800, standard: 2500, luxury: 8000 };
    const foodRates: Record<string, number> = { budget: 500, standard: 1200, luxury: 3000 };
    const activityRates: Record<string, number> = { low: 300, medium: 1000, high: 2500 };

    const styleMap: Record<string, { food: string, activities: string }> = {
      budget: { food: 'budget', activities: 'low' },
      standard: { food: 'standard', activities: 'medium' },
      luxury: { food: 'luxury', activities: 'high' },
      adventure: { food: 'standard', activities: 'high' },
      family: { food: 'standard', activities: 'medium' }
    };

    const currentStyle = styleMap[travelStyle] || styleMap.standard;
    
    const transportCost = transportRates[transportType] * numPeople;
    const hotelCost = hotelRates[accommodationType] * duration * numPeople;
    const foodCost = foodRates[currentStyle.food] * duration * numPeople;
    const activitiesCost = activityRates[currentStyle.activities] * duration * numPeople;
    const totalCost = transportCost + hotelCost + foodCost + activitiesCost;

    return {
      transportCost,
      hotelCost,
      foodCost,
      activitiesCost,
      totalCost
    };
  }, [transportType, accommodationType, travelStyle, duration, numPeople, locationInput]);

  const aiSuggestedBudget = useMemo(() => {
    const getDailyRate = (style: string) => {
      switch(style) {
        case 'budget': return 2500;
        case 'luxury': return 15000;
        case 'adventure': return 4500;
        case 'family': return 6500;
        default: return 5500;
      }
    };
    return duration * getDailyRate(travelStyle) * numPeople;
  }, [duration, travelStyle, numPeople]);

  // AI Typing Animation
  React.useEffect(() => {
    const phrases = [
      "Planning your dream escape...",
      "Finding the best local gems...",
      "Optimizing your travel route...",
      "Crafting a unique adventure..."
    ];
    let currentPhraseIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;
    let timeout: any;

    const type = () => {
      const currentPhrase = phrases[currentPhraseIndex];
      if (isDeleting) {
        setTypingText(currentPhrase.substring(0, currentCharIndex - 1));
        currentCharIndex--;
      } else {
        setTypingText(currentPhrase.substring(0, currentCharIndex + 1));
        currentCharIndex++;
      }

      let typeSpeed = isDeleting ? 50 : 100;

      if (!isDeleting && currentCharIndex === currentPhrase.length) {
        isDeleting = true;
        typeSpeed = 2000; // Pause at end
      } else if (isDeleting && currentCharIndex === 0) {
        isDeleting = false;
        currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
        typeSpeed = 500;
      }

      timeout = setTimeout(type, typeSpeed);
    };

    type();
    return () => clearTimeout(timeout);
  }, []);

  const detectLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            if (isLoaded && window.google) {
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                  const cityComponent = results[0].address_components.find(
                    (c: any) => c.types.includes('locality') || c.types.includes('administrative_area_level_2')
                  );
                  const stateComponent = results[0].address_components.find(
                    (c: any) => c.types.includes('administrative_area_level_1') || c.types.includes('country')
                  );
                  if (cityComponent) {
                    setStartLocation(`${cityComponent.long_name}${stateComponent ? ', ' + stateComponent.long_name : ''}`);
                  }
                }
                setIsLocating(false);
              });
            } else {
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              const data = await response.json();
              const city = data.address.city || data.address.town || data.address.village || data.address.suburb;
              const state = data.address.state || data.address.country;
              if (city) setStartLocation(`${city}, ${state}`);
              setIsLocating(false);
            }
          } catch (error) {
            console.error("Error detecting location:", error);
            setIsLocating(false);
          }
        },
        () => setIsLocating(false)
      );
    } else {
      setIsLocating(false);
    }
  };

  // Route Summary Calculation
  React.useEffect(() => {
    const calculateRoute = async () => {
      if (startLocation && locationInput && startLocation !== locationInput) {
        try {
          let lat1, lon1, lat2, lon2;

          if (isLoaded && window.google) {
            const geocoder = new google.maps.Geocoder();
            const [res1, res2] = await Promise.all([
              new Promise<any>((resolve) => geocoder.geocode({ address: startLocation }, (r) => resolve(r))),
              new Promise<any>((resolve) => geocoder.geocode({ address: locationInput }, (r) => resolve(r)))
            ]);
            
            if (res1 && res1[0] && res2 && res2[0]) {
              lat1 = res1[0].geometry.location.lat();
              lon1 = res1[0].geometry.location.lng();
              lat2 = res2[0].geometry.location.lat();
              lon2 = res2[0].geometry.location.lng();
            }
          }

          if (!lat1) {
            // Fetch coordinates for both cities using Nominatim
            const [res1, res2] = await Promise.all([
              fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startLocation)}&limit=1`),
              fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}&limit=1`)
            ]);
            const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

            if (data1[0] && data2[0]) {
              lat1 = parseFloat(data1[0].lat);
              lon1 = parseFloat(data1[0].lon);
              lat2 = parseFloat(data2[0].lat);
              lon2 = parseFloat(data2[0].lon);
            }
          }

          if (lat1 && lat2) {
            // Haversine distance
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = Math.round(R * c);

            // Estimate time and mode
            let mode = "Car/Bus";
            let time = `${Math.round(distance / 60)}h ${Math.round((distance % 60))}m`;

            if (distance > 800) {
              mode = "Flight";
              time = `${Math.round(distance / 500 + 2)}h`;
            } else if (distance > 300) {
              mode = "Train/Flight";
              time = `${Math.round(distance / 80)}h`;
            }

            setRouteSummary({
              distance: `${distance} km`,
              time,
              mode
            });
          }
        } catch (error) {
          console.error("Error calculating route:", error);
        }
      } else {
        setRouteSummary(null);
      }
    };

    const timer = setTimeout(calculateRoute, 1000);
    return () => clearTimeout(timer);
  }, [startLocation, locationInput, isLoaded]);

  // Translations
  const t = useMemo(() => {
    const dicts: Record<string, any> = {
      English: {
        welcome: "Welcome back",
        whereTo: "Where to next?",
        explore: "Explore",
        myTrips: "My Trips",
        bookings: "Bookings",
        profile: "Profile",
        planTrip: "Plan My Trip",
        startingLocation: "From where will you start your journey?",
        saveTrip: "Save Trip",
        viewMaps: "View on Maps",
        loginRequired: "Login Required",
        loginToAccess: "Please login to access this feature.",
        logout: "Logout Account",
        settings: "Settings",
        support: "Support",
        language: "Language",
        currency: "Currency",
        theme: "Theme",
        notifications: "Notifications",
        tripsPlanned: "Trips Planned",
        upcoming: "Upcoming",
        saved: "Saved",
        addPhone: "Add mobile number",
        editProfile: "Edit Profile",
        saveChanges: "Save Changes",
        cancel: "Cancel"
      },
      Marathi: {
        welcome: "पुन्हा स्वागत आहे",
        whereTo: "पुढील प्रवास कोठे?",
        explore: "शोधा",
        myTrips: "माझ्या सहली",
        bookings: "बुकिंग",
        profile: "प्रोफाइल",
        planTrip: "सहल नियोजित करा",
        startingLocation: "तुमचा प्रवास कोठून सुरू होईल?",
        saveTrip: "सहल जतन करा",
        viewMaps: "नकाशावर पहा",
        loginRequired: "लॉगिन आवश्यक",
        loginToAccess: "कृपया हे वैशिष्ट्य वापरण्यासाठी लॉगिन करा.",
        logout: "लॉगआउट",
        settings: "सेटिंग्ज",
        support: "सपोर्ट",
        language: "भाषा",
        currency: "चलन",
        theme: "थीम",
        notifications: "सूचना",
        tripsPlanned: "नियोजित सहली",
        upcoming: "येणाऱ्या",
        saved: "जतन केलेल्या",
        addPhone: "मोबाईल नंबर जोडा",
        editProfile: "प्रोफाइल संपादित करा",
        saveChanges: "बदल जतन करा",
        cancel: "रद्द करा"
      },
      Hindi: {
        welcome: "स्वागत है",
        whereTo: "अगली यात्रा कहाँ?",
        explore: "खोजें",
        myTrips: "मेरी यात्राएं",
        bookings: "बुकिंग",
        profile: "प्रोफाइल",
        planTrip: "यात्रा प्लान करें",
        startingLocation: "आपकी यात्रा कहाँ से शुरू होगी?",
        saveTrip: "यात्रा सहेजें",
        viewMaps: "मैप पर देखें",
        loginRequired: "लॉगिन आवश्यक",
        loginToAccess: "कृपया इस सुविधा के लिए लॉगिन करें।",
        logout: "लॉगआउट",
        settings: "सेटिंग्स",
        support: "सपोर्ट",
        language: "भाषा",
        currency: "मुद्रा",
        theme: "थीम",
        notifications: "सूचनाएं",
        tripsPlanned: "प्लान की गई यात्राएं",
        upcoming: "आने वाली",
        saved: "सहेजी गई",
        addPhone: "मोबाइल नंबर जोड़ें",
        editProfile: "प्रोफाइल बदलें",
        saveChanges: "बदलाव सहेजें",
        cancel: "रद्द करें"
      }
    };
    return dicts[language] || dicts.English;
  }, [language]);

  // Currency Conversion
  const formatPrice = (inrAmount: number) => {
    const rates: Record<string, number> = { "INR (₹)": 1, "USD ($)": 0.012, "EUR (€)": 0.011 };
    const symbol: Record<string, string> = { "INR (₹)": "₹", "USD ($)": "$", "EUR (€)": "€" };
    const rate = rates[currency] || 1;
    const s = symbol[currency] || "₹";
    return `${s}${(inrAmount * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  // Firebase Auth Listener
  React.useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional profile data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        setUser({
          id: firebaseUser.uid,
          name: userData.name || firebaseUser.displayName || 'Traveler',
          email: firebaseUser.email || '',
          photo: userData.photo || firebaseUser.photoURL || '',
          phone: userData.phone || ''
        });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Listeners
  React.useEffect(() => {
    if (!user) {
      setSavedTrips([]);
      setBookings([]);
      return;
    }

    // Listen to Saved Trips
    const tripsQuery = query(
      collection(db, 'trips'), 
      where('user_id', '==', user.id),
      orderBy('created_at', 'desc')
    );
    const unsubscribeTrips = onSnapshot(tripsQuery, (snapshot) => {
      const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setSavedTrips(trips);
    });

    // Listen to Bookings
    const bookingsQuery = query(
      collection(db, 'bookings'), 
      where('user_id', '==', user.id)
    );
    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      const bks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setBookings(bks);
    });

    // Listen to Wishlist
    const wishlistQuery = query(
      collection(db, 'wishlist'), 
      where('user_id', '==', user.id)
    );
    const unsubscribeWishlist = onSnapshot(wishlistQuery, (snapshot) => {
      const wsh = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setWishlist(wsh);
    });

    // Listen to User Budget
    const userDocRef = doc(db, 'users', user.id);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.totalBudget) setUserTotalBudget(data.totalBudget);
      }
    });

    setEditForm({ name: user.name, phone: user.phone || '', photo: user.photo || '' });

    return () => {
      unsubscribeTrips();
      unsubscribeBookings();
      unsubscribeWishlist();
      unsubscribeUser();
    };
  }, [user?.id]);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('travolor_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  React.useEffect(() => {
    localStorage.setItem('travolor_lang', language);
  }, [language]);

  React.useEffect(() => {
    localStorage.setItem('travolor_currency', currency);
  }, [currency]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setAuthError("Firebase is not configured. Please add your API key to the environment variables.");
      return;
    }
    setAuthError(null);
    setLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        const newUser = userCredential.user;
        
        // Initialize user profile in Firestore
        await setDoc(doc(db, 'users', newUser.uid), {
          name: authForm.name,
          email: authForm.email,
          totalBudget: 50000,
          created_at: new Date().toISOString()
        });

        await firebaseUpdateProfile(newUser, {
          displayName: authForm.name
        });
      }
      setActiveTab('explore');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth) {
      setAuthError("Firebase is not configured. Please add your API key to the environment variables.");
      return;
    }
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore, if not create
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName || 'Traveler',
          email: user.email,
          photo: user.photoURL,
          totalBudget: 50000,
          created_at: new Date().toISOString()
        });
      }
      setActiveTab('explore');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "Google login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setActiveTab('explore');
  };

  const handleGenerate = async (overrideStyle?: string) => {
    if (!locationInput.trim()) {
      alert("Please enter a destination.");
      return;
    }
    if (!startLocation.trim()) {
      alert("Please enter your starting location.");
      return;
    }
    const styleToUse = overrideStyle || travelStyle;
    if (overrideStyle) setTravelStyle(overrideStyle);

    setLoading(true);
    setItinerary(null);
    try {
      const result = await generateItinerary({
        location: locationInput,
        startLocation: startLocation,
        duration,
        numPeople,
        travelStyle: styleToUse,
        language: language
      });
      setItinerary(result);
      // Simple heuristic to extract some info for the route card if possible
      // Or just set defaults for the visual card
      setRouteSummary({
        distance: "Calculating...",
        time: "Calculating...",
        mode: "Multiple Options"
      });
    } catch (error) {
      console.error(error);
      alert("Failed to generate itinerary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = async (dest: any) => {
    if (!user) {
      alert("Please login to save to wishlist!");
      setActiveTab('profile');
      return;
    }

    const existing = wishlist.find(w => w.dest_id === dest.id);
    if (existing) {
      try {
        await deleteDoc(doc(db, 'wishlist', existing.id));
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        await addDoc(collection(db, 'wishlist'), {
          user_id: user.id,
          dest_id: dest.id,
          title: dest.title,
          img: dest.img,
          desc: dest.desc,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const saveTrip = async () => {
    if (!itinerary) return;
    if (!user) {
      alert("Please login to save your trips!");
      setActiveTab('profile');
      return;
    }
    
    const tripData = {
      user_id: user.id,
      start_location: startLocation,
      location: locationInput,
      duration,
      style: travelStyle,
      budget: formatPrice(duration * 5000 * numPeople),
      itinerary,
      created_at: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'trips'), tripData);
      alert("Trip saved to My Trips!");
    } catch (err) {
      console.error(err);
      alert("Failed to save trip.");
    }
  };

  const openInMaps = (loc: string) => {
    window.open(`https://www.google.com/maps/search/${loc}+tourist+attractions`, '_blank');
  };

  const currentColor = StyleColors[travelStyle] || StyleColors.standard;

  const renderExplore = () => {
    return (
      <div className="space-y-16 pb-24">
        {/* Hero Section with Banner Background */}
        <section className="relative min-h-[60vh] md:min-h-[70vh] rounded-[3rem] overflow-hidden flex flex-col items-center justify-center text-center px-4 md:px-6">
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
              <motion.img 
                key={headlineIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1.5 }}
                src={[
                  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1920&q=80",
                  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80",
                  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1920&q=80",
                  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80"
                ][headlineIndex]} 
                alt="Travel Background"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          </div>

          <div className="relative z-10 space-y-10 max-w-5xl w-full">
            <div className="space-y-4">
              <motion.div
                key={headlineIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-20 md:h-24 flex items-center justify-center"
              >
                <h1 className="text-4xl md:text-7xl font-display font-black text-white tracking-tight drop-shadow-2xl">
                  {headlines[headlineIndex]}
                </h1>
              </motion.div>
              <p className="text-white/90 text-lg md:text-xl font-medium max-w-2xl mx-auto drop-shadow-lg">
                Your AI-powered companion for seamless travel planning and unforgettable experiences.
              </p>
            </div>

            {/* Category Bar */}
            <div className="flex flex-wrap justify-center gap-4 px-4">
              {BOOKING_SERVICES.map((service) => (
                <motion.button
                  key={service.id}
                  whileHover={{ y: -5, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.open(service.link(startLocation || "Mumbai", locationInput || "Delhi"), '_blank')}
                  className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl flex items-center gap-3 text-white hover:bg-white hover:text-[#000080] transition-all shadow-lg"
                >
                  <service.icon size={20} />
                  <span className="font-bold text-sm">{service.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Premium Search Card */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/95 backdrop-blur-xl rounded-[3rem] p-6 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/20 space-y-8 mx-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                <LocationInput
                  value={startLocation}
                  onChange={setStartLocation}
                  onPlaceSelect={(place: any) => {
                    if (place.formatted_address) setStartLocation(place.formatted_address);
                    else if (place.name) setStartLocation(place.name);
                    if (place.geometry?.location) {
                      setStartCoords({
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                      });
                    }
                  }}
                  placeholder="Starting City"
                  label="From"
                  icon={Search}
                  isLoaded={isLoaded}
                  showLocationButton={true}
                  onLocationDetect={detectLocation}
                  isLocating={isLocating}
                />

                <LocationInput
                  value={locationInput}
                  onChange={setLocationInput}
                  onPlaceSelect={(place: any) => {
                    if (place.formatted_address) setLocationInput(place.formatted_address);
                    else if (place.name) setLocationInput(place.name);
                    if (place.geometry?.location) {
                      setEndCoords({
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                      });
                    }
                  }}
                  placeholder="Destination City"
                  label="To"
                  icon={Search}
                  isLoaded={isLoaded}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-gray-400" size={20} />
                    <div className="flex flex-col text-left">
                      <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Duration</span>
                      <span className="text-[#000080] font-bold">Days</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setDuration(Math.max(1, duration - 1))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#000080] hover:border-[#000080] transition-all font-bold shadow-sm">-</button>
                    <span className="text-[#000080] font-bold text-lg w-6 text-center">{duration}</span>
                    <button onClick={() => setDuration(duration + 1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#000080] hover:border-[#000080] transition-all font-bold shadow-sm">+</button>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <Users className="text-gray-400" size={20} />
                    <div className="flex flex-col text-left">
                      <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Travelers</span>
                      <span className="text-[#000080] font-bold">People</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setNumPeople(Math.max(1, numPeople - 1))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#000080] hover:border-[#000080] transition-all font-bold shadow-sm">-</button>
                    <span className="text-[#000080] font-bold text-lg w-6 text-center">{numPeople}</span>
                    <button onClick={() => setNumPeople(numPeople + 1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#000080] hover:border-[#000080] transition-all font-bold shadow-sm">+</button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleGenerate()}
                  disabled={loading}
                  className="btn-primary rounded-2xl py-4 font-black text-lg flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={22} /> : <Zap size={22} className="fill-current" />}
                  {loading ? "Planning..." : "Start Journey"}
                </motion.button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {TRAVEL_STYLES.filter(s => ['budget', 'luxury', 'adventure', 'family', 'standard'].includes(s.id)).map(style => {
                  const Icon = IconMap[style.icon];
                  return (
                    <button
                      key={style.id}
                      onClick={() => setTravelStyle(style.id)}
                      className={cn(
                        "flex items-center gap-2.5 px-6 py-3 rounded-full border text-sm font-bold transition-all",
                        travelStyle === style.id 
                          ? "bg-[#000080] border-[#000080] text-white shadow-lg" 
                          : "bg-white border-gray-100 text-gray-500 hover:border-[#1E90FF] hover:text-[#1E90FF]"
                      )}
                    >
                      <Icon size={16} />
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Travel Stats Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          {TRAVEL_STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/50 backdrop-blur-sm border border-white/20 p-8 rounded-[2.5rem] text-center space-y-2 shadow-sm"
            >
              <h4 className="text-4xl font-black text-[#000080] tracking-tighter">{stat.value}</h4>
              <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">{stat.label}</p>
            </motion.div>
          ))}
        </section>





      {/* Results Section */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="py-20 flex flex-col items-center justify-center space-y-10"
          >
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 border-4 border-gray-100 border-t-[#1E90FF] rounded-full shadow-xl"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Compass size={32} className="text-[#000080] animate-bounce" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-[#000080]">Crafting your adventure...</h3>
              <p className="text-gray-500 text-sm font-medium">AI is finding the best local gems for you</p>
            </div>
          </motion.div>
        )}

        {itinerary && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {/* Destination Card */}
            <div className="relative h-[500px] rounded-[3.5rem] overflow-hidden shadow-2xl group">
              <img 
                src={`https://picsum.photos/seed/${locationInput}/1600/900`} 
                alt={locationInput}
                className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row justify-between items-end gap-8">
                <div className="space-y-4">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3"
                  >
                    <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-bold text-white uppercase tracking-widest backdrop-blur-md border border-white/20", currentColor.bg)}>
                      {travelStyle}
                    </span>
                    <span className="px-4 py-1.5 rounded-full text-[10px] font-bold text-white uppercase tracking-widest bg-white/10 backdrop-blur-md border border-white/20">
                      {duration} Days
                    </span>
                    <span className="px-4 py-1.5 rounded-full text-[10px] font-bold text-white uppercase tracking-widest bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-300">
                      AI Optimized
                    </span>
                  </motion.div>
                  <h2 className="text-4xl md:text-6xl font-bold text-[#000080] tracking-tight">{locationInput}</h2>
                </div>
                <div className="flex gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={saveTrip}
                    className="bg-white/10 backdrop-blur-xl text-white px-8 py-5 rounded-3xl font-bold flex items-center gap-3 hover:bg-white hover:text-[#1E90FF] transition-all shadow-2xl border border-white/20"
                  >
                    <Heart size={20} /> {t.saveTrip}
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openInMaps(locationInput)}
                    className="bg-[#1E90FF] text-white px-10 py-5 rounded-3xl font-bold flex items-center gap-3 hover:bg-[#1E90FF]/90 transition-all shadow-2xl"
                  >
                    <MapIcon size={20} /> {t.viewMaps}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Quick Actions / Optimization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: "budget", label: "Budget Version", icon: Wallet, color: "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white" },
                { id: "standard", label: "Optimize Plan", icon: Briefcase, color: "bg-blue-50 border-blue-100 text-[#1E90FF] hover:bg-[#1E90FF] hover:text-white" },
                { id: "luxury", label: "Make It Luxury", icon: Crown, color: "bg-purple-50 border-purple-100 text-purple-600 hover:bg-purple-500 hover:text-white" }
              ].map((action) => (
                <button 
                  key={action.id}
                  onClick={() => handleGenerate(action.id)} 
                  className={cn(
                    "border p-6 rounded-3xl font-bold transition-all flex items-center justify-center gap-3 group shadow-sm",
                    action.color
                  )}
                >
                  <action.icon size={20} className="transition-transform group-hover:scale-110" /> 
                  {action.label}
                </button>
              ))}
            </div>

            {/* Itinerary Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-10">
                <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border border-gray-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-50" />
                  <div className="markdown-body prose prose-slate max-w-none prose-img:rounded-[2rem] prose-headings:text-[#000080] prose-headings:font-bold prose-p:text-gray-600 prose-li:text-gray-600">
                    <Markdown>{itinerary}</Markdown>
                  </div>

                  {/* Booking CTAs after AI Result */}
                  <div className="mt-12 pt-10 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[#1E90FF]/10 flex items-center justify-center">
                        <Sparkles className="text-[#1E90FF]" size={20} />
                      </div>
                      <h3 className="text-3xl font-display font-black text-[#000080] tracking-tight">Ready to Book?</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {BOOKING_SERVICES.filter(s => ['hotels', 'flights', 'buses'].includes(s.id)).map(service => (
                        <motion.button
                          key={service.id}
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => window.open(service.link(startLocation || "Mumbai", locationInput || "Delhi"), '_blank')}
                          className={cn("flex items-center justify-center gap-3 py-5 px-6 rounded-[2rem] text-white font-bold shadow-xl transition-all", service.color)}
                        >
                          <service.icon size={20} />
                          Book {service.id === 'hotels' ? 'Hotel' : service.id === 'flights' ? 'Flight' : 'Bus'}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-4 space-y-8">
                {/* Budget Summary Card */}
                <div className="bg-[#000080] rounded-[3rem] p-8 md:p-10 shadow-xl text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8 opacity-70">Budget Summary</h4>
                  <div className="space-y-8">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-light opacity-80 tracking-wide">Total Estimate</span>
                      <span className="text-4xl font-bold tracking-tighter">{formatPrice(liveBudget.totalCost)}</span>
                    </div>
                    <div className="h-px bg-white/20" />
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest">Per Person</p>
                        <p className="text-xl font-bold">{formatPrice(liveBudget.totalCost / numPeople)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest">Per Day</p>
                        <p className="text-xl font-bold">{formatPrice(liveBudget.totalCost / duration)}</p>
                      </div>
                    </div>
                    <div className="h-px bg-white/20" />
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest">AI Suggested Budget</p>
                      <p className="text-sm font-medium opacity-80 italic">{formatPrice(aiSuggestedBudget)} (Reference only)</p>
                    </div>
                  </div>
                </div>

                {/* Quick Info Cards */}
                <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-gray-100 space-y-10">
                  <h4 className="text-[#000080] font-bold text-2xl tracking-tight">Trip Insights</h4>
                  <div className="space-y-8">
                    {[
                      { label: "Best Time", icon: Clock, value: "Oct - Mar", color: "text-orange-500" },
                      { label: "Crowd Level", icon: Users, value: "Moderate", color: "text-[#1E90FF]" },
                      { label: "Weather", icon: Thermometer, value: "Pleasant", color: "text-emerald-500" },
                      { label: "Photo Spots", icon: Camera, value: "12+ Points", color: "text-pink-500" },
                      { label: "Shopping", icon: ShoppingBag, value: "Local Crafts", color: "text-purple-500" },
                      { label: "Pro Tip", icon: Lightbulb, value: "Book early!", color: "text-amber-500" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-5 group">
                        <div className={cn("w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-white group-hover:shadow-md", item.color)}>
                          <item.icon size={22} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</p>
                          <p className="text-sm font-bold text-[#000080]">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>

            {/* Trip Budget Tracker Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-100 rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-10"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#000080] flex items-center justify-center shadow-xl">
                    <Wallet className="text-white" size={28} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-[#000080] tracking-tight">Trip Budget Tracker</h3>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Real-time cost analysis</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white hover:shadow-md transition-all">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Your Budget</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">₹</span>
                    <input 
                      type="number" 
                      value={userTotalBudget}
                      onChange={async (e) => {
                        const val = Number(e.target.value);
                        setUserTotalBudget(val);
                        if (user) {
                          try {
                            await updateDoc(doc(db, 'users', user.id), { totalBudget: val });
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className="bg-transparent text-[#000080] font-bold text-xl w-32 outline-none focus:text-[#1E90FF] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {(() => {
                const totalEstimate = liveBudget.totalCost;
                const remaining = userTotalBudget - totalEstimate;
                const isOverBudget = remaining < 0;
                const percentage = Math.min(100, (totalEstimate / userTotalBudget) * 100);
                
                const breakdown = [
                  { label: "Hotels", amount: liveBudget.hotelCost, icon: Briefcase, color: "bg-blue-500" },
                  { label: "Transport", amount: liveBudget.transportCost, icon: Plane, color: "bg-purple-500" },
                  { label: "Food", amount: liveBudget.foodCost, icon: ShoppingBag, color: "bg-orange-500" },
                  { label: "Activities", amount: liveBudget.activitiesCost, icon: Zap, color: "bg-amber-500" }
                ];

                return (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total Estimate</p>
                        <motion.p 
                          key={totalEstimate}
                          initial={{ scale: 1.1, color: "#1E90FF" }}
                          animate={{ scale: 1, color: "#000080" }}
                          className="text-4xl font-bold tracking-tighter"
                        >
                          {formatPrice(totalEstimate)}
                        </motion.p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Remaining</p>
                        <motion.p 
                          key={remaining}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          className={cn("text-4xl font-bold tracking-tighter", isOverBudget ? "text-rose-500" : "text-emerald-600")}
                        >
                          {formatPrice(Math.abs(remaining))}
                          <span className="text-sm ml-2 opacity-60">{isOverBudget ? "Over" : "Left"}</span>
                        </motion.p>
                      </div>
                      <div className="flex items-center">
                        {isOverBudget ? (
                          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 text-rose-600">
                            <AlertTriangle size={20} className="shrink-0" />
                            <p className="text-xs font-medium leading-relaxed">
                              ⚠ You are over budget by {formatPrice(Math.abs(remaining))}. Consider switching to budget hotels or public transport.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 text-emerald-600">
                            <Sparkles size={20} className="shrink-0" />
                            <p className="text-xs font-medium leading-relaxed">
                              🎉 You are within budget! Your plan is perfectly optimized for your wallet.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Budget Utilization</span>
                        <span className={cn("text-sm font-bold", isOverBudget ? "text-rose-500" : "text-emerald-600")}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200 p-1">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={cn(
                            "h-full rounded-full shadow-sm",
                            isOverBudget ? "bg-gradient-to-r from-rose-600 to-rose-400" : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                          )}
                        />
                      </div>
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {breakdown.map((item, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-100 rounded-[2rem] p-6 space-y-4 group hover:bg-white hover:shadow-xl transition-all">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", item.color)}>
                            <item.icon size={18} />
                          </div>
                          <div>
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
                            <p className="text-[#000080] font-bold">{formatPrice(item.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>

            {/* Booking Services Section */}
            <div className="space-y-8">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#000080] flex items-center justify-center shadow-xl">
                    <BookingIcon className="text-white" size={24} />
                  </div>
                  <h3 className="text-3xl font-bold text-[#000080] tracking-tight">Complete Your Booking</h3>
                </div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest hidden md:block">Best prices guaranteed</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {BOOKING_SERVICES.map((service) => (
                  <motion.button
                    key={service.id}
                    whileHover={{ y: -10, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.open(service.link(startLocation || "Mumbai", locationInput || "Delhi"), '_blank')}
                    className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col items-center gap-6 hover:shadow-2xl transition-all group relative overflow-hidden"
                  >
                    <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-6", service.color)}>
                      <service.icon className="text-white" size={28} />
                    </div>
                    <span className="text-[#000080] font-bold text-xs uppercase tracking-[0.2em]">{service.label}</span>
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gray-50 rounded-full -mr-8 -mt-8" />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    );
  };

  const renderAuth = () => (
    <div className="min-h-screen bg-gradient-to-b from-white via-sky-50 to-white flex items-center justify-center px-6 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-10"
      >
        {/* Top Section: Logo & Tagline */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-[0_10px_40px_rgba(10,31,68,0.1)] mx-auto relative group overflow-hidden p-4"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#000080] to-[#1E90FF] opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E90FF]/20 to-transparent opacity-50" />
            <img 
              src="/logo.png" 
              alt="Travolor Logo" 
              className="w-full h-full object-contain relative z-10 group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-4xl font-display font-black text-[#000080] tracking-tight">Travolor</h1>
            <p className="text-gray-400 font-medium text-sm tracking-wide">Plan Your Perfect Trip</p>
          </div>
        </div>

        {authError && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-sm text-center font-bold shadow-sm"
          >
            {authError}
          </motion.div>
        )}

        <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.05)] space-y-8">
          <form onSubmit={handleAuth} className="space-y-6">
            {authMode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
                <div className="relative group">
                  <ProfileIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#000080] transition-colors" size={18} />
                  <input 
                    type="text" 
                    required
                    placeholder="John Doe"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                    className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl pl-14 pr-5 py-4 text-[#000080] font-bold placeholder:text-gray-300 outline-none focus:ring-4 focus:ring-blue-50/50 focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Email or Mobile Number</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#000080] transition-colors" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="name@example.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl pl-14 pr-5 py-4 text-[#000080] font-bold placeholder:text-gray-300 outline-none focus:ring-4 focus:ring-blue-50/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#000080] transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl pl-14 pr-14 py-4 text-[#000080] font-bold placeholder:text-gray-300 outline-none focus:ring-4 focus:ring-blue-50/50 focus:bg-white transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#000080] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div 
                  onClick={() => setRememberMe(!rememberMe)}
                  className={cn(
                    "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                    rememberMe ? "bg-[#000080] border-[#000080]" : "border-gray-200 group-hover:border-gray-300"
                  )}
                >
                  {rememberMe && <Check size={14} className="text-white" />}
                </div>
                <span className="text-xs font-bold text-gray-500">Remember me</span>
              </label>
              <button type="button" className="text-xs font-bold text-orange-500 hover:underline">Forgot Password?</button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Start Your Journey'}
              {!loading && <Plane size={18} className="rotate-45" />}
            </motion.button>
          </form>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-gray-300 text-[10px] font-black uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-gray-100 text-[#000080] py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <button 
              disabled={loading}
              className="w-full bg-white border border-gray-100 text-[#000080] py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            >
              <Phone size={18} className="text-emerald-500" />
              Continue with Phone OTP
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm font-medium">
          {authMode === 'login' ? "New user?" : "Already have an account?"}
          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="ml-2 text-[#000080] font-black hover:text-orange-500 transition-colors"
          >
            {authMode === 'login' ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </motion.div>
    </div>
  );

  const renderMyTrips = () => (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
          <h2 className="text-5xl font-display font-black text-[#000080] tracking-tighter">{t.myTrips}</h2>
          <p className="text-gray-500 font-medium tracking-wide tracking-widest uppercase text-[10px]">Your curated collection of adventures</p>
        </div>
        <div className="flex gap-3">
          <div className="px-6 py-3 bg-white rounded-full border border-gray-100 flex items-center gap-3 shadow-xl">
            <Globe size={16} className="text-[#1E90FF]" />
            <span className="text-[#000080] font-black text-lg tracking-tighter">{savedTrips.length}</span>
            <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total</span>
          </div>
        </div>
      </div>

      {!user ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-[4rem] p-20 text-center space-y-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E90FF]/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-[#1E90FF]/10 transition-all duration-700" />
          <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100 shadow-2xl relative z-10">
            <Lock size={56} className="text-gray-300" />
          </div>
          <div className="space-y-3 relative z-10">
            <h3 className="text-3xl font-serif font-black text-[#000080] tracking-tight">{t.loginRequired}</h3>
            <p className="text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">{t.loginToAccess}</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('profile')}
            className="bg-[#1E90FF] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-xl hover:glow-blue transition-all relative z-10"
          >
            Login to Continue
          </motion.button>
        </motion.div>
      ) : savedTrips.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-[4rem] p-20 text-center space-y-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-emerald-600/10 transition-all duration-700" />
          <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100 shadow-2xl relative z-10">
            <MapIcon size={56} className="text-gray-300" />
          </div>
          <div className="space-y-3 relative z-10">
            <h3 className="text-3xl font-display font-black text-[#000080] tracking-tight">Your map is empty</h3>
            <p className="text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">Start planning your journey and save your dream destinations here. ✈</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('explore')}
            className="bg-[#1E90FF] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-xl hover:glow-blue transition-all relative z-10"
          >
            Start Planning
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedTrips.map((trip) => (
            <motion.div
              key={trip.id}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-[2rem] overflow-hidden shadow-xl flex flex-col"
            >
              <div className="h-48 relative">
                <img 
                  src={`https://picsum.photos/seed/${trip.location}/600/400`} 
                  alt={trip.location}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#1E90FF]">
                  {trip.style}
                </div>
                {trip.budget && (
                  <div className="absolute bottom-4 left-4 bg-[#1E90FF]/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white">
                    {trip.budget}
                  </div>
                )}
              </div>
              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-display font-bold text-slate-900">{trip.location}</h3>
                    <p className="text-slate-500 text-sm">{trip.start_location} → {trip.location}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{trip.duration} Days</p>
                      <span className="text-slate-200">•</span>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        {trip.created_at ? new Date(trip.created_at).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const shareData = {
                          title: `My Trip to ${trip.location}`,
                          text: `Check out my ${trip.duration}-day ${trip.style} trip to ${trip.location} planned with Travolor!`,
                          url: window.location.href
                        };
                        if (navigator.share) {
                          navigator.share(shareData);
                        } else {
                          alert("Sharing is not supported on this browser. Copy the URL to share!");
                        }
                      }}
                      className="text-slate-300 hover:text-blue-500 transition-colors"
                    >
                      <Share2 size={20} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete this trip?")) {
                          try {
                            await deleteDoc(doc(db, 'trips', trip.id));
                          } catch (err) {
                            console.error(err);
                            alert("Failed to delete trip.");
                          }
                        }
                      }}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Heart className="fill-current text-red-500" size={20} />
                    </button>
                  </div>
                </div>
                <div className="mt-auto pt-4 flex gap-2">
                  <button 
                    onClick={() => {
                      setStartLocation(trip.start_location || '');
                      setLocationInput(trip.location);
                      setDuration(trip.duration);
                      setTravelStyle(trip.style);
                      setItinerary(trip.itinerary);
                      setActiveTab('explore');
                    }}
                    className="flex-1 bg-[#1E90FF] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#1E90FF]/90 transition-all"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => openInMaps(trip.location)}
                    className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                  >
                    <MapIcon size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
          <h2 className="text-5xl font-serif font-black text-[#000080] tracking-tighter">{t.bookings}</h2>
          <p className="text-gray-500 font-medium tracking-wide tracking-widest uppercase text-[10px]">Manage your travel arrangements in one place</p>
        </div>
        <div className="flex gap-3">
          <div className="px-6 py-3 bg-white rounded-full border border-gray-100 flex items-center gap-3 shadow-xl">
            <BookingIcon size={16} className="text-[#1E90FF]" />
            <span className="text-[#000080] font-black text-lg tracking-tighter">{bookings.length}</span>
            <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Active</span>
          </div>
        </div>
      </div>

      {!user ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-[4rem] p-20 text-center space-y-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E90FF]/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-[#1E90FF]/10 transition-all duration-700" />
          <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100 shadow-2xl relative z-10">
            <Lock size={56} className="text-gray-300" />
          </div>
          <div className="space-y-3 relative z-10">
            <h3 className="text-3xl font-serif font-black text-[#000080] tracking-tight">{t.loginRequired}</h3>
            <p className="text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">{t.loginToAccess}</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('profile')}
            className="bg-[#1E90FF] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-xl hover:glow-blue transition-all relative z-10"
          >
            Login to Continue
          </motion.button>
        </motion.div>
      ) : bookings.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-[4rem] p-20 text-center space-y-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-emerald-600/10 transition-all duration-700" />
          <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100 shadow-2xl relative z-10">
            <BookingIcon size={56} className="text-gray-300" />
          </div>
          <div className="space-y-3 relative z-10">
            <h3 className="text-3xl font-serif font-black text-[#000080] tracking-tight">No bookings found</h3>
            <p className="text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">You haven't made any bookings yet. Start planning your next trip!</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('explore')}
            className="bg-[#1E90FF] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-xl hover:glow-blue transition-all relative z-10"
          >
            Book Now
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {bookings.map((booking, idx) => (
            <motion.div 
              key={booking.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl flex items-center gap-6 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#1E90FF]/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E90FF] to-indigo-600 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform relative z-10">
                <BookingIcon size={32} />
              </div>
              <div className="flex-1 space-y-1 relative z-10">
                <h4 className="font-black text-[#000080] text-xl tracking-tight">{booking.title}</h4>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{booking.date}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-200" />
                  <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">{booking.status}</span>
                </div>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1E90FF] bg-[#1E90FF]/5 px-4 py-2 rounded-full border border-[#1E90FF]/10 relative z-10">
                {booking.type}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          { label: "Hotels", icon: Hotel, color: "bg-orange-500", desc: "Find the best stays", url: "https://www.makemytrip.com/hotels/" },
          { label: "Flights", icon: Navigation, color: "bg-[#1E90FF]", rotate: "-rotate-45", desc: "Fly anywhere in the world", url: "https://www.makemytrip.com/flights/" },
          { label: "Trains", icon: Navigation, color: "bg-emerald-500", rotate: "rotate-90", desc: "Scenic rail journeys", url: "https://www.confirmtkt.com/" },
          { label: "Buses", icon: Navigation, color: "bg-rose-500", desc: "Affordable road travel", url: "https://www.redbus.in/" },
          { label: "Cabs", icon: Navigation, color: "bg-amber-500", desc: "Local & outstation rides", url: "https://www.savaari.com/" },
          { label: "Activities", icon: Sparkles, color: "bg-purple-500", desc: "Unforgettable experiences", url: "https://www.klook.com/" }
        ].map((item, idx) => (
          <motion.a 
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -10 }}
            className="group bg-white border border-gray-100 rounded-[3rem] p-8 shadow-xl hover:shadow-2xl transition-all flex items-center gap-6 relative overflow-hidden"
          >
            <div className={cn("absolute top-0 right-0 w-24 h-24 opacity-5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110", item.color)} />
            <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 relative z-10", item.color)}>
              <item.icon size={36} className={item.rotate} />
            </div>
            <div className="flex-1 relative z-10">
              <h3 className="text-2xl font-serif font-black text-[#000080] tracking-tight">{item.label}</h3>
              <p className="text-gray-400 text-xs font-medium">{item.desc}</p>
            </div>
            <ArrowRight className="text-gray-200 group-hover:text-[#000080] transition-all relative z-10" />
          </motion.a>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        className="bg-white border border-gray-100 rounded-[3rem] p-12 text-center relative overflow-hidden group shadow-xl"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#1E90FF]/5 to-indigo-600/5 opacity-50" />
        <h4 className="text-3xl font-serif font-black text-[#000080] mb-3 tracking-tight relative z-10">Need help with booking?</h4>
        <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto relative z-10 font-medium">Our travel experts are available 24/7 to assist you with your journey.</p>
        <motion.button 
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="bg-[#000080] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-xl hover:glow-blue transition-all relative z-10"
        >
          Contact Support
        </motion.button>
      </motion.div>
    </div>
  );

  const startEditing = () => {
    if (user) {
      setEditForm({ name: user.name, phone: user.phone || '', photo: user.photo || '' });
      setIsEditingProfile(true);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        name: editForm.name,
        phone: editForm.phone,
        photo: editForm.photo
      });
      
      setUser({
        ...user,
        name: editForm.name,
        phone: editForm.phone,
        photo: editForm.photo
      });
      setIsEditingProfile(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderEditProfile = () => {
    if (!user) return null;
    return (
      <div className="space-y-8 pb-24 px-4 md:px-0">
        <div className="flex items-center gap-4 pt-8">
          <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
            <ArrowLeft size={24} className="text-[#000080]" />
          </button>
          <h2 className="text-3xl font-serif font-black text-[#000080] tracking-tight">Edit Profile</h2>
        </div>

        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                {editForm.photo ? (
                  <img src={editForm.photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <ProfileIcon size={48} className="text-[#1E90FF]" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-[#1E90FF] text-white p-2.5 rounded-full shadow-lg border-2 border-white hover:scale-110 transition-all cursor-pointer">
                <Camera size={18} />
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
              </label>
            </div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Tap to change photo</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
              <div className="relative">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-6 py-4 text-[#000080] font-bold outline-none focus:border-[#1E90FF] focus:bg-white transition-all"
                  placeholder="Your Name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="text" 
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-6 py-4 text-[#000080] font-bold outline-none focus:border-[#1E90FF] focus:bg-white transition-all"
                  placeholder="Your Phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="email" 
                  value={user.email}
                  disabled
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-6 py-4 text-gray-400 font-bold outline-none cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-gray-400 ml-4 italic">Email cannot be changed</p>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={updateProfile}
              disabled={loading}
              className="w-full bg-[#000080] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:glow-blue transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </motion.button>
            <button 
              onClick={() => setIsEditingProfile(false)}
              className="w-full bg-white text-gray-400 py-5 rounded-2xl font-black uppercase tracking-[0.2em] border border-gray-100 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    if (!user) return renderAuth();
    if (isEditingProfile) return renderEditProfile();
    
    return (
      <div className="space-y-12 pb-24 px-4 md:px-0">
        {/* Header Section */}
        <div className="text-center space-y-2 pt-8">
          <h2 className="text-4xl font-serif font-black text-[#000080] tracking-tight">Settings</h2>
          <p className="text-gray-400 text-sm font-medium">Manage your account and preferences</p>
        </div>

        {/* Account Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <User className="text-[#000080]" size={20} />
            <h3 className="text-lg font-bold text-[#000080]">Account</h3>
          </div>
          <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
            {/* Profile Summary */}
            <div className="p-6 flex items-center gap-4 border-b border-gray-50 bg-gray-50/30">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                {user.photo ? (
                  <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <ProfileIcon size={32} className="text-[#1E90FF]" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-[#000080]">{user.name}</h4>
                <p className="text-gray-400 text-xs font-medium">{user.email}</p>
              </div>
              <button 
                onClick={startEditing}
                className="text-[#1E90FF] font-black text-[10px] uppercase tracking-widest px-4 py-2 bg-white rounded-full border border-blue-50 hover:bg-blue-50 transition-all"
              >
                Edit
              </button>
            </div>

            {[
              { label: "Change Password", icon: Lock, color: "text-amber-500" },
              { label: "Email / Phone", icon: Mail, color: "text-emerald-500", detail: user.phone || "Add phone" }
            ].map((item, idx) => (
              <button key={idx} className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all border-b border-gray-50 last:border-0 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-all">
                    <item.icon size={20} className={item.color} />
                  </div>
                  <span className="text-[#000080] font-bold text-sm">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.detail && <span className="text-gray-400 text-xs font-medium">{item.detail}</span>}
                  <ArrowRight size={16} className="text-gray-200 group-hover:text-[#000080] transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <Settings className="text-[#000080]" size={20} />
            <h3 className="text-lg font-bold text-[#000080]">Preferences</h3>
          </div>
          <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
            {[
              { label: "Language", icon: Languages, color: "text-blue-500", value: language, options: ["English", "Marathi", "Hindi"], onChange: setLanguage },
              { label: "Currency", icon: WalletIcon, color: "text-emerald-500", value: currency, options: ["INR (₹)", "USD ($)", "EUR (€)"], onChange: setCurrency }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 border-b border-gray-50 hover:bg-gray-50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-all">
                    <item.icon size={20} className={item.color} />
                  </div>
                  <span className="text-[#000080] font-bold text-sm">{item.label}</span>
                </div>
                <select 
                  value={item.value}
                  onChange={(e) => item.onChange(e.target.value)}
                  className="bg-gray-50 text-[#000080] font-bold px-4 py-2 rounded-xl outline-none cursor-pointer text-xs border border-gray-100 focus:border-[#1E90FF] transition-all"
                >
                  {item.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}

            {/* Notification Settings */}
            <div className="flex items-center justify-between p-6 border-b border-gray-50 hover:bg-gray-50 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-all">
                  <Bell size={20} className="text-amber-500" />
                </div>
                <span className="text-[#000080] font-bold text-sm">Notifications</span>
              </div>
              <button 
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative p-1",
                  notificationsEnabled ? "bg-emerald-500" : "bg-gray-200"
                )}
              >
                <motion.div 
                  animate={{ x: notificationsEnabled ? 24 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow-sm" 
                />
              </button>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-all">
                  {isDarkMode ? <Moon size={20} className="text-indigo-500" /> : <Sun size={20} className="text-orange-500" />}
                </div>
                <span className="text-[#000080] font-bold text-sm">Theme</span>
              </div>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="bg-gray-50 px-4 py-2 rounded-xl text-[#000080] text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all border border-gray-100"
              >
                {isDarkMode ? "Dark" : "Light"}
              </button>
            </div>
          </div>
        </div>

        {/* Travel Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <MapIcon className="text-[#000080]" size={20} />
            <h3 className="text-lg font-bold text-[#000080]">Travel</h3>
          </div>
          <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
            {[
              { label: "Saved Trips", icon: Globe, color: "text-blue-500", count: savedTrips.length, tab: 'trips' },
              { label: "Booking History", icon: BookingIcon, color: "text-emerald-500", count: bookings.length, tab: 'bookings' },
              { label: "Payment Methods", icon: WalletIcon, color: "text-purple-500" }
            ].map((item, idx) => (
              <button 
                key={idx} 
                onClick={() => item.tab && setActiveTab(item.tab)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all border-b border-gray-50 last:border-0 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-all">
                    <item.icon size={20} className={item.color} />
                  </div>
                  <span className="text-[#000080] font-bold text-sm">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.count !== undefined && <span className="bg-blue-50 text-[#1E90FF] text-[10px] font-black px-2 py-0.5 rounded-full">{item.count}</span>}
                  <ArrowRight size={16} className="text-gray-200 group-hover:text-[#000080] transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Support Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <HelpCircle className="text-[#000080]" size={20} />
            <h3 className="text-lg font-bold text-[#000080]">Support</h3>
          </div>
          <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
            {[
              { label: "Help Center", icon: HelpCircle, color: "text-blue-500" },
              { label: "Contact Support", icon: Phone, color: "text-emerald-500" },
              { label: "Terms & Privacy", icon: ShieldCheck, color: "text-slate-500" }
            ].map((item, idx) => (
              <button key={idx} className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all border-b border-gray-50 last:border-0 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-all">
                    <item.icon size={20} className={item.color} />
                  </div>
                  <span className="text-[#000080] font-bold text-sm">{item.label}</span>
                </div>
                <ArrowRight size={16} className="text-gray-200 group-hover:text-[#000080] transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full bg-rose-50 border border-rose-100 text-rose-600 py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-rose-600 hover:text-white transition-all shadow-sm group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          Logout Account
        </motion.button>
      </div>
    );
  };

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-blue-100 transition-colors duration-500 pb-32 text-[#000080]",
      activeTab === 'explore' ? "bg-white" : "bg-[#F5F7FA]"
    )}>
      {/* Header */}
      <header className={cn(
        "pt-6 pb-4 px-6 sticky top-0 z-40 transition-all duration-500",
        activeTab === 'explore' 
          ? "bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm" 
          : "bg-[#000080] border-b border-white/10"
      )}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('explore')}
          >
            <img 
              src="/logo.png" 
              alt="Travolor Logo" 
              className="h-10 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <span className={cn(
              "text-xl font-display font-bold tracking-tight transition-colors duration-300",
              activeTab === 'explore' ? "text-[#000080]" : "text-white"
            )}>Travolor</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            {user ? (
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border cursor-pointer overflow-hidden relative transition-all duration-300",
                  activeTab === 'explore' ? "bg-gray-100 border-gray-200" : "bg-white/10 border-white/20"
                )}
                onClick={() => setActiveTab('profile')}
              >
                {user.photo ? (
                  <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <ProfileIcon className={activeTab === 'explore' ? "text-[#000080]" : "text-white"} size={20} />
                )}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full z-10" />
              </motion.div>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "px-6 py-2 rounded-full font-bold shadow-md hover:shadow-lg transition-all text-sm uppercase tracking-wider",
                  activeTab === 'explore' ? "btn-primary" : "bg-white text-[#000080]"
                )}
              >
                Login
              </motion.button>
            )}
          </motion.div>
        </div>
      </header>

      <main className={cn(
        "max-w-6xl mx-auto px-4",
        activeTab === 'explore' ? "pt-0" : "pt-6"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'explore' && renderExplore()}
            {activeTab === 'trips' && renderMyTrips()}
            {activeTab === 'bookings' && renderBookings()}
            {activeTab === 'profile' && renderProfile()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky Bottom Navigation */}
      <nav className="fixed bottom-6 left-0 right-0 z-50 px-6">
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl border border-gray-100 rounded-full shadow-xl p-1.5 flex justify-between items-center relative overflow-hidden">
          {[
            { id: "explore", icon: Globe, label: "Explore" },
            { id: "trips", icon: MapIcon, label: "Trips" },
            { id: "bookings", icon: BookingIcon, label: "Bookings" },
            { id: "profile", icon: Settings, label: "Settings" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-full transition-all flex-1 relative z-10 group"
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-blue-50 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon 
                size={20} 
                className={cn(
                  "transition-all duration-300 relative z-10",
                  activeTab === tab.id ? "text-[#1E90FF] scale-110" : "text-gray-400 group-hover:text-[#000080]"
                )} 
              />
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-tight relative z-10 transition-all duration-300",
                activeTab === tab.id ? "text-[#1E90FF] opacity-100" : "text-gray-400 opacity-0 group-hover:opacity-100"
              )}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_MAPS_API_KEY;
  if (mapsKey) {
    return <AppWithMaps mapsKey={mapsKey} />;
  }
  return <AppContent isLoaded={false} />;
}

function AppWithMaps({ mapsKey }: { mapsKey: string }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: mapsKey,
    libraries,
  });
  return <AppContent isLoaded={isLoaded} />;
}
