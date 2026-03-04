/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Calendar, Wallet, Search, Map as MapIcon, 
  Utensils, Hotel, Navigation, Sparkles, Loader2, 
  User, Users, Heart, Users2, Church, Trees, Castle,
  Clock, Thermometer, Info, ExternalLink, Compass,
  Mountain, Briefcase, Crown, Wallet as WalletIcon,
  Home, Globe, Briefcase as BookingIcon, User as ProfileIcon,
  ArrowRight, Camera, ShoppingBag, Lightbulb,
  Bell, Moon, Sun, Languages, LogOut, Settings, HelpCircle, ShieldCheck, Phone,
  AlertTriangle,
  Mail, Lock, Eye, EyeOff, Github, Share2,
  Plane, TrainFront, Bus, Car, Package,
  GripVertical, MapPin as MapPinIcon, Navigation2, Zap
} from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { generateItinerary } from './services/geminiService';
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
  budget: { bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-200", light: "bg-emerald-50" },
  standard: { bg: "bg-blue-500", text: "text-blue-500", border: "border-blue-200", light: "bg-blue-50" },
  luxury: { bg: "bg-purple-500", text: "text-purple-500", border: "border-purple-200", light: "bg-purple-50" },
  backpacking: { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-200", light: "bg-orange-50" },
  family: { bg: "bg-teal-500", text: "text-teal-500", border: "border-teal-200", light: "bg-teal-50" },
  honeymoon: { bg: "bg-pink-500", text: "text-pink-500", border: "border-pink-200", light: "bg-pink-50" },
  adventure: { bg: "bg-red-500", text: "text-red-500", border: "border-red-200", light: "bg-red-50" },
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
  { id: 'hotels', label: 'Hotels', icon: Hotel, color: 'bg-orange-500', link: (loc: string) => `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(loc)}` },
  { id: 'flights', label: 'Flights', icon: Plane, color: 'bg-blue-500', link: (loc: string) => `https://www.skyscanner.com/transport/flights-from/anywhere/to/${encodeURIComponent(loc)}` },
  { id: 'trains', label: 'Trains', icon: TrainFront, color: 'bg-red-600', link: (loc: string) => `https://www.irctc.co.in/nget/train-search` },
  { id: 'buses', label: 'Buses', icon: Bus, color: 'bg-rose-500', link: (loc: string) => `https://www.redbus.in/search?toCityName=${encodeURIComponent(loc)}` },
  { id: 'cabs', label: 'Cabs', icon: Car, color: 'bg-yellow-500', link: (loc: string) => `https://www.uber.com` },
  { id: 'packages', label: 'Packages', icon: Package, color: 'bg-purple-600', link: (loc: string) => `https://www.makemytrip.com/holiday-packages/search?dest=${encodeURIComponent(loc)}` },
];

const TRENDING_DESTINATIONS = [
  { id: 'goa', title: 'Goa', desc: 'Beaches & Parties', img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80' },
  { id: 'manali', title: 'Manali', desc: 'Snowy Peaks', img: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=400&q=80' },
  { id: 'dubai', title: 'Dubai', desc: 'Luxury & Desert', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=400&q=80' },
  { id: 'bali', title: 'Bali', desc: 'Tropical Paradise', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=400&q=80' },
  { id: 'kashmir', title: 'Kashmir', desc: 'Heaven on Earth', img: 'https://images.unsplash.com/photo-1598305371124-42ad180358ee?auto=format&fit=crop&w=400&q=80' },
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

function AppContent({ isLoaded }: { isLoaded: boolean }) {

  const [user, setUser] = useState<{id: string, name: string, email: string, photo?: string, phone?: string} | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [locationInput, setLocationInput] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [duration, setDuration] = useState(3);
  const [numPeople, setNumPeople] = useState(2);
  const [travelStyle, setTravelStyle] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<{distance: string, time: string, mode: string} | null>(null);
  const [activeTab, setActiveTab] = useState("explore");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('tripgenious_theme');
    return saved === 'dark';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language, setLanguage] = useState(() => localStorage.getItem('tripgenious_lang') || "English");
  const [currency, setCurrency] = useState(() => localStorage.getItem('tripgenious_currency') || "INR (₹)");
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
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
            const data = await response.json();
            const city = data.address.city || data.address.town || data.address.village || data.address.suburb;
            const state = data.address.state || data.address.country;
            if (city) setStartLocation(`${city}, ${state}`);
          } catch (error) {
            console.error("Error detecting location:", error);
          } finally {
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
          // Fetch coordinates for both cities
          const [res1, res2] = await Promise.all([
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startLocation)}&limit=1`),
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}&limit=1`)
          ]);
          const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

          if (data1[0] && data2[0]) {
            const lat1 = parseFloat(data1[0].lat);
            const lon1 = parseFloat(data1[0].lon);
            const lat2 = parseFloat(data2[0].lat);
            const lon2 = parseFloat(data2[0].lon);

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
  }, [startLocation, locationInput]);

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
    localStorage.setItem('tripgenious_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  React.useEffect(() => {
    localStorage.setItem('tripgenious_lang', language);
  }, [language]);

  React.useEffect(() => {
    localStorage.setItem('tripgenious_currency', currency);
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

  const renderExplore = () => (
    <div className="space-y-12">
      {/* Hero Section with Cinematic Background */}
      <section className="relative min-h-[60vh] md:min-h-[70vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-[#0B1220] via-[#0F1C3F] to-[#142E6E]">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B1220]/40 to-[#0B1220]" />
        </div>

        <div className="relative z-10 space-y-6 max-w-4xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-5xl md:text-8xl font-serif text-white font-bold tracking-tight leading-tight">
              TripGenious
            </h1>
            <div className="h-8 flex items-center justify-center">
              <p className="text-[#C8D4F0] text-lg md:text-xl font-light tracking-wide">
                Smart Travel. Powered by AI.
              </p>
            </div>
          </motion.div>

          {/* Glassmorphism Search Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-[2.5rem] p-6 md:p-10 space-y-8"
          >
            {/* From-To Card (MakeMyTrip Style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {/* From Input */}
              <div className="relative group">
                <div className="absolute top-3 left-6 z-10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 group-focus-within:text-blue-400 transition-colors">From</span>
                </div>
                <div className="absolute inset-y-0 left-6 flex items-center pt-4 pointer-events-none">
                  <MapPinIcon className="text-white/40 group-focus-within:text-white transition-colors" size={20} />
                </div>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(autocomplete) => setStartAutocomplete(autocomplete)}
                    onPlaceChanged={() => {
                      if (startAutocomplete !== null) {
                        const place = startAutocomplete.getPlace();
                        if (place.formatted_address) {
                          setStartLocation(place.formatted_address);
                        } else if (place.name) {
                          setStartLocation(place.name);
                        }
                        if (place.geometry?.location) {
                          setStartCoords({
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                          });
                        }
                      }
                    }}
                    options={{ types: ['(cities)'] }}
                  >
                    <input
                      type="text"
                      value={startLocation}
                      onChange={(e) => setStartLocation(e.target.value)}
                      placeholder="Starting City"
                      className="w-full bg-white/5 border border-white/10 rounded-3xl pl-14 pr-12 pt-8 pb-4 text-xl text-white placeholder:text-white/20 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 outline-none transition-all shadow-inner"
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    placeholder="Starting City"
                    className="w-full bg-white/5 border border-white/10 rounded-3xl pl-14 pr-12 pt-8 pb-4 text-xl text-white placeholder:text-white/20 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 outline-none transition-all shadow-inner"
                  />
                )}
                <button 
                  onClick={detectLocation}
                  className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 transition-all",
                    isLocating ? "animate-spin text-blue-400" : "text-white/40 hover:text-white"
                  )}
                >
                  <Navigation2 size={18} />
                </button>
              </div>

              {/* Swap Button */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex">
                <motion.button 
                  whileHover={{ rotate: 180 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="bg-blue-600 text-white p-3 rounded-full shadow-xl border-4 border-black/20 cursor-pointer" 
                  onClick={() => {
                    const temp = startLocation;
                    setStartLocation(locationInput);
                    setLocationInput(temp);
                  }}
                >
                  <ArrowRight size={20} />
                </motion.button>
              </div>

              {/* To Input */}
              <div className="relative group">
                <div className="absolute top-3 left-6 z-10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 group-focus-within:text-blue-400 transition-colors">To</span>
                </div>
                <div className="absolute inset-y-0 left-6 flex items-center pt-4 pointer-events-none">
                  <Search className="text-white/40 group-focus-within:text-white transition-colors" size={20} />
                </div>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(autocomplete) => setEndAutocomplete(autocomplete)}
                    onPlaceChanged={() => {
                      if (endAutocomplete !== null) {
                        const place = endAutocomplete.getPlace();
                        if (place.formatted_address) {
                          setLocationInput(place.formatted_address);
                        } else if (place.name) {
                          setLocationInput(place.name);
                        }
                        if (place.geometry?.location) {
                          setEndCoords({
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                          });
                        }
                      }
                    }}
                    options={{ types: ['(cities)'] }}
                  >
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Destination City"
                      className="w-full bg-white/5 border border-white/10 rounded-3xl pl-14 pr-6 pt-8 pb-4 text-xl text-white placeholder:text-white/20 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 outline-none transition-all shadow-inner"
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="Destination City"
                    className="w-full bg-white/5 border border-white/10 rounded-3xl pl-14 pr-6 pt-8 pb-4 text-xl text-white placeholder:text-white/20 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 outline-none transition-all shadow-inner"
                  />
                )}
              </div>
            </div>

            {/* Smart Chips & Mini Map Preview */}
            <AnimatePresence>
              {startLocation && locationInput && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  {/* Smart Chips */}
                  <div className="flex flex-wrap justify-center gap-3">
                    {[
                      { label: "Distance", value: routeSummary?.distance || "Calculating...", icon: Navigation2, color: "text-blue-400" },
                      { label: "Est. Time", value: routeSummary?.time || "Calculating...", icon: Clock, color: "text-emerald-400" },
                      { label: "Best Mode", value: routeSummary?.mode || "Calculating...", icon: Plane, color: "text-purple-400" }
                    ].map((chip, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2"
                      >
                        <chip.icon size={14} className={chip.color} />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{chip.label}</span>
                        <span className="text-xs font-bold text-white">{chip.value}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Mini Map Preview */}
                  <div className="relative h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 opacity-20">
                      <svg className="w-full h-full" viewBox="0 0 400 100">
                        <path d="M50,50 Q200,10 350,50" fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
                        <circle cx="50" cy="50" r="4" fill="white" />
                        <circle cx="350" cy="50" r="4" fill="white" />
                      </svg>
                    </div>
                    <div className="relative z-10 flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
                        <span className="text-[8px] font-bold text-white/60 mt-1 uppercase">{startLocation.split(',')[0]}</span>
                      </div>
                      <div className="w-32 h-px bg-gradient-to-r from-blue-400 to-emerald-400 animate-pulse" />
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                        <span className="text-[8px] font-bold text-white/60 mt-1 uppercase">{locationInput.split(',')[0]}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Duration */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <Calendar className="text-white/60 group-hover:text-white transition-colors" size={20} />
                  <span className="text-white/60 font-medium group-hover:text-white transition-colors">Duration</span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setDuration(Math.max(1, duration - 1))} className="text-white/40 hover:text-white transition-colors">-</button>
                  <span className="text-white font-bold text-xl w-6 text-center">{duration}</span>
                  <button onClick={() => setDuration(duration + 1)} className="text-white/40 hover:text-white transition-colors">+</button>
                </div>
              </div>

              {/* People */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <Users className="text-white/60 group-hover:text-white transition-colors" size={20} />
                  <span className="text-white/60 font-medium group-hover:text-white transition-colors">Travelers</span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setNumPeople(Math.max(1, numPeople - 1))} className="text-white/40 hover:text-white transition-colors">-</button>
                  <span className="text-white font-bold text-xl w-6 text-center">{numPeople}</span>
                  <button onClick={() => setNumPeople(numPeople + 1)} className="text-white/40 hover:text-white transition-colors">+</button>
                </div>
              </div>

              {/* Glowing Gradient CTA Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleGenerate()}
                disabled={loading}
                className="btn-primary relative overflow-hidden rounded-3xl py-4 font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Zap size={20} className="fill-current" />}
                {loading ? "Planning..." : t.planTrip}
                {!loading && <Sparkles size={16} className="absolute top-2 right-4 animate-pulse opacity-50" />}
              </motion.button>
            </div>

            {/* Travel Styles Grid */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Travel Style</span>
                <span className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">{travelStyle}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {TRAVEL_STYLES.filter(s => ['budget', 'luxury', 'adventure', 'family', 'standard'].includes(s.id)).map(style => {
                  const Icon = IconMap[style.icon];
                  const color = StyleColors[style.id];
                  return (
                    <button
                      key={style.id}
                      onClick={() => setTravelStyle(style.id)}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-[2rem] border transition-all relative overflow-hidden group",
                        travelStyle === style.id 
                          ? `${color.bg} border-white shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105 text-white` 
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                        travelStyle === style.id ? "bg-white/20" : "bg-white/5"
                      )}>
                        <Icon size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-tight">{style.label}</span>
                      {travelStyle === style.id && (
                        <motion.div layoutId="activeStyle" className="absolute inset-0 border-2 border-white rounded-[2rem]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transport & Accommodation Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Transport</span>
                  <span className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">{transportType}</span>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: 'public', label: 'Public', icon: Bus },
                    { id: 'private', label: 'Private', icon: Car },
                    { id: 'flight', label: 'Flight', icon: Plane }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setTransportType(item.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all",
                        transportType === item.id 
                          ? "bg-blue-600 border-white text-white shadow-lg" 
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      )}
                    >
                      <item.icon size={14} />
                      <span className="text-[10px] font-bold uppercase">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Accommodation</span>
                  <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">{accommodationType}</span>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: 'hostel', label: 'Hostel', icon: Home },
                    { id: 'standard', label: 'Standard', icon: Hotel },
                    { id: 'luxury', label: 'Luxury', icon: Crown }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setAccommodationType(item.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all",
                        accommodationType === item.id 
                          ? "bg-emerald-600 border-white text-white shadow-lg" 
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      )}
                    >
                      <item.icon size={14} />
                      <span className="text-[10px] font-bold uppercase">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trending Destinations - Horizontal Scroll */}
      {!itinerary && !loading && (
        <section className="space-y-6">
          <div className="flex justify-between items-end px-2">
            <div className="space-y-1">
              <h3 className="text-3xl font-serif font-bold text-white">Trending Now</h3>
              <p className="text-white/50 text-sm">Most loved destinations by fellow travelers</p>
            </div>
            <button className="text-blue-400 text-sm font-bold hover:text-white transition-colors flex items-center gap-2">
              View All <ArrowRight size={16} />
            </button>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-8 px-2 scrollbar-hide snap-x">
            {TRENDING_DESTINATIONS.map((dest) => (
              <motion.div
                key={dest.id}
                whileHover={{ y: -10 }}
                onClick={() => setLocationInput(dest.title)}
                className="min-w-[280px] md:min-w-[320px] h-[400px] relative rounded-[2.5rem] overflow-hidden shadow-2xl group cursor-pointer snap-start"
              >
                <img 
                  src={dest.img} 
                  alt={dest.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(dest);
                  }}
                  className={cn(
                    "absolute top-6 right-6 w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all shadow-2xl z-20",
                    wishlist.some(w => w.dest_id === dest.id) 
                      ? "bg-red-500 border-red-400 text-white" 
                      : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                  )}
                >
                  <Heart size={20} className={wishlist.some(w => w.dest_id === dest.id) ? "fill-current" : ""} />
                </button>

                <div className="absolute bottom-8 left-8 right-8 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-600 rounded-full text-[8px] font-bold text-white uppercase tracking-widest">Trending</span>
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[8px] font-bold text-white uppercase tracking-widest">4.8 ★</span>
                  </div>
                  <h4 className="text-white font-serif font-bold text-3xl">{dest.title}</h4>
                  <p className="text-white/60 text-sm font-light">{dest.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="py-20 flex flex-col items-center justify-center space-y-10"
          >
            {/* Skeleton Loading State */}
            <div className="w-full max-w-4xl space-y-8">
              <div className="h-96 w-full bg-white/5 animate-pulse rounded-[3rem]" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-16 bg-white/5 animate-pulse rounded-3xl" />
                <div className="h-16 bg-white/5 animate-pulse rounded-3xl" />
                <div className="h-16 bg-white/5 animate-pulse rounded-3xl" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 h-[600px] bg-white/5 animate-pulse rounded-[2.5rem]" />
                <div className="lg:col-span-4 space-y-6">
                  <div className="h-64 bg-white/5 animate-pulse rounded-[2.5rem]" />
                  <div className="h-96 bg-white/5 animate-pulse rounded-[2.5rem]" />
                </div>
              </div>
            </div>
            
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 border-4 border-white/10 border-t-blue-500 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Compass size={40} className="text-white animate-bounce" />
                </div>
              </div>
              <div className="text-center mt-8 space-y-3">
                <h3 className="text-3xl font-serif font-bold text-white tracking-tight">Crafting your adventure...</h3>
                <p className="text-blue-200/60 font-light tracking-widest uppercase text-xs">AI is finding the best local gems for you</p>
              </div>
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
                  <h2 className="text-6xl md:text-8xl font-serif font-bold text-white tracking-tighter leading-none">{locationInput}</h2>
                </div>
                <div className="flex gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={saveTrip}
                    className="bg-white/10 backdrop-blur-xl text-white px-8 py-5 rounded-3xl font-bold flex items-center gap-3 hover:bg-white hover:text-blue-600 transition-all shadow-2xl border border-white/20"
                  >
                    <Heart size={20} /> {t.saveTrip}
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openInMaps(locationInput)}
                    className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-bold flex items-center gap-3 hover:bg-blue-700 transition-all shadow-2xl"
                  >
                    <MapIcon size={20} /> {t.viewMaps}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Quick Actions / Optimization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: "budget", label: "Budget Version", icon: Wallet, color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500" },
                { id: "standard", label: "Optimize Plan", icon: Briefcase, color: "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500" },
                { id: "luxury", label: "Make It Luxury", icon: Crown, color: "bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500" }
              ].map((action) => (
                <button 
                  key={action.id}
                  onClick={() => handleGenerate(action.id)} 
                  className={cn(
                    "backdrop-blur-md border p-6 rounded-[2.5rem] font-bold transition-all flex items-center justify-center gap-3 group",
                    action.color,
                    "hover:text-white"
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
                <div className={cn("bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl border relative overflow-hidden", currentColor.border)}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-50" />
                  <div className="markdown-body prose prose-slate max-w-none prose-img:rounded-[2rem] prose-headings:font-serif prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
                    <Markdown>{itinerary}</Markdown>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-4 space-y-8">
                {/* Budget Summary Card */}
                <div className={cn("rounded-[3rem] p-10 border shadow-2xl text-white relative overflow-hidden group", currentColor.bg)}>
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
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 space-y-10 shadow-2xl">
                  <h4 className="text-white font-serif font-bold text-2xl tracking-tight">Trip Insights</h4>
                  <div className="space-y-8">
                    {[
                      { label: "Best Time", icon: Clock, value: "Oct - Mar", color: "text-orange-400" },
                      { label: "Crowd Level", icon: Users, value: "Moderate", color: "text-blue-400" },
                      { label: "Weather", icon: Thermometer, value: "Pleasant", color: "text-emerald-400" },
                      { label: "Photo Spots", icon: Camera, value: "12+ Points", color: "text-pink-400" },
                      { label: "Shopping", icon: ShoppingBag, value: "Local Crafts", color: "text-purple-400" },
                      { label: "Pro Tip", icon: Lightbulb, value: "Book early!", color: "text-amber-400" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-5 group">
                        <div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-white/10", item.color)}>
                          <item.icon size={22} />
                        </div>
                        <div>
                          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">{item.label}</p>
                          <p className="text-white font-semibold tracking-wide">{item.value}</p>
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
              className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-10"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <Wallet className="text-white" size={28} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif font-bold text-white tracking-tight">Trip Budget Tracker</h3>
                    <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Real-time cost analysis</p>
                  </div>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white/10 transition-all">
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Your Budget</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">₹</span>
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
                      className="bg-transparent text-white font-bold text-xl w-32 outline-none focus:text-blue-400 transition-colors"
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
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Total Estimate</p>
                        <motion.p 
                          key={totalEstimate}
                          initial={{ scale: 1.1, color: "#60a5fa" }}
                          animate={{ scale: 1, color: "#ffffff" }}
                          className="text-4xl font-bold tracking-tighter"
                        >
                          {formatPrice(totalEstimate)}
                        </motion.p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Remaining</p>
                        <motion.p 
                          key={remaining}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          className={cn("text-4xl font-bold tracking-tighter", isOverBudget ? "text-rose-400" : "text-emerald-400")}
                        >
                          {formatPrice(Math.abs(remaining))}
                          <span className="text-sm ml-2 opacity-60">{isOverBudget ? "Over" : "Left"}</span>
                        </motion.p>
                      </div>
                      <div className="flex items-center">
                        {isOverBudget ? (
                          <div className="bg-rose-500/20 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3 text-rose-200">
                            <AlertTriangle size={20} className="shrink-0" />
                            <p className="text-xs font-medium leading-relaxed">
                              ⚠ You are over budget by {formatPrice(Math.abs(remaining))}. Consider switching to budget hotels or public transport.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-emerald-200">
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
                        <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Budget Utilization</span>
                        <span className={cn("text-sm font-bold", isOverBudget ? "text-rose-400" : "text-emerald-400")}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={cn(
                            "h-full rounded-full shadow-[0_0_15px_rgba(0,0,0,0.2)]",
                            isOverBudget ? "bg-gradient-to-r from-rose-600 to-rose-400" : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                          )}
                        />
                      </div>
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {breakdown.map((item, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4 group hover:bg-white/10 transition-all">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", item.color)}>
                            <item.icon size={18} />
                          </div>
                          <div>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
                            <p className="text-white font-bold">{formatPrice(item.amount)}</p>
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
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl">
                    <BookingIcon className="text-white" size={24} />
                  </div>
                  <h3 className="text-3xl font-serif font-bold text-white tracking-tight">Complete Your Booking</h3>
                </div>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest hidden md:block">Best prices guaranteed</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {BOOKING_SERVICES.map((service) => (
                  <motion.button
                    key={service.id}
                    whileHover={{ y: -10, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.open(service.link(locationInput), '_blank')}
                    className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center gap-6 hover:bg-white/10 transition-all group relative overflow-hidden"
                  >
                    <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-6", service.color)}>
                      <service.icon className="text-white" size={28} />
                    </div>
                    <span className="text-white font-bold text-xs uppercase tracking-[0.2em]">{service.label}</span>
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8" />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderAuth = () => (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/20 backdrop-blur-2xl border border-white/30 rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-6">
            <Compass className="text-blue-600" size={32} />
          </div>
          <h2 className="text-3xl font-serif font-bold text-white">
            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-white/70">
            {authMode === 'login' ? 'Login to access your trips' : 'Join our community of travelers'}
          </p>
        </div>

        {authError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-500/20 border border-rose-500/30 text-rose-100 p-4 rounded-2xl text-sm text-center font-medium"
          >
            {authError}
          </motion.div>
        )}

        <div className="space-y-4">
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-slate-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-50 transition-all shadow-lg disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-white/40 text-xs font-bold uppercase tracking-widest">Or with Email</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div className="relative group">
                <ProfileIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={20} />
                <input 
                  type="text" 
                  required
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/20 transition-all"
                />
              </div>
            )}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={20} />
              <input 
                type="email" 
                required
                placeholder="Email Address"
                value={authForm.email}
                onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/20 transition-all"
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-12 py-4 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/20 transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? 'Login' : 'Sign Up')}
            </motion.button>
          </form>

          <p className="text-center text-white/60 text-sm">
            {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="ml-2 text-white font-bold hover:underline"
            >
              {authMode === 'login' ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );

  const renderMyTrips = () => (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
          <h2 className="text-5xl font-serif font-black text-white tracking-tighter">{t.myTrips}</h2>
          <p className="text-white/50 font-medium tracking-wide tracking-widest uppercase text-[10px]">Your curated collection of adventures</p>
        </div>
        <div className="flex gap-3">
          <div className="px-6 py-3 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-3 shadow-xl">
            <Globe size={16} className="text-blue-400" />
            <span className="text-white font-black text-lg tracking-tighter">{savedTrips.length}</span>
            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Total</span>
          </div>
        </div>
      </div>

      {!user ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[4rem] p-20 text-center space-y-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-600/20 transition-all duration-700" />
          <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center mx-auto border border-white/10 shadow-2xl relative z-10">
            <Lock size={56} className="text-white/40" />
          </div>
          <div className="space-y-3 relative z-10">
            <h3 className="text-3xl font-serif font-black text-white tracking-tight">{t.loginRequired}</h3>
            <p className="text-white/50 max-w-sm mx-auto leading-relaxed font-medium">{t.loginToAccess}</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('profile')}
            className="bg-white text-blue-600 px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(255,255,255,0.2)] hover:glow-blue transition-all relative z-10"
          >
            Login to Continue
          </motion.button>
        </motion.div>
      ) : savedTrips.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[4rem] p-20 text-center space-y-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-emerald-600/20 transition-all duration-700" />
          <div className="w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full flex items-center justify-center mx-auto border border-white/10 shadow-2xl relative z-10">
            <MapIcon size={56} className="text-white/40" />
          </div>
          <div className="space-y-3 relative z-10">
            <h3 className="text-3xl font-serif font-black text-white tracking-tight">Your map is empty</h3>
            <p className="text-white/50 max-w-sm mx-auto leading-relaxed font-medium">Start planning your journey and save your dream destinations here. ✈</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('explore')}
            className="bg-white text-blue-600 px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(255,255,255,0.2)] hover:glow-blue transition-all relative z-10"
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
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  {trip.style}
                </div>
                {trip.budget && (
                  <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white">
                    {trip.budget}
                  </div>
                )}
              </div>
              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-slate-900">{trip.location}</h3>
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
                          text: `Check out my ${trip.duration}-day ${trip.style} trip to ${trip.location} planned with TripGenious!`,
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
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
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
          <h2 className="text-5xl font-serif font-black text-white tracking-tighter">{t.bookings}</h2>
          <p className="text-white/50 font-medium tracking-wide tracking-widest uppercase text-[10px]">Manage your travel arrangements in one place</p>
        </div>
        <div className="flex gap-3">
          <div className="px-6 py-3 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-3 shadow-xl">
            <BookingIcon size={16} className="text-emerald-400" />
            <span className="text-white font-black text-lg tracking-tighter">{bookings.length}</span>
            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Active</span>
          </div>
        </div>
      </div>

      {!user ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[4rem] p-20 text-center space-y-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-600/20 transition-all duration-700" />
          <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center mx-auto border border-white/10 shadow-2xl relative z-10">
            <Lock size={56} className="text-white/40" />
          </div>
          <div className="space-y-3 relative z-10">
            <h3 className="text-3xl font-serif font-black text-white tracking-tight">{t.loginRequired}</h3>
            <p className="text-white/50 max-w-sm mx-auto leading-relaxed font-medium">{t.loginToAccess}</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('profile')}
            className="bg-white text-blue-600 px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(255,255,255,0.2)] hover:glow-blue transition-all relative z-10"
          >
            Login to Continue
          </motion.button>
        </motion.div>
      ) : bookings.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[4rem] p-20 text-center space-y-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-emerald-600/20 transition-all duration-700" />
          <div className="w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full flex items-center justify-center mx-auto border border-white/10 shadow-2xl relative z-10">
            <BookingIcon size={56} className="text-white/40" />
          </div>
          <div className="space-y-3 relative z-10">
            <h3 className="text-3xl font-serif font-black text-white tracking-tight">No bookings found</h3>
            <p className="text-white/50 max-w-sm mx-auto leading-relaxed font-medium">You haven't made any bookings yet. Start planning your next trip!</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('explore')}
            className="bg-white text-blue-600 px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(255,255,255,0.2)] hover:glow-blue transition-all relative z-10"
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
              className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-8 shadow-2xl flex items-center gap-6 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform relative z-10">
                <BookingIcon size={32} />
              </div>
              <div className="flex-1 space-y-1 relative z-10">
                <h4 className="font-black text-white text-xl tracking-tight">{booking.title}</h4>
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{booking.date}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{booking.status}</span>
                </div>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 bg-blue-400/10 px-4 py-2 rounded-full border border-blue-400/20 relative z-10">
                {booking.type}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          { label: "Hotels", icon: Hotel, color: "bg-orange-500", desc: "Find the best stays", url: "https://www.makemytrip.com/hotels/" },
          { label: "Flights", icon: Navigation, color: "bg-blue-500", rotate: "-rotate-45", desc: "Fly anywhere in the world", url: "https://www.makemytrip.com/flights/" },
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
            className="group bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[3rem] p-8 shadow-2xl hover:bg-white/20 transition-all flex items-center gap-6 relative overflow-hidden"
          >
            <div className={cn("absolute top-0 right-0 w-24 h-24 opacity-10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110", item.color)} />
            <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 relative z-10", item.color)}>
              <item.icon size={36} className={item.rotate} />
            </div>
            <div className="flex-1 relative z-10">
              <h3 className="text-2xl font-serif font-black text-white tracking-tight">{item.label}</h3>
              <p className="text-white/40 text-xs font-medium">{item.desc}</p>
            </div>
            <ArrowRight className="text-white/20 group-hover:text-white transition-all relative z-10" />
          </motion.a>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-3xl border border-white/20 rounded-[3rem] p-12 text-center relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)]" />
        <h4 className="text-3xl font-serif font-black text-white mb-3 tracking-tight relative z-10">Need help with booking?</h4>
        <p className="text-white/50 text-lg mb-8 max-w-md mx-auto relative z-10">Our travel experts are available 24/7 to assist you with your journey.</p>
        <motion.button 
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="bg-white text-blue-600 px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-2xl hover:glow-blue transition-all relative z-10"
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
      alert("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const renderProfile = () => {
    if (!user) return renderAuth();
    
    return (
      <div className="space-y-10 pb-12">
        {/* Premium Profile Header */}
        <div className="relative bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[3.5rem] overflow-hidden shadow-2xl group">
          {/* Animated Gradient Banner */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 animate-gradient-x relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 5, 0]
              }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" 
            />
          </div>

          <div className="relative z-10 px-8 md:px-12 pb-12 -mt-20">
            <div className="flex flex-col md:flex-row items-end gap-8">
              {/* Circular Avatar with Glow Ring */}
              <div className="relative group/avatar">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="w-40 h-40 rounded-full p-1.5 bg-gradient-to-tr from-blue-500 via-emerald-500 to-purple-500 shadow-[0_0_30px_rgba(59,130,246,0.5)] relative z-10"
                >
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border-4 border-slate-900">
                    {user.photo ? (
                      <img src={user.photo} alt={user.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" />
                    ) : (
                      <ProfileIcon size={80} className="text-white/20" />
                    )}
                  </div>
                </motion.div>
                <label className="absolute bottom-2 right-2 bg-white text-blue-600 p-3 rounded-full shadow-2xl border border-blue-100 hover:scale-110 transition-all cursor-pointer z-20 hover:glow-blue">
                  <Camera size={20} />
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                </label>
              </div>

              <div className="flex-1 text-center md:text-left space-y-4 pb-2">
                {isEditingProfile ? (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4 max-w-sm"
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Full Name</label>
                        <input 
                          type="text" 
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
                          placeholder="Full Name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Mobile Number</label>
                        <input 
                          type="text" 
                          value={editForm.phone}
                          onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
                          placeholder="Mobile Number"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={updateProfile} className="flex-1 bg-white text-blue-600 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-blue-50 transition-all">
                        {t.saveChanges}
                      </button>
                      <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-white/10 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest border border-white/20 hover:bg-white/20 transition-all">
                        {t.cancel}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
                    <div className="space-y-2">
                      <h2 className="text-5xl font-serif font-black text-white tracking-tighter">{user.name}</h2>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                          <Mail size={14} className="text-blue-400" />
                          <span className="text-white/60 text-xs font-bold">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                          <Phone size={14} className="text-emerald-400" />
                          <span className="text-white/60 text-xs font-bold">
                            {user.phone || (
                              <button onClick={startEditing} className="text-white underline hover:text-blue-400 transition-colors">
                                {t.addPhone}
                              </button>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startEditing}
                      className="bg-white text-blue-600 px-10 py-4 rounded-full font-black text-sm uppercase tracking-widest shadow-2xl hover:glow-blue transition-all flex items-center gap-3 mx-auto md:mx-0"
                    >
                      <Settings size={18} /> {t.editProfile}
                    </motion.button>
                  </div>
                )}
              </div>
            </div>

            {/* Travel Stats in Premium Glass Pills */}
            {!isEditingProfile && (
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-8">
                {[
                  { label: t.tripsPlanned, count: savedTrips.length, icon: Globe, color: 'text-blue-400' },
                  { label: t.upcoming, count: bookings.length, icon: Calendar, color: 'text-emerald-400' },
                  { label: t.saved, count: wishlist.length, icon: Heart, color: 'text-rose-400' }
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="px-6 py-3 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-3 shadow-xl hover:bg-white/10 transition-all cursor-default"
                  >
                    <stat.icon size={16} className={stat.color} />
                    <span className="text-white font-black text-lg tracking-tighter">{stat.count}</span>
                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section Cards with Icons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Settings Section */}
          <div className="space-y-8">
            <div className="flex items-center gap-4 px-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_10px_30px_rgba(37,99,235,0.4)]">
                <Settings className="text-white" size={28} />
              </div>
              <h3 className="text-3xl font-serif font-black text-white tracking-tight">{t.settings}</h3>
            </div>
            <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[3rem] overflow-hidden shadow-2xl">
              {[
                { label: t.language, icon: Languages, color: 'text-blue-400', value: language, onChange: setLanguage, options: ["English", "Marathi", "Hindi"] },
                { label: t.currency, icon: WalletIcon, color: 'text-emerald-400', value: currency, onChange: setCurrency, options: ["INR (₹)", "USD ($)", "EUR (€)"] }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-8 border-b border-white/10 hover:bg-white/5 transition-all group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                      <item.icon size={24} className={item.color} />
                    </div>
                    <span className="text-white font-black text-lg tracking-tight">{item.label}</span>
                  </div>
                  <select 
                    value={item.value}
                    onChange={(e) => item.onChange(e.target.value)}
                    className="bg-white/5 text-white font-black px-6 py-3 rounded-2xl outline-none cursor-pointer text-sm border border-white/10 focus:border-white/30 transition-all"
                  >
                    {item.options.map(opt => (
                      <option key={opt} className="text-slate-900" value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between p-8 border-b border-white/10 hover:bg-white/5 transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                    <Bell size={24} className="text-amber-400" />
                  </div>
                  <span className="text-white font-black text-lg tracking-tight">{t.notifications}</span>
                </div>
                <button 
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={cn(
                    "w-16 h-8 rounded-full transition-all relative p-1",
                    notificationsEnabled ? "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" : "bg-white/10"
                  )}
                >
                  <motion.div 
                    animate={{ x: notificationsEnabled ? 32 : 0 }}
                    className="w-6 h-6 bg-white rounded-full shadow-lg" 
                  />
                </button>
              </div>

              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between p-8 hover:bg-white/5 transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                    {isDarkMode ? <Moon size={24} className="text-indigo-400" /> : <Sun size={24} className="text-orange-400" />}
                  </div>
                  <span className="text-white font-black text-lg tracking-tight">{t.theme}</span>
                </div>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="bg-white/10 px-8 py-3 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all border border-white/10"
                >
                  {isDarkMode ? "Dark" : "Light"}
                </button>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <div className="space-y-8">
            <div className="flex items-center gap-4 px-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.4)]">
                <HelpCircle className="text-white" size={28} />
              </div>
              <h3 className="text-3xl font-serif font-black text-white tracking-tight">{t.support}</h3>
            </div>
            <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[3rem] overflow-hidden shadow-2xl">
              {[
                { label: "Call Support", icon: Phone, color: 'text-blue-400', href: "tel:+919876543210" },
                { label: "WhatsApp Support", icon: Phone, color: 'text-emerald-400', href: "https://wa.me/919876543210" },
                { label: "Email Support", icon: Mail, color: 'text-rose-400', href: "mailto:support@tripgenious.com" },
                { label: "Help & FAQ", icon: HelpCircle, color: 'text-purple-400' },
                { label: "About Us", icon: Info, color: 'text-sky-400' },
                { label: "Privacy Policy", icon: ShieldCheck, color: 'text-slate-400' }
              ].map((item, idx) => (
                <motion.a 
                  key={idx}
                  href={item.href}
                  target={item.href?.startsWith('http') ? "_blank" : undefined}
                  rel={item.href?.startsWith('http') ? "noreferrer" : undefined}
                  whileHover={{ x: 10 }}
                  className="w-full flex items-center justify-between p-8 text-white hover:bg-white/5 transition-all border-b border-white/10 last:border-0 group cursor-pointer"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                      <item.icon size={24} className={item.color} />
                    </div>
                    <span className="text-white font-black text-lg tracking-tight">{item.label}</span>
                  </div>
                  <ArrowRight size={20} className="text-white/20 group-hover:text-white transition-all" />
                </motion.a>
              ))}
            </div>

            {/* Logout Button */}
            <motion.button 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-100 py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-rose-500 hover:text-white transition-all shadow-2xl group"
            >
              <LogOut size={24} className="group-hover:-translate-x-2 transition-transform" />
              Logout Account
            </motion.button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-blue-100 transition-colors duration-500 pb-32 text-white",
      "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#142E6E] via-[#0F2A5F] to-[#0B1E3D]"
    )}>
      {/* Header */}
      <header className="pt-8 pb-4 px-6 sticky top-0 z-40 backdrop-blur-md bg-transparent">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('explore')}
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl group-hover:glow-blue transition-all duration-300">
              <Compass className="text-blue-600" size={28} />
            </div>
            <span className="text-white font-serif text-2xl font-black tracking-tighter drop-shadow-md">TripGenious</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            {user ? (
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/40 cursor-pointer overflow-hidden relative shadow-2xl"
                onClick={() => setActiveTab('profile')}
              >
                {user.photo ? (
                  <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <ProfileIcon className="text-white" size={24} />
                )}
                <div className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full z-10 shadow-lg" />
              </motion.div>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('profile')}
                className="bg-white text-blue-600 px-8 py-3 rounded-full font-black shadow-2xl hover:glow-blue transition-all text-sm uppercase tracking-widest"
              >
                Login
              </motion.button>
            )}
          </motion.div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6">
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
      <nav className="fixed bottom-8 left-0 right-0 z-50 px-6">
        <div className="max-w-md mx-auto bg-[#0B1E3D]/60 backdrop-blur-3xl border border-[#1FD1F9]/20 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#1FD1F9]/10 to-transparent pointer-events-none" />
          {[
            { id: "explore", icon: Globe, label: "Explore" },
            { id: "trips", icon: MapIcon, label: "My Trips" },
            { id: "bookings", icon: BookingIcon, label: "Bookings" },
            { id: "profile", icon: ProfileIcon, label: "Profile" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-1 px-4 py-3 rounded-full transition-all flex-1 relative z-10 group"
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-[#00C6FF] to-[#0072FF] rounded-full shadow-[0_0_20px_rgba(0,198,255,0.6)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon 
                size={22} 
                className={cn(
                  "transition-all duration-300 relative z-10",
                  activeTab === tab.id ? "text-[#FFFFFF] scale-110" : "text-[#C8D4F0]/70 group-hover:text-[#FFFFFF]"
                )} 
              />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-tighter relative z-10 transition-all duration-300",
                activeTab === tab.id ? "text-[#FFFFFF] opacity-100" : "text-[#C8D4F0]/70 opacity-0 group-hover:opacity-60"
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
  const mapsKey = import.meta.env.VITE_MAPS_API_KEY;
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
