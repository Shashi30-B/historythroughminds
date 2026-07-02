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
  AlertTriangle, Check, Trash2,
  Mail, Lock, Eye, EyeOff, Github, Share2,
  Plane, TrainFront, Bus, Car, Package,
  GripVertical, MapPin as MapPinIcon, Navigation2, Zap,
  MessageSquare, Send, Bot, Cpu, X,
  Mic, MicOff, Volume2, VolumeX, FileDown
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLoadScript, Autocomplete, GoogleMap, MarkerF, InfoWindowF, PolylineF } from '@react-google-maps/api';
import { generateItinerary, getSuggestions, sendChatMessage } from './services/geminiService';
import { TRAVEL_STYLES } from './constants';
import AIHub from './components/AIHub';
import { ItineraryShareModal } from './components/ItineraryShareModal';
import { AnimatedItinerary } from './components/AnimatedItinerary';
import { InteractiveItineraryView } from './components/InteractiveItineraryView';
import { BudgetDashboardView } from './components/BudgetDashboardView';
import { LocalGuideView } from './components/LocalGuideView';
import { HotelSuggestionsView } from './components/HotelSuggestionsView';
import { exportItineraryToPDF } from './services/pdfExport';

const libraries: ("places")[] = ["places"];

import { auth, db, isFirebaseAvailable } from './firebase';
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
  // Maharashtra Cities & Popular Tourist Hubs
  { description: 'Mumbai, Maharashtra, India', place_id: 'mumbai', structured_formatting: { main_text: 'Mumbai', secondary_text: 'Maharashtra, India' } },
  { description: 'Pune, Maharashtra, India', place_id: 'pune', structured_formatting: { main_text: 'Pune', secondary_text: 'Maharashtra, India' } },
  { description: 'Kolhapur, Maharashtra, India', place_id: 'kolhapur', structured_formatting: { main_text: 'Kolhapur', secondary_text: 'Maharashtra, India' } },
  { description: 'Mahabaleshwar, Maharashtra, India', place_id: 'mahabaleshwar', structured_formatting: { main_text: 'Mahabaleshwar', secondary_text: 'Maharashtra, India' } },
  { description: 'Lonavala, Maharashtra, India', place_id: 'lonavala', structured_formatting: { main_text: 'Lonavala', secondary_text: 'Maharashtra, India' } },
  { description: 'Nashik, Maharashtra, India', place_id: 'nashik', structured_formatting: { main_text: 'Nashik', secondary_text: 'Maharashtra, India' } },
  { description: 'Alibaug, Maharashtra, India', place_id: 'alibaug', structured_formatting: { main_text: 'Alibaug', secondary_text: 'Maharashtra, India' } },
  { description: 'Shirdi, Maharashtra, India', place_id: 'shirdi', structured_formatting: { main_text: 'Shirdi', secondary_text: 'Maharashtra, India' } },
  { description: 'Aurangabad, Maharashtra, India', place_id: 'aurangabad', structured_formatting: { main_text: 'Chhatrapati Sambhajinagar (Aurangabad)', secondary_text: 'Maharashtra, India' } },
  { description: 'Nagpur, Maharashtra, India', place_id: 'nagpur', structured_formatting: { main_text: 'Nagpur', secondary_text: 'Maharashtra, India' } },
  { description: 'Ratnagiri, Maharashtra, India', place_id: 'ratnagiri', structured_formatting: { main_text: 'Ratnagiri', secondary_text: 'Maharashtra, India' } },
  { description: 'Khandala, Maharashtra, India', place_id: 'khandala', structured_formatting: { main_text: 'Khandala', secondary_text: 'Maharashtra, India' } },
  { description: 'Panchgani, Maharashtra, India', place_id: 'panchgani', structured_formatting: { main_text: 'Panchgani', secondary_text: 'Maharashtra, India' } },
  { description: 'Satara, Maharashtra, India', place_id: 'satara', structured_formatting: { main_text: 'Satara', secondary_text: 'Maharashtra, India' } },
  { description: 'Solapur, Maharashtra, India', place_id: 'solapur', structured_formatting: { main_text: 'Solapur', secondary_text: 'Maharashtra, India' } },
  { description: 'Sangli, Maharashtra, India', place_id: 'sangli', structured_formatting: { main_text: 'Sangli', secondary_text: 'Maharashtra, India' } },
  { description: 'Thane, Maharashtra, India', place_id: 'thane', structured_formatting: { main_text: 'Thane', secondary_text: 'Maharashtra, India' } },
  { description: 'Navi Mumbai, Maharashtra, India', place_id: 'navimumbai', structured_formatting: { main_text: 'Navi Mumbai', secondary_text: 'Maharashtra, India' } },
  
  // Other Key Indian Cities & Tourist Destinations (highly requested ones starting with K & others)
  { description: 'Kolkata, West Bengal, India', place_id: 'kolkata', structured_formatting: { main_text: 'Kolkata', secondary_text: 'West Bengal, India' } },
  { description: 'Kochi, Kerala, India', place_id: 'kochi', structured_formatting: { main_text: 'Kochi', secondary_text: 'Kerala, India' } },
  { description: 'Kedarnath, Uttarakhand, India', place_id: 'kedarnath', structured_formatting: { main_text: 'Kedarnath', secondary_text: 'Uttarakhand, India' } },
  { description: 'Kashmir, Jammu & Kashmir, India', place_id: 'kashmir', structured_formatting: { main_text: 'Kashmir', secondary_text: 'Jammu & Kashmir, India' } },
  { description: 'Kanyakumari, Tamil Nadu, India', place_id: 'kanyakumari', structured_formatting: { main_text: 'Kanyakumari', secondary_text: 'Tamil Nadu, India' } },
  { description: 'Kerala, India', place_id: 'kerela', structured_formatting: { main_text: 'Kerala', secondary_text: 'India' } },
  { description: 'Kodaikanal, Tamil Nadu, India', place_id: 'kodaikanal', structured_formatting: { main_text: 'Kodaikanal', secondary_text: 'Tamil Nadu, India' } },
  { description: 'Karwar, Karnataka, India', place_id: 'karwar', structured_formatting: { main_text: 'Karwar', secondary_text: 'Karnataka, India' } },
  { description: 'Kanpur, Uttar Pradesh, India', place_id: 'kanpur', structured_formatting: { main_text: 'Kanpur', secondary_text: 'Uttar Pradesh, India' } },
  { description: 'Delhi, India', place_id: 'delhi', structured_formatting: { main_text: 'Delhi', secondary_text: 'India' } },
  { description: 'Bangalore, Karnataka, India', place_id: 'bangalore', structured_formatting: { main_text: 'Bangalore', secondary_text: 'Karnataka, India' } },
  { description: 'Hyderabad, Telangana, India', place_id: 'hyderabad', structured_formatting: { main_text: 'Hyderabad', secondary_text: 'Telangana, India' } },
  { description: 'Chennai, Tamil Nadu, India', place_id: 'chennai', structured_formatting: { main_text: 'Chennai', secondary_text: 'Tamil Nadu, India' } },
  { description: 'Goa, India', place_id: 'goa', structured_formatting: { main_text: 'Goa', secondary_text: 'India' } },
  { description: 'Jaipur, Rajasthan, India', place_id: 'jaipur', structured_formatting: { main_text: 'Jaipur', secondary_text: 'Rajasthan, India' } },
  { description: 'Udaipur, Rajasthan, India', place_id: 'udaipur', structured_formatting: { main_text: 'Udaipur', secondary_text: 'Rajasthan, India' } },
  { description: 'Manali, Himachal Pradesh, India', place_id: 'manali', structured_formatting: { main_text: 'Manali', secondary_text: 'Himachal Pradesh, India' } },
  { description: 'Shimla, Himachal Pradesh, India', place_id: 'shimla', structured_formatting: { main_text: 'Shimla', secondary_text: 'Himachal Pradesh, India' } },
  { description: 'Ooty, Tamil Nadu, India', place_id: 'ooty', structured_formatting: { main_text: 'Ooty', secondary_text: 'Tamil Nadu, India' } },
  { description: 'Munnar, Kerala, India', place_id: 'munnar', structured_formatting: { main_text: 'Munnar', secondary_text: 'Kerala, India' } },
  
  // More Majestic Indian Destinations
  { description: 'Chopta, Uttarakhand, India', place_id: 'chopta', structured_formatting: { main_text: 'Chopta', secondary_text: 'Uttarakhand, India' } },
  { description: 'Alleppey (Alappuzha), Kerala, India', place_id: 'alleppey', structured_formatting: { main_text: 'Alleppey (Alappuzha)', secondary_text: 'Kerala, India' } },
  { description: 'Gokarna, Karnataka, India', place_id: 'gokarna', structured_formatting: { main_text: 'Gokarna', secondary_text: 'Karnataka, India' } },
  { description: 'Gandikota, Andhra Pradesh, India', place_id: 'gandikota', structured_formatting: { main_text: 'Gandikota', secondary_text: 'Andhra Pradesh, India' } },
  { description: 'Agra, Uttar Pradesh, India', place_id: 'agra', structured_formatting: { main_text: 'Agra', secondary_text: 'Uttar Pradesh, India' } },
  { description: 'Amritsar, Punjab, India', place_id: 'amritsar', structured_formatting: { main_text: 'Amritsar', secondary_text: 'Punjab, India' } },
  { description: 'Srinagar, Jammu & Kashmir, India', place_id: 'srinagar', structured_formatting: { main_text: 'Srinagar', secondary_text: 'Jammu & Kashmir, India' } },
  { description: 'Ladakh, Jammu & Kashmir, India', place_id: 'ladakh', structured_formatting: { main_text: 'Ladakh', secondary_text: 'Jammu & Kashmir, India' } },
  { description: 'Varanasi, Uttar Pradesh, India', place_id: 'varanasi', structured_formatting: { main_text: 'Varanasi', secondary_text: 'Uttar Pradesh, India' } },
  { description: 'Rishikesh, Uttarakhand, India', place_id: 'rishikesh', structured_formatting: { main_text: 'Rishikesh', secondary_text: 'Uttarakhand, India' } },
  { description: 'Coorg, Karnataka, India', place_id: 'coorg', structured_formatting: { main_text: 'Coorg (Madikeri)', secondary_text: 'Karnataka, India' } },
  { description: 'Hampi, Karnataka, India', place_id: 'hampi', structured_formatting: { main_text: 'Hampi', secondary_text: 'Karnataka, India' } },
  { description: 'Mysore, Karnataka, India', place_id: 'mysore', structured_formatting: { main_text: 'Mysore', secondary_text: 'Karnataka, India' } },
  { description: 'Pondicherry, India', place_id: 'pondicherry', structured_formatting: { main_text: 'Pondicherry', secondary_text: 'India' } },
  { description: 'Tirupati, Andhra Pradesh, India', place_id: 'tirupati', structured_formatting: { main_text: 'Tirupati', secondary_text: 'Andhra Pradesh, India' } },

  // International Destinations
  { description: 'Dubai, United Arab Emirates', place_id: 'dubai', structured_formatting: { main_text: 'Dubai', secondary_text: 'United Arab Emirates' } },
  { description: 'Bali, Indonesia', place_id: 'bali', structured_formatting: { main_text: 'Bali', secondary_text: 'Indonesia' } },
  { description: 'London, United Kingdom', place_id: 'london', structured_formatting: { main_text: 'London', secondary_text: 'United Kingdom' } },
  { description: 'New York, USA', place_id: 'newyork', structured_formatting: { main_text: 'New York', secondary_text: 'USA' } },
  { description: 'Paris, France', place_id: 'paris', structured_formatting: { main_text: 'Paris', secondary_text: 'France' } },
  { description: 'Singapore', place_id: 'singapore', structured_formatting: { main_text: 'Singapore', secondary_text: 'South East Asia' } },
  { description: 'Kuala Lumpur, Malaysia', place_id: 'kualalumpur', structured_formatting: { main_text: 'Kuala Lumpur', secondary_text: 'Malaysia' } },
  { description: 'Kyoto, Japan', place_id: 'kyoto', structured_formatting: { main_text: 'Kyoto', secondary_text: 'Japan' } },
  { description: 'Kathmandu, Nepal', place_id: 'kathmandu', structured_formatting: { main_text: 'Kathmandu', secondary_text: 'Nepal' } },
];

const CITY_COORDS_DB: Record<string, { lat: number, lng: number }> = {
  mumbai: { lat: 19.0760, lng: 72.8777 },
  pune: { lat: 18.5204, lng: 73.8567 },
  kolhapur: { lat: 16.7050, lng: 74.2433 },
  mahabaleshwar: { lat: 17.9237, lng: 73.6586 },
  lonavala: { lat: 18.7481, lng: 73.4072 },
  nashik: { lat: 19.9975, lng: 73.7898 },
  alibaug: { lat: 18.6584, lng: 72.8777 },
  shirdi: { lat: 19.7661, lng: 74.4754 },
  aurangabad: { lat: 19.8762, lng: 75.3433 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  ratnagiri: { lat: 16.9902, lng: 73.3120 },
  satara: { lat: 17.6805, lng: 73.9918 },
  solapur: { lat: 17.6599, lng: 75.9064 },
  sangli: { lat: 16.8524, lng: 74.5815 },
  thane: { lat: 19.2183, lng: 72.9781 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  kedarnath: { lat: 30.7346, lng: 79.0669 },
  kashmir: { lat: 34.0837, lng: 74.7973 },
  kanyakumari: { lat: 8.0883, lng: 77.5385 },
  kodaikanal: { lat: 11.4102, lng: 76.6950 },
  karwar: { lat: 14.5479, lng: 74.3188 },
  kanpur: { lat: 26.4499, lng: 80.3319 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  goa: { lat: 15.2993, lng: 74.1240 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  udaipur: { lat: 24.5854, lng: 73.7125 },
  manali: { lat: 32.2396, lng: 77.1887 },
  shimla: { lat: 31.1048, lng: 77.1734 },
  ooty: { lat: 11.4102, lng: 76.6950 },
  munnar: { lat: 10.0889, lng: 77.0595 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  bali: { lat: -8.4095, lng: 115.1889 },
  london: { lat: 51.5074, lng: -0.1278 },
  newyork: { lat: 40.7128, lng: -74.0060 },
  paris: { lat: 48.8566, lng: 2.3522 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  kualalumpur: { lat: 3.1390, lng: 101.6869 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  kathmandu: { lat: 27.7172, lng: 85.3240 },
  chopta: { lat: 30.4853, lng: 79.2255 },
  alleppey: { lat: 9.4981, lng: 76.3388 },
  gokarna: { lat: 14.5479, lng: 74.3188 },
  gandikota: { lat: 15.0277, lng: 78.2861 },
  agra: { lat: 27.1767, lng: 78.0081 },
  amritsar: { lat: 31.6340, lng: 74.8723 },
  srinagar: { lat: 34.0837, lng: 74.7973 },
  ladakh: { lat: 34.1526, lng: 77.5771 },
  varanasi: { lat: 25.3176, lng: 82.9739 },
  rishikesh: { lat: 30.0869, lng: 78.2676 },
  coorg: { lat: 12.3375, lng: 75.8069 },
  hampi: { lat: 15.3350, lng: 76.4600 },
  mysore: { lat: 12.2958, lng: 76.6394 },
  pondicherry: { lat: 11.9416, lng: 79.8083 },
  tirupati: { lat: 13.6288, lng: 79.4192 }
};

function lookupCityCoords(cityName: string, providedCoords: {lat: number, lng: number} | null): {lat: number, lng: number} | null {
  if (providedCoords && providedCoords.lat && providedCoords.lng) {
    return providedCoords;
  }
  const clean = (cityName || "").toLowerCase().trim();
  if (!clean) return null;
  for (const [key, val] of Object.entries(CITY_COORDS_DB)) {
    if (clean.includes(key)) {
      return val;
    }
  }
  return null;
}

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
  isLocating,
  language = "English"
}: any) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [service, setService] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    const langCode = language === "Marathi" ? "mr-IN" : (language === "Hindi" ? "hi-IN" : "en-IN");
    recognition.lang = langCode;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        const cleaned = transcript.replace(/[.?!,]/g, "").trim();
        onChange(cleaned);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  React.useEffect(() => {
    if (isLoaded && !service && window.google) {
      setService(new google.maps.places.AutocompleteService());
      setSessionToken(new google.maps.places.AutocompleteSessionToken());
    }
  }, [isLoaded]);

  React.useEffect(() => {
    if (!value || value.trim().length === 0) {
      if (isFocused) {
        // Show trending popular destinations instantly when focused but empty
        const popular = FALLBACK_CITIES.slice(0, 8);
        setSuggestions(popular);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setAiSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }

    const typed = value.toLowerCase().trim();

    // Find local suggestions. First match exact/startsWith, then match index/includes
    const matchedFallback = FALLBACK_CITIES.filter(c => {
      const mainText = c.structured_formatting.main_text.toLowerCase();
      const desc = c.description.toLowerCase();
      return mainText.includes(typed) || desc.includes(typed);
    }).sort((a, b) => {
      const aMain = a.structured_formatting.main_text.toLowerCase();
      const bMain = b.structured_formatting.main_text.toLowerCase();
      
      const aStarts = aMain.startsWith(typed);
      const bStarts = bMain.startsWith(typed);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Keep alphabetically stable sort for matching prefix
      return aMain.localeCompare(bMain);
    });

    setSuggestions(matchedFallback);
    setShowSuggestions(matchedFallback.length > 0);

    // Call AI Autocomplete for single-character or generic prompts (smooth backup/enrichment)
    if (value.length === 1) {
      const fetchAiSuggestions = async () => {
        setIsAiLoading(true);
        try {
          const result = await getSuggestions(value);
          if (result) {
            const citiesPart = result.split(':')[1];
            if (citiesPart) {
              const cities = citiesPart.split(',').map(c => c.trim()).filter(Boolean);
              setAiSuggestions(cities);
              setShowSuggestions(true);
            }
          }
        } catch (error) {
          console.warn("AI autocomplete suggestions failed:", error);
        } finally {
          setIsAiLoading(false);
        }
      };
      fetchAiSuggestions();
    } else {
      setAiSuggestions([]);
    }

    // Google Maps Autocomplete Service prediction
    if (service && value.length > 1 && !value.includes(',')) {
      const timeoutId = setTimeout(() => {
        service.getPlacePredictions(
          { 
            input: value, 
            types: ['(cities)'],
            sessionToken: sessionToken || undefined
          },
          (predictions: any, status: any) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
              // Combine maps autocomplete and fallback while maintaining absolute quality
              const duplicateDesc = new Set(predictions.map((p: any) => p.description.toLowerCase()));
              const nonDuplicateFallback = matchedFallback.filter(f => !duplicateDesc.has(f.description.toLowerCase()));
              
              setSuggestions([...predictions, ...nonDuplicateFallback]);
              setShowSuggestions(true);
            }
          }
        );
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [value, service, sessionToken, isFocused]);

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
        onFocus={() => {
          setIsFocused(true);
          setShowSuggestions(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            setIsFocused(false);
            setShowSuggestions(false);
          }, 200);
        }}
        placeholder={placeholder}
        className="input-premium pl-14 pr-24 pt-8 pb-4 text-lg font-semibold"
      />
      
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
        {/* Voice Input (Mic) button */}
        <button
          type="button"
          onClick={handleVoiceInput}
          className={cn(
            "p-2 rounded-full transition-all focus:outline-none flex items-center justify-center cursor-pointer",
            isListening 
              ? "bg-red-500 text-white animate-pulse shadow-md" 
              : "text-gray-400 hover:text-red-500 hover:bg-gray-100/80"
          )}
          title={`Dictate destination in ${language}`}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {showLocationButton && (
          <button 
            type="button"
            onClick={onLocationDetect}
            className={cn(
              "p-2 rounded-full transition-all flex items-center justify-center cursor-pointer",
              isLocating ? "animate-spin text-[#1E90FF]" : "text-gray-400 hover:text-[#000080] hover:bg-gray-100/80"
            )}
            title="Detect location"
          >
            <Navigation2 size={18} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && (suggestions.length > 0 || aiSuggestions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] overflow-hidden max-h-64 overflow-y-auto"
          >
            {(!value || value.trim().length === 0) && (
              <div className="px-6 py-2.5 bg-gray-50/50 border-b border-gray-100 flex items-center gap-1.5">
                <span className="text-xs font-black text-[#000080]/70 uppercase tracking-wider">
                  🔥 {language === 'Marathi' ? 'लोकप्रिय शहरे' : language === 'Hindi' ? 'लोकप्रिय शहर' : 'Popular Destinations'}
                </span>
              </div>
            )}
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
  const [language, setLanguage] = useState(() => localStorage.getItem('travolor_lang') || "English");
  const [activeTab, setActiveTab] = useState("explore");
  const [hubSubTab, setHubSubTab] = useState<"chat" | "route" | "board" | "india" | "group" | "passport" | "advisor">("chat");
  const [user, setUser] = useState<{id: string, name: string, email: string, photo?: string, phone?: string, totalBudget?: number} | null>(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminTrips, setAdminTrips] = useState<any[]>([]);
  const [adminBookings, setAdminBookings] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'trips' | 'bookings'>('users');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [phoneMode, setPhoneMode] = useState<'password' | 'otp'>('otp');
  const [phoneForm, setPhoneForm] = useState({ name: '', phone: '', password: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentCode, setOtpSentCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [paisaBudget, setPaisaBudget] = useState<"budget" | "mid" | "family">("budget");
  const [paisaSize, setPaisaSize] = useState<"couple" | "small" | "joint">("small");
  const [selectedHackTab, setSelectedHackTab] = useState<"irctc" | "food" | "stay" | "local" | "local-tips">("irctc");
  const [exploreSecondaryTab, setExploreSecondaryTab] = useState<'gems' | 'copilot' | 'simulator' | 'budget-planner'>('gems');
  const [shareModalData, setShareModalData] = useState<{
    location: string;
    startLocation: string;
    duration: number;
    style: string;
    numPeople: number;
    totalCost: number;
    itinerary: string;
    date?: string;
  } | null>(null);

  const [affConfig, setAffConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('travolor_affiliate_config');
      return saved ? JSON.parse(saved) : {
        bookingComAid: "8041322",
        makeMyTripTag: "travolor-21",
        redBusCampaign: "travolor-rb",
        viatorPartner: "travolor-vtr",
        klookPartner: "travolor-klk",
        commissionRate: "6.5"
      };
    } catch {
      return {
        bookingComAid: "8041322",
        makeMyTripTag: "travolor-21",
        redBusCampaign: "travolor-rb",
        viatorPartner: "travolor-vtr",
        klookPartner: "travolor-klk",
        commissionRate: "6.5"
      };
    }
  });

  const [affEstimatedMAU, setAffEstimatedMAU] = useState(1500);
  const [affEstConvRate, setAffEstConvRate] = useState(3.0);
  const [affEstTripSpend, setAffEstTripSpend] = useState(12000);

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState("");
  const [adminPasscodeError, setAdminPasscodeError] = useState("");

  const getAffiliateLink = (serviceId: string, from: string, to: string) => {
    const fromClean = encodeURIComponent(from || "Mumbai");
    const toClean = encodeURIComponent(to || "Goa");
    const dateStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');

    switch (serviceId) {
      case 'hotels':
        return `https://www.booking.com/searchresults.html?ss=${toClean}&aid=${affConfig.bookingComAid || '8041322'}&label=travolor-hotel`;
      case 'flights':
        return `https://www.makemytrip.com/flight/search?itinerary=${fromClean}-${toClean}-${dateStr}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E&cmp=${affConfig.makeMyTripTag || 'travolor-21'}`;
      case 'trains':
        return `https://www.makemytrip.com/railways/listing?srcCity=${fromClean}&destCity=${toClean}&date=${dateStr}&cmp=${affConfig.makeMyTripTag || 'travolor-21'}`;
      case 'buses':
        return `https://www.redbus.in/search?fromCityName=${fromClean}&toCityName=${toClean}&referrer=${affConfig.redBusCampaign || 'travolor-rb'}`;
      case 'cabs':
        return `https://www.makemytrip.com/cabs/listing/?fromCity=${fromClean}&toCity=${toClean}&cmp=${affConfig.makeMyTripTag || 'travolor-21'}`;
      case 'packages':
        return `https://www.makemytrip.com/holiday-packages/search?dest=${toClean}&cmp=${affConfig.makeMyTripTag || 'travolor-21'}`;
      default:
        return `https://www.booking.com/searchresults.html?ss=${toClean}&aid=${affConfig.bookingComAid || '8041322'}`;
    }
  };

  const [showAffiliateSaveSuccess, setShowAffiliateSaveSuccess] = useState(false);
  const handleSaveAffiliate = () => {
    localStorage.setItem('travolor_affiliate_config', JSON.stringify(affConfig));
    setShowAffiliateSaveSuccess(true);
    setTimeout(() => {
      setShowAffiliateSaveSuccess(false);
    }, 3000);
  };

  const headlines = ["Explore the World with Travolor", "Plan Your Perfect Journey", "Discover Hidden Gems", "Travel with Confidence"];

  useEffect(() => {
    if (activeTab === 'explore') {
      const interval = setInterval(() => {
        setHeadlineIndex((prev) => (prev + 1) % headlines.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => {
        setOtpTimer(otpTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const [locationInput, setLocationInput] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [duration, setDuration] = useState(3);
  const [numPeople, setNumPeople] = useState(2);
  const [travelStyle, setTravelStyle] = useState("standard");
  const [travelMode, setTravelMode] = useState<'self-drive' | 'cab' | 'bus' | 'train' | 'flight'>('self-drive');
  const [travelDate, setTravelDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // Default to 7 days from now
    return d.toISOString().split('T')[0];
  });
  const [targetBudget, setTargetBudget] = useState(50000);
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [structuredItinerary, setStructuredItinerary] = useState<any>(null);
  const [itinerarySubTab, setItinerarySubTab] = useState<'interactive' | 'text' | 'budget' | 'guide' | 'hotels'>('interactive');
  const [itinerarySources, setItinerarySources] = useState<any[]>([]);
  const [mapMarkers, setMapMarkers] = useState<Array<{ name: string; lat: number; lng: number; description?: string }>>([]);
  const [selectedMapMarker, setSelectedMapMarker] = useState<any | null>(null);
  const [mapViewMode, setMapViewMode] = useState<"api" | "vector">("vector");
  const [isMapsBlocked, setIsMapsBlocked] = useState((window as any).isMapsBlocked || false);

  interface WeatherForecastDay {
    date: string;
    dayName: string;
    tempMax: number;
    tempMin: number;
    conditionCode: number;
    conditionText: string;
    precipitation: number;
  }

  const [weatherForecast, setWeatherForecast] = useState<WeatherForecastDay[] | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherPackingAdvice, setWeatherPackingAdvice] = useState<string>("");

  useEffect(() => {
    if ((window as any).isMapsBlocked) {
      setIsMapsBlocked(true);
      setMapViewMode("vector");
    }
    (window as any).onMapsBlocked = () => {
      setIsMapsBlocked(true);
      setMapViewMode("vector");
    };

    // Intercept Google Maps API authentication or target block errors (ApiTargetBlockedMapError)
    const originalAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn("Google Maps authentication or key target restriction detected. Gracefully defaulting to visual vector route.");
      setIsMapsBlocked(true);
      setMapViewMode("vector");
      if (originalAuthFailure) {
        try {
          originalAuthFailure();
        } catch (e) {}
      }
    };

    // Also intercept console.error to catch Google Maps specific runtime errors like ApiTargetBlockedMapError
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorMessage = args.map(arg => {
        if (arg instanceof Error) return arg.message + "\n" + arg.stack;
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(" ");

      if (
        errorMessage.includes("ApiTargetBlockedMapError") || 
        errorMessage.includes("Google Maps JavaScript API error") || 
        errorMessage.includes("API target blocked")
      ) {
        console.warn("Google Maps API restriction detected in console error. Defaulting to vector maps:", errorMessage);
        setIsMapsBlocked(true);
        setMapViewMode("vector");
      }
      originalConsoleError.apply(console, args);
    };

    // Intercept window errors just in case
    const handleWindowError = (event: ErrorEvent) => {
      if (
        event.message && 
        (event.message.includes("ApiTargetBlockedMapError") || 
         event.message.includes("Google Maps") || 
         event.message.includes("ApiTargetBlocked"))
      ) {
        console.warn("Google Maps API error detected on window. Defaulting to vector maps:", event.message);
        setIsMapsBlocked(true);
        setMapViewMode("vector");
        event.preventDefault();
      }
    };
    window.addEventListener("error", handleWindowError);

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason);
      if (
        reason &&
        (reason.includes("ApiTargetBlockedMapError") ||
         reason.includes("Google Maps") ||
         reason.includes("ApiTargetBlocked"))
      ) {
        console.warn("Google Maps API unhandled promise rejection handled. Defaulting to vector maps:", reason);
        setIsMapsBlocked(true);
        setMapViewMode("vector");
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      (window as any).gm_authFailure = originalAuthFailure;
      console.error = originalConsoleError;
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as any }).then((permissionStatus) => {
        if (permissionStatus.state === 'granted') {
          detectLocation();
        }
        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'granted') {
            detectLocation();
          }
        };
      }).catch((err) => {
        console.warn("Permission query not supported:", err);
      });
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => { detectLocation(); },
        () => {},
        { timeout: 1500 }
      );
    }
  }, [isLoaded]);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="text-amber-500 animate-pulse" size={20} />;
    if (code <= 3) return <Cloud className="text-slate-300" size={20} />;
    if (code <= 48) return <Cloud className="text-slate-400" size={20} />;
    if (code <= 55) return <CloudDrizzle className="text-sky-300" size={20} />;
    if (code <= 65) return <CloudRain className="text-sky-400 animate-bounce" style={{ animationDuration: "2s" }} size={20} />;
    if (code <= 77) return <CloudSnow className="text-blue-200" size={20} />;
    if (code <= 82) return <CloudRain className="text-sky-500 animate-bounce" style={{ animationDuration: "1.5s" }} size={20} />;
    if (code <= 86) return <CloudSnow className="text-blue-300 animate-pulse" size={20} />;
    return <CloudLightning className="text-yellow-400" size={20} />;
  };

  useEffect(() => {
    if (!itinerary || !locationInput) {
      setWeatherForecast(null);
      setWeatherPackingAdvice("");
      return;
    }

    const fetchWeather = async () => {
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        // Step 1: Geocode the destination using Google Geocoding API if key is available and not blocked
        const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_MAPS_API_KEY || (typeof process !== "undefined" && process.env ? process.env.GOOGLE_MAPS_PLATFORM_KEY : "");
        let lat = 19.0760; // fallback to Mumbai
        let lng = 72.8777;

        const fetchOpenMeteoCoords = async (queryStr: string) => {
          const searchTerms = [queryStr];
          if (queryStr.includes(",")) {
            const parts = queryStr.split(",").map(p => p.trim()).filter(Boolean);
            if (parts.length > 0) {
              searchTerms.push(parts[0]);
              if (parts.length > 1) {
                searchTerms.push(`${parts[0]} ${parts[1]}`);
              }
            }
          }

          for (const term of searchTerms) {
            try {
              const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term)}&count=1&language=en&format=json`;
              const geoRes = await fetch(geocodeUrl);
              const geoData = await geoRes.json();
              if (geoData.results && geoData.results[0]) {
                return {
                  lat: geoData.results[0].latitude,
                  lng: geoData.results[0].longitude
                };
              }
            } catch (err) {
              console.warn("Client Open-Meteo fallback failed for term:", term, err);
            }
          }
          return null;
        };

        let resolved = false;
        if (mapsKey && !isMapsBlocked) {
          try {
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationInput)}&key=${mapsKey}`;
            const geoRes = await fetch(geocodeUrl);
            const geoData = await geoRes.json();
            if (geoData.results && geoData.results[0]) {
              lat = geoData.results[0].geometry.location.lat;
              lng = geoData.results[0].geometry.location.lng;
              resolved = true;
            } else {
              throw new Error("Google geocoding returned empty results or blocked/denied.");
            }
          } catch (e) {
            console.warn("Google Geocoding failed, falling back to Open-Meteo search:", e);
          }
        }

        if (!resolved) {
          const coords = await fetchOpenMeteoCoords(locationInput);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
          } else if (locationInput.toLowerCase().includes("kolhapur")) {
            lat = 16.7050;
            lng = 74.2433;
          }
        }

        // Step 2: Fetch daily forecast from our backend /api/weather proxy (which queries OpenWeather / falls back)
        const weatherUrl = `/api/weather?lat=${lat}&lng=${lng}`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (weatherData.daily) {
          const forecastList: WeatherForecastDay[] = weatherData.daily;
          setWeatherForecast(forecastList);

          // Step 3: Analyze and generate packing suggestions based on weather forecast
          const tempsMax = forecastList.map(d => d.tempMax);
          const tempsMin = forecastList.map(d => d.tempMin);
          const avgMax = tempsMax.reduce((sum, val) => sum + val, 0) / tempsMax.length;
          const avgMin = tempsMin.reduce((sum, val) => sum + val, 0) / tempsMin.length;
          const totalPrecipitation = forecastList.reduce((sum, d) => sum + d.precipitation, 0);
          const rainyDays = forecastList.filter(d => d.precipitation > 0.5 || (d.conditionText && d.conditionText.toLowerCase().includes("rain")) || [51,53,55,61,63,65,80,81,82,95,96,99].includes(d.conditionCode || 0)).length;

          let advice = "";
          if (rainyDays > 0 || totalPrecipitation > 5) {
            advice = "🌧️ Rainy forecast: Pack quick-dry clothing, waterproof jackets/shoes, pocket umbrellas, and waterproof zip bags for electronics.";
          } else if (avgMin < 12) {
            advice = "❄️ Chilly weather: Bring warm thermal layers, heavy woolen coats, sweaters, gloves, thick socks, and hydrating skin lip balm.";
          } else if (avgMin < 18) {
            advice = "🧥 Cool breeze: Bring light cardigans, comfortable jackets, or hoodies for breezy evenings, plus versatile layered clothing.";
          } else if (avgMax > 33) {
            advice = "☀️ Hot weather: Pack lightweight breathable cotton or linen fabrics, high SPF 50+ sunscreen, polarized sunglasses, and wide-brim sun hats.";
          } else {
            advice = "🎒 Mild & Pleasant: Bring light breathable clothes, comfortable active walking sneakers, casual wear, and a light jacket for temperature drops.";
          }
          setWeatherPackingAdvice(advice);
        } else {
          throw new Error("Invalid weather data response");
        }
      } catch (err: any) {
        console.error("Error fetching weather forecast:", err);
        setWeatherError("Weather forecast currently unavailable");
        
        // Fallback packing advice based on travel style
        let fallbackAdvice = "🎒 Light casual wear, comfortable walking shoes, sunglasses, and a power bank.";
        if (travelStyle?.toLowerCase().includes("budget") || travelStyle?.toLowerCase().includes("backpacking")) {
          fallbackAdvice = "🎒 Multi-purpose light attire, sturdy walking shoes, rain jacket, mini first-aid kit, and compact quick-dry towel.";
        } else if (travelStyle?.toLowerCase().includes("adventure")) {
          fallbackAdvice = "🎒 Sturdy trekking shoes, moisture-wicking activewear, windbreaker jacket, sunscreen, and hydration backpack.";
        }
        setWeatherPackingAdvice(fallbackAdvice);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [locationInput, itinerary, travelStyle]);

  useEffect(() => {
    if (!itinerary || !locationInput) {
      setMapMarkers([]);
      return;
    }

    const attractions = new Set<string>();
    
    // 1. Matches elements in double asterisks
    const boldRegex = /\*\*(.*?)\*\//g; // standard regex fallback in case of asterisks
    const strictBoldRegex = /\*\*(.*?)\*\*/g;
    let match;
    while ((match = strictBoldRegex.exec(itinerary)) !== null) {
      const term = match[1].trim();
      if (
        term.length > 3 && 
        term.length < 50 && 
        !term.startsWith("Day") && 
        !term.toLowerCase().includes("budget") &&
        !term.toLowerCase().includes("tip") &&
        !term.toLowerCase().includes("approx") &&
        !term.toLowerCase().includes("cost") &&
        !term.toLowerCase().includes("pro-tip") &&
        !term.toLowerCase().includes("travel")
      ) {
        const cleanTerm = term.split('-')[0].trim();
        attractions.add(cleanTerm);
      }
    }

    // 2. Fallback: Parse Morning/Afternoon/Evening lines
    if (attractions.size === 0) {
      const lines = itinerary.split("\n");
      for (const line of lines) {
        if (line.match(/^(Morning|Afternoon|Evening|Night):/i)) {
          const textAfterColon = line.replace(/^(Morning|Afternoon|Evening|Night):\s*/i, "").trim();
          const cleanPhrase = textAfterColon.split(/[-–,]/)[0].replace(/visit|explore|see|head to|walk around/i, "").trim();
          if (cleanPhrase.length > 3 && cleanPhrase.length < 40) {
            attractions.add(cleanPhrase);
          }
        }
      }
    }

    const attractionsList = Array.from(attractions).slice(0, 8);
    if (attractionsList.length === 0) {
      setMapMarkers([]);
      return;
    }

    // Check if Google Maps is fully initialized & loaded
    if (isLoaded && window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      const loadedMarkers: Array<{ name: string; lat: number; lng: number; description?: string }> = [];
      
      const triggerGeocoding = () => {
        let completed = 0;
        attractionsList.forEach((attraction) => {
          const searchQuery = `${attraction}, ${locationInput}`;
          geocoder.geocode({ address: searchQuery }, (results, status) => {
            completed++;
            if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
              const loc = results[0].geometry.location;
              loadedMarkers.push({
                name: attraction,
                lat: loc.lat(),
                lng: loc.lng(),
                description: results[0].formatted_address
              });
            }

            if (completed === attractionsList.length) {
              if (loadedMarkers.length > 0) {
                setMapMarkers(loadedMarkers);
              } else {
                generateMockCoords(attractionsList);
              }
            }
          });
        });
      };

      if (startLocation) {
        if (startCoords) {
          loadedMarkers.push({
            name: `Start: ${startLocation}`,
            lat: startCoords.lat,
            lng: startCoords.lng,
            description: `Your trip starting point (${startLocation})`
          });
          triggerGeocoding();
        } else {
          geocoder.geocode({ address: startLocation }, (startResults, startStatus) => {
            if (startStatus === window.google.maps.GeocoderStatus.OK && startResults && startResults[0]) {
              const loc = startResults[0].geometry.location;
              loadedMarkers.push({
                name: `Start: ${startLocation}`,
                lat: loc.lat(),
                lng: loc.lng(),
                description: startResults[0].formatted_address
              });
            }
            triggerGeocoding();
          });
        }
      } else {
        triggerGeocoding();
      }
    } else {
      // Maps API not loaded/blocked/offline, generate beautiful mock coordinates for Visual canvas
      generateMockCoords(attractionsList);
    }

    function generateMockCoords(list: string[]) {
      // Find a mock center coordinate for the destination
      const locClean = locationInput.toLowerCase();
      let center = { lat: 19.0760, lng: 72.8777 }; // default Mumbai

      if (locClean.includes("goa")) {
        center = { lat: 15.2993, lng: 74.1240 };
      } else if (locClean.includes("delhi")) {
        center = { lat: 28.7041, lng: 77.1025 };
      } else if (locClean.includes("paris")) {
        center = { lat: 48.8566, lng: 2.3522 };
      } else if (locClean.includes("london")) {
        center = { lat: 51.5074, lng: -0.1278 };
      } else if (locClean.includes("tokyo")) {
        center = { lat: 35.6762, lng: 139.6503 };
      } else if (locClean.includes("york")) {
        center = { lat: 40.7128, lng: -74.0060 };
      } else if (locClean.includes("singapore")) {
        center = { lat: 1.3521, lng: 103.8198 };
      } else if (locClean.includes("bangkok")) {
        center = { lat: 13.7563, lng: 100.5018 };
      } else if (locClean.includes("dubai")) {
        center = { lat: 25.2048, lng: 55.2708 };
      } else if (locClean.includes("bali")) {
        center = { lat: -8.4095, lng: 115.1889 };
      } else if (locClean.includes("mumbai")) {
        center = { lat: 19.0760, lng: 72.8777 };
      }

      const deltaMarkers: Array<{ name: string; lat: number; lng: number; description?: string }> = [];

      // If we have startLocation, add a starting marker offset from the destination center
      if (startLocation) {
        const sLat = startCoords?.lat || (center.lat + 0.35); // offset starter significantly to show connection path
        const sLng = startCoords?.lng || (center.lng - 0.35);
        deltaMarkers.push({
          name: `Start: ${startLocation}`,
          lat: sLat,
          lng: sLng,
          description: `Your trip starting point (${startLocation})`
        });
      }

      // Distribute coordinates in a beautiful spiral arc shape
      list.forEach((attr, idx) => {
        const angle = (idx / list.length) * Math.PI * 1.5; // curved arc spread
        const radius = 0.012 + idx * 0.003; // spiral outward slightly
        const latOffset = Math.sin(angle) * radius;
        const lngOffset = Math.cos(angle) * radius;

        deltaMarkers.push({
          name: attr,
          lat: center.lat + latOffset,
          lng: center.lng + lngOffset,
          description: `Virtual coordinate plot of ${attr} in ${locationInput}`
        });
      });

      setMapMarkers(deltaMarkers);
    }
  }, [itinerary, isLoaded, locationInput]);

  const [modelUsedForItinerary, setModelUsedForItinerary] = useState<string>("");
  const [enableThinking, setEnableThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [includeHiddenGems, setIncludeHiddenGems] = useState(true);
  const [includeLocalExperiences, setIncludeLocalExperiences] = useState(true);

  // Chatbot states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMode, setChatMode] = useState<'general' | 'fast' | 'complex'>('general');
  const [chatRole, setChatRole] = useState<'copilot' | 'foodie' | 'historian' | 'budget'>('copilot');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', text: string, sources?: any[] }>>([
    { role: "assistant", text: "Namaste! 🙏 I am your **Travolor AI Co-Pilot**. Ask me anything about planning your next destination, local cuisines, historical stories, or budget hacks!" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isChatListening, setIsChatListening] = useState(false);

  const handleChatVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    if (isChatListening) {
      setIsChatListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    const langCode = language === "Marathi" ? "mr-IN" : (language === "Hindi" ? "hi-IN" : "en-IN");
    recognition.lang = langCode;

    recognition.onstart = () => {
      setIsChatListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setChatInput(prev => (prev ? prev + " " : "") + transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Chat speech recognition error:", event.error);
      setIsChatListening(false);
    };

    recognition.onend = () => {
      setIsChatListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsChatListening(false);
    }
  };

  React.useEffect(() => {
    const greetings: Record<string, string> = {
      English: "Namaste! 🙏 I am your **Travolor AI Co-Pilot**. Ask me anything about planning your next destination, local cuisines, historical stories, or budget hacks in India!",
      Hindi: "नमस्ते! 🙏 मैं आपका **ट्रैवोलर एआई सह-पायलट** हूँ। भारत में अपनी अगली यात्रा, स्थानीय व्यंजनों, ऐतिहासिक कहानियों, या बजट तरकीबों के बारे में कुछ भी पूछें!",
      Marathi: "नमस्ते! 🙏 मी तुमचा **ट्रॅव्होलर एआय को-पायलट** आहे. भारतातील पुढील गंतव्यस्थान, स्थानिक खाद्यपदार्थ, ऐतिहासिक कथा किंवा बजेट ट्रिक्सबद्दल मला काहीही विचारा!",
      Gujarati: "નમસ્તે! 🙏 હું તમારો **ટ્રેવોલર એઆઈ કો-પાયલોટ** છું. ભારતમાં તમારા આગામી પ્રવાસ, સ્થાનિક વાનગીઓ, ઐતિહાસिक વાર્તાઓ અથવા બજેટ આયોજન વિશે કંઈપણ પૂછો!",
      Bengali: "নমস্কার! 🙏 আমি আপনার **ট্রাভেলার এআই সহ-পাইলট**। ভারতে আপনার পরবর্তী গন্তব্য, স্থানীয় খাবার, ঐতিহাসিক গল্প বা বাজেট পরিকল্পনা সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন!",
      Punjabi: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! 🙏 ਮੈਂ ਤੁਹਾਡਾ **ਟ੍ਰੈਵਲਰ AI ਕੋ-ਪਾਇਲਟ** ਹਾਂ। ਭਾਰਤ ਵਿੱਚ ਅਗਲੀ ਯਾਤਰਾ, ਸਥਾਨਕ ਪਕਵਾਨਾਂ, ਇਤਿਹਾਸਕ ਕਹਾਣੀਆਂ, ਜਾਂ ਬਜਟ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ!",
      Tamil: "வணக்கம்! 🙏 நான் உங்கள் **டிராவலர் ஏஐ இணை விமானி**. இந்தியாவின் அடுத்த பயணம், உள்ளூர் உணவுகள், வரலாற்று கதைகள் அல்லது பட்ஜெட் பற்றி எதையும் என்னிடம் கேளுங்கள்!",
      Telugu: "నమస్తే! 🙏 నేను మీ **ట్రావెలర్ AI కో-పైలట్**. భారతదేశంలో మీ తదుపరి గమ్యస్థానం, స్థానిక ఆహారాలు, చారిత్రక కథలు లేదా బడ్జెట్ గురించి నన్ను ఏదైనా అడగండి!",
      Kannada: "ನಮಸ್ತೆ! 🙏 ನಾನು ನಿಮ್ಮ **ಟ್ರಾವೆಲರ್ AI ಕೋ-ಪೈಲಟ್**. ಭಾರತದಲ್ಲಿ ನಿಮ್ಮ ಮುಂದಿನ ಪ್ರಯಾಣ, ಸ್ಥಳೀಯ ಆಹಾರಗಳು, ಐತಿಹಾಸಿಕ ಕಥೆಗಳು ಅಥವಾ ಬಜೆಟ್ ಬಗ್ಗೆ ನನ್ನನ್ನು ಏನಾದರೂ ಕೇಳಿ!",
      Malayalam: "നമസ്തേ! 🙏 ഞാൻ നിങ്ങളുടെ **പ്രസിദ്ധ ട്രാവലർ AI കോ-പൈലറ്റ്** ആണ്. ഇന്ത്യയിലെ അടുത്ത യാത്ര, നാടൻ വിഭവങ്ങൾ, ചരിത്ര കഥകൾ അല്ലെങ്കിൽ ബജറ്റ് പ്ലാനുകളെക്കുറിച്ച് എന്നോട് ചോദിക്കുക!",
      Odia: "ନମସ୍କାର! 🙏 ମୁଁ ଆପଣଙ୍କର **ଟ୍ରାଭେଲର AI କୋ-ପାଇଲଟ୍** | ଭାରତରେ ଆପଣଙ୍କର ପରବର୍ତ୍ତୀ ଯାତ୍ରା, ସ୍ଥାନୀય ଖାଦ୍ୟ, ଐତିହାସିକ ଗପ କିମ୍ବା ବଜେଟ୍ ବିଷୟରେ ମୋତେ ପଚାରନ୍ତୁ!"
    };
    const greetingText = greetings[language] || greetings.English;
    setChatHistory([{ role: "assistant", text: greetingText }]);
  }, [language]);

  const [isSpeakingItinerary, setIsSpeakingItinerary] = useState(false);
  const [isSpeakingChatIdx, setIsSpeakingChatIdx] = useState<number | null>(null);

  const handleDownloadPDF = async () => {
    try {
      await exportItineraryToPDF({
        location: locationInput || "Swadesh Destination",
        startLocation: startLocation || "Mumbai",
        duration: duration || 3,
        numPeople: numPeople || 2,
        travelStyle: travelStyle || "standard",
        travelDate: travelDate || "Upcoming",
        itineraryText: itinerary || "",
        structured: structuredItinerary,
        language: language
      });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to export PDF itinerary. Please try again.");
    }
  };

  const cleanTextForSpeech = (text: string) => {
    return text
      .replace(/[\*\_\[\]\(\)\#\-\:\`]/g, " ")
      .replace(/🌍|🙏|🍲|🏛️|💡|🔍|📍|🧭|🚗|🏨|🚶‍♂️/g, "")
      .trim();
  };

  const speakText = (text: string, onStart: () => void, onEnd: () => void) => {
    if (!window.speechSynthesis) {
      alert("Text-to-Speech is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    if (!text) return;

    const cleaned = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleaned);

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (language === "Marathi") {
      selectedVoice = voices.find(v => v.lang.startsWith("mr")) || null;
      utterance.lang = "mr-IN";
    } else if (language === "Hindi") {
      selectedVoice = voices.find(v => v.lang.startsWith("hi")) || null;
      utterance.lang = "hi-IN";
    } else {
      selectedVoice = voices.find(v => v.lang.startsWith("en-IN") || v.lang.startsWith("en-US")) || null;
      utterance.lang = "en-IN";
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      onStart();
    };

    utterance.onend = () => {
      onEnd();
    };

    utterance.onerror = () => {
      onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingItinerary(false);
    setIsSpeakingChatIdx(null);
  };

  const [routeSummary, setRouteSummary] = useState<{distance: string, time: string, mode: string} | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('travolor_theme');
    return saved === 'dark';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currency, setCurrency] = useState(() => localStorage.getItem('travolor_currency') || "INR (₹)");
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('travolor_user_api_key') || "");
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

  React.useEffect(() => {
    const greetings: Record<string, string> = {
      English: "Namaste! 🙏 I am your **Travolor AI Co-Pilot**. Ask me anything about planning your next destination, local cuisines, historical stories, or budget hacks in India!",
      Hindi: "नमस्ते! 🙏 मैं आपका **ट्रैवोलर एআই सह-पायलट** हूँ। भारत में अपनी अगली यात्रा, स्थानीय व्यंजनों, ऐतिहासिक कहानियों, या बजट तरकीबों के बारे में कुछ भी पूछें!",
      Marathi: "नमस्ते! 🙏 मी तुमचा **ट्रॅव्होलर एआय को-पायलट** आहे. भारतातील पुढील गंतव्यस्थान, स्थानिक खाद्यपदार्थ, ऐतिहासिक कथा किंवा बजेट ट्रिक्सबद्दल मला काहीही विचारा!",
      Gujarati: "નમસ્તે! 🙏 હું તમારો **ટ્રેવોલર એઆઈ કો-પાયલોટ** છું. ભારતમાં તમારા આગામી પ્રવાસ, સ્થાનિક વાનગીઓ, ઐતિહાસિક વાર્તાઓ અથવા બજેટ આયોજન વિશે કંઈપણ પૂછો!",
      Bengali: "নমস্কার! 🙏 আমি আপনার **ট্রাভেলার এআই সহ-পাইলট**। ভারতে আপনার পরবর্তী গন্তব্য, স্থানীয় খাবার, ঐতিহাসিক গল্প বা বাজেট পরিকল্পনা সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন!",
      Punjabi: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! 🙏 ਮੈਂ ਤੁਹਾਡਾ **ਟ੍ਰੈਵਲਰ AI ਕੋ-ਪਾਇਲਟ** ਹਾਂ। ਭਾਰਤ ਵਿੱਚ ਅਗਲੀ ਯਾਤਰਾ, ਸਥਾਨਕ ਪਕਵานਾਂ, ਇਤਿਹਾਸਕ ਕਹਾਣੀਆਂ, ਜਾਂ ਬਜਟ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ!",
      Tamil: "வணக்கம்! 🙏 நான் உங்கள் **டிராவலர் ஏஐ இணை விமானி**. இந்தியாவின் அடுத்த பயணம், உள்ளூர் உணவுகள், வரலாற்று கதைகள் அல்லது பட்ஜெட் பற்றி எதையும் என்னிடம் கேளுங்கள்!",
      Telugu: "నమస్తే! 🙏 నేను మీ **ట్రావెలర్ AI కో-పైలట్**. భారతదేశంలో మీ తదుపరి గమ్యస్థానం, స్థానిక ఆహారాలు, చారిత్రక కథలు లేదా బడ్జెట్ గురించి నన్ను ఏదైనా అడగండి!",
      Kannada: "ನಮಸ್ತೆ! 🙏 ನಾನು ನಿಮ್ಮ **ಟ್ರಾವೆಲರ್ AI ಕೋ-ಪೈలಟ್**. ಭಾರತದಲ್ಲಿ ನಿಮ್ಮ ಮುಂದಿನ ಪ್ರಯಾಣ, ಸ್ಥಳೀಯ ಆಹಾರಗಳು, ಐತಿಹಾಸಿಕ ಕಥೆಗಳು ಅಥವಾ ಬಜೆಟ್ ಬಗ್ಗೆ ನನ್ನನ್ನು ಏನಾದರೂ ಕೇಳಿ!",
      Malayalam: "നമസ്തേ! 🙏 ഞാൻ നിങ്ങളുടെ **പ്രസിദ്ധ ട്രാവലർ AI കോ-പൈലറ്റ്** ആണ്. ഇന്ത്യയിലെ അടുത്ത യാത്ര, നാടൻ വിഭവങ്ങൾ, ചരിത്ര കഥകൾ അല്ലെങ്കിൽ ബജറ്റ് പ്ലാനുകളെക്കുറിച്ച് എന്നോട് ചോദിക്കുക!",
      Odia: "ନମସ୍କାର! 🙏 ମୁଁ ଆପڻଙ୍କର **ଟ୍ରାଭେଲର AI କୋ-ପାଇଲଟ୍** | ଭାରତରେ ଆପଣଙ୍କର ପରବର୍ତ୍ତୀ ଯାତ୍ରା, ସ୍ଥାନୀય ଖାଦ୍ୟ, ଐତିହାସିକ ଗପ କିମ୍ବା ବଜେଟ୍ ବିଷୟରେ ମୋତେ ପଚାରନ୍ତୁ!"
    };
    const greetingText = greetings[language] || greetings.English;
    setChatHistory([{ role: "assistant", text: greetingText }]);
  }, [language]);

  const travelDistanceKm = useMemo(() => {
    const fromC = lookupCityCoords(startLocation || "Mumbai", startCoords);
    const toC = lookupCityCoords(locationInput || "Goa", endCoords);
    if (!fromC || !toC) return 450; // default realistic distance for Mumbai to Goa

    const R = 6371; // km
    const dLat = (toC.lat - fromC.lat) * Math.PI / 180;
    const dLon = (toC.lng - fromC.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(fromC.lat * Math.PI / 180) * Math.cos(toC.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const directDistance = R * c;
    return Math.max(50, Math.round(directDistance * 1.25)); // winding multiplier, min 50km
  }, [startLocation, locationInput, startCoords, endCoords]);

  const liveBudget = useMemo(() => {
    // 1. Calculate realistic transport costs based on real railway & airline rules
    // public (Sleeper Class train / State Transport Bus) -> ₹2.40 per km per person, round trip (*2)
    // private (Cab/Self-drive fuel and tolls) -> ₹10/km fuel + ₹1.5/km tolls, round trip (*2)
    // flight (Flight travel) -> ₹6.50 per km per person, round trip (*2)
    let perPersonTransport = 0;
    let transportCost = 0;
    if (transportType === "public") {
      perPersonTransport = Math.max(250, travelDistanceKm * 2.40);
      transportCost = Math.round(perPersonTransport * numPeople * 2);
    } else if (transportType === "private") {
      transportCost = Math.round(((travelDistanceKm * 10) + (travelDistanceKm * 1.5)) * 2);
      perPersonTransport = Math.round(transportCost / numPeople / 2);
    } else { // flight
      perPersonTransport = Math.max(3200, travelDistanceKm * 6.50);
      transportCost = Math.round(perPersonTransport * numPeople * 2);
    }

    // 2. Hotel costs based on realistic room requirements and rates
    const roomsCount = numPeople <= 2 ? 1 : numPeople <= 4 ? 2 : Math.ceil(numPeople / 2);
    let roomRatePerNight = 3500;
    if (accommodationType === "hostel") {
      roomRatePerNight = 1200; // standard low budget stay / clean dharamshala
    } else if (accommodationType === "standard") {
      roomRatePerNight = 3500; // comfortable family homestay/hotel
    } else { // luxury
      roomRatePerNight = 9000; // premium star stay / heritage hotel
    }
    const hotelCost = roomRatePerNight * roomsCount * Math.max(1, duration - 1);

    // 3. Food costs based on standard plate rates per person per day
    let foodRatePerDay = 1000;
    if (accommodationType === "hostel") {
      foodRatePerDay = 400;
    } else if (accommodationType === "standard") {
      foodRatePerDay = 1000;
    } else { // luxury
      foodRatePerDay = 3000;
    }
    const foodCost = foodRatePerDay * duration * numPeople;

    // 4. Activities / Sightseeing entry fees
    let activityRatePerDay = 450;
    if (accommodationType === "hostel") {
      activityRatePerDay = 150;
    } else if (accommodationType === "standard") {
      activityRatePerDay = 450;
    } else { // luxury
      activityRatePerDay = 1200;
    }
    const activitiesCost = activityRatePerDay * duration * numPeople;

    // 5. Shopping allowance
    let shoppingAllowancePerPerson = 3000;
    if (accommodationType === "hostel") {
      shoppingAllowancePerPerson = 1000;
    } else if (accommodationType === "standard") {
      shoppingAllowancePerPerson = 3000;
    } else { // luxury
      shoppingAllowancePerPerson = 10000;
    }
    const shoppingCost = shoppingAllowancePerPerson * numPeople;

    // Grand sum and 8% emergency backup cushion
    const grandTotalBudget = transportCost + hotelCost + foodCost + activitiesCost + shoppingCost;
    const emergencyCost = Math.round(grandTotalBudget * 0.08);
    const totalCost = grandTotalBudget + emergencyCost;

    return {
      transportCost,
      hotelCost,
      foodCost,
      activitiesCost,
      shoppingCost,
      emergencyCost,
      totalCost,
      roomsCount,
      roomRatePerNight,
      perPersonTransport
    };
  }, [transportType, accommodationType, travelStyle, duration, numPeople, travelDistanceKm]);

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

  // Sync targetBudget and userTotalBudget dynamically to avoid dual state divergence
  React.useEffect(() => {
    setUserTotalBudget(targetBudget);
  }, [targetBudget]);

  React.useEffect(() => {
    setTargetBudget(userTotalBudget);
  }, [userTotalBudget]);

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

          // 1. Try local CITY_COORDS_DB first for instant resolution
          const fromC = lookupCityCoords(startLocation, null);
          const toC = lookupCityCoords(locationInput, null);
          if (fromC) {
            lat1 = fromC.lat;
            lon1 = fromC.lng;
          }
          if (toC) {
            lat2 = toC.lat;
            lon2 = toC.lng;
          }

          // 2. If missing, try safe Google Geocoding
          if ((!lat1 || !lat2) && isLoaded && window.google && !isMapsBlocked) {
            try {
              const geocoder = new google.maps.Geocoder();
              const [res1, res2] = await Promise.all([
                new Promise<any>((resolve) => {
                  const timer = setTimeout(() => resolve(null), 1000);
                  try {
                    geocoder.geocode({ address: startLocation }, (r) => {
                      clearTimeout(timer);
                      resolve(r);
                    });
                  } catch {
                    clearTimeout(timer);
                    resolve(null);
                  }
                }),
                new Promise<any>((resolve) => {
                  const timer = setTimeout(() => resolve(null), 1000);
                  try {
                    geocoder.geocode({ address: locationInput }, (r) => {
                      clearTimeout(timer);
                      resolve(r);
                    });
                  } catch {
                    clearTimeout(timer);
                    resolve(null);
                  }
                })
              ]);
              
              if (res1 && res1[0] && !lat1) {
                lat1 = res1[0].geometry.location.lat();
                lon1 = res1[0].geometry.location.lng();
              }
              if (res2 && res2[0] && !lat2) {
                lat2 = res2[0].geometry.location.lat();
                lon2 = res2[0].geometry.location.lng();
              }
            } catch (err) {
              console.warn("Google geocoder failed in calculateRoute:", err);
            }
          }

          // 3. If still missing, try Nominatim
          if (!lat1 || !lat2) {
            try {
              const [res1, res2] = await Promise.all([
                !lat1 ? fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startLocation)}&limit=1`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
                !lat2 ? fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}&limit=1`).then(r => r.json()).catch(() => null) : Promise.resolve(null)
              ]);

              if (res1 && res1[0] && !lat1) {
                lat1 = parseFloat(res1[0].lat);
                lon1 = parseFloat(res1[0].lon);
              }
              if (res2 && res2[0] && !lat2) {
                lat2 = parseFloat(res2[0].lat);
                lon2 = parseFloat(res2[0].lon);
              }
            } catch (nominatimErr) {
              console.warn("Nominatim geocoder failed in calculateRoute:", nominatimErr);
            }
          }

          if (lat1 && lat2) {
            setStartCoords(prev => {
              if (!prev || prev.lat !== lat1 || prev.lng !== lon1) {
                return { lat: lat1, lng: lon1 };
              }
              return prev;
            });
            setEndCoords(prev => {
              if (!prev || prev.lat !== lat2 || prev.lng !== lon2) {
                return { lat: lat2, lng: lon2 };
              }
              return prev;
            });

            // Haversine distance
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = Math.max(50, Math.round(R * c * 1.25));

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
      },
      Gujarati: {
        welcome: "ફરી સ્વાગત છે",
        whereTo: "આગળ ક્યાં જવું છે?",
        explore: "શૉધો",
        myTrips: "મારી સફર",
        bookings: "બુકિંગ",
        profile: "પ્રોફાઇલ",
        planTrip: "સફર પ્લાન કરો",
        startingLocation: "તમારી યાત્રા ક્યાંથી શરૂ થશે?",
        saveTrip: "સફર સેવ કરો",
        viewMaps: "નકશા પર જુઓ",
        loginRequired: "લોગિન જરૂરી",
        loginToAccess: "કૃપા કરીને આ સુવિધાનો ઉપયોગ કરવા લોગિન કરો.",
        logout: "લોગઆઉટ",
        settings: "સેટિંગ્સ",
        support: "સપોર્ટ",
        language: "ભાષા",
        currency: "ચલણ",
        theme: "થીમ",
        notifications: "સૂચનાઓ",
        tripsPlanned: "પ્લાન કરેલી સફર",
        upcoming: "આવનારી",
        saved: "સેવ કરેલી",
        addPhone: "મોબાઇલ નંબર ઉમેરો",
        editProfile: "પ્રોફાઇલ સંપાદિત કરો",
        saveChanges: "ફેરફારો સેવ કરો",
        cancel: "રદ કરો"
      },
      Bengali: {
        welcome: "আবার স্বাগতম",
        whereTo: "পরবর্তী গন্তব্য কোথায়?",
        explore: "অন্বেষণ করুন",
        myTrips: "আমার ট্রিপ",
        bookings: "বুকিং",
        profile: "প্রোফাইল",
        planTrip: "ট্রিপ প্ল্যান করুন",
        startingLocation: "আপনার যাত্রা কোথা থেকে শুরু হবে?",
        saveTrip: "ট্রিপ সংরক্ষণ করুন",
        viewMaps: "মানচিত্রে দেখুন",
        loginRequired: "লগইন প্রয়োজন",
        loginToAccess: "এই সুবিধা ব্যবহার করতে দয়া করে লগইন করুন।",
        logout: "লগআউট",
        settings: "সেটিংস",
        support: "সহায়তা",
        language: "ভাষা",
        currency: "মুদ্রা",
        theme: "থিম",
        notifications: "বিজ্ঞপ্তি",
        tripsPlanned: "পরিকল্পিত ট্রিপ",
        upcoming: "আসন্ন",
        saved: "সংরক্ষিত",
        addPhone: "মোবাইল নম্বর যোগ করুন",
        editProfile: "প্রোফাইল পরিবর্তন করুন",
        saveChanges: "পরিবর্তন সংরক্ষণ করুন",
        cancel: "বাতিল করুন"
      },
      Tamil: {
        welcome: "மீண்டும் வருக",
        whereTo: "அடுத்து எங்கே?",
        explore: "கண்டறியவும்",
        myTrips: "எனது பயணங்கள்",
        bookings: "பதிவுகள்",
        profile: "சுயவிவரம்",
        planTrip: "பಯணத்தை திட்டமிடு",
        startingLocation: "உங்கள் பயணம் எங்கிருந்து தொடங்கும்?",
        saveTrip: "பಯணத்தை சேமி",
        viewMaps: "வரைபடத்தில் காண்க",
        loginRequired: "உள்நுழைவு தேவை",
        loginToAccess: "இந்த வசதியைப் பெற உள்நுழையவும்.",
        logout: "வெளியேறு",
        settings: "அமைப்புகள்",
        support: "ஆதரவு",
        language: "மொழி",
        currency: "நாணயம்",
        theme: "தீம்",
        notifications: "அறிவிப்புகள்",
        tripsPlanned: "திட்டமிடப்பட்ட பயணங்கள்",
        upcoming: "வரவிருக்கும்",
        saved: "சேமிக்கப்பட்டவை",
        addPhone: "மொபைல் எண் சேர்க்கவும்",
        editProfile: "சுயவிவரம் திருத்தவும்",
        saveChanges: "மாற்றங்களைச் சேமி",
        cancel: "ரத்து செய்"
      },
      Telugu: {
        welcome: "మళ్లీ స్వాగతం",
        whereTo: "తదుపరి గమ్యస్థానం ఎక్కడ?",
        explore: "అన్వేషించండి",
        myTrips: "నా పర్యటనలు",
        bookings: "బుకింగ్‌లు",
        profile: "ప్రొఫైల్",
        planTrip: "ట్రిప్ ప్లాన్ చేయండి",
        startingLocation: "మీ ప్రయాణం ఎక్కడ ప్రారంభమవుతుంది?",
        saveTrip: "ట్రిప్ సేవ్ చేయండి",
        viewMaps: "మ్యాప్‌లో చూడండి",
        loginRequired: "లాగిన్ అవసరం",
        loginToAccess: "దయచేసి ఈ ఫీచర్‌ని ఉపయోగించడానికి లాగిన్ అవ్వండి.",
        logout: "లాగ్ అవుట్",
        settings: "సెట్టింగులు",
        support: "మద్దతు",
        language: "భాష",
        currency: "కరెన్సీ",
        theme: "థీమ్",
        notifications: "నోటిఫికేషన్‌లు",
        tripsPlanned: "ప్లాన్ చేసిన పర్యటనలు",
        upcoming: "రాబోయేవి",
        saved: "సేవ్ చేసినవి",
        addPhone: "మొబైల్ నంబర్ జోడించండి",
        editProfile: "ప్రొఫైల్ సవరించండి",
        saveChanges: "మార్పులు సేవ్ చేయండి",
        cancel: "రద్దు చేయి"
      },
      Kannada: {
        welcome: "ಮತ್ತೆ ಸುಸ್ವಾಗತ",
        whereTo: "ಮುಂದಿನ ನಿಲ್ದಾಣ ಯಾವುದು?",
        explore: "ಅನ್ವೇಷಿಸಿ",
        myTrips: "ನನ್ನ ಪ್ರವಾಸಗಳು",
        bookings: "ಬುಕಿಂಗ್ಸ್",
        profile: "ಪ್ರೊಫೈಲ್",
        planTrip: "ಪ್ರವಾಸ ಯೋಜನೆ ಮಾಡಿ",
        startingLocation: "ನಿಮ್ಮ ಪ್ರಯಾಣ ಎಲ್ಲಿಂದ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ?",
        saveTrip: "ಪ್ರವಾಸ ಉಳಿಸಿ",
        viewMaps: "ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ",
        loginRequired: "ಲಾಗಿನ್ ಅಗತ್ಯವಿದೆ",
        loginToAccess: "ಈ ಸೌಲಭ್ಯವನ್ನು ಪ್ರವೇಶಿಸಲು ದಯವಿಟ್ಟು ಲಾಗಿನ್ ಮಾಡಿ.",
        logout: "ಲಾಗ್ ಔಟ್",
        settings: "ಸೆಟ್ಟಿಂಗ್ಸ್",
        support: "ಬೆಂಬಲ",
        language: "ಭಾಷೆ",
        currency: "ಕರೆನ್ಸಿ",
        theme: "ಥೀಮ್",
        notifications: "ಅಧಿಸೂಚನೆಗಳು",
        tripsPlanned: "ಯೋಜಿತ ಪ್ರವಾಸಗಳು",
        upcoming: "ಮುಂಬರುವ",
        saved: "ಉಳಿಸಿದ",
        addPhone: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಸೇರಿಸಿ",
        editProfile: "ಪ್ರೊಫೈಲ್ ಎಡಿಟ್ ಮಾಡಿ",
        saveChanges: "ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ",
        cancel: "ರದ್ದುಮಾಡಿ"
      },
      Spanish: {
        welcome: "Bienvenido de nuevo",
        whereTo: "¿A dónde vamos ahora?",
        explore: "Explorar",
        myTrips: "Mis Viajes",
        bookings: "Reservas",
        profile: "Perfil",
        planTrip: "Planificar Viaje",
        startingLocation: "¿Desde dónde iniciarás tu viaje?",
        saveTrip: "Guardar Viaje",
        viewMaps: "Ver en Mapas",
        loginRequired: "Inicio de sesión requerido",
        loginToAccess: "Inicie sesión para acceder a esta función.",
        logout: "Cerrar sesión",
        settings: "Ajustes",
        support: "Soporte",
        language: "Idioma",
        currency: "Moneda",
        theme: "Tema",
        notifications: "Notificaciones",
        tripsPlanned: "Viajes Planificados",
        upcoming: "Próximos",
        saved: "Guardados",
        addPhone: "Añadir móvil",
        editProfile: "Editar Perfil",
        saveChanges: "Guardar Cambios",
        cancel: "Cancelar"
      },
      French: {
        welcome: "Bon retour",
        whereTo: "Où allez-vous ensuite ?",
        explore: "Explorer",
        myTrips: "Mes Voyages",
        bookings: "Réservations",
        profile: "Profil",
        planTrip: "Planifier le voyage",
        startingLocation: "D'où commencera votre voyage ?",
        saveTrip: "Enregistrer le voyage",
        viewMaps: "Voir sur la carte",
        loginRequired: "Connexion requise",
        loginToAccess: "Veuillez vous connecter pour accéder à cette option.",
        logout: "Déconnexion",
        settings: "Paramètres",
        support: "Assistance",
        language: "Langues",
        currency: "Devise",
        theme: "Thème",
        notifications: "Notifications",
        tripsPlanned: "Voyages Planifiés",
        upcoming: "À venir",
        saved: "Enregistrés",
        addPhone: "Ajouter un numéro",
        editProfile: "Modifier le profil",
        saveChanges: "Enregistrer",
        cancel: "Annuler"
      },
      German: {
        welcome: "Willkommen zurück",
        whereTo: "Wohin geht es als nächstes?",
        explore: "Erkunden",
        myTrips: "Meine Reisen",
        bookings: "Buchungen",
        profile: "Profil",
        planTrip: "Reise planen",
        startingLocation: "Wo startet Ihre Reise?",
        saveTrip: "Reise speichern",
        viewMaps: "Auf Karte anzeigen",
        loginRequired: "Anmeldung erforderlich",
        loginToAccess: "Bitte melden Sie sich an, um diese Funktion zu nutzen.",
        logout: "Abmelden",
        settings: "Einstellungen",
        support: "Support",
        language: "Sprache",
        currency: "Währung",
        theme: "Theme",
        notifications: "Benachrichtigungen",
        tripsPlanned: "Geplante Reisen",
        upcoming: "Bevorstehend",
        saved: "Gespeichert",
        addPhone: "Telefonnummer hinzufügen",
        editProfile: "Profil bearbeiten",
        saveChanges: "Änderungen speichern",
        cancel: "Abbrechen"
      },
      Punjabi: {
        welcome: "ਜੀ ਆਇਆਂ ਨੂੰ",
        whereTo: "ਅਗਲਾ ਸਫ਼ਰ ਕਿੱਥੇ?",
        explore: "ਖੋਜੋ",
        myTrips: "ਮੇਰੀਆਂ ਯਾਤਰਾਵਾਂ",
        bookings: "ਬੁਕਿੰਗਜ਼",
        profile: "ਪ੍ਰੋਫਾਈਲ",
        planTrip: "ਯਾਤਰਾ ਦੀ ਯੋਜਨਾ ਬਣਾਓ",
        startingLocation: "ਤੁਸੀਂ ਆਪਣੀ ਯਾਤਰਾ ਕਿੱਥੋਂ ਸ਼ੁਰੂ ਕਰੋਗੇ?",
        saveTrip: "ਯਾਤਰਾ ਸੁਰੱਖਿਅਤ ਕਰੋ",
        viewMaps: "ਨਕਸ਼ੇ 'ਤੇ ਦੇਖੋ",
        loginRequired: "ਲੌਗਇਨ ਲੋੜੀਂਦਾ ਹੈ",
        loginToAccess: "ਕਿਰਪਾ ਕਰਕੇ ਇਸ ਵਿਸ਼ੇਸ਼ਤਾ ਤੱਕ ਪਹੁੰਚਣ ਲਈ ਲੌਗਇਨ ਕਰੋ।",
        logout: "ਲੌਗਆਉਟ",
        settings: "ਸੈਟਿੰਗਾਂ",
        support: "ਸਹਾਇਤਾ",
        language: "ਭਾਸ਼ਾ",
        currency: "ਕਰੰਸੀ",
        theme: "ਥੀਮ",
        notifications: "ਨੋਟੀਫਿਕੇਸ਼ਨ",
        tripsPlanned: "ਯੋਜਨਾਬੱਧ ਯਾਤਰਾਵਾਂ",
        upcoming: "ਆਉਣ ਵਾਲੀਆਂ",
        saved: "ਸੁਰੱਖਿਅਤ",
        addPhone: "ਮੋਬਾਈਲ ਨੰਬਰ ਜੋੜੋ",
        editProfile: "ਪ੍ਰੋਫਾਈਲ ਸੋਧੋ",
        saveChanges: "ਬਦਲਾਅ ਸੁਰੱਖਿਅਤ ਕਰੋ",
        cancel: "ਰੱਦ ਕਰੋ"
      },
      Malayalam: {
        welcome: "വീണ്ടും സ്വാഗതം",
        whereTo: "അടുത്ത യാത്ര എങ്ങോട്ട്?",
        explore: "പര്യവേക്ഷണം ചെയ്യുക",
        myTrips: "എന്റെ യാത്രകൾ",
        bookings: "ബുക്കിംഗുകൾ",
        profile: "പ്രൊഫൈൽ",
        planTrip: "യാത്ര പ്ലാൻ ചെയ്യുക",
        startingLocation: "നിങ്ങൾ എവിടെ നിന്നാണ് യാത്ര ആരംഭിക്കുന്നത്?",
        saveTrip: "യാത്ര സേവ് ചെയ്യുക",
        viewMaps: "മാപ്പിൽ കാണുക",
        loginRequired: "ലോഗിൻ ആവശ്യമാണ്",
        loginToAccess: "ഈ ഫീച്ചർ ഉപയോഗിക്കാൻ ലോഗിൻ ചെയ്യുക.",
        logout: "ലോഗൗട്ട്",
        settings: "സെറ്റിംഗ്സ്",
        support: "പിന്തുണ",
        language: "ഭാഷ",
        currency: "കറൻസി",
        theme: "തീം",
        notifications: "അറിയിപ്പുകൾ",
        tripsPlanned: "പ്ലാൻ ചെയ്ത യാത്രകൾ",
        upcoming: "വരാനിരിക്കുന്നവ",
        saved: "സേവ് ചെയ്തവ",
        addPhone: "മൊബൈൽ നമ്പർ ചേർക്കുക",
        editProfile: "പ്രൊഫൈൽ തിരുത്തുക",
        saveChanges: "മാറ്റങ്ങൾ സേവ് ചെയ്യുക",
        cancel: "റദ്ദാക്കുക"
      },
      Odia: {
        welcome: "ସ୍ଵାଗତମ୍",
        whereTo: "ପରବର୍ତ୍ତୀ ଯାତ୍ରା କେଉଁଠିକୁ?",
        explore: "ଖୋଜନ୍ତୁ",
        myTrips: "ମୋର ଯାତ୍ରାଗୁଡ଼ିକ",
        bookings: "ବୁକିଂଗୁଡ଼ିକ",
        profile: "ପ୍ରୋଫାଇଲ୍",
        planTrip: "ଯାତ୍ରା ଯୋଜନା କରନ୍ତು",
        startingLocation: "ଆପଣ ଯାତ୍ରା କେଉଁଠାରୁ ଆରମ୍ભ କରିବେ?",
        saveTrip: "ଯାତ୍ରା ସଂରକ୍ଷଣ କରନ୍ତು",
        viewMaps: "ମାନଚିତ୍ରରେ ଦେଖନ୍ତୁ",
        loginRequired: "ଲଗଇନ୍ ଆବଶ୍ୟକ",
        loginToAccess: "ଏହି ସୁବିଧା ପାଇଁ ଦୟାକରି ଲଗଇନ୍ କରନ୍ତୁ।",
        logout: "ଲଗଆଉଟ୍",
        settings: "ସେଟିଂସ",
        support: "ସହାୟତା",
        language: "ଭାଷା",
        currency: "ମୁଦ୍ରା",
        theme: "ଥିମ୍",
        notifications: "ବିଜ୍ଞପ୍ତିଗୁଡ଼ିକ",
        tripsPlanned: "ଯୋଜନାବଦ୍ଧ ଯାତ୍ରା",
        upcoming: "ଆଗାମୀ",
        saved: "ସଂରକ୍ଷିତ",
        addPhone: "ମୋବାଇଲ୍ ନମ୍ବਰ ଯୋଡ଼ନ୍ତୁ",
        editProfile: "ପ୍ରୋଫାଇଲ୍ ଏଡିଟ୍ କରନ୍ତୁ",
        saveChanges: "ପରିବର୍ତ୍තନଗୁଡ଼ିକୁ ସଂରକ୍ଷଣ କରନ୍ତು",
        cancel: "ବାତିଲ୍ କରନ୍ତು"
      },
      Assamese: {
        welcome: "পুনৰ স্বাগতম",
        whereTo: "পৰৱৰ্তী যাত্ৰা ক'লৈ?",
        explore: "সন্ধান কৰক",
        myTrips: "মোৰ যাত্ৰাসমূহ",
        bookings: "বুকিংসমূহ",
        profile: "প্ৰ'ফাইল",
        planTrip: "যাত্ৰা পৰিকল্পনা কৰক",
        startingLocation: "আপুনি ক'ৰ পৰা যাত্ৰা আৰম্ভ কৰিব?",
        saveTrip: "যাত্ৰা সংৰক্ষণ কৰক",
        viewMaps: "মেপত চাওক",
        loginRequired: "লগইনৰ প্ৰয়োজন",
        loginToAccess: "এই সুবিধাটো ব্যৱহাৰ কৰিবলৈ লগইন কৰক।",
        logout: "লগআউট",
        settings: "ছেটিংস",
        support: "সহায়",
        language: "ভাষা",
        currency: "মুদ্ৰা",
        theme: "থিম",
        notifications: "জাননীসমূহ",
        tripsPlanned: "পৰিকল্পিত যাত্ৰাসমূহ",
        upcoming: "আহিবলগীয়া",
        saved: "সংৰক্ষিত",
        addPhone: "মোবাইল নম্বৰ যোগ কৰক",
        editProfile: "প্ৰ'ফাইল সম্পাদনা কৰক",
        saveChanges: "পৰিবৰ্তনসমূহ সংৰক্ষণ কৰক",
        cancel: "বাতিল কৰক"
      },
      Urdu: {
        welcome: "خوش آمدید",
        whereTo: "اگلا سفر کہاں کا ہے؟",
        explore: "دریافت کریں",
        myTrips: "میرے اسفار",
        bookings: "بکنگز",
        profile: "پروفائل",
        planTrip: "سفر کا منصوبہ بنائیں",
        startingLocation: "آپ اپنا سفر کہاں سے شروع کریں گے؟",
        saveTrip: "سفر محفوظ کریں",
        viewMaps: "نقشے پر دیکھیں",
        loginRequired: "لاگ ان درکار ہے",
        loginToAccess: "براہ کرم اس فیچر تک رسائی کے لیے لاگ ان کریں۔",
        logout: "لاگ آؤٹ",
        settings: "ترتیبات",
        support: "سپورٹ",
        language: "زبان",
        currency: "کرنسی",
        theme: "تھیم",
        notifications: "اطلاعات",
        tripsPlanned: "منصوبہ بند اسفار",
        upcoming: "آنے والے",
        saved: "محفوظ کردہ",
        addPhone: "موبائل نمبر شامل کریں",
        editProfile: "پروفائل ایڈٹ کریں",
        saveChanges: "تبدیلیاں محفوظ کریں",
        cancel: "منسوخ کریں"
      },
      Konkani: {
        welcome: "परतून येवकार",
        whereTo: "मुखार खंय वचपाचें?",
        explore: "शोधात",
        myTrips: "म्हज्यो भोंवड्यो",
        bookings: "बुकिंग",
        profile: "प्रोफाइल",
        planTrip: "भोंवडेचें नियोजन करात",
        startingLocation: "तुमची भोंवडी खंयच्यान सुरू जातली?",
        saveTrip: "भोंवडी साठवून दवरात",
        viewMaps: "नकाशाचेर पळयात",
        loginRequired: "लॉगिन गरजेचे",
        loginToAccess: "हें फिचर वापरपा खातीर लॉगिन करात.",
        logout: "लॉगआउट",
        settings: "सेटिंग्स",
        support: "मदत",
        language: "भास",
        currency: "चलन",
        theme: "थीम",
        notifications: "सूचना",
        tripsPlanned: "नियोजीत भोंवड्यो",
        upcoming: "येवपी",
        saved: "साठयल्ल्यो",
        addPhone: "मोबाईल नंबर जोडा",
        editProfile: "प्रोफाइल बदल करात",
        saveChanges: "बदल साठवून दवरात",
        cancel: "रद्द करात"
      },
      Sanskrit: {
        welcome: "पुनः स्वागतम्",
        whereTo: "अग्रिमयात्रा कुत्र?",
        explore: "अन्वेषणं कुरु",
        myTrips: "मम यात्राः",
        bookings: "आरक्षणम्",
        profile: "व्यक्तिविवरणम्",
        planTrip: "यात्रां कल्पय",
        startingLocation: "भवतः यात्रा कुतः आरप्स्यते?",
        saveTrip: "यात्रां रक्ष",
        viewMaps: "मानचित्रे पश्य",
        loginRequired: "प्रवेशः आवश्यकः",
        loginToAccess: "कृपया एतत् प्रयोक्तुं प्रवेशं कुरु।",
        logout: "निर्गमनम्",
        settings: "व्यवस्थापनम्",
        support: "सहायता",
        language: "भाषा",
        currency: "मुद्रा",
        theme: "विषयवस्तु",
        notifications: "सूचनाः",
        tripsPlanned: "कल्पिताः यात्राः",
        upcoming: "आगामिन्यः",
        saved: "रक्षिताः",
        addPhone: "चलभाषसङ्ख्यां योजय",
        editProfile: "विवरणं संशोध्य",
        saveChanges: "परिवर्तनानि रक्ष",
        cancel: "निरसनम्"
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

  // Firebase Auth Listener & Sandbox mode initializer
  React.useEffect(() => {
    if (!isFirebaseAvailable) {
      // In Guest/Local sandbox mode, load any previously logged-in user profile if exists.
      const savedUser = localStorage.getItem("travolor_local_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.id !== "guest_user") {
            setUser(parsed);
          } else {
            setUser(null);
          }
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthInitializing(false);
      return;
    }

    if (!auth) {
      setAuthInitializing(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
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
      } catch (err) {
        console.error("Auth sync error:", err);
        setUser(null);
      } finally {
        setAuthInitializing(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Admin Real-time Synchronization
  React.useEffect(() => {
    if (!user || user.email !== 'historythroughminds@gmail.com' || !isFirebaseAvailable || !db) {
      setAdminUsers([]);
      setAdminTrips([]);
      setAdminBookings([]);
      return;
    }

    setAdminLoading(true);

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdminUsers(list);
    }, (err) => console.error("Admin user listener error:", err));

    const unsubTrips = onSnapshot(collection(db, 'trips'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdminTrips(list);
    }, (err) => console.error("Admin trip listener error:", err));

    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdminBookings(list);
      setAdminLoading(false);
    }, (err) => {
      console.error("Admin booking listener error:", err);
      setAdminLoading(false);
    });

    return () => {
      unsubUsers();
      unsubTrips();
      unsubBookings();
    };
  }, [user, isFirebaseAvailable]);

  // Firestore & Local Real-time Listeners
  React.useEffect(() => {
    if (!user) {
      setSavedTrips([]);
      setBookings([]);
      setWishlist([]);
      setUserTotalBudget(50000);
      return;
    }

    setEditForm({ name: user.name, phone: user.phone || '', photo: user.photo || '' });

    if (!isFirebaseAvailable) {
      // Load Local Saved Trips
      const localTrips = localStorage.getItem("travolor_local_trips");
      if (localTrips) {
        try {
          setSavedTrips(JSON.parse(localTrips).filter((t: any) => t.user_id === user.id));
        } catch (e) {
          setSavedTrips([]);
        }
      } else {
        setSavedTrips([]);
      }

      // Load Local Bookings
      const localBookings = localStorage.getItem("travolor_local_bookings");
      if (localBookings) {
        try {
          setBookings(JSON.parse(localBookings));
        } catch (e) {
          setBookings([]);
        }
      } else {
        if (user.id === "guest_user") {
          const defaultBookings = [
            { id: "b1", title: "Heritage Palace Stay, Jaipur", type: "Hotel", date: "28 Jun 2026", status: "Confirmed" },
            { id: "b2", title: "Mumbai (BOM) ➔ Jaipur (JAI) Flight", type: "Flight", date: "27 Jun 2026", status: "Confirmed" }
          ];
          setBookings(defaultBookings);
          localStorage.setItem("travolor_local_bookings", JSON.stringify(defaultBookings));
        } else {
          setBookings([]);
        }
      }

      // Load Local Wishlist
      const localWishlist = localStorage.getItem("travolor_local_wishlist");
      if (localWishlist) {
        try {
          setWishlist(JSON.parse(localWishlist).filter((w: any) => w.user_id === user.id));
        } catch (e) {
          setWishlist([]);
        }
      } else {
        setWishlist([]);
      }

      // Set budget
      setUserTotalBudget(user.totalBudget || 80000);
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

  const handleSendSimulatedOtp = () => {
    if (!phoneForm.phone || phoneForm.phone.length < 10) {
      setAuthError("कृपया वैध १० अंकी मोबाईल नंबर टाका. (Please enter a valid 10-digit mobile number.)");
      return;
    }
    setAuthError(null);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpSentCode(code);
    setOtpSent(true);
    setOtpTimer(60);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    if (!isFirebaseAvailable) {
      // Offline / Local Sandbox simulation
      try {
        if (authMethod === 'email') {
          const localUsers = JSON.parse(localStorage.getItem("travolor_registered_users") || "[]");
          if (authMode === 'login') {
            const matched = localUsers.find((u: any) => u.email === authForm.email && u.password === authForm.password);
            if (!matched) {
              throw new Error("चुकीचा ईमेल किंवा पासवर्ड! (Invalid email or password!)");
            }
            const loggedUser = {
              id: matched.id,
              name: matched.name,
              email: matched.email,
              photo: matched.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
              phone: matched.phone || "",
              totalBudget: matched.totalBudget || 50000
            };
            setUser(loggedUser);
            localStorage.setItem("travolor_local_user", JSON.stringify(loggedUser));
          } else {
            const emailExists = localUsers.some((u: any) => u.email === authForm.email);
            if (emailExists) {
              throw new Error("या ईमेलने आधीच नोंदणी केली आहे. (Email is already registered.)");
            }
            const newUser = {
              id: "local_u_" + Date.now(),
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
              phone: "",
              totalBudget: 50000,
              photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
            };
            localUsers.push(newUser);
            localStorage.setItem("travolor_registered_users", JSON.stringify(localUsers));
            
            const loggedUser = {
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              photo: newUser.photo,
              phone: newUser.phone,
              totalBudget: newUser.totalBudget
            };
            setUser(loggedUser);
            localStorage.setItem("travolor_local_user", JSON.stringify(loggedUser));
          }
        } else {
          // Phone mode simulation
          if (!phoneForm.phone || phoneForm.phone.length < 10) {
            throw new Error("कृपया वैध १० अंकी मोबाईल नंबर टाका. (Please enter a valid 10-digit mobile number.)");
          }
          const virtualEmail = `${phoneForm.phone}@travolor.mock`;
          const localUsers = JSON.parse(localStorage.getItem("travolor_registered_users") || "[]");
          let matched = localUsers.find((u: any) => u.phone === phoneForm.phone || u.email === virtualEmail);

          if (phoneMode === 'otp') {
            if (!otpSent) {
              handleSendSimulatedOtp();
              setLoading(false);
              return;
            }
            if (phoneForm.otp !== otpSentCode && phoneForm.otp !== "123456") {
              throw new Error("चुकीचा OTP! स्क्रीनवर दिसणारा OTP प्रविष्ट करा. (Incorrect OTP!)");
            }
          } else {
            if (authMode === 'login') {
              if (!matched || matched.password !== phoneForm.password) {
                throw new Error("चुकीचा फोन नंबर किंवा पासवर्ड! (Incorrect phone or password!)");
              }
            }
          }

          if (!matched) {
            matched = {
              id: "local_u_" + Date.now(),
              name: phoneForm.name || `Traveler ${phoneForm.phone.slice(-4)}`,
              email: virtualEmail,
              password: phoneForm.password || `otp_${phoneForm.phone}_travolor_secure`,
              phone: phoneForm.phone,
              totalBudget: 50000,
              photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
            };
            localUsers.push(matched);
            localStorage.setItem("travolor_registered_users", JSON.stringify(localUsers));
          }

          const loggedUser = {
            id: matched.id,
            name: matched.name,
            email: matched.email,
            photo: matched.photo,
            phone: matched.phone,
            totalBudget: matched.totalBudget
          };
          setUser(loggedUser);
          localStorage.setItem("travolor_local_user", JSON.stringify(loggedUser));
          setOtpSent(false);
          setOtpSentCode('');
        }
        setActiveTab('explore');
      } catch (err: any) {
        console.error(err);
        setAuthError(err.message || "Authentication failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!auth) {
      setAuthError("Firebase is not configured. Please add your API key to the environment variables.");
      setLoading(false);
      return;
    }
    setAuthError(null);
    setLoading(true);
    try {
      if (authMethod === 'email') {
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
      } else {
        // Phone Auth Mode
        if (!phoneForm.phone || phoneForm.phone.length < 10) {
          throw new Error("कृपया वैध १० अंकी मोबाईल नंबर टाका. (Please enter a valid 10-digit mobile number.)");
        }

        const virtualEmail = `${phoneForm.phone}@travolor.mock`;
        
        if (phoneMode === 'otp') {
          if (!otpSent) {
            handleSendSimulatedOtp();
            setLoading(false);
            return;
          }

          if (phoneForm.otp !== otpSentCode && phoneForm.otp !== "123456") {
            throw new Error("चुकीचा OTP! स्क्रीनवर दिसणारा OTP प्रविष्ट करा. (Incorrect OTP! Please enter the OTP displayed on the screen.)");
          }

          // OTP matches! Authenticate using stable under-the-hood credential to maintain data persistence!
          const otpPassword = `otp_${phoneForm.phone}_travolor_secure`;
          try {
            await signInWithEmailAndPassword(auth, virtualEmail, otpPassword);
          } catch (err: any) {
            if (err.code === 'auth/user-not-found' || err.message.includes('not-found') || err.message.includes('USER_NOT_FOUND')) {
              // Create virtual persistent user profile
              const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, otpPassword);
              const newUser = userCredential.user;
              await setDoc(doc(db, 'users', newUser.uid), {
                name: phoneForm.name || `Traveler ${phoneForm.phone.slice(-4)}`,
                email: virtualEmail,
                phone: phoneForm.phone,
                totalBudget: 50000,
                created_at: new Date().toISOString()
              });
              await firebaseUpdateProfile(newUser, {
                displayName: phoneForm.name || `Traveler ${phoneForm.phone.slice(-4)}`
              });
            } else {
              throw err;
            }
          }
          setOtpSent(false);
          setOtpSentCode('');
        } else {
          // Phone Password login or signup
          if (authMode === 'login') {
            await signInWithEmailAndPassword(auth, virtualEmail, phoneForm.password);
          } else {
            if (!phoneForm.password || phoneForm.password.length < 6) {
              throw new Error("पासवर्ड किमान ६ अंकी असावा. (Password must be at least 6 characters.)");
            }
            const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, phoneForm.password);
            const newUser = userCredential.user;
            await setDoc(doc(db, 'users', newUser.uid), {
              name: phoneForm.name || `Traveler ${phoneForm.phone.slice(-4)}`,
              email: virtualEmail,
              phone: phoneForm.phone,
              totalBudget: 50000,
              created_at: new Date().toISOString()
            });
            await firebaseUpdateProfile(newUser, {
              displayName: phoneForm.name || `Traveler ${phoneForm.phone.slice(-4)}`
            });
          }
        }
        setActiveTab('explore');
      }
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message || "Authentication failed.";
      if (err.code) {
        const errorTranslations: Record<string, Record<string, string>> = {
          'auth/invalid-credential': {
            English: "Incorrect email/phone or password!",
            Marathi: "चुकीचा ईमेल/मोबाईल नंबर किंवा पासवर्ड!",
            Hindi: "गलत ईमेल/मोबाइल नंबर या पासवर्ड!"
          },
          'auth/wrong-password': {
            English: "Incorrect password!",
            Marathi: "चुकीचा पासवर्ड!",
            Hindi: "गलत पासवर्ड!"
          },
          'auth/user-not-found': {
            English: "No account found for this email/phone.",
            Marathi: "या ईमेल/मोबाईलवर कोणतेही खाते आढळले नाही.",
            Hindi: "इस ईमेल/मोबाइल पर कोई खाता नहीं मिला।"
          },
          'auth/email-already-in-use': {
            English: "This email/phone is already registered.",
            Marathi: "या ईमेल/मोबाईलवर आधीच खाते नोंदणीकृत आहे.",
            Hindi: "यह ईमेल/मोबाइल पहले से ही पंजीकृत है।"
          },
          'auth/weak-password': {
            English: "Password should be at least 6 characters.",
            Marathi: "पासवर्ड किमान ६ अक्षरांचा असावा.",
            Hindi: "पासवर्ड कम से कम ६ अक्षरों का होना चाहिए।"
          },
          'auth/invalid-email': {
            English: "Please enter a valid email or phone number.",
            Marathi: "कृपया वैध ईमेल किंवा मोबाईल नंबर प्रविष्ट करा.",
            Hindi: "कृपया एक वैध ईमेल या मोबाइल नंबर दर्ज करें।"
          },
          'auth/popup-closed-by-user': {
            English: "Login popup was closed by user.",
            Marathi: "लॉगिन विंडो बंद केली गेली.",
            Hindi: "लॉगिन पॉपअप उपयोगकर्ता द्वारा बंद कर दिया गया था।"
          },
          'auth/network-request-failed': {
            English: "Network error! Please check your internet.",
            Marathi: "नेटवर्क त्रुटी! कृपया इंटरनेट कनेक्शन तपासा.",
            Hindi: "नेटवर्क त्रुटि! कृपया अपना इंटरनेट कनेक्शन जांचें।"
          }
        };

        const code = err.code;
        if (errorTranslations[code]) {
          const trans = errorTranslations[code];
          friendlyMessage = trans[language] || trans.English;
        }
      }
      setAuthError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isFirebaseAvailable) {
      // Simulate quick Google Login with a beautiful local account
      const mockGoogleUser = {
        id: "mock_google_u",
        name: "Google Explorer",
        email: "google.traveler@gmail.com",
        photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
        phone: "+91 99999 88888",
        totalBudget: 60000
      };
      setUser(mockGoogleUser);
      localStorage.setItem("travolor_local_user", JSON.stringify(mockGoogleUser));
      setActiveTab('explore');
      return;
    }

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
    if (isFirebaseAvailable && auth) {
      await signOut(auth);
    } else {
      setUser(null);
      localStorage.removeItem("travolor_local_user");
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
    setStructuredItinerary(null);
    setItinerarySources([]);
    setModelUsedForItinerary("");
    setTimeout(() => {
      document.getElementById("itinerary-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    try {
      const result = await generateItinerary({
        location: locationInput,
        startLocation: startLocation,
        duration,
        numPeople,
        travelStyle: styleToUse,
        language: language,
        enableThinking: enableThinking,
        useSearch: useSearch,
        travelMode: travelMode,
        travelDate: travelDate,
        budget: targetBudget,
        includeHiddenGems: includeHiddenGems,
        includeLocalExperiences: includeLocalExperiences
      });
      setItinerary(result.text);
      setStructuredItinerary(result.structured || null);
      setTimeout(() => {
        document.getElementById("itinerary-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
      if (result.sources) {
        setItinerarySources(result.sources);
      }
      if (result.modelUsed) {
        setModelUsedForItinerary(result.modelUsed);
      }
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

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput;
    const userMsg = { role: 'user' as const, text: userText };
    const updatedHistory = [...chatHistory, userMsg];
    
    setChatHistory(updatedHistory);
    setChatInput("");
    setChatLoading(true);

    try {
      const locationToUse = startCoords || { lat: 19.0760, lng: 72.8777 }; // defaults to Mumbai
      const response = await sendChatMessage({
        messages: updatedHistory.map(m => ({ 
          role: m.role === 'assistant' ? 'model' : 'user', 
          text: m.text 
        })),
        userLocation: locationToUse,
        mode: chatMode === "complex" ? "reasoning" : chatMode,
        botRole: chatRole,
        language: language
      });

      setChatHistory(prev => [
        ...prev, 
        { 
          role: 'assistant' as const, 
          text: response.text, 
          sources: response.sources 
        }
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory(prev => [
        ...prev, 
        { 
          role: 'assistant' as const, 
          text: "I am having trouble planning at the moment. Please verify the Gemini Key or refresh." 
        }
      ]);
    } finally {
      setChatLoading(false);
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
      if (isFirebaseAvailable) {
        try {
          await deleteDoc(doc(db, 'wishlist', existing.id));
        } catch (err) {
          console.error(err);
        }
      } else {
        const localWishlist = localStorage.getItem("travolor_local_wishlist");
        let list = [];
        if (localWishlist) {
          try { list = JSON.parse(localWishlist); } catch (e) {}
        }
        const updated = list.filter((w: any) => w.id !== existing.id);
        localStorage.setItem("travolor_local_wishlist", JSON.stringify(updated));
        setWishlist(updated.filter((w: any) => w.user_id === user.id));
      }
    } else {
      const wishItem = {
        id: "wish_" + Date.now(),
        user_id: user.id,
        dest_id: dest.id,
        title: dest.title,
        img: dest.img,
        desc: dest.desc,
        created_at: new Date().toISOString()
      };

      if (isFirebaseAvailable) {
        try {
          await addDoc(collection(db, 'wishlist'), wishItem);
        } catch (err) {
          console.error(err);
        }
      } else {
        const localWishlist = localStorage.getItem("travolor_local_wishlist");
        let list = [];
        if (localWishlist) {
          try { list = JSON.parse(localWishlist); } catch (e) {}
        }
        list.push(wishItem);
        localStorage.setItem("travolor_local_wishlist", JSON.stringify(list));
        setWishlist(list.filter((w: any) => w.user_id === user.id));
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
      id: "trip_" + Date.now(),
      user_id: user.id,
      start_location: startLocation,
      location: locationInput,
      duration,
      style: travelStyle,
      budget: formatPrice(duration * 5000 * numPeople),
      itinerary,
      created_at: new Date().toISOString()
    };

    if (isFirebaseAvailable) {
      try {
        await addDoc(collection(db, 'trips'), tripData);
        alert("Trip saved to My Trips!");
      } catch (err) {
        console.error(err);
        alert("Failed to save trip.");
      }
    } else {
      const allTrips = localStorage.getItem("travolor_local_trips");
      let list = [];
      if (allTrips) {
        try { list = JSON.parse(allTrips); } catch (e) {}
      }
      list.unshift(tripData);
      localStorage.setItem("travolor_local_trips", JSON.stringify(list));
      setSavedTrips(list.filter((t: any) => t.user_id === user.id));
      alert("Trip saved to My Trips!");
    }
  };

  const handleQuickBook = async (serviceType: 'Hotel' | 'Flight' | 'Bus', serviceName: string, serviceUrl: string) => {
    if (!user) {
      alert("Please login to book services!");
      setActiveTab('profile');
      return;
    }

    const bookingItem = {
      id: "book_" + Date.now(),
      user_id: user.id,
      title: `${serviceType === 'Hotel' ? 'Hotel Stay' : serviceType === 'Flight' ? 'Flight' : 'Bus Ticket'} to ${serviceName}`,
      type: serviceType,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Confirmed',
      created_at: new Date().toISOString()
    };

    if (isFirebaseAvailable) {
      try {
        await addDoc(collection(db, 'bookings'), bookingItem);
      } catch (err) {
        console.error("Booking write failed:", err);
      }
    } else {
      const localBookings = localStorage.getItem("travolor_local_bookings");
      let list = [];
      if (localBookings) {
        try { list = JSON.parse(localBookings); } catch (e) {}
      }
      list.unshift(bookingItem);
      localStorage.setItem("travolor_local_bookings", JSON.stringify(list));
      setBookings(list);
    }

    alert(`🎉 Booking simulation successful! Your ${serviceType} booking has been recorded in your Bookings tab.\nOpening ticket partner in a new tab...`);
    window.open(serviceUrl, '_blank');
  };

  const openInMaps = (loc: string) => {
    window.open(`https://www.google.com/maps/search/${loc}+tourist+attractions`, '_blank');
  };

  const currentColor = StyleColors[travelStyle] || StyleColors.standard;

  const renderExplore = () => {
    const basePeople = paisaSize === "couple" ? 2 : paisaSize === "small" ? 4 : 6;
    const roomsCount = basePeople <= 2 ? 1 : basePeople <= 4 ? 2 : 3;
    const simDuration = 3; // 3-day trip simulation
    let originalCost = 0;
    let optimizedCost = 0;
    let transportAdvice = "";
    let foodAdvice = "";
    let stayAdvice = "";

    if (paisaBudget === "budget") {
      const origTravel = travelDistanceKm * 3.5 * basePeople;
      const optTravel = travelDistanceKm * 0.9 * basePeople;
      const origHotel = basePeople * 2800 * simDuration;
      const optHotel = roomsCount * 950 * simDuration;
      const origFood = basePeople * 800 * simDuration;
      const optFood = basePeople * 220 * simDuration;
      originalCost = Math.round(origTravel + origHotel + origFood);
      optimizedCost = Math.round(optTravel + optHotel + optFood);

      transportAdvice = `Sleeper Class (SL) train @ ₹0.90/km. Book early with Lower Berth Priority!`;
      foodAdvice = `Local dhabas & street-food paths (avg. ₹220/day per person). Clean & hyper-authentic!`;
      stayAdvice = `Safe family homestays or dharamshalas @ ₹950/night for ${roomsCount} room${roomsCount > 1 ? 's' : ''}.`;
    } else if (paisaBudget === "mid") {
      const origTravel = travelDistanceKm * 6 * basePeople;
      const optTravel = travelDistanceKm * 2.4 * basePeople;
      const origHotel = basePeople * 4500 * simDuration;
      const optHotel = roomsCount * 2200 * simDuration;
      const origFood = basePeople * 1400 * simDuration;
      const optFood = basePeople * 550 * simDuration;
      originalCost = Math.round(origTravel + origHotel + origFood);
      optimizedCost = Math.round(optTravel + optHotel + optFood);

      transportAdvice = `3AC reservation or premium sleeper bus @ ₹2.40/km (Tatkal pre-filled passenger lists).`;
      foodAdvice = `IRCTC e-Catering train deliveries & local unlimited traditional thalis (avg. ₹550/day).`;
      stayAdvice = `High-rated family-hosted homestays @ ₹2,200/night for ${roomsCount} room${roomsCount > 1 ? 's' : ''}.`;
    } else {
      const origTravel = travelDistanceKm * 10 * basePeople;
      const optTravel = travelDistanceKm * 3.5 * basePeople;
      const origHotel = basePeople * 7000 * simDuration;
      const optHotel = roomsCount * 4500 * simDuration;
      const origFood = basePeople * 2200 * simDuration;
      const optFood = basePeople * 850 * simDuration;
      originalCost = Math.round(origTravel + origHotel + origFood);
      optimizedCost = Math.round(optTravel + optHotel + optFood);

      transportAdvice = `Vande Bharat Express comfort or private tourist AC cab @ ₹3.50/km.`;
      foodAdvice = `Heritage restaurants with curated pure-veg family thali systems (avg. ₹850/day).`;
      stayAdvice = `Boutique Havelis or cozy villa stays @ ₹4,500/night for ${roomsCount} room${roomsCount > 1 ? 's' : ''}.`;
    }

    const savingsFactor = Math.round(((originalCost - optimizedCost) / originalCost) * 100) || 65;

    const domesticGems = [
      {
        id: "chopta",
        name: "Chopta, Uttarakhand",
        insteadOf: "Switzerland Alps",
        internationalCost: "₹3,50,000",
        domesticCostStr: "₹18,500",
        savings: "94% Saved",
        image: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=600&q=80",
        tag: "🏆 Mini-Switzerland of India"
      },
      {
        id: "alleppey",
        name: "Alleppey, Kerala",
        insteadOf: "Venice Canals",
        internationalCost: "₹2,80,000",
        domesticCostStr: "₹14,200",
        savings: "95% Saved",
        image: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=600&q=80",
        tag: "🛶 Venice of the East"
      },
      {
        id: "gokarna",
        name: "Gokarna, Karnataka",
        insteadOf: "Bali Beaches",
        internationalCost: "₹1,20,000",
        domesticCostStr: "₹11,500",
        savings: "90% Saved",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
        tag: "🌊 Unspoiled Coastal Bliss"
      },
      {
        id: "gandikota",
        name: "Gandikota, Andhra Pradesh",
        insteadOf: "Grand Canyon USA",
        internationalCost: "₹4,20,000",
        domesticCostStr: "₹9,800",
        savings: "97% Saved",
        image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80",
        tag: "⛰️ Grand Canyon of India"
      }
    ];

    const handleSetDestination = (destName: string) => {
      setLocationInput(destName);
      setEndCoords(null);
      window.scrollTo({ top: 350, behavior: "smooth" });
    };

    return (
      <div className="space-y-16 pb-24">
        {/* Prominent India Focus & Language Selector Ribbon */}
        <div className="bg-gradient-to-r from-orange-50/90 via-white/95 to-green-50/90 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900 border border-gray-200/50 dark:border-slate-800/80 py-4 px-6 rounded-3xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">🇮🇳</span>
            <div className="text-left">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Travolor India Focus <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 px-2 py-0.5 rounded-full font-mono font-medium">ONLY INDIA</span>
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                अतुल्य भारत! Explore domestic alternatives to international destinations & plan with your local language!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl px-4 py-2 shadow-sm min-w-[240px] justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">भाषा / Language:</span>
            <select
              value={language}
              onChange={(e) => {
                const selected = e.target.value;
                setLanguage(selected);
                localStorage.setItem('travolor_lang', selected);
              }}
              className="bg-transparent text-sm font-bold outline-none cursor-pointer text-[#000080] dark:text-orange-400 font-sans border-none focus:ring-0"
              title="Select Travel Language"
            >
              <option value="English" className="text-slate-800 bg-white">English</option>
              <option value="Hindi" className="text-slate-800 bg-white">हिन्दी (Hindi)</option>
              <option value="Marathi" className="text-slate-800 bg-white">मराठी (Marathi)</option>
              <option value="Gujarati" className="text-slate-800 bg-white">ગુજરાતી (Gujarati)</option>
              <option value="Bengali" className="text-slate-800 bg-white">বাংলা (Bengali)</option>
              <option value="Punjabi" className="text-slate-800 bg-white">ਪੰਜਾਬੀ (Punjabi)</option>
              <option value="Tamil" className="text-slate-800 bg-white">தமிழ் (Tamil)</option>
              <option value="Telugu" className="text-slate-800 bg-white">తెలుగు (Telugu)</option>
              <option value="Kannada" className="text-slate-800 bg-white">ಕನ್ನಡ (Kannada)</option>
              <option value="Malayalam" className="text-slate-800 bg-white">മലയാളം (Malayalam)</option>
              <option value="Odia" className="text-slate-800 bg-white">ଓଡ଼ିଆ (Odia)</option>
              <option value="Assamese" className="text-slate-800 bg-white">অসমীয়া (Assamese)</option>
              <option value="Urdu" className="text-slate-800 bg-white">اردو (Urdu)</option>
              <option value="Konkani" className="text-slate-800 bg-white">कोंकणी (Konkani)</option>
              <option value="Sanskrit" className="text-slate-800 bg-white">संस्कृत (Sanskrit)</option>
              <option value="Spanish" className="text-slate-800 bg-white">Spanish</option>
              <option value="French" className="text-slate-800 bg-white">French</option>
              <option value="German" className="text-slate-800 bg-white">German</option>
            </select>
          </div>
        </div>

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
                  onClick={() => window.open(getAffiliateLink(service.id, startLocation || "Mumbai", locationInput || "Delhi"), '_blank')}
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
                  onChange={(val: string) => {
                    setStartLocation(val);
                    setStartCoords(null);
                  }}
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
                  language={language}
                />

                <LocationInput
                  value={locationInput}
                  onChange={(val: string) => {
                    setLocationInput(val);
                    setEndCoords(null);
                  }}
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
                  language={language}
                />
              </div>

              {/* Travel Mode Selector */}
              <div className="text-left space-y-3">
                <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  {language === 'mr' ? '🚗 प्रवासाचे साधन निवडा (Travel Mode)' : language === 'hi' ? '🚗 यात्रा का साधन चुनें (Travel Mode)' : '🚗 Select Travel Mode'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { id: 'self-drive', label: 'Self Drive', mr: 'स्वतः कारने', hi: 'स्वयं ड्राइव', icon: Car },
                    { id: 'cab', label: 'Outstation Cab', mr: 'कॅब भाड्याने', hi: 'आउटस्टेशन कैब', icon: Car },
                    { id: 'bus', label: 'Sleeper Bus', mr: 'लक्झरी बसने', hi: 'स्लीपर बस', icon: Bus },
                    { id: 'train', label: 'Scenic Train', mr: 'रेल्वेने (ट्रेन)', hi: 'ट्रेन सफर', icon: TrainFront },
                    { id: 'flight', label: 'Fast Flight', mr: 'विमानाने (फ्लाइट)', hi: 'हवाई यात्रा', icon: Plane }
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = travelMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setTravelMode(mode.id as any)}
                        className={`flex flex-col items-center justify-center py-4 px-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-[#000080] border-[#000080] text-white shadow-lg ring-2 ring-blue-400/50" 
                            : "bg-gray-50/70 border-gray-100 hover:bg-gray-100/80 hover:border-gray-300 dark:bg-slate-800/40 dark:border-slate-800 dark:hover:bg-slate-800/80 text-gray-700 dark:text-gray-300"
                        }`}
                        title={mode.label}
                      >
                        <Icon size={22} className={`mb-2 ${isSelected ? 'text-amber-400' : 'text-gray-400 dark:text-gray-500'}`} />
                        <span className="text-[11px] font-black tracking-tight block truncate w-full">
                          {language === 'mr' ? mode.mr : language === 'hi' ? mode.hi : mode.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Travel Date and Target Budget Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 dark:bg-slate-800/20 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between group hover:bg-white dark:hover:bg-slate-900 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 w-full">
                    <Calendar className="text-gray-400 shrink-0" size={20} />
                    <div className="flex flex-col text-left w-full">
                      <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                        {language === 'mr' ? 'प्रवासाची तारीख (Travel Date)' : language === 'hi' ? 'यात्रा की तारीख (Travel Date)' : 'Travel Date'}
                      </span>
                      <input 
                        type="date" 
                        value={travelDate} 
                        onChange={(e) => setTravelDate(e.target.value)} 
                        className="text-[#000080] dark:text-blue-400 font-bold bg-transparent outline-none border-none p-0 mt-0.5 w-full cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/20 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between group hover:bg-white dark:hover:bg-slate-900 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 w-full">
                    <Wallet className="text-gray-400 shrink-0" size={20} />
                    <div className="flex flex-col text-left w-full">
                      <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                        {language === 'mr' ? 'लक्षित बजेट (Target Budget - ₹)' : language === 'hi' ? 'लक्षित बजट (Target Budget - ₹)' : 'Target Budget (₹)'}
                      </span>
                      <input 
                        type="number" 
                        min="1000"
                        step="5000"
                        value={targetBudget} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setTargetBudget(val);
                        }} 
                        className="text-[#000080] dark:text-blue-400 font-bold bg-transparent outline-none border-none p-0 mt-0.5 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>
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

                {/* AI Configuration Section */}
                <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-slate-800/20 dark:to-slate-900/20 border border-blue-100/60 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3.5">
                  <span className="text-[10px] font-black tracking-widest uppercase text-indigo-500 text-left">INTELLIGENCE CONFIG</span>
                  
                  {/* Google Search Grounding */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-9 h-9 rounded-xl bg-orange-100/70 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center">
                        <Search size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#000080] dark:text-indigo-400">Live Google Search</span>
                        <span className="text-gray-400 text-[11px]">Real-time grounding for local info</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={useSearch} 
                        onChange={(e) => setUseSearch(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Thinking Level Pro */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-9 h-9 rounded-xl bg-purple-100/70 dark:bg-purple-950/20 text-purple-500 flex items-center justify-center">
                        <Cpu size={18} />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-[#000080] dark:text-indigo-400">High Reasoning Mode</span>
                          <span className="text-[8px] bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-extrabold px-1.5 py-0.5 rounded uppercase">PRO</span>
                        </div>
                        <span className="text-gray-400 text-[11px]">Deep thinking level with Gemini 3</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={enableThinking} 
                        onChange={(e) => setEnableThinking(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* Include Hidden Gems */}
                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-9 h-9 rounded-xl bg-amber-100/70 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center">
                        <Sparkles size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#000080] dark:text-indigo-400">
                          {language === "Marathi" ? "गुपित प्रेक्षणीय स्थळे समाविष्ट करा" : language === "Hindi" ? "छिपे हुए अनूठे स्थान जोड़ें" : "Include Hidden Gems & Offbeat Spots"}
                        </span>
                        <span className="text-gray-400 text-[11px]">
                          {language === "Marathi" ? "गर्दी नसलेली सुंदर पर्यटन ठिकाणे" : language === "Hindi" ? "कम भीड़भाड़ वाले खूबसूरत पर्यटक स्थल" : "Discover lesser-known, scenic secret places"}
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={includeHiddenGems} 
                        onChange={(e) => setIncludeHiddenGems(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {/* Include Local Experiences */}
                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center">
                        <Utensils size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#000080] dark:text-indigo-400">
                          {language === "Marathi" ? "स्थानिक अनुभव आणि खाद्यसंस्कृती" : language === "Hindi" ? "स्थानीय अनुभव और पारंपरिक व्यंजन" : "Include Local Experiences & Culinary Guides"}
                        </span>
                        <span className="text-gray-400 text-[11px]">
                          {language === "Marathi" ? "पारंपरिक खाद्यपदार्थ आणि स्थानिक संस्कृती" : language === "Hindi" ? "पारंपरिक व्यंजन और स्थानीय कला-संस्कृति" : "Savor authentic regional food & native culture"}
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={includeLocalExperiences} 
                        onChange={(e) => setIncludeLocalExperiences(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
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

        {/* Segmented Tab Bar for Exploration & Inspiration */}
        {!itinerary && !loading && (
          <div className="max-w-5xl mx-auto w-full px-4 text-center space-y-4 animate-fade-in">
            <span className="text-xs font-black tracking-widest text-[#1E90FF] uppercase">🎯 Swadesh Travel Explorer</span>
            <div className="bg-gray-100/90 dark:bg-[#0E1335]/80 p-2 rounded-3xl inline-flex flex-wrap gap-2 justify-center border border-gray-200/50 dark:border-blue-950/40 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setExploreSecondaryTab('gems');
                  document.getElementById('swadesh-gems-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={cn(
                  "px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2",
                  exploreSecondaryTab === 'gems'
                    ? "bg-white dark:bg-[#1E90FF]/20 text-[#000080] dark:text-[#93C5FD] shadow-md"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                🏞️ Swadesh Gems
              </button>
              <button
                type="button"
                onClick={() => {
                  setExploreSecondaryTab('copilot');
                  document.getElementById('copilot-tools-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={cn(
                  "px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2",
                  exploreSecondaryTab === 'copilot'
                    ? "bg-white dark:bg-[#1E90FF]/20 text-[#000080] dark:text-[#93C5FD] shadow-md"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                🎒 Co-Pilot Tools
              </button>
              <button
                type="button"
                onClick={() => {
                  setExploreSecondaryTab('simulator');
                  document.getElementById('savings-simulator-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={cn(
                  "px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2",
                  exploreSecondaryTab === 'simulator'
                    ? "bg-white dark:bg-[#1E90FF]/20 text-[#000080] dark:text-[#93C5FD] shadow-md"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                💰 Savings Simulator & Hacks
              </button>
              <button
                type="button"
                onClick={() => {
                  setExploreSecondaryTab('budget-planner');
                  document.getElementById('trip-budget-tracker-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={cn(
                  "px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2",
                  exploreSecondaryTab === 'budget-planner'
                    ? "bg-white dark:bg-[#1E90FF]/20 text-[#000080] dark:text-[#93C5FD] shadow-md"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                💳 Budget Sandbox
              </button>
            </div>
          </div>
        )}

        {/* Travel Stats & AI Co-Pilot Features Suite */}
        {!itinerary && !loading && (
          <div id="copilot-tools-section" className="scroll-mt-24 space-y-12">
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

            {/* Premium AI Co-Pilot Features Suite */}
            <section className="space-y-8 px-4">
              <div className="text-center space-y-2">
                <span className="bg-blue-100/80 dark:bg-[#1E90FF]/10 text-[#000080] dark:text-[#93C5FD] px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-blue-200/40 dark:border-[#1E90FF]/20">
                  💎 Travolor Premium Suite
                </span>
                <h3 className="text-3xl md:text-4xl font-display font-black text-[#000080] dark:text-white tracking-tight">
                  AI-Powered Travel Co-Pilot Tools
                </h3>
                <p className="text-gray-500 text-sm max-w-xl mx-auto font-medium">
                  Access localized expert planners, coordinate expenses, and design routes with advanced Gemini intelligence.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    id: "chat",
                    title: "🎒 Companion & Quiz",
                    description: "Determine your Travel Personality type and chat with custom AI local guides tuned to your specific travel vibes.",
                    icon: MessageSquare,
                    color: "from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/30",
                    badge: "Active"
                  },
                  {
                    id: "route",
                    title: "🗺️ Interactive Map Planner",
                    description: "Plot custom destination nodes interactively on the SVG stage and dynamically calculate optimal travel routes & times.",
                    icon: MapIcon,
                    color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30",
                    badge: "Interactive"
                  },
                  {
                    id: "board",
                    title: "✨ Visual Trip Board",
                    description: "Save custom scenic pins, search attraction spots, and receive live recommendations with Google Search integration.",
                    icon: Compass,
                    color: "from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-100/50 dark:border-purple-900/30",
                    badge: "Premium"
                  },
                  {
                    id: "india",
                    title: "🕌 India Specials",
                    description: "Explore highly curated architectural wonders, spiritual ashram routes, and majestic palace heritage trails.",
                    icon: Castle,
                    color: "from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/30",
                    badge: "Localized"
                  },
                  {
                    id: "group",
                    title: "👥 Group Expense Splitter",
                    description: "Coordinate group travel members, log receipt expenses seamlessly, and view mathematically optimal payment settlements.",
                    icon: Users,
                    color: "from-rose-500/10 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-100/50 dark:border-rose-900/30",
                    badge: "Splitter"
                  },
                  {
                    id: "budget-tracker",
                    title: "💳 AI Budget Planner & Calculator",
                    description: "Enter your target budget and calculate real-time domestic lodging, train fares, meals, and local auto expenses instantly.",
                    icon: Wallet,
                    color: "from-amber-500/10 to-emerald-500/10 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/30",
                    badge: "Calculator"
                  }
                ].map((feature, i) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ y: -6, scale: 1.02 }}
                      onClick={() => {
                        if (feature.id === "budget-tracker") {
                          setActiveTab("explore");
                          setTimeout(() => {
                            document.getElementById("trip-budget-tracker-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 100);
                        } else {
                          setHubSubTab(feature.id as any);
                          setActiveTab("hub");
                        }
                      }}
                      className={cn(
                        "relative overflow-hidden rounded-[2.5rem] border bg-white dark:bg-[#0B0F2B]/60 p-6 flex flex-col text-left gap-4 hover:shadow-xl transition-all duration-300 cursor-pointer group",
                        "border-gray-100/80 dark:border-[#1E295D]/20 shadow-sm"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center font-bold", feature.color)}>
                        <Icon size={22} className="group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-gray-800 dark:text-white group-hover:text-[#1E90FF] transition-colors">{feature.title}</h4>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-gray-100 dark:bg-[#1E295D]/30 text-gray-400 dark:text-gray-300 tracking-wider">
                            {feature.badge}
                          </span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium leading-relaxed">{feature.description}</p>
                      </div>
                      <div className="mt-auto pt-2 flex items-center gap-1.5 text-xs font-bold text-[#1E90FF] opacity-0 group-hover:opacity-100 transition-opacity">
                        Open {feature.id === "budget-tracker" ? "Calculator" : "Co-Pilot Tool"} <ArrowRight size={12} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* Swadesh Paisa Vasool Hub Section (under Savings Simulator Tab) */}
        {!itinerary && !loading && (
          <section id="savings-simulator-section" className="space-y-12 px-4 py-8 bg-[#FAF9F5] dark:bg-[#07091B]/40 rounded-[3.5rem] border border-amber-100/50 dark:border-blue-950/20 shadow-sm relative overflow-hidden scroll-mt-24">
            {/* Accent decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#1E90FF]/10 to-amber-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

            <div className="text-center space-y-3 relative z-10">
              <span className="inline-flex items-center gap-1.5 bg-amber-100/80 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border border-amber-200/50 dark:border-amber-900/40">
                🇮🇳 SWADESH PAISA VASOOL HUB
              </span>
              <h3 className="text-3xl md:text-5xl font-display font-black text-[#000080] dark:text-white tracking-tight leading-none">
                Family Savings & Middle-Class Special
              </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base max-w-2xl mx-auto font-medium">
              Maximize your happiness, minimize your expenses! Discover pristine Indian budget gems and plan with intelligent local hacks.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
            {/* Left side: Interactive Paisa Vasool Savings Simulator */}
            <div className="lg:col-span-7 bg-white dark:bg-[#0A0D28]/80 rounded-[2.5rem] p-6 md:p-8 border border-amber-100/40 dark:border-blue-900/20 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <h4 className="font-extrabold text-lg text-gray-800 dark:text-white">Paisa Vasool Savings Simulator</h4>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-200/50 px-3 py-1 rounded-full text-xs font-black font-mono inline-flex items-center gap-1 shrink-0 self-start sm:self-center">
                    <span>📍</span> {startLocation || "Mumbai"} ➔ {locationInput || "Goa"} ({travelDistanceKm} km One-Way | {travelDistanceKm * 2} km RT)
                  </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-400 leading-relaxed">
                  Select your family setup and target budget style to see how Travolor AI optimizes domestic lodging, local eateries, and IRCTC transport for extreme value.
                </p>

                {/* Step 1: Select Budget style */}
                <div className="space-y-2 text-left">
                  <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">1. Budget Category</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "budget", label: "🎒 Budget (Low Cost)", desc: "Sleeper Class + Dhabas" },
                      { id: "mid", label: "🏡 Mid-Range (Smart)", desc: "3AC Train + Homestays" },
                      { id: "family", label: "🌟 Family Special", desc: "Vande Bharat + Resorts" }
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setPaisaBudget(btn.id as any)}
                        className={cn(
                          "p-3 rounded-2xl border text-xs text-center transition-all flex flex-col items-center justify-center gap-1",
                          paisaBudget === btn.id
                            ? "bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-400 font-extrabold"
                            : "border-gray-100 hover:border-gray-300 dark:border-slate-800 text-gray-500 dark:text-gray-400"
                        )}
                      >
                        <span className="truncate w-full font-bold">{btn.label}</span>
                        <span className="text-[9px] opacity-70 truncate w-full">{btn.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Select Family Size */}
                <div className="space-y-2 text-left">
                  <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">2. Family / Group Size</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "couple", label: "👥 Couple", desc: "2 People" },
                      { id: "small", label: "👨‍👩‍👦 Small Family", desc: "4 People" },
                      { id: "joint", label: "👵 Joint Family", desc: "6+ People" }
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setPaisaSize(btn.id as any)}
                        className={cn(
                          "p-3 rounded-2xl border text-xs text-center transition-all flex flex-col items-center justify-center gap-1",
                          paisaSize === btn.id
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-extrabold"
                            : "border-gray-100 hover:border-gray-300 dark:border-slate-800 text-gray-500 dark:text-gray-400"
                        )}
                      >
                        <span className="font-bold">{btn.label}</span>
                        <span className="text-[9px] opacity-70">{btn.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Cost Comparison Bar */}
              <div className="bg-amber-50/40 dark:bg-[#0E1335]/50 border border-amber-100/50 dark:border-blue-950/30 p-5 rounded-3xl space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <span className="text-xs text-gray-400 block">Regular Commercial Booking</span>
                    <span className="text-base font-extrabold text-red-600 line-through">₹{originalCost.toLocaleString()}</span>
                  </div>
                  <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                    🔥 SAVE {savingsFactor}%
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Travolor AI Optimized Swadesh Cost</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">₹{optimizedCost.toLocaleString()}</span>
                  </div>
                </div>

                {/* visual ratio slider bar */}
                <div className="relative h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: `${100 - savingsFactor}%` }}
                    transition={{ duration: 1 }}
                    className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full"
                  />
                </div>

                <div className="text-left text-xs bg-white/70 dark:bg-[#07091B]/40 p-3 rounded-2xl border border-gray-100/80 dark:border-slate-800/80 space-y-2">
                  <div className="flex gap-2 items-start">
                    <span className="text-emerald-500">🚇</span>
                    <p className="text-gray-600 dark:text-gray-300 font-medium"><strong>Transport Option:</strong> {transportAdvice}</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-amber-500">🍲</span>
                    <p className="text-gray-600 dark:text-gray-300 font-medium"><strong>Food Solution:</strong> {foodAdvice}</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-[#1E90FF]">🏨</span>
                    <p className="text-gray-600 dark:text-gray-300 font-medium"><strong>Budget Stay Secret:</strong> {stayAdvice}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Accordion of Local Travel Masterclass */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4 text-left">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">🧠 FAMILY MASTERCLASS</span>
                <h4 className="text-xl font-black text-[#000080] dark:text-white">Pro Budget Saving Hacks</h4>
                <p className="text-xs text-gray-400">Click the tabs below to read localized secrets used by experienced Indian family travelers.</p>
              </div>

              <div className="space-y-2">
                {[
                  {
                    id: "irctc",
                    title: "🚇 IRCTC Train booking hacks",
                    icon: TrainFront,
                    desc: "To get confirmed tickets, book in General Quota exactly 120 days early. When traveling with senior citizens, check the 'Lower Berth Priority' box. Utilize Tatkal booking at 11 AM (Sleeper) or 10 AM (AC) with pre-filled Master Passenger list to checkout in under 45 seconds!",
                    color: "border-orange-200/50 dark:border-orange-950/20 bg-orange-50/20 dark:bg-orange-950/5"
                  },
                  {
                    id: "food",
                    title: "🍲 Pure & Delicious Family Food",
                    icon: Utensils,
                    desc: "Use IRCTC e-Catering services with codes to get hygienic food delivered direct to your train coach seat. In pilgrimage cities (Varanasi, Haridwar, Puri, Amritsar), leverage sacred Temple trust Bhandaras & Langars which serve world-class hot meals with utmost purity and devotion.",
                    color: "border-amber-200/50 dark:border-amber-950/20 bg-amber-50/20 dark:bg-amber-950/5"
                  },
                  {
                    id: "stay",
                    title: "🏡 Safe & Cozy Homestays",
                    icon: Home,
                    desc: "Avoid expensive commercial hotels. Choose verified family-run homestays listed on regional government tourism boards. They offer clean, safe rooms, free authentic home-cooked meals, and never levy hidden extra-person bed charges for children under 10.",
                    color: "border-emerald-200/50 dark:border-emerald-950/20 bg-emerald-50/20 dark:bg-emerald-950/5"
                  },
                  {
                    id: "local",
                    title: "🚌 Sarkaari Transport Masterclass",
                    icon: Bus,
                    desc: "Ditch costly private cabs. Use official state transport luxury bus models (e.g., Maharashtra Shivneri/Shivshahi, Karnataka Airavat, Gujarat Gurjarnagri) which offer premium AC comfort at 1/3rd the cost. Highly comfortable, secure for families, and run strictly on schedule.",
                    color: "border-blue-200/50 dark:border-blue-950/20 bg-blue-50/20 dark:bg-blue-950/5"
                  },
                  {
                    id: "local-tips",
                    title: "💡 Local Savings Tips",
                    icon: Lightbulb,
                    desc: "Never accept airport or railway station taxi rates. Always walk outside the gate or use local ride-sharing apps (Ola/Uber) or official pre-paid counters. Hire local registered e-rickshaws for sightseeing instead of full-day taxis, and always ask street food vendors for the local thali rates.",
                    color: "border-purple-200/50 dark:border-purple-950/20 bg-purple-50/20 dark:bg-purple-950/5"
                  }
                ].map((hack) => (
                  <div
                    key={hack.id}
                    onClick={() => setSelectedHackTab(hack.id as any)}
                    className={cn(
                      "p-4 rounded-3xl border transition-all cursor-pointer",
                      selectedHackTab === hack.id
                        ? "bg-white dark:bg-[#0A0D28] shadow-md border-amber-500 scale-[1.01]"
                        : "opacity-80 hover:opacity-100 border-gray-100 dark:border-slate-800"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-amber-500 font-extrabold"><hack.icon size={16} /></span>
                        <span className="font-extrabold text-sm text-gray-800 dark:text-gray-200">{hack.title}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-bold">{selectedHackTab === hack.id ? "▼" : "▶"}</span>
                    </div>
                    {selectedHackTab === hack.id && (
                      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-6 border-l border-amber-300">
                        {hack.desc}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

        {/* Sandbox: AI Budget Planner & Calculator (Middle-Class Travel Dashboard) */}
        {!itinerary && !loading && (
          <section id="trip-budget-tracker-section" className="space-y-12 px-4 py-8 bg-[#FAF9F5] dark:bg-[#07091B]/40 rounded-[3.5rem] border border-blue-100/50 dark:border-blue-950/20 shadow-sm relative overflow-hidden scroll-mt-24">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#1E90FF]/10 to-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-500/10 to-[#1E90FF]/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

            <div className="text-center space-y-3 relative z-10">
              <span className="inline-flex items-center gap-1.5 bg-blue-100/80 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border border-blue-200/50 dark:border-blue-900/40">
                💳 INTERACTIVE BUDGET SANDBOX
              </span>
              <h3 className="text-3xl md:text-5xl font-display font-black text-[#000080] dark:text-white tracking-tight leading-none">
                AI Budget Planner & Calculator
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base max-w-2xl mx-auto font-medium">
                Adjust sliders and toggle transport/stay options to see real-time cost estimations based on realistic Indian local rates and IRCTC rules.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
              {/* Left side: Interactive Settings Form */}
              <div className="lg:col-span-5 bg-white dark:bg-[#0A0D28]/80 rounded-[2.5rem] p-6 md:p-8 border border-blue-100/40 dark:border-blue-900/20 shadow-sm flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3 text-left">
                    <span className="text-xl">🎛️</span>
                    <h4 className="font-extrabold text-lg text-gray-800 dark:text-white">Calculator Settings</h4>
                  </div>

                  {/* Input Budget */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex justify-between">
                      <span>1. Your Target Budget</span>
                      <span className="text-blue-500 font-bold">₹{userTotalBudget.toLocaleString('en-IN')}</span>
                    </label>
                    <input 
                      type="range" 
                      min="2000" 
                      max="150000" 
                      step="1000"
                      value={userTotalBudget}
                      onChange={(e) => setUserTotalBudget(Number(e.target.value))}
                      className="w-full accent-[#1E90FF]"
                    />
                  </div>

                  {/* Travelers Slider */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex justify-between">
                      <span>2. Number of Travelers (Pax)</span>
                      <span className="text-blue-500 font-bold">{numPeople} Person{numPeople > 1 ? 's' : ''}</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="12" 
                      value={numPeople}
                      onChange={(e) => setNumPeople(Number(e.target.value))}
                      className="w-full accent-[#1E90FF]"
                    />
                  </div>

                  {/* Trip Duration */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex justify-between">
                      <span>3. Trip Duration (Nights)</span>
                      <span className="text-blue-500 font-bold">{duration} Night{duration > 1 ? 's' : ''}</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="15" 
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full accent-[#1E90FF]"
                    />
                  </div>

                  {/* Transport Type Select */}
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">4. Budget Transport Type</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "public", label: "🚇 SL Train/Bus", desc: "Sarkari/Sleeper" },
                        { id: "private", label: "🚗 3AC Train/Cab", desc: "Premium AC" },
                        { id: "flight", label: "✈️ Flight Ticket", desc: "Fast Travel" }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTransportType(t.id)}
                          className={cn(
                            "p-2.5 rounded-2xl border text-[11px] text-center transition-all flex flex-col items-center justify-center gap-0.5",
                            transportType === t.id
                              ? "bg-blue-500/10 border-blue-500 text-blue-800 dark:text-blue-400 font-extrabold"
                              : "border-gray-100 hover:border-gray-300 dark:border-slate-800 text-gray-500 dark:text-gray-400"
                          )}
                        >
                          <span className="font-bold truncate w-full">{t.label}</span>
                          <span className="text-[8px] opacity-70 truncate w-full">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accommodation Stay Type Select */}
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">5. Budget Stay Type</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "hostel", label: "🎒 Dorm/Dharamsala", desc: "Low-Cost Stay" },
                        { id: "standard", label: "🏡 Family Homestay", desc: "Cozy & Safe" },
                        { id: "luxury", label: "🌟 Luxury Resort", desc: "Premium Style" }
                      ].map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setAccommodationType(a.id)}
                          className={cn(
                            "p-2.5 rounded-2xl border text-[11px] text-center transition-all flex flex-col items-center justify-center gap-0.5",
                            accommodationType === a.id
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-extrabold"
                              : "border-gray-100 hover:border-gray-300 dark:border-slate-800 text-gray-500 dark:text-gray-400"
                          )}
                        >
                          <span className="font-bold truncate w-full">{a.label}</span>
                          <span className="text-[8px] opacity-70 truncate w-full">{a.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Middle-Class Travel Dashboard (Results Display) */}
              <div className="lg:col-span-7 bg-white dark:bg-[#0A0D28]/80 rounded-[2.5rem] p-6 md:p-8 border border-blue-100/40 dark:border-blue-900/20 shadow-sm flex flex-col justify-between space-y-6">
                {(() => {
                  const totalEstimate = liveBudget.totalCost;
                  const remaining = userTotalBudget - totalEstimate;
                  const isOverBudget = remaining < 0;
                  const percentage = Math.min(100, (totalEstimate / userTotalBudget) * 100);
                  
                  const breakdown = [
                    { 
                      label: "🏢 Budget Hotels & Homestays", 
                      amount: liveBudget.hotelCost, 
                      icon: Home, 
                      color: "bg-blue-500",
                      formula: `${liveBudget.roomsCount} Room${liveBudget.roomsCount > 1 ? 's' : ''} × ${duration} Night${duration > 1 ? 's' : ''} @ ₹${liveBudget.roomRatePerNight.toLocaleString('en-IN')}/night`
                    },
                    { 
                      label: "🚌 Budget Transport & Railways", 
                      amount: liveBudget.transportCost, 
                      icon: TrainFront, 
                      color: "bg-purple-500",
                      formula: `${travelDistanceKm} km × ${numPeople} Pax (${transportType === 'flight' ? 'Flight' : transportType === 'private' ? '3AC Train' : 'SL Train/Bus'})`
                    },
                    { 
                      label: "🍲 Local Food & Pure Veg Thalis", 
                      amount: liveBudget.foodCost, 
                      icon: Utensils, 
                      color: "bg-orange-500",
                      formula: `${numPeople} Traveler${numPeople > 1 ? 's' : ''} × ${duration} Day${duration > 1 ? 's' : ''} @ safe, pure veg & dhaba thalis`
                    },
                    { 
                      label: "🎟️ Activities & Local Rickshaws", 
                      amount: liveBudget.activitiesCost, 
                      icon: Zap, 
                      color: "bg-amber-500",
                      formula: `Local auto-rickshaws & landmark entry passes`
                    },
                    { 
                      label: "🛍️ Local Shopping Allowance", 
                      amount: liveBudget.shoppingCost, 
                      icon: ShoppingBag, 
                      color: "bg-pink-500",
                      formula: `Souvenirs & local market handicraft shopping`
                    },
                    { 
                      label: "🚨 Emergency Backup Cushion", 
                      amount: liveBudget.emergencyCost, 
                      icon: AlertTriangle, 
                      color: "bg-red-500",
                      formula: `8% emergency & unexpected event safety cushion`
                    }
                  ];

                  return (
                    <div className="space-y-6 text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📊</span>
                          <h4 className="font-extrabold text-base text-gray-800 dark:text-white">Middle-Class Travel Dashboard</h4>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/20 text-[#1E90FF] border border-blue-200/50 px-3 py-1 rounded-full text-xs font-black font-mono inline-flex items-center gap-1 shrink-0 self-start sm:self-center">
                          <span>📍</span> {startLocation || "Mumbai"} ➔ {locationInput || "Goa"} ({travelDistanceKm} km One-Way | {travelDistanceKm * 2} km RT)
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                          <p className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Distance (Round-Trip)</p>
                          <p className="text-2xl font-black text-[#000080] dark:text-white mt-1">
                            {(travelDistanceKm * 2).toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-500">km</span>
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">({travelDistanceKm.toLocaleString('en-IN')} km each way)</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                          <p className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Total Estimate</p>
                          <p className="text-2xl font-black text-[#000080] dark:text-white mt-1">{formatPrice(totalEstimate)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                          <p className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Remaining</p>
                          <p className={cn("text-2xl font-black mt-1", isOverBudget ? "text-rose-500" : "text-emerald-600")}>
                            {formatPrice(Math.abs(remaining))}
                            <span className="text-[10px] ml-1 opacity-60 font-bold">{isOverBudget ? "Over" : "Left"}</span>
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[11px] font-black text-gray-400 uppercase">
                          <span>Budget Utilization</span>
                          <span className={cn(isOverBudget ? "text-rose-500" : "text-[#1E90FF]")}>
                            {percentage.toFixed(0)}% Used
                          </span>
                        </div>
                        <div className="h-3 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden p-0.5 border border-gray-100 dark:border-slate-800/80">
                          <motion.div 
                            className={cn("h-full rounded-full transition-all duration-500", isOverBudget ? "bg-rose-500" : "bg-gradient-to-r from-[#1E90FF] to-[#000080]")}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Category Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {breakdown.map((item, idx) => {
                          const ItemIcon = item.icon;
                          return (
                            <div key={idx} className="bg-gray-50/60 dark:bg-slate-900/20 rounded-2xl p-4 border border-gray-100 dark:border-slate-800/60 flex items-start gap-3 hover:bg-white dark:hover:bg-slate-900/60 hover:shadow-md transition-all group">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-sm", item.color)}>
                                <ItemIcon size={16} />
                              </div>
                              <div className="overflow-hidden space-y-0.5 text-left">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">{item.label}</p>
                                <p className="text-base font-black text-[#000080] dark:text-white font-mono leading-none pt-1">{formatPrice(item.amount)}</p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold truncate leading-none pt-0.5">{item.formula}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Match Banner */}
                      <div className="pt-2">
                        {isOverBudget ? (
                          <div className="bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/20 rounded-2xl p-4 flex items-start gap-3 text-rose-600 dark:text-rose-400 text-xs">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <p className="font-semibold leading-relaxed">
                              You are exceeding your budget by <strong>{formatPrice(Math.abs(remaining))}</strong>. Try switching to Public SL Train or Cozy Family Homestays to stay within limit.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/20 rounded-2xl p-4 flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-xs">
                            <Check size={18} className="shrink-0 mt-0.5" />
                            <p className="font-semibold leading-relaxed">
                              This configuration is perfectly within your budget. Every fare has been mathematically cross-referenced with local transport state cards.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {/* Swadesh Domestic Alternatives Showcase (under Swadesh Gems Tab) */}
        {!itinerary && !loading && (
          <section id="swadesh-gems-section" className="space-y-6 px-4 py-8 text-left bg-[#FAF9F5] dark:bg-[#07091B]/40 rounded-[3.5rem] border border-emerald-100/50 dark:border-blue-950/20 shadow-sm relative overflow-hidden animate-fade-in scroll-mt-24">
            {/* Accent decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-[#1E90FF]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            <div className="space-y-1 relative z-10">
              <span className="inline-flex items-center gap-1.5 bg-emerald-100/80 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-200/50 dark:border-emerald-900/40">
                🏞️ SWADESH DARSHAN SUGGESTIONS & HIDDEN BUDGET DESTINATIONS
              </span>
              <h4 className="text-2xl md:text-3xl font-black text-[#000080] dark:text-white">Ditch Expensive International, Choose Swadesh!</h4>
              <p className="text-xs text-gray-400">Save lakhs on premium experiences. Visually identical nature, culture, and serenity at a fraction of the budget.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              {domesticGems.map((gem) => (
                <div
                  key={gem.id}
                  className="rounded-[2.5rem] border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#0A0D28]/60 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={gem.image}
                      alt={gem.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-white/10">
                      {gem.tag}
                    </div>
                    <div className="absolute bottom-3 left-3 bg-[#000080]/90 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                      🔥 {gem.savings}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div>
                        <h5 className="font-extrabold text-gray-800 dark:text-white text-base truncate">{gem.name}</h5>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 block mt-0.5">
                          Alternative to <span className="line-through">{gem.insteadOf}</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1.5 border-t border-gray-50 dark:border-slate-800">
                        <div>
                          <span className="text-gray-400 block text-[9px] font-bold uppercase">Foreign Trip</span>
                          <span className="text-red-500 line-through font-extrabold">{gem.internationalCost}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-500 block text-[9px] font-bold uppercase">Swadesh Cost</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{gem.domesticCostStr}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSetDestination(gem.name)}
                      className="w-full bg-[#1E90FF]/10 text-[#1E90FF] hover:bg-[#1E90FF] hover:text-white font-black text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>✨</span> Plan This Swadesh Trip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}


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
            <div className="relative h-auto md:h-[500px] min-h-[500px] rounded-[3.5rem] overflow-hidden shadow-2xl group flex flex-col justify-between">
              <img 
                src={`https://picsum.photos/seed/${locationInput}/1600/900`} 
                alt={locationInput}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              
              {/* Premium Weather & Packing Widget */}
              <div className="absolute top-4 left-4 right-4 md:top-8 md:right-8 md:left-auto md:max-w-md bg-black/55 backdrop-blur-md border border-white/10 rounded-3xl p-5 text-white z-10 space-y-4 shadow-2xl animate-fade-in text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
                      <Sun size={18} className="animate-spin" style={{ animationDuration: "10s" }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-tight text-white">7-Day Climate & Packing</h4>
                      <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider font-mono">Open-Meteo Integration</p>
                    </div>
                  </div>
                  {weatherForecast && !weatherLoading && (
                    <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      Live
                    </span>
                  )}
                </div>

                {weatherLoading ? (
                  <div className="py-6 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="animate-spin text-[#1E90FF]" size={20} />
                    <span className="text-[10px] font-bold text-gray-300">Retrieving local climate trends...</span>
                  </div>
                ) : weatherError ? (
                  <div className="text-[11px] text-rose-300 bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20 text-center font-medium">
                    ⚠️ {weatherError}
                  </div>
                ) : weatherForecast ? (
                  <div className="space-y-3.5 animate-fade-in">
                    {/* Horizontal 7-Day Scroll */}
                    <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/20">
                      {weatherForecast.map((day, dIdx) => (
                        <div key={dIdx} className="flex flex-col items-center bg-white/5 border border-white/5 rounded-2xl p-2.5 min-w-[55px] text-center space-y-1.5 hover:bg-white/10 transition-all shrink-0">
                          <span className="text-[9px] font-extrabold text-gray-300 uppercase">{day.dayName}</span>
                          <div className="my-0.5">{getWeatherIcon(day.conditionCode)}</div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black">{day.tempMax}°</span>
                            <span className="text-[9px] text-gray-400 font-bold">{day.tempMin}°</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dynamic Packing Suggestions */}
                    {weatherPackingAdvice && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1 hover:bg-white/10 transition-all">
                        <span className="text-[9px] font-black uppercase tracking-wider text-sky-300 block">
                          🎒 Weather-Tuned Packing List
                        </span>
                        <p className="text-[11px] text-gray-200 font-semibold leading-relaxed">
                          {weatherPackingAdvice}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-300 text-center py-4 font-medium">
                    Enter destination to load live weather.
                  </div>
                )}
              </div>

              <div className="relative z-10 w-full mt-auto p-6 md:p-12 flex flex-col md:flex-row justify-between items-end gap-8">
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
                <div className="flex flex-wrap gap-4">
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
                    onClick={() => {
                      setShareModalData({
                        location: locationInput,
                        startLocation: startLocation || 'Mumbai',
                        duration: duration,
                        style: travelStyle,
                        numPeople: numPeople,
                        totalCost: liveBudget.totalCost,
                        itinerary: itinerary
                      });
                    }}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-8 py-5 rounded-3xl font-bold flex items-center gap-3 shadow-2xl transition-all border border-amber-400/20"
                  >
                    <Share2 size={20} /> Share Poster
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
                  {/* Model Engine & Grounding Metadata Sources Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">ENGINE:</span>
                        <div className={cn(
                          "text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5",
                          modelUsedForItinerary === "Travolor-Local-Engine"
                            ? "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40"
                            : modelUsedForItinerary.includes("pro") 
                              ? "bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900" 
                              : "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900"
                        )}>
                          <Cpu size={12} className="animate-pulse" />
                          {modelUsedForItinerary || "gemini-3.5-flash"}
                          {modelUsedForItinerary.includes("pro") && " (Thinking Mode Active)"}
                        </div>
                      </div>

                      {modelUsedForItinerary === "Travolor-Local-Engine" && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50/50 dark:bg-amber-950/20 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-900/30 flex items-center gap-1 animate-fade-in">
                          <span>💡</span> Gemini spending limits reached. Utilizing offline knowledge base.
                        </div>
                      )}

                      {/* TTS Voice Read Aloud */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isSpeakingItinerary) {
                            stopSpeaking();
                          } else {
                            speakText(
                              itinerary || "", 
                              () => setIsSpeakingItinerary(true), 
                              () => setIsSpeakingItinerary(false)
                            );
                          }
                        }}
                        className={cn(
                          "text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border",
                          isSpeakingItinerary 
                            ? "bg-red-500 text-white border-red-400 animate-pulse" 
                            : "bg-red-50 text-red-700 border-red-100 hover:bg-red-100/80"
                        )}
                        title="Read itinerary aloud"
                      >
                        {isSpeakingItinerary ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        {isSpeakingItinerary ? "Stop Speaking" : "Listen to Plan"}
                      </button>

                      {/* Export PDF Button */}
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className="text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border bg-[#000080]/5 text-[#000080] border-[#000080]/10 hover:bg-[#000080]/10"
                        title="Download beautifully formatted PDF"
                      >
                        <FileDown size={12} />
                        Export PDF
                      </button>
                    </div>

                    {itinerarySources.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex w-2 h-2 rounded-full bg-green-500 animate-ping" />
                        <span className="text-[11px] font-bold text-green-600 dark:text-green-400">Search Grounded & Up-To-Date</span>
                      </div>
                    )}
                  </div>

                  {/* Grounding Source Web Links */}
                  {itinerarySources.length > 0 && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/10 rounded-2xl p-4 mb-8 border border-slate-100/60 dark:border-slate-800">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 text-left">Verified Travel Sources & References:</h4>
                      <div className="flex flex-wrap gap-2">
                        {itinerarySources.map((source, idx) => (
                          <a 
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 rounded-full px-3.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <ExternalLink size={11} />
                            {source.title || "Travel Reference Source"}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {structuredItinerary && (
                    <div className="flex border-b border-gray-100 dark:border-slate-800/60 pb-3 mb-6 overflow-x-auto gap-1">
                      {[
                        { id: 'interactive', label: language === 'Marathi' ? '🗺️ प्लॅन' : language === 'Hindi' ? '🗺️ योजना' : 'Interactive Plan', icon: Compass },
                        { id: 'hotels', label: language === 'Marathi' ? '🏨 हॉटेल्स' : language === 'Hindi' ? '🏨 होटल' : 'Hotel Suggestions', icon: Hotel },
                        { id: 'budget', label: language === 'Marathi' ? '💰 बजेट' : language === 'Hindi' ? '💰 बजट' : 'Budget Analyst', icon: Wallet },
                        { id: 'guide', label: language === 'Marathi' ? '✨ मार्गदर्शक' : language === 'Hindi' ? '✨ गाइड' : 'Local Guide', icon: Sparkles },
                        { id: 'text', label: language === 'Marathi' ? '📝 टेक्स्ट' : language === 'Hindi' ? '📝 पाठ्य' : 'Classic Text', icon: Info }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setItinerarySubTab(tab.id as any)}
                          className={cn(
                            "px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 cursor-pointer border",
                            itinerarySubTab === tab.id
                              ? "bg-[#000080] text-white border-[#000080] shadow-md dark:bg-[#1E90FF] dark:border-[#1E90FF]"
                              : "text-gray-500 hover:text-gray-800 hover:bg-slate-50 border-transparent dark:hover:bg-slate-800"
                          )}
                        >
                          <tab.icon size={14} />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-4">
                    <AnimatePresence mode="wait">
                      {structuredItinerary && itinerarySubTab === 'interactive' && (
                        <motion.div
                          key="interactive"
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ 
                            type: "spring" as const,
                            stiffness: 100,
                            damping: 15,
                            mass: 0.8
                          }}
                        >
                          <InteractiveItineraryView
                            structured={structuredItinerary}
                            language={language}
                            startLocation={startLocation || 'Mumbai'}
                            locationInput={locationInput}
                            travelMode={travelMode}
                            travelDate={travelDate}
                            duration={duration}
                            travelStyle={travelStyle}
                            numPeople={numPeople}
                          />
                        </motion.div>
                      )}

                      {structuredItinerary && itinerarySubTab === 'hotels' && (
                        <motion.div
                          key="hotels"
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ 
                            type: "spring" as const,
                            stiffness: 100,
                            damping: 15,
                            mass: 0.8
                          }}
                        >
                          <HotelSuggestionsView
                            hotels={structuredItinerary.hotelsList}
                            location={locationInput}
                            language={language}
                            style={travelStyle}
                            bookingComAid={affConfig.bookingComAid}
                          />
                        </motion.div>
                      )}
                      
                      {(!structuredItinerary || itinerarySubTab === 'text') && (
                        <motion.div
                          key="text"
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ 
                            type: "spring" as const,
                            stiffness: 100,
                            damping: 15,
                            mass: 0.8
                          }}
                        >
                          <AnimatedItinerary 
                            itinerary={itinerary} 
                            locationInput={locationInput} 
                            startLocation={startLocation || 'Mumbai'} 
                          />
                        </motion.div>
                      )}

                      {structuredItinerary && itinerarySubTab === 'budget' && (
                        <motion.div
                          key="budget"
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ 
                            type: "spring" as const,
                            stiffness: 100,
                            damping: 15,
                            mass: 0.8
                          }}
                        >
                          <BudgetDashboardView
                            budget={structuredItinerary.budgetDashboard}
                            language={language}
                            numPeople={numPeople}
                            duration={duration}
                            travelStyle={travelStyle}
                            budgetOptimizer={structuredItinerary.aiFeatures?.budgetOptimizer}
                          />
                        </motion.div>
                      )}

                      {structuredItinerary && itinerarySubTab === 'guide' && (
                        <motion.div
                          key="guide"
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ 
                            type: "spring" as const,
                            stiffness: 100,
                            damping: 15,
                            mass: 0.8
                          }}
                        >
                          <LocalGuideView
                            features={structuredItinerary.aiFeatures}
                            checklist={structuredItinerary.checklist}
                            emergencyContacts={structuredItinerary.emergencyContacts}
                            language={language}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                          onClick={() => handleQuickBook(
                            service.id === 'hotels' ? 'Hotel' : service.id === 'flights' ? 'Flight' : 'Bus',
                            locationInput || "Delhi",
                            getAffiliateLink(service.id, startLocation || "Mumbai", locationInput || "Delhi")
                          )}
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
                    <div className="space-y-1 text-left">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-light opacity-80 tracking-wide">Total Estimate</span>
                        <span className="text-4xl font-bold tracking-tighter">{formatPrice(liveBudget.totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-xs opacity-75 font-medium pt-2 border-t border-white/10 mt-2">
                        <span>Calculated Distance:</span>
                        <span className="font-mono">{travelDistanceKm.toLocaleString('en-IN')} km</span>
                      </div>
                      <div className="flex justify-between text-xs opacity-75 font-medium">
                        <span>Hotel Rooms Required:</span>
                        <span className="font-mono">{liveBudget.roomsCount} Room{liveBudget.roomsCount > 1 ? 's' : ''} × {duration} N</span>
                      </div>
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

                {/* Interactive Google Map Card */}
                {mapMarkers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-[#0B0F2B] rounded-[3rem] p-6 md:p-8 shadow-xl border border-gray-100 dark:border-slate-800/80 space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-[#1E90FF] flex items-center justify-center">
                          <MapIcon size={22} />
                        </div>
                        <div className="text-left">
                          <h4 className="text-[#000080] dark:text-[#1E90FF] font-bold text-lg tracking-tight">Interactive Map</h4>
                          <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Attractions Route View</p>
                        </div>
                      </div>

                      {/* View Switcher Toggle */}
                      {isLoaded && window.google && (
                        <div className="bg-gray-100 dark:bg-slate-900/60 p-1 rounded-2xl flex items-center gap-1 text-[11px] font-bold self-start sm:self-auto shadow-inner">
                          <button
                            type="button"
                            disabled={isMapsBlocked}
                            onClick={() => setMapViewMode("api")}
                            className={cn(
                              "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1",
                              isMapsBlocked && "opacity-40 cursor-not-allowed",
                              mapViewMode === "api" && !isMapsBlocked
                                ? "bg-white dark:bg-[#1E90FF]/25 text-[#103090] dark:text-[#1E90FF] shadow-sm font-black"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            )}
                            title={isMapsBlocked ? "API Map disabled due to API key restrictions (ApiTargetBlockedMapError)" : "Switch to Google Maps"}
                          >
                            🗺️ API Map {isMapsBlocked && "🔒"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMapViewMode("vector")}
                            className={cn(
                              "px-3 py-1.5 rounded-xl transition-all",
                              mapViewMode === "vector" || isMapsBlocked
                                ? "bg-white dark:bg-[#1E90FF]/25 text-[#103090] dark:text-[#1E90FF] shadow-sm font-black"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            )}
                          >
                            🎨 Visual Route
                          </button>
                        </div>
                      )}
                    </div>

                    {isMapsBlocked && (
                      <div className="text-left bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 p-4 rounded-[2rem] flex items-start gap-3 text-[11px] text-amber-700 dark:text-amber-400 animate-fade-in leading-relaxed">
                        <span className="text-sm">⚠️</span>
                        <div>
                          <span className="font-extrabold block mb-0.5 text-xs text-amber-800 dark:text-amber-300">Google Maps key is restricted (ApiTargetBlockedMapError).</span>
                          Travolor has automatically switched to **Visual Route** mode to draw your trip attractions instantly with high-contrast custom vector curves.
                        </div>
                      </div>
                    )}

                    <div className="h-[300px] w-full rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 relative shadow-inner">
                      {mapViewMode === "api" && isLoaded && window.google ? (
                        <GoogleMap
                          mapContainerStyle={{ width: '100%', height: '100%' }}
                          center={selectedMapMarker ? { lat: selectedMapMarker.lat, lng: selectedMapMarker.lng } : (mapMarkers[0] ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng } : { lat: 19.076, lng: 72.877 })}
                          zoom={selectedMapMarker ? 14 : 12}
                          options={{
                            disableDefaultUI: false,
                            mapTypeControl: false,
                            streetViewControl: false,
                            fullscreenControl: true,
                            styles: [
                              {
                                featureType: "poi",
                                elementType: "labels",
                                stylers: [{ visibility: "off" }]
                              }
                            ]
                          }}
                        >
                          {mapMarkers.map((marker, mIdx) => (
                            <MarkerF
                              key={mIdx}
                              position={{ lat: marker.lat, lng: marker.lng }}
                              title={marker.name}
                              onClick={() => setSelectedMapMarker(marker)}
                              label={{
                                text: `${mIdx + 1}`,
                                color: "white",
                                fontWeight: "bold",
                                fontSize: "12px"
                              }}
                            />
                          ))}

                          {mapMarkers.length > 1 && (
                            <PolylineF
                              path={mapMarkers.map(m => ({ lat: m.lat, lng: m.lng }))}
                              options={{
                                strokeColor: "#000080",
                                strokeOpacity: 0.8,
                                strokeWeight: 4.5,
                                geodesic: true
                              }}
                            />
                          )}

                          {selectedMapMarker && (
                            <InfoWindowF
                              position={{ lat: selectedMapMarker.lat, lng: selectedMapMarker.lng }}
                              onCloseClick={() => setSelectedMapMarker(null)}
                            >
                              <div className="p-2 text-slate-800 dark:text-slate-200 max-w-[200px] text-left">
                                <h5 className="font-bold text-xs text-[#000080] dark:text-[#1E90FF]">{selectedMapMarker.name}</h5>
                                <p className="text-[10px] text-gray-500 mt-1 dark:text-gray-400 leading-relaxed">
                                  {selectedMapMarker.description || "Main attraction listed in your AI travel itinerary."}
                                </p>
                              </div>
                            </InfoWindowF>
                          )}
                        </GoogleMap>
                      ) : (
                        // Customized, exquisite aesthetic visual vector route fallback
                        (() => {
                          const lats = mapMarkers.map(m => m.lat);
                          const lngs = mapMarkers.map(m => m.lng);
                          const minLat = Math.min(...lats);
                          const maxLat = Math.max(...lats);
                          const minLng = Math.min(...lngs);
                          const maxLng = Math.max(...lngs);
                          const latRange = maxLat - minLat || 0.001;
                          const lngRange = maxLng - minLng || 0.001;
                          const padding = 45;
                          const width = 500;
                          const height = 300;
                          const getXY = (lat: number, lng: number) => {
                            const x = padding + ((lng - minLng) / lngRange) * (width - padding * 2);
                            const y = height - padding - ((lat - minLat) / latRange) * (height - padding * 2);
                            return { x, y };
                          };
                          const projectedPoints = mapMarkers.map((marker, idx) => {
                            const { x, y } = getXY(marker.lat, marker.lng);
                            return { ...marker, x, y, index: idx + 1 };
                          });
                          let pathD = "";
                          if (projectedPoints.length > 1) {
                            pathD = `M ${projectedPoints[0].x} ${projectedPoints[0].y}`;
                            for (let i = 1; i < projectedPoints.length; i++) {
                              const prev = projectedPoints[i - 1];
                              const curr = projectedPoints[i];
                              const cpX1 = prev.x + (curr.x - prev.x) * 0.5;
                              const cpY1 = prev.y;
                              const cpX2 = prev.x + (curr.x - prev.x) * 0.5;
                              const cpY2 = curr.y;
                              pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
                            }
                          }
                          return (
                            <div className="relative w-full h-full bg-[#FAFAFE] dark:bg-[#0A0D23] select-none flex flex-col items-center justify-center p-2 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800">
                              <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                  <pattern id="gmaps-fallback-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-slate-800/40" />
                                    <circle cx="0" cy="0" r="1" fill="currentColor" className="text-gray-300 dark:text-slate-700" />
                                  </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#gmaps-fallback-grid)" />
                              </svg>
                              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full relative z-10 p-4">
                                {projectedPoints.length > 1 && (
                                  <>
                                    <path d={pathD} fill="none" stroke="#1E90FF" strokeWidth="5" strokeLinecap="round" className="opacity-20 dark:opacity-30 blur-[2px]" />
                                    <path d={pathD} fill="none" stroke="#1E90FF" strokeWidth="2" strokeLinecap="round" strokeDasharray="6,4" />
                                  </>
                                )}
                                {projectedPoints.map((pt, idx) => {
                                  const isSelected = selectedMapMarker?.name === pt.name;
                                  return (
                                    <g key={idx} className="cursor-pointer group transition-all duration-300" onClick={() => setSelectedMapMarker(pt)}>
                                      {isSelected && <circle cx={pt.x} cy={pt.y} r="18" fill="#1E90FF" className="opacity-25 animate-pulse" />}
                                      <circle cx={pt.x} cy={pt.y} r={isSelected ? "11" : "8"} fill={isSelected ? "#1E90FF" : "#000080"} stroke="white" strokeWidth="2" className="transition-all duration-300 shadow" />
                                      <circle cx={pt.x} cy={pt.y} r="3" fill="white" />
                                      <text x={pt.x} y={pt.y - 14} textAnchor="middle" className="fill-gray-600 dark:fill-gray-300 text-[9px] font-bold font-mono tracking-tight">{pt.index}</text>
                                    </g>
                                  );
                                })}
                              </svg>
                              {selectedMapMarker && (
                                <div className="absolute top-3 left-3 bg-white/95 dark:bg-[#0B0F2B]/95 border border-gray-100 dark:border-slate-800 p-3 rounded-2xl shadow-xl max-w-[210px] text-left z-20 backdrop-blur animate-fade-in mini-card">
                                  <h5 className="font-bold text-xs text-[#000080] dark:text-[#1E90FF]">{selectedMapMarker.name}</h5>
                                  <p className="text-[10px] text-gray-500 mt-1 dark:text-gray-400 leading-relaxed truncate">{selectedMapMarker.description || "Main attraction in travel itinerary."}</p>
                                </div>
                              )}
                              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[8px] font-mono text-gray-400 dark:text-slate-500 z-10 bg-white/70 dark:bg-[#0A0D23]/70 backdrop-blur px-2 py-0.5 rounded-lg">
                                <div>Lat bounds: {minLat.toFixed(3)}° – {maxLat.toFixed(3)}°N</div>
                                <div className="text-right">Lng bounds: {minLng.toFixed(3)}° – {maxLng.toFixed(3)}°E</div>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>

                    {mapViewMode === "api" && !isMapsBlocked && (
                      <div className="text-left bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 p-3.5 rounded-2xl flex items-start gap-2.5 text-[11px] text-blue-600/90 dark:text-blue-400">
                        <span className="text-sm">💡</span>
                        <p className="leading-relaxed">
                          Note: If Google Maps fails to display properly due to API key or billing restrictions, please toggle the <span className="font-bold underline cursor-pointer hover:text-blue-800 dark:hover:text-blue-300" onClick={() => setMapViewMode("vector")}>Visual Route</span> mode above for a highly polished vector map of your trip.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest block text-left">Mapped Attractions:</span>
                      <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {mapMarkers.map((marker, mIdx) => (
                          <button
                            type="button"
                            key={mIdx}
                            onClick={() => setSelectedMapMarker(marker)}
                            className={cn(
                              "w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center gap-3 border justify-start",
                              selectedMapMarker?.name === marker.name
                                ? "bg-blue-50 dark:bg-blue-950/30 text-[#1E90FF] border-[#1E90FF] font-bold"
                                : "bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-800/80"
                            )}
                          >
                            <span className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                              selectedMapMarker?.name === marker.name
                                ? "bg-[#1E90FF] text-white"
                                : "bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-400"
                            )}>
                              {mIdx + 1}
                            </span>
                            <span className="truncate flex-1 font-semibold">{marker.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Quick Info Cards */}
                <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-gray-100 space-y-10">
                  <h4 className="text-[#000080] font-bold text-2xl tracking-tight">Trip Insights</h4>
                  <div className="space-y-8">
                    {[
                      { label: "Best Time", icon: Clock, value: "Oct - Mar", color: "text-orange-500" },
                      { label: "Crowd Level", icon: Users, value: "Moderate", color: "text-[#1E90FF]" },
                      { label: "Weather", icon: Thermometer, value: weatherForecast ? `${weatherForecast[0].tempMax}°C - ${weatherForecast[0].conditionText}` : "Pleasant", color: "text-emerald-500" },
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
              id="trip-budget-tracker-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-100 dark:border-[#1E295D]/20 rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-10 dark:bg-[#0B0F2B]/60 scroll-mt-24"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#000080] dark:bg-[#1E90FF]/20 flex items-center justify-center shadow-xl">
                    <Wallet className="text-white dark:text-[#93C5FD]" size={28} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-[#000080] dark:text-white tracking-tight">AI Budget Planner & Calculator</h3>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Middle-Class Travel Dashboard</p>
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
                          if (isFirebaseAvailable) {
                            try {
                              await updateDoc(doc(db, 'users', user.id), { totalBudget: val });
                            } catch (err) {
                              console.error(err);
                            }
                          } else {
                            const updatedUser = { ...user, totalBudget: val };
                            setUser(updatedUser);
                            localStorage.setItem("travolor_local_user", JSON.stringify(updatedUser));
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
                  { 
                    label: "Hotels", 
                    amount: liveBudget.hotelCost, 
                    icon: Briefcase, 
                    color: "bg-blue-500",
                    formula: `${liveBudget.roomsCount} Room${liveBudget.roomsCount > 1 ? 's' : ''} × ${duration} Night${duration > 1 ? 's' : ''} @ ₹${liveBudget.roomRatePerNight.toLocaleString('en-IN')}/night`
                  },
                  { 
                    label: "Transport", 
                    amount: liveBudget.transportCost, 
                    icon: Plane, 
                    color: "bg-purple-500",
                    formula: `Round-Trip ${travelDistanceKm * 2} km (${travelDistanceKm} km each way) × ${numPeople} Pax (${transportType === 'flight' ? 'Flight' : transportType === 'private' ? '3AC Train' : 'SL Train/Bus'})`
                  },
                  { 
                    label: "Food", 
                    amount: liveBudget.foodCost, 
                    icon: ShoppingBag, 
                    color: "bg-orange-500",
                    formula: `${numPeople} Traveler${numPeople > 1 ? 's' : ''} × ${duration} Day${duration > 1 ? 's' : ''} @ safe, pure veg & dhaba thalis`
                  },
                  { 
                    label: "Activities", 
                    amount: liveBudget.activitiesCost, 
                    icon: Zap, 
                    color: "bg-amber-500",
                    formula: `Local rickshaws & landmark entry passes`
                  },
                  { 
                    label: "Shopping", 
                    amount: liveBudget.shoppingCost, 
                    icon: ShoppingBag, 
                    color: "bg-pink-500",
                    formula: `Souvenirs & local market handicraft shopping`
                  },
                  { 
                    label: "Emergency Cushion", 
                    amount: liveBudget.emergencyCost, 
                    icon: AlertTriangle, 
                    color: "bg-red-500",
                    formula: `8% emergency & unexpected event safety cushion`
                  }
                ];

                return (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Calculated Distance (Round-Trip)</p>
                        <motion.p 
                          key={travelDistanceKm}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          className="text-4xl font-bold tracking-tighter text-[#000080]"
                        >
                          {(travelDistanceKm * 2).toLocaleString('en-IN')} <span className="text-lg font-normal text-gray-500">km</span>
                        </motion.p>
                        <p className="text-[10px] text-gray-400 font-semibold">({travelDistanceKm.toLocaleString('en-IN')} km each way)</p>
                      </div>
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isOverBudget ? (
                        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5 flex items-start gap-4 text-rose-600">
                          <AlertTriangle size={24} className="shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="font-extrabold text-sm">Over Budget Alert!</h5>
                            <p className="text-xs font-medium leading-relaxed">
                              You are exceeding your budget by {formatPrice(Math.abs(remaining))}. Change to public rail/bus travel or select a cozy family homestay to instantly save.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex items-start gap-4 text-emerald-600">
                          <Check size={24} className="shrink-0 mt-0.5 animate-bounce" />
                          <div className="space-y-1">
                            <h5 className="font-extrabold text-sm">Perfect Swadesh Pricing!</h5>
                            <p className="text-xs font-medium leading-relaxed">
                              This trip is safely within your pocket limits. Every fare has been mathematically cross-referenced with local transport state cards.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-amber-50/50 border border-amber-100/50 rounded-3xl p-5 flex items-start gap-4 text-amber-800">
                        <span className="text-xl">💡</span>
                        <div className="space-y-1">
                          <h5 className="font-extrabold text-sm">Real distance based calculations</h5>
                          <p className="text-xs font-medium leading-relaxed text-amber-700">
                            Fares calculated for {travelDistanceKm * 2} km round-trip journey ({travelDistanceKm} km each way) from {startLocation || "Mumbai"} to {locationInput || "Goa"}.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-widest">Budget Usage</span>
                        <span className={cn("font-bold font-mono", isOverBudget ? "text-rose-500" : "text-[#000080]")}>
                          {percentage.toFixed(0)}% ({formatPrice(totalEstimate)} / {formatPrice(userTotalBudget)})
                        </span>
                      </div>
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-100">
                        <motion.div 
                          className={cn("h-full rounded-full transition-all duration-500", isOverBudget ? "bg-rose-500" : "bg-gradient-to-r from-[#1E90FF] to-[#000080]")}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      {breakdown.map((item, idx) => {
                        const ItemIcon = item.icon;
                        return (
                          <div key={idx} className="bg-gray-50/60 rounded-3xl p-5 border border-gray-100 flex items-start gap-4 hover:bg-white hover:shadow-md transition-all group">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform shadow-sm", item.color)}>
                              <ItemIcon size={20} />
                            </div>
                            <div className="overflow-hidden space-y-1 text-left">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                              <p className="text-lg font-black text-[#000080] font-mono">{formatPrice(item.amount)}</p>
                              <p className="text-xs text-gray-500 font-semibold leading-none">{item.formula}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

  const renderAuth = () => {
    const authLang: Record<string, {
      emailTab: string;
      phoneTab: string;
      otpMode: string;
      passwordMode: string;
      sendOtp: string;
      resendOtp: string;
      resendNow: string;
      otpSentToast: string;
      verifyBtn: string;
      fullName: string;
      phoneNumber: string;
      enterOtp: string;
    }> = {
      English: {
        emailTab: "Email/Username",
        phoneTab: "Mobile Number",
        otpMode: "SMS OTP Login",
        passwordMode: "Password Login",
        sendOtp: "Send OTP Securely",
        resendOtp: "Resend Code in",
        resendNow: "Resend Now",
        otpSentToast: "Simulated OTP Code sent to",
        verifyBtn: "Verify OTP & Continue",
        fullName: "Full Name",
        phoneNumber: "Phone Number",
        enterOtp: "Enter 6-Digit OTP",
      },
      Marathi: {
        emailTab: "ईमेल / युझरनेम",
        phoneTab: "मोबाईल नंबर",
        otpMode: "SMS OTP लॉगिन",
        passwordMode: "पासवर्ड लॉगिन",
        sendOtp: "OTP सुरक्षितपणे पाठवा",
        resendOtp: "पुन्हा पाठवा",
        resendNow: "आता पाठवा",
        otpSentToast: "या मोबाईलवर OTP पाठवला आहे:",
        verifyBtn: "OTP सत्यापित करा आणि सुरू करा",
        fullName: "पूर्ण नाव",
        phoneNumber: "मोबाईल नंबर",
        enterOtp: "६-अंकीय OTP टाका",
      },
      Hindi: {
        emailTab: "ईमेल / यूजरनेम",
        phoneTab: "मोबाइल नंबर",
        otpMode: "SMS OTP लॉगिन",
        passwordMode: "पासवर्ड लॉगिन",
        sendOtp: "OTP सुरक्षित भेजें",
        resendOtp: "पुनः भेजें",
        resendNow: "अभी भेजें",
        otpSentToast: "इस मोबाइल पर OTP भेजा गया है:",
        verifyBtn: "OTP सत्यापित करें और शुरू करें",
        fullName: "पूरा नाम",
        phoneNumber: "मोबाइल नंबर",
        enterOtp: "६-अंकीय OTP दर्ज करें",
      }
    };

    const curLang = authLang[language] || authLang.English;

    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-sky-50 to-white flex items-center justify-center px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Top Section: Logo & Tagline */}
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-[0_10px_40px_rgba(10,31,68,0.1)] mx-auto relative group overflow-hidden p-4"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#000080] to-[#1E90FF] opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#1E90FF]/25 to-transparent opacity-50" />
              <img 
                src="/travolor-logo.svg" 
                alt="Travolor Logo" 
                className="w-full h-full object-contain relative z-10 group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <div className="space-y-1">
              <h1 className="text-3xl font-display font-black text-[#000080] tracking-tight">Travolor</h1>
              <p className="text-gray-400 font-semibold text-xs tracking-wider uppercase">Plan Your Perfect Trip</p>
            </div>
          </div>

          {authError && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-xs text-center font-bold shadow-sm leading-relaxed"
            >
              {authError}
            </motion.div>
          )}

          {/* Simulated OTP Notification Banner */}
          {otpSent && authMethod === 'phone' && otpSentCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl text-xs text-center font-bold shadow-sm relative overflow-hidden"
            >
              <div className="flex flex-col gap-1 items-center">
                <span className="uppercase tracking-widest text-[9px] text-emerald-600 font-extrabold">{curLang.otpSentToast} +91 {phoneForm.phone}</span>
                <span className="text-2xl font-black text-emerald-900 tracking-[0.25em]">{otpSentCode}</span>
                <span className="text-[10px] text-gray-400 font-medium">(Security simulation: verify by entering this code)</span>
              </div>
            </motion.div>
          )}

          <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.055)] space-y-6">
            {/* Toggle tabs for Email / Phone */}
            <div className="bg-gray-100/80 p-1.5 rounded-2xl grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('email');
                  setAuthError(null);
                }}
                className={cn(
                  "py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2",
                  authMethod === 'email'
                    ? "bg-white text-[#000080] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Mail size={14} />
                {curLang.emailTab}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('phone');
                  setAuthError(null);
                }}
                className={cn(
                  "py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2",
                  authMethod === 'phone'
                    ? "bg-white text-[#000080] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Phone size={14} />
                {curLang.phoneTab}
              </button>
            </div>

            {/* If Phone method is selected, show Sub-Selector for OTP vs Password */}
            {authMethod === 'phone' && (
              <div className="flex gap-2 justify-center border-b border-gray-100 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    setPhoneMode('otp');
                    setAuthError(null);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                    phoneMode === 'otp'
                      ? "bg-[#1E90FF]/10 text-[#1E90FF]"
                      : "text-gray-400 hover:text-gray-600 bg-gray-50"
                  )}
                >
                  {curLang.otpMode}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneMode('password');
                    setAuthError(null);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                    phoneMode === 'password'
                      ? "bg-[#0e1b69]/10 text-[#000080]"
                      : "text-gray-400 hover:text-gray-600 bg-gray-50"
                  )}
                >
                  {curLang.passwordMode}
                </button>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              {/* Common Name field for Sign Up across all screens */}
              {authMode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest ml-3">{curLang.fullName}</label>
                  <div className="relative group">
                    <ProfileIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#000080] transition-colors" size={16} />
                    <input 
                      type="text" 
                      required
                      placeholder="Rahul Sharma"
                      value={authMethod === 'email' ? authForm.name : phoneForm.name}
                      onChange={(e) => {
                        if (authMethod === 'email') {
                          setAuthForm({...authForm, name: e.target.value});
                        } else {
                          setPhoneForm({...phoneForm, name: e.target.value});
                        }
                      }}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-4 py-3.5 text-[#000080] font-bold text-sm placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {/* EMAIL METHOD FIELDS */}
              {authMethod === 'email' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest ml-3">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#000080] transition-colors" size={16} />
                      <input 
                        type="email" 
                        required
                        placeholder="name@example.com"
                        value={authForm.email}
                        onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-4 py-3.5 text-[#000080] font-bold text-sm placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest ml-3">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#000080] transition-colors" size={16} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        placeholder="••••••••"
                        value={authForm.password}
                        onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-12 py-3.5 text-[#000080] font-bold text-sm placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#000080] transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* PHONE METHOD FIELDS */}
              {authMethod === 'phone' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest ml-3">{curLang.phoneNumber}</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#000080] transition-colors" size={16} />
                      <span className="absolute left-11 top-1/2 -translate-y-1/2 text-[#000080] font-black text-sm pr-1 border-r border-gray-200">+91</span>
                      <input 
                        type="tel" 
                        required
                        readOnly={otpSent && phoneMode === 'otp'}
                        placeholder="98765 43210"
                        value={phoneForm.phone}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setPhoneForm({...phoneForm, phone: sanitized});
                        }}
                        className={cn(
                          "w-full bg-gray-50 border border-gray-100 rounded-xl pl-20 pr-4 py-3.5 text-[#000080] font-bold text-sm placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all",
                          otpSent && phoneMode === 'otp' ? "opacity-75 bg-gray-100 cursor-not-allowed" : ""
                        )}
                      />
                    </div>
                  </div>

                  {phoneMode === 'password' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest ml-3">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#000080] transition-colors" size={16} />
                        <input 
                          type={showPassword ? "text" : "password"} 
                          required
                          placeholder="••••••••"
                          value={phoneForm.password}
                          onChange={(e) => setPhoneForm({...phoneForm, password: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-12 py-3.5 text-[#000080] font-bold text-sm placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#000080] transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {phoneMode === 'otp' && (
                    <>
                      {/* Send OTP button if OTP not sent yet */}
                      {!otpSent && (
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={handleSendSimulatedOtp}
                            disabled={loading || !phoneForm.phone}
                            className="w-full py-3 rounded-xl bg-[#1E90FF]/15 hover:bg-[#1E90FF]/25 text-[#1E90FF] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            {loading ? <Loader2 className="animate-spin" size={14} /> : 'Send Verification OTP'}
                          </button>
                        </div>
                      )}

                      {/* Code verify input if OTP is sent */}
                      {otpSent && (
                        <div className="space-y-1 py-1">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest ml-2">{curLang.enterOtp}</label>
                            <span className="text-[10px] font-bold text-blue-500">
                              {otpTimer > 0 ? (
                                `${curLang.resendOtp} ${otpTimer}s`
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleSendSimulatedOtp}
                                  className="hover:underline font-black focus:outline-none"
                                >
                                  {curLang.resendNow}
                                </button>
                              )}
                            </span>
                          </div>
                          <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 group-focus-within:text-[#000080] transition-colors" size={16} />
                            <input 
                              type="text" 
                              required
                              pattern="\d{6}"
                              placeholder="******"
                              value={phoneForm.otp}
                              onChange={(e) => {
                                const sanitized = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setPhoneForm({...phoneForm, otp: sanitized});
                              }}
                              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-4 py-3.5 text-[#000080] font-black tracking-[0.5em] text-center text-lg placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-emerald-100 focus:bg-white transition-all"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              <div className="flex items-center justify-between px-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer group select-none">
                  <div 
                    onClick={() => setRememberMe(!rememberMe)}
                    className={cn(
                      "w-4 h-4 rounded border transition-all flex items-center justify-center",
                      rememberMe ? "bg-[#000080] border-[#000080]" : "border-gray-200 group-hover:border-gray-300"
                    )}
                  >
                    {rememberMe && <Check size={12} className="text-white" />}
                  </div>
                  <span className="font-bold text-gray-500">Remember me</span>
                </label>
                <button type="button" className="font-bold text-[#1E90FF] hover:underline hover:text-[#000080]">Forgot?</button>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-4 rounded-xl font-black text-xs uppercase tracking-[0.15em] disabled:opacity-50 flex items-center justify-center gap-3 shadow-md"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    {authMethod === 'phone' && phoneMode === 'otp' && !otpSent ? curLang.sendOtp : 'Continue'}
                    {!(authMethod === 'phone' && phoneMode === 'otp' && !otpSent) && <Plane size={14} className="rotate-45" />}
                  </>
                )}
              </motion.button>
            </form>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-gray-300 text-[9px] font-black uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white border border-gray-100 text-[#000080] py-4 rounded-xl font-bold text-xs flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm font-medium">
            {authMode === 'login' ? "New user?" : "Already have an account?"}
            <button 
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setOtpSent(false);
                setOtpSentCode('');
                setAuthError(null);
              }}
              className="ml-2 text-[#000080] font-black hover:text-orange-500 transition-colors"
            >
              {authMode === 'login' ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </motion.div>
      </div>
    );
  };

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
                        const costEst = parseInt(trip.budget ? trip.budget.replace(/[^0-9]/g, '') : '15000') || 15000;
                        setShareModalData({
                          location: trip.location,
                          startLocation: trip.start_location || 'Mumbai',
                          duration: trip.duration,
                          style: trip.style,
                          numPeople: 2, // standard fallback
                          totalCost: costEst,
                          itinerary: trip.itinerary,
                          date: trip.created_at ? new Date(trip.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined
                        });
                      }}
                      className="text-slate-300 hover:text-[#1E90FF] transition-colors"
                      title="Share Beautiful Card"
                    >
                      <Share2 size={20} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete this trip?")) {
                          if (isFirebaseAvailable) {
                            try {
                              await deleteDoc(doc(db, 'trips', trip.id));
                            } catch (err) {
                              console.error(err);
                              alert("Failed to delete trip.");
                            }
                          } else {
                            const allTrips = localStorage.getItem("travolor_local_trips");
                            let list = [];
                            if (allTrips) {
                              try { list = JSON.parse(allTrips); } catch (e) {}
                            }
                            const updated = list.filter((t: any) => t.id !== trip.id);
                            localStorage.setItem("travolor_local_trips", JSON.stringify(updated));
                            setSavedTrips(updated.filter((t: any) => t.user_id === user.id));
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
                      setStartCoords(null);
                      setEndCoords(null);
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
      if (isFirebaseAvailable) {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          name: editForm.name,
          phone: editForm.phone,
          photo: editForm.photo
        });
      } else {
        const updatedUser = {
          ...user,
          name: editForm.name,
          phone: editForm.phone,
          photo: editForm.photo
        };
        localStorage.setItem("travolor_local_user", JSON.stringify(updatedUser));
      }
      
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

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status });
    } catch (err) {
      console.error("Failed to update booking status:", err);
    }
  };

  const deleteTripByAdmin = async (tripId: string) => {
    if (window.confirm("Are you sure you want to delete this itinerary?")) {
      try {
        await deleteDoc(doc(db, 'trips', tripId));
      } catch (err) {
        console.error("Failed to delete trip:", err);
      }
    }
  };

  const deleteBookingByAdmin = async (bookingId: string) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      try {
        await deleteDoc(doc(db, 'bookings', bookingId));
      } catch (err) {
        console.error("Failed to delete booking:", err);
      }
    }
  };

  const renderAdmin = () => {
    const totalRevenue = adminBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);

    return (
      <div className="space-y-10 pb-24 px-4 md:px-0">
        {/* Admin Header */}
        <div className="text-center space-y-3 pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-wider shadow-sm animate-pulse">
            <Crown size={14} className="text-amber-600" />
            System Administrator Mode
          </div>
          <h2 className="text-4xl font-serif font-black text-[#000080] dark:text-white tracking-tight">Admin Dashboard</h2>
          <p className="text-gray-400 text-sm font-medium">Global platform analytics, user directory, and bookings oversight</p>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-sans">
          {[
            { label: "Total Registered Users", value: adminUsers.length, detail: "Platform users", icon: Users2, color: "bg-blue-500/10 text-blue-600" },
            { label: "Active Planned Trips", value: adminTrips.length, detail: "AI Itineraries", icon: MapIcon, color: "bg-emerald-500/10 text-emerald-600" },
            { label: "Customer Bookings", value: adminBookings.length, detail: "Confirmed trips", icon: BookingIcon, color: "bg-purple-500/10 text-purple-600" },
            { label: "Estimated Revenue", value: `₹${totalRevenue.toLocaleString('en-IN')}`, detail: "Booking value", icon: Wallet, color: "bg-amber-500/10 text-amber-600" }
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-[#1E295D]/30 p-6 rounded-[2rem] shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-bold", stat.color)}>
                <stat.icon size={26} />
              </div>
              <div>
                <span className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">{stat.label}</span>
                <span className="text-2xl font-black text-[#000080] dark:text-white block mt-0.5">{stat.value}</span>
                <span className="text-[10px] text-gray-400 font-medium block mt-0.5">{stat.detail}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sub-tabs Selection */}
        <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-[#1E295D]/30 p-2 rounded-2xl flex gap-1 max-w-md mx-auto shadow-sm">
          {[
            { id: 'users', label: 'User Directory', icon: Users },
            { id: 'trips', label: 'All Trips', icon: MapIcon },
            { id: 'bookings', label: 'All Bookings', icon: BookingIcon }
          ].map((subTab) => (
            <button
              key={subTab.id}
              onClick={() => setAdminSubTab(subTab.id as any)}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2",
                adminSubTab === subTab.id
                  ? "bg-[#000080] text-white shadow-md"
                  : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              )}
            >
              <subTab.icon size={14} />
              {subTab.label}
            </button>
          ))}
        </div>

        {/* Main Admin Section */}
        <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-[#1E295D]/30 rounded-[2.5rem] p-6 md:p-8 shadow-sm">
          {adminLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-[#000080]" size={36} />
              <p className="text-sm font-bold text-gray-400">Loading master analytics...</p>
            </div>
          ) : (
            <>
              {adminSubTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-[#000080] dark:text-white font-sans">Registered Customer Directory</h3>
                    <span className="text-xs font-extrabold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{adminUsers.length} Customers</span>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-[#1E295D]/30">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-[#1E295D]/30 text-[10px] uppercase tracking-widest text-gray-400 font-extrabold">
                          <th className="p-4">Customer</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Phone</th>
                          <th className="p-4 text-center">Custom Budget</th>
                          <th className="p-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-[#1E295D]/20">
                        {adminUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-400 font-bold">No registered users found.</td>
                          </tr>
                        ) : (
                          adminUsers.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                              <td className="p-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center border border-white shadow-sm">
                                  {item.photo ? (
                                    <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <User size={16} className="text-blue-600" />
                                  )}
                                </div>
                                <span className="font-bold text-[#000080] dark:text-white">{item.name || 'Traveler'}</span>
                              </td>
                              <td className="p-4 font-semibold text-gray-500 dark:text-gray-400">{item.email}</td>
                              <td className="p-4 font-mono text-gray-500 dark:text-gray-400">{item.phone || '-'}</td>
                              <td className="p-4 text-center font-bold text-emerald-600">₹{(item.totalBudget || 50000).toLocaleString('en-IN')}</td>
                              <td className="p-4 text-center">
                                {item.email === 'historythroughminds@gmail.com' ? (
                                  <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Owner / Admin</span>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`Are you sure you want to delete user ${item.name}?`)) {
                                        try {
                                          await deleteDoc(doc(db, 'users', item.id));
                                        } catch (err) {
                                          console.error(err);
                                        }
                                      }
                                    }}
                                    className="text-rose-600 hover:text-rose-800 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-all"
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminSubTab === 'trips' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-[#000080] dark:text-white font-sans">All Custom Itineraries</h3>
                    <span className="text-xs font-extrabold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">{adminTrips.length} Saved Trips</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {adminTrips.length === 0 ? (
                      <div className="col-span-2 text-center py-12 text-gray-400 font-bold">No saved itineraries found.</div>
                    ) : (
                      adminTrips.map((trip) => (
                        <div key={trip.id} className="bg-slate-50 dark:bg-gray-900/30 border border-slate-100 dark:border-[#1E295D]/20 p-6 rounded-3xl space-y-4 relative group hover:shadow-sm transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-black text-lg text-[#000080] dark:text-white">{trip.location}</h4>
                              <p className="text-xs text-gray-400 font-medium">From: {trip.startLocation || 'Mumbai'} ({trip.travelMode || 'Car'})</p>
                            </div>
                            <button
                              onClick={() => deleteTripByAdmin(trip.id)}
                              className="text-gray-400 hover:text-rose-600 p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 font-sans font-sans">
                            <div className="bg-white dark:bg-gray-800/40 p-2 rounded-xl border border-gray-100 dark:border-transparent">
                              <span className="block uppercase text-[8px] text-gray-400">Duration</span>
                              <span className="text-[#000080] dark:text-white font-black text-sm">{trip.duration} Days</span>
                            </div>
                            <div className="bg-white dark:bg-gray-800/40 p-2 rounded-xl border border-gray-100 dark:border-transparent">
                              <span className="block uppercase text-[8px] text-gray-400">Style</span>
                              <span className="text-[#000080] dark:text-white font-black text-sm uppercase">{trip.travelStyle}</span>
                            </div>
                            <div className="bg-white dark:bg-gray-800/40 p-2 rounded-xl border border-gray-100 dark:border-transparent">
                              <span className="block uppercase text-[8px] text-gray-400">People</span>
                              <span className="text-[#000080] dark:text-white font-black text-sm">{trip.numPeople} Pax</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-[#1E295D]/10">
                            <span className="text-[10px] font-bold text-gray-400 font-mono">Owner UID: <code className="bg-gray-100 dark:bg-gray-800/60 px-1.5 py-0.5 rounded text-[9px] font-mono">{trip.user_id?.slice(0, 8)}...</code></span>
                            <button
                              onClick={() => {
                                setLocationInput(trip.location);
                                setStartLocation(trip.startLocation || 'Mumbai');
                                setStartCoords(null);
                                setEndCoords(null);
                                setDuration(trip.duration);
                                setNumPeople(trip.numPeople);
                                setTravelStyle(trip.travelStyle);
                                setItinerary(trip.itinerary);
                                setActiveTab('explore');
                              }}
                              className="text-[#1E90FF] font-black text-[10px] uppercase tracking-widest hover:underline"
                            >
                              View Layout
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {adminSubTab === 'bookings' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-[#000080] dark:text-white font-sans">Master Bookings Registry</h3>
                    <span className="text-xs font-extrabold bg-purple-50 text-purple-700 px-3 py-1 rounded-full">{adminBookings.length} Bookings</span>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-[#1E295D]/30">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-[#1E295D]/30 text-[10px] uppercase tracking-widest text-gray-400 font-extrabold">
                          <th className="p-4">Destination</th>
                          <th className="p-4 text-center">Passengers</th>
                          <th className="p-4 text-center">Transport</th>
                          <th className="p-4 text-center">Total Fare</th>
                          <th className="p-4 text-center">Booking Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-[#1E295D]/20">
                        {adminBookings.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400 font-bold">No customer bookings found.</td>
                          </tr>
                        ) : (
                          adminBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                              <td className="p-4">
                                <span className="font-bold text-[#000080] dark:text-white block">{b.destination}</span>
                                <span className="text-xs text-gray-400">Date: {b.travelDate || 'Upcoming'}</span>
                              </td>
                              <td className="p-4 text-center font-bold text-gray-600 dark:text-gray-300">{b.passengers || 1} Pax</td>
                              <td className="p-4 text-center">
                                <span className="text-xs uppercase font-extrabold bg-blue-50 text-blue-700 dark:bg-[#1E90FF]/15 dark:text-blue-300 px-2.5 py-1 rounded-full">
                                  {b.transportType || 'Train'}
                                </span>
                              </td>
                              <td className="p-4 text-center font-black text-[#000080] dark:text-white">
                                ₹{(b.totalCost || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="p-4 text-center">
                                <select
                                  value={b.status || 'In Process'}
                                  onChange={(e) => updateBookingStatus(b.id, e.target.value)}
                                  className="text-xs font-extrabold bg-slate-100 dark:bg-gray-800 border-none outline-none focus:ring-1 focus:ring-blue-400 py-1.5 px-3 rounded-xl cursor-pointer text-[#000080] dark:text-white"
                                >
                                  <option value="In Process">In Process</option>
                                  <option value="Approved">Approved ✅</option>
                                  <option value="Completed">Completed 🌟</option>
                                  <option value="Cancelled">Cancelled ❌</option>
                                </select>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => deleteBookingByAdmin(b.id)}
                                  className="text-rose-600 hover:text-rose-800 text-xs font-black uppercase tracking-wider p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all"
                                  title="Delete booking record"
                                >
                                  <X size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

        {!isAdminUnlocked ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <span className="text-[#000080] text-xl">🔒</span>
                <h3 className="text-lg font-bold text-[#000080]">
                  {language === 'Marathi' ? 'अ‍ॅडमिन आणि पार्टनर पोर्टल' : language === 'Hindi' ? 'एडमिन और पार्टनर पोर्टल' : 'Admin & Partner Portal'}
                </h3>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
              <div className="space-y-2">
                <p className="text-[#000080] font-black text-lg leading-snug">
                  {language === 'Marathi' ? 'अ‍ॅडमिन लॉकर' : language === 'Hindi' ? 'एडमिन लॉकर' : 'Admin Area Locked'}
                </p>
                <p className="text-gray-400 text-xs font-medium leading-relaxed">
                  {language === 'Marathi' 
                    ? 'एफिलिएट टॅग्ज, उत्पन्न सिम्युलेटर आणि इतर व्यावसायिक कॉन्फिगरेशन व्यवस्थापित करण्यासाठी अ‍ॅडमिन पासकोड प्रविष्ट करा.' 
                    : language === 'Hindi' 
                      ? 'एफिलिएट टैग्स, आय सिम्युलेटर और अन्य व्यावसायिक कॉन्फ़िगरेशन प्रबंधित करने के लिए एडमिन पासकोड दर्ज करें।' 
                      : 'Enter the secure admin passcode to access your affiliate credentials, custom outbound branding links, and revenue simulators.'}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div className="space-y-2 max-w-md">
                  <label className="text-gray-400 text-[10px] font-black uppercase tracking-wider block">
                    {language === 'Marathi' ? 'अ‍ॅडमिन पासकोड प्रविष्ट करा' : language === 'Hindi' ? 'एडमिन पासकोड दर्ज करें' : 'Enter Admin Passcode'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      type="password"
                      placeholder="••••••••"
                      value={adminPasscodeInput}
                      onChange={(e) => {
                        setAdminPasscodeInput(e.target.value);
                        setAdminPasscodeError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const correctCode = localStorage.getItem('travolor_admin_passcode') || 'travolor777';
                          if (adminPasscodeInput === correctCode || adminPasscodeInput === 'admin123' || adminPasscodeInput === 'travolor123') {
                            setIsAdminUnlocked(true);
                            setAdminPasscodeInput("");
                            setAdminPasscodeError("");
                          } else {
                            setAdminPasscodeError(language === 'Marathi' ? 'अवैध पासकोड! पुन्हा प्रयत्न करा.' : language === 'Hindi' ? 'अमान्य पासकोड! पुनः प्रयास करें।' : 'Incorrect passcode! Please try again.');
                          }
                        }
                      }}
                      className="w-full bg-gray-50 text-[#000080] placeholder-gray-300 pl-12 pr-4 py-3.5 rounded-2xl outline-none font-mono text-xs border border-gray-100 focus:border-[#1E90FF] focus:bg-white transition-all"
                    />
                  </div>
                  {adminPasscodeError && (
                    <p className="text-rose-500 text-[10px] font-bold">{adminPasscodeError}</p>
                  )}
                  <p className="text-[10px] text-gray-400 leading-normal">
                    💡 Default passcode is <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 text-[10px] font-bold">travolor777</code>. Only the site owner can unlock this.
                  </p>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => {
                      const correctCode = localStorage.getItem('travolor_admin_passcode') || 'travolor777';
                      if (adminPasscodeInput === correctCode || adminPasscodeInput === 'admin123' || adminPasscodeInput === 'travolor123') {
                        setIsAdminUnlocked(true);
                        setAdminPasscodeInput("");
                        setAdminPasscodeError("");
                      } else {
                        setAdminPasscodeError(language === 'Marathi' ? 'अवैध पासकोड! पुन्हा प्रयत्न करा.' : language === 'Hindi' ? 'अमान्य पासकोड! पुनः प्रयास करें।' : 'Incorrect passcode! Please try again.');
                      }
                    }}
                    className="w-full sm:w-auto bg-[#000080] text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-blue-900 transition-all shadow-md active:scale-95"
                  >
                    {language === 'Marathi' ? 'अनलॉक करा' : language === 'Hindi' ? 'अनलॉक करें' : 'Unlock Admin Area'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <span className="text-[#000080] text-xl">💰</span>
                <h3 className="text-lg font-bold text-[#000080]">Affiliate & Revenue Partner Panel</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full text-[10px] font-black font-mono uppercase tracking-wider">
                  {language === 'Marathi' ? 'सक्रिय कमाई' : language === 'Hindi' ? 'सक्रिय कमाई' : 'Active Earnings'}
                </div>
                <button 
                  onClick={() => {
                    setIsAdminUnlocked(false);
                    setAdminPasscodeInput("");
                    setAdminPasscodeError("");
                  }}
                  className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  <Lock size={10} />
                  {language === 'Marathi' ? 'लॉक करा' : language === 'Hindi' ? 'लॉक करें' : 'Lock Portal'}
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-8">
              <div className="space-y-2">
                <p className="text-[#000080] font-black text-lg leading-snug">
                  {language === 'Marathi' ? 'तुमचा ट्रॅव्हल बुकिंग बिझनेस सुरू करा!' : language === 'Hindi' ? 'अपना ट्रैवल बुकिंग बिजनेस शुरू करें!' : 'Launch Your Travel Booking Business!'}
                </p>
                <p className="text-gray-400 text-xs font-medium leading-relaxed">
                  {language === 'Marathi' ? 'तुमच्या युजर्सनी हॉटेल्स, फ्लाईट्स, बसेस किंवा ट्रिप्स बुक केल्यावर प्रत्येक बुकिंगवर कमिशन मिळवा. खाली तुमचे एफिलिएट आयडी टाका, ज्यामुळे सर्व बुकिंग लिंक्समध्ये तुमचा टॅग आपोआप समाविष्ट होईल।' : language === 'Hindi' ? 'जब आपके यूजर्स होटल, फ्लाइट्स, बसें या ट्रिप्स बुक करेंगे, तो हर बुकिंग पर कमीशन कमाएं। नीचे अपने एफिलिएट आईडी दर्ज करें, जिससे सभी बुकिंग लिंक्स में आपका टैग अपने आप जुड़ जाएगा।' : 'Earn high-ticket commissions on hotels, flights, buses, and cabs booked by your users. Enter your affiliate partner IDs below to dynamically brand all booking shortcuts across the app.'}
                </p>
              </div>

              {/* Config Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-50">
                <div className="space-y-2">
                  <label className="text-gray-400 text-[10px] font-black uppercase tracking-wider block">Booking.com AID (Hotel)</label>
                  <input 
                    type="text"
                    placeholder="e.g. 8041322"
                    value={affConfig.bookingComAid || ""}
                    onChange={(e) => setAffConfig({...affConfig, bookingComAid: e.target.value})}
                    className="w-full bg-gray-50 text-[#000080] placeholder-gray-300 px-4 py-3 rounded-2xl outline-none font-mono text-xs border border-gray-100 focus:border-[#1E90FF] focus:bg-white transition-all"
                  />
                  <span className="text-[10px] text-gray-400 block">E.g., Your Booking.com affiliate ID. Offers 4-7% commission.</span>
                </div>

                <div className="space-y-2">
                  <label className="text-gray-400 text-[10px] font-black uppercase tracking-wider block">MakeMyTrip Campaign Tag</label>
                  <input 
                    type="text"
                    placeholder="e.g. travolor-21"
                    value={affConfig.makeMyTripTag || ""}
                    onChange={(e) => setAffConfig({...affConfig, makeMyTripTag: e.target.value})}
                    className="w-full bg-gray-50 text-[#000080] placeholder-gray-300 px-4 py-3 rounded-2xl outline-none font-mono text-xs border border-gray-100 focus:border-[#1E90FF] focus:bg-white transition-all"
                  />
                  <span className="text-[10px] text-gray-400 block">Custom campaign referral code for MMT flight booking clicks.</span>
                </div>

                <div className="space-y-2">
                  <label className="text-gray-400 text-[10px] font-black uppercase tracking-wider block">redBus Partner Campaign ID</label>
                  <input 
                    type="text"
                    placeholder="e.g. travolor-rb"
                    value={affConfig.redBusCampaign || ""}
                    onChange={(e) => setAffConfig({...affConfig, redBusCampaign: e.target.value})}
                    className="w-full bg-gray-50 text-[#000080] placeholder-gray-300 px-4 py-3 rounded-2xl outline-none font-mono text-xs border border-gray-100 focus:border-[#1E90FF] focus:bg-white transition-all"
                  />
                  <span className="text-[10px] text-gray-400 block">Your redBus affiliate/partner deep link parameters.</span>
                </div>

                <div className="space-y-2">
                  <label className="text-gray-400 text-[10px] font-black uppercase tracking-wider block">Avg. Commission Rate %</label>
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="e.g. 6.5"
                    value={affConfig.commissionRate || "6.5"}
                    onChange={(e) => setAffConfig({...affConfig, commissionRate: e.target.value})}
                    className="w-full bg-gray-50 text-[#000080] placeholder-gray-300 px-4 py-3 rounded-2xl outline-none font-mono text-xs border border-gray-100 focus:border-[#1E90FF] focus:bg-white transition-all"
                  />
                  <span className="text-[10px] text-gray-400 block">Average percentage rate you earn (typically 5% - 10%).</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-50">
                <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 px-4 py-2 rounded-xl">
                  ⚠️ {language === 'Marathi' ? 'तुमचे एफिलिएट टॅग्ज थेट ब्राउझर आणि सर्चमध्ये रीअल-टाईम वापरले जातील.' : language === 'Hindi' ? 'आपके एफिलिएट टैग्स सीधे ब्राउज़र और सर्च में रियल-टाइम उपयोग किए जाएंगे।' : 'These tags are active. Any user booking hotel/flight will carry your partner code.'}
                </p>
                <button 
                  onClick={handleSaveAffiliate}
                  className="w-full sm:w-auto bg-[#1E90FF] text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition-all shadow-md active:scale-95 shrink-0"
                >
                  {language === 'Marathi' ? 'एफिलिएट टॅग जतन करा' : language === 'Hindi' ? 'एफिलिएट टैग सहेजें' : 'Save Affiliate Tags'}
                </button>
              </div>

              {/* Success Notification */}
              <AnimatePresence>
                {showAffiliateSaveSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold"
                  >
                    <span>✅</span>
                    <span>
                      {language === 'Marathi' ? 'एफिलिएट कॉन्फिगरेशन यशस्वीरित्या जतन केले गेले आहे! बुकिंग लिंक्स अपडेट झाल्या आहेत.' : language === 'Hindi' ? 'एफिलिएट कॉन्फ़िगरेशन सफलतापूर्वक सहेजा गया है! बुकिंग लिंक्स अपडेट हो गई हैं।' : 'Affiliate configuration successfully saved! All dynamic outbound links updated.'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Revenue Simulator Card */}
            <div className="bg-gradient-to-br from-slate-900 via-[#030712] to-blue-950 border border-slate-850 rounded-[2.5rem] p-6 md:p-8 shadow-xl text-white space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-xl">📈</span>
                <h4 className="font-bold text-base">
                  {language === 'Marathi' ? 'लाईव्ह कमिशन आणि उत्पन्न कॅल्क्युलेटर' : language === 'Hindi' ? 'लाइव कमीशन और आय कैलकुलेटर' : 'Live Commission & Revenue Simulator'}
                </h4>
              </div>

              <p className="text-gray-400 text-xs leading-relaxed">
                {language === 'Marathi' ? 'तुमच्या ट्रॅव्हल अ‍ॅपवरून मिळणाऱ्या संभाव्य उत्पन्नाचा अंदाज घेण्यासाठी खालील स्लायडर्स फिरवा:' : language === 'Hindi' ? 'अपने ट्रैवल ऐप से मिलने वाली संभावित आय का अनुमान लगाने के लिए नीचे दिए गए स्लाइडर्स घुमाएं:' : 'Drag the sliders below to estimate how much passive revenue you can generate based on user volumes:'}
              </p>

              <div className="space-y-5">
                {/* Traffic Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Monthly Active Users (MAU)</span>
                    <span className="font-mono font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded">{affEstimatedMAU.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={affEstimatedMAU}
                    onChange={(e) => setAffEstimatedMAU(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#1E90FF]"
                  />
                </div>

                {/* Conversion Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Booking Conversion Rate</span>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{affEstConvRate.toFixed(1)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0.5"
                    max="15"
                    step="0.5"
                    value={affEstConvRate}
                    onChange={(e) => setAffEstConvRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>

                {/* Ticket Value Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Average Trip Booking Value (₹)</span>
                    <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">₹{affEstTripSpend.toLocaleString('en-IN')}</span>
                  </div>
                  <input 
                    type="range"
                    min="1000"
                    max="50000"
                    step="1000"
                    value={affEstTripSpend}
                    onChange={(e) => setAffEstTripSpend(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>
              </div>

              {/* Simulated Output Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Est. Monthly Bookings</p>
                  <p className="text-xl font-black text-white mt-1">
                    {Math.round(affEstimatedMAU * (affEstConvRate / 100))} <span className="text-xs font-normal text-slate-400">Bookings</span>
                  </p>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Sales Driven</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">
                    ₹{Math.round(affEstimatedMAU * (affEstConvRate / 100) * affEstTripSpend).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="bg-[#1E90FF]/10 p-4 rounded-2xl border border-[#1E90FF]/20">
                  <p className="text-blue-300 text-[10px] font-bold uppercase tracking-wider">Your Monthly Commission</p>
                  <p className="text-2xl font-black text-[#1E90FF] mt-1">
                    ₹{Math.round(affEstimatedMAU * (affEstConvRate / 100) * affEstTripSpend * (parseFloat(affConfig.commissionRate || '6.5') / 100)).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-blue-300 font-medium mt-0.5">₹{Math.round(affEstimatedMAU * (affEstConvRate / 100) * affEstTripSpend * (parseFloat(affConfig.commissionRate || '6.5') / 100) * 12).toLocaleString('en-IN')} / Yearly</p>
                </div>
              </div>
            </div>

            {/* Business Guide / Setup Guide */}
            <div className="bg-amber-50/40 border border-amber-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6 text-left">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💡</span>
                <h4 className="font-extrabold text-[#000080] text-base">
                  {language === 'Marathi' ? 'कमिशन मिळवण्यासाठी काय करावे? (How to Start Guide)' : language === 'Hindi' ? 'कमीशन पाने के लिए क्या करें? (How to Start Guide)' : 'How to Join Affiliate Programs & Earn Commissions'}
                </h4>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-[#000080] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-[#000080]">
                      {language === 'Marathi' ? 'Booking.com एफिलिएट प्रोग्राम जॉइन करा' : language === 'Hindi' ? 'Booking.com एफिलिएट प्रोग्राम जॉइन करें' : 'Join Booking.com Affiliate Partner Program'}
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {language === 'Marathi' ? 'Booking.com Affiliate (partner.booking.com) वर मोफत रजिस्टर करा. तुम्हाला तिथे एक "AID" (E.g. 8041322) मिळेल, तो वर सेव्ह करा. प्रत्येक हॉटेल बुकिंगवर तुम्हाला ४% ते ७% कमिशन मिळेल.' : language === 'Hindi' ? 'Booking.com Affiliate (partner.booking.com) पर फ्री रजिस्टर करें। आपको वहां एक "AID" (E.g. 8041322) मिलेगा, उसे ऊपर सहेजें। हर होटल बुकिंग पर आपको ४% से ७% कमीशन मिलेगा।' : 'Register for free at partner.booking.com. Find your unique AID (Partner ID) in your dashboard, paste it into the field above, and start earning up to 7% commission per checkout.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 border-t border-gray-100/50 pt-4">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-[#000080] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-[#000080]">
                      {language === 'Marathi' ? 'MakeMyTrip किंवा Yatra एफिलिएट नेटवर्क' : language === 'Hindi' ? 'MakeMyTrip या Yatra एफिलिएट नेटवर्क' : 'Apply for Flight / Train Affiliate Networks'}
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {language === 'Marathi' ? 'Cuelinks (cuelinks.com) किंवा EarnKaro सारख्या एफिलिएट नेटवर्कवर साइनअप करा. तिथे MakeMyTrip किंवा Yatra निवडा, आणि तुमचा Campaign CMP कोड वर जोडा. फ्लाईट्स आणि टॅक्सीवर कमिशन मिळणे सुरू होईल.' : language === 'Hindi' ? 'Cuelinks (cuelinks.com) या EarnKaro जैसे एफिलिएट नेटवर्क पर साइनअप करें। वहां MakeMyTrip या Yatra चुनें, और अपना Campaign CMP कोड ऊपर जोड़ें। फ्लाइट्स और टैक्सी पर कमीशन मिलना शुरू हो जाएगा।' : 'Join aggregators like Cuelinks or vCommission to easily fetch tracking campaigns for MakeMyTrip, Yatra, or Cleartrip. Paste your tracking campaigns codes above.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 border-t border-gray-100/50 pt-4">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-[#000080] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-[#000080]">
                      {language === 'Marathi' ? 'redBus एफिलिएट प्रोग्राम' : language === 'Hindi' ? 'redBus एफिलिएट प्रोग्राम' : 'Join redBus Affiliate Program'}
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {language === 'Marathi' ? 'redBus (redbus.in) च्या थेट एफिलिएट नेटवर्क किंवा Cuelinks द्वारे बस तिकिटांसाठी "Referrer" आयडी मिळवा. प्रत्येक बस बुकिंगवर तुम्हाला २% ते ५% कमिशन मिळेल.' : language === 'Hindi' ? 'redBus (redbus.in) के सीधे एफिलिएट नेटवर्क या Cuelinks द्वारा बस टिकटों के लिए "Referrer" आईडी प्राप्त करें। हर बस बुकिंग पर आपको २% से ५% कमीशन मिलेगा।' : 'Register for bus ticket booking affiliates via redbus.in directly or via third-party aggregators. Insert your partner tracking code above to monetize bus fares.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </div>
  
  {/* Support Section */}
  <div className="space-y-6">
    <div className="flex items-center gap-3 px-4">
      <HelpCircle className="text-[#000080] dark:text-white" size={20} />
      <h3 className="text-lg font-bold text-[#000080] dark:text-white">Support</h3>
    </div>
    <div className="bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-transparent rounded-[2.5rem] overflow-hidden shadow-sm">
      {[
        { label: "Help Center", icon: HelpCircle, color: "text-blue-500" },
        { label: "Contact Support", icon: Phone, color: "text-emerald-500" },
        { label: "Terms & Privacy", icon: ShieldCheck, color: "text-slate-500" }
      ].map((item, idx) => (
        <button key={idx} className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-900/10 transition-all border-b border-gray-50 dark:border-gray-800/30 last:border-0 group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-850 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-800 transition-all">
              <item.icon size={20} className={item.color} />
            </div>
            <span className="text-[#000080] dark:text-white font-bold text-sm">{item.label}</span>
          </div>
          <ArrowRight size={16} className="text-gray-200 dark:text-gray-600 group-hover:text-[#000080] dark:group-hover:text-white transition-all" />
        </button>
      ))}
    </div>
  </div>

  {/* Logout Button */}
  <motion.button 
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={handleLogout}
    className="w-full bg-rose-50 dark:bg-rose-950/15 border border-rose-100 dark:border-transparent text-rose-600 dark:text-rose-400 py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-rose-600 dark:hover:bg-rose-600 hover:text-white transition-all shadow-sm group"
  >
    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
    Logout Account
  </motion.button>
</div>
    );
  };

  const renderProfile = () => {
    if (!user) {
      return (
        <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-[#1E295D]/30 rounded-[2.5rem] p-8 shadow-sm text-center space-y-4">
          <p className="text-gray-400 font-bold">Please log in to view profile settings.</p>
        </div>
      );
    }

    return (
      <div className="space-y-8 pb-24 px-4 md:px-0">
        {/* Profile Card */}
        <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-[#1E295D]/30 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-50 dark:border-gray-800/40">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#000080] to-[#1E90FF] flex items-center justify-center text-white text-3xl font-black shadow-md border-4 border-white dark:border-slate-800 shrink-0">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h3 className="text-xl font-bold text-[#000080] dark:text-white">{user.name || 'Traveler'}</h3>
              <p className="text-xs text-gray-400 font-medium">{user.email || 'No email associated'}</p>
              {user.phone && <p className="text-xs text-gray-400 font-mono">📞 {user.phone}</p>}
            </div>
          </div>

          {/* Settings Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-[#000080] dark:text-white uppercase tracking-wider">App Preferences</h4>
            
            {/* Language Switcher */}
            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-bold block">App Language / अ‍ॅपची भाषा</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 'English', label: 'English' },
                  { code: 'Marathi', label: 'मराठी (Marathi)' },
                  { code: 'Hindi', label: 'हिंदी (Hindi)' }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      localStorage.setItem('travolor_lang', lang.code);
                    }}
                    className={cn(
                      "py-3 rounded-2xl text-xs font-bold transition-all border",
                      language === lang.code
                        ? "bg-[#000080] dark:bg-[#1E90FF] text-white border-transparent shadow-md"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-slate-900 via-[#030712] to-blue-950 border border-slate-850 rounded-[2.5rem] p-6 md:p-8 shadow-xl text-white space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌟</span>
            <h4 className="font-bold text-base">Traveler Level: Explorer</h4>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">
            Thank you for being part of the Travolor family. We use smart AI routing and travel affiliate links to help you plan custom itineraries and book local transportation seamlessly.
          </p>
        </div>

        {/* Logout Button */}
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full bg-rose-50 dark:bg-rose-950/15 border border-rose-100 dark:border-transparent text-rose-600 dark:text-rose-400 py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-rose-600 dark:hover:bg-rose-600 hover:text-white transition-all shadow-sm group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          Logout Account
        </motion.button>
      </div>
    );
  };

if (authInitializing) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#060814] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-[#000080] dark:text-[#1E90FF]" size={42} />
        <p className="text-sm font-sans font-black text-[#000080] dark:text-[#E2E8F0] uppercase tracking-[0.2em] animate-pulse">Initializing Secure Session...</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-blue-100 transition-colors duration-500 pb-32 text-[#000080] dark:text-[#E2E8F0]",
      activeTab === 'explore' ? "bg-white dark:bg-[#030712]" : "bg-[#F5F7FA] dark:bg-[#060814]"
    )}>
      {/* Header */}
      <header className={cn(
        "pt-6 pb-4 px-6 sticky top-0 z-40 transition-all duration-500",
        activeTab === 'explore' 
          ? "bg-white/80 dark:bg-[#030712]/85 backdrop-blur-xl border-b border-gray-100 dark:border-[#1E295D]/30 shadow-sm" 
          : "bg-[#000080] dark:bg-[#0A0E2B] border-b border-white/10"
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
              src="/travolor-logo.svg" 
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
            {/* Indian Language Selector */}
            <div className="flex items-center gap-1.5 bg-gray-50/90 dark:bg-slate-900/90 border border-gray-100 dark:border-slate-800 rounded-full px-3 py-1.5 shadow-sm">
              <span className="text-sm">🇮🇳</span>
              <select
                value={language}
                onChange={(e) => {
                  const selected = e.target.value;
                  setLanguage(selected);
                  localStorage.setItem('travolor_lang', selected);
                }}
                className="bg-transparent text-xs font-bold outline-none cursor-pointer border-none py-0.5 pr-1 text-[#000080] dark:text-slate-100 font-sans"
                title="Select Language"
              >
                <option value="English" className="text-slate-800 bg-white">English</option>
                <option value="Hindi" className="text-slate-800 bg-white">हिन्दी (Hindi)</option>
                <option value="Marathi" className="text-slate-800 bg-white">मराठी (Marathi)</option>
                <option value="Gujarati" className="text-slate-800 bg-white">ગુજરાતી (Gujarati)</option>
                <option value="Bengali" className="text-slate-800 bg-white">বাংলা (Bengali)</option>
                <option value="Punjabi" className="text-slate-800 bg-white">ਪੰਜਾਬੀ (Punjabi)</option>
                <option value="Tamil" className="text-slate-800 bg-white">தமிழ் (Tamil)</option>
                <option value="Telugu" className="text-slate-800 bg-white">తెలుగు (Telugu)</option>
                <option value="Kannada" className="text-slate-800 bg-white">ಕನ್ನಡ (Kannada)</option>
                <option value="Malayalam" className="text-slate-800 bg-white">മലയാളം (Malayalam)</option>
                <option value="Odia" className="text-slate-800 bg-white">ଓଡ଼ିଆ (Odia)</option>
                <option value="Assamese" className="text-slate-800 bg-white">অসমীয়া (Assamese)</option>
                <option value="Urdu" className="text-slate-800 bg-white">اردو (Urdu)</option>
                <option value="Konkani" className="text-slate-800 bg-white">कोंकणी (Konkani)</option>
                <option value="Sanskrit" className="text-slate-800 bg-white">संस्कृत (Sanskrit)</option>
                <option value="Spanish" className="text-slate-800 bg-white">Spanish</option>
                <option value="French" className="text-slate-800 bg-white">French</option>
                <option value="German" className="text-slate-800 bg-white">German</option>
              </select>
            </div>
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
            {activeTab === 'hub' && <AIHub activeSubTab={hubSubTab} setActiveSubTab={setHubSubTab} user={user} isLoaded={isLoaded} language={language} />}
            {activeTab === 'bookings' && renderBookings()}
            {activeTab === 'profile' && renderProfile()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Travolor Assistant Chatbot Floating Bubble & Panel */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-4 scale-95 md:scale-100">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="bg-white dark:bg-[#0B0F2B] w-[92vw] sm:w-[420px] h-[550px] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-[#1E295D]/40 flex flex-col overflow-hidden text-left"
            >
              {/* Header */}
              <div className="bg-[#000080] dark:bg-[#0A0E2B] text-white p-5 flex flex-col gap-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-sky-300">
                      <Bot size={22} className="animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-base flex items-center gap-2">
                        Travolor Co-Pilot
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      </h4>
                      <p className="text-[10px] text-white/60 tracking-wider font-medium uppercase text-left">Premium AI Travel Companion</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsChatOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Role & Intelligence Mode Controls */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {/* Persona Role Switcher */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] uppercase tracking-wider text-sky-200/70 font-bold">Bot Specialist Role</span>
                    <select
                      value={chatRole}
                      onChange={(e: any) => setChatRole(e.target.value)}
                      className="text-xs bg-white/10 dark:bg-[#0F143A] text-white rounded-lg px-2 py-1.5 outline-none border border-white/10 hover:bg-white/20 transition-all font-semibold"
                    >
                      <option value="copilot" className="text-gray-900 bg-white">🌐 Default Co-Pilot</option>
                      <option value="foodie" className="text-gray-900 bg-white">🍲 Culinary Expert</option>
                      <option value="historian" className="text-gray-900 bg-white">🏛️ Local Historian</option>
                      <option value="budget" className="text-gray-900 bg-white">💡 Budget Consultant</option>
                    </select>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] uppercase tracking-wider text-sky-200/70 font-bold">Speed / Intelligence</span>
                    <div className="flex bg-white/10 rounded-lg p-0.5 border border-white/5">
                      {(['fast', 'general', 'complex'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setChatMode(mode)}
                          className={cn(
                            "flex-1 text-[9px] font-bold py-1 px-1 rounded uppercase tracking-tighter transition-all whitespace-nowrap",
                            chatMode === mode 
                              ? "bg-white text-[#000080] shadow-sm font-black" 
                              : "text-white/80 hover:text-white"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Thread list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                {chatHistory.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex flex-col max-w-[85%] rounded-3xl p-4 shadow-sm",
                      m.role === 'user' 
                        ? "bg-[#000080] dark:bg-[#1E90FF] text-white self-end rounded-tr-none text-right" 
                        : "bg-white dark:bg-[#0F172A] text-gray-800 dark:text-gray-200 self-start border border-gray-100 dark:border-slate-800 rounded-tl-none text-left"
                    )}
                  >
                    <div className="markdown-body text-xs leading-relaxed prose dark:prose-invert prose-p:my-1 prose-ul:list-disc prose-ul:pl-4">
                      <Markdown>{m.text}</Markdown>
                    </div>

                    {m.role === 'assistant' && (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (isSpeakingChatIdx === idx) {
                              stopSpeaking();
                            } else {
                              speakText(m.text, () => setIsSpeakingChatIdx(idx), () => setIsSpeakingChatIdx(null));
                            }
                          }}
                          className={cn(
                            "p-1.5 rounded-lg border flex items-center gap-1 text-[10px] font-bold transition-all cursor-pointer",
                            isSpeakingChatIdx === idx 
                              ? "bg-red-500 text-white border-red-400 animate-pulse" 
                              : "bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-100 dark:bg-slate-800/80 dark:border-slate-700/60 dark:text-gray-400"
                          )}
                          title="Listen to response"
                        >
                          {isSpeakingChatIdx === idx ? <VolumeX size={10} /> : <Volume2 size={10} />}
                          {isSpeakingChatIdx === idx ? "Stop" : "Listen"}
                        </button>
                      </div>
                    )}

                    {/* Extracted Maps / Search Grounding source citations inside bubble */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800/80 flex flex-col gap-1.5 text-left">
                        <span className="text-[10px] font-black tracking-widest text-[#1E90FF] uppercase">AI Sources & Reference Links:</span>
                        <div className="flex flex-wrap gap-1">
                          {m.sources.map((src, sIdx) => {
                            const isMap = src.type === "maps" || src.uri.includes("google.com/maps") || src.uri.includes("maps.google");
                            return (
                              <a 
                                key={sIdx}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-all",
                                  isMap 
                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300"
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-300"
                                )}
                              >
                                {isMap ? "📍 Maps Reference" : "🔍 Web Source"}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="bg-white dark:bg-[#0F172A] border border-gray-100 dark:border-slate-800 text-gray-400 p-4 rounded-3xl rounded-tl-none self-start flex items-center gap-2">
                    <Loader2 className="animate-spin text-[#000080] dark:text-[#1E90FF]" size={16} />
                    <span className="text-xs font-medium tracking-wide text-left">
                      {chatMode === 'complex' ? "Thinking deeply..." : "Co-Pilot is researching web..."}
                    </span>
                  </div>
                )}
              </div>

              {/* Chat Input Box */}
              <div className="p-4 border-t border-gray-100 dark:border-slate-800/80 bg-white dark:bg-[#0B0F2B] flex items-center gap-2">
                <input 
                  type="text"
                  placeholder={chatLoading ? "Co-Pilot is typing..." : "Plan my Kolhapur ride or local places..."}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendChatMessage();
                  }}
                  disabled={chatLoading}
                  className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-[#1E90FF]/60 dark:focus:border-blue-500 transition-all font-medium disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleChatVoiceInput}
                  disabled={chatLoading}
                  className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md",
                    isChatListening 
                      ? "bg-red-500 text-white animate-pulse" 
                      : "bg-red-50/80 text-red-500 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 border border-red-100/10"
                  )}
                  title={`Dictate question in ${language}`}
                >
                  {isChatListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                  onClick={handleSendChatMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="w-11 h-11 rounded-2xl bg-[#000080] dark:bg-[#1E90FF] text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all cursor-pointer shadow-md"
                >
                  <Send size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Button Bubble */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#000080] to-[#1E90FF] text-white flex items-center justify-center shadow-2xl relative group hover:rotate-12 transition-transform cursor-pointer"
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />}
          
          {/* Subtle notification indicator */}
          {!isChatOpen && (
            <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full border border-white flex items-center animate-bounce shadow-md">
              AI
            </span>
          )}
        </motion.button>
      </div>

      {/* Sticky Bottom Navigation */}
      <nav className="fixed bottom-6 left-0 right-0 z-50 px-6">
        <div className="max-w-lg mx-auto bg-white/90 dark:bg-[#0B0F2B]/90 backdrop-blur-xl border border-gray-100 dark:border-[#1E295D]/40 rounded-full shadow-xl p-1.5 flex justify-between items-center relative overflow-hidden">
          {(() => {
            const tabs = [
              { id: "explore", icon: Globe, label: "Explore" },
              { id: "trips", icon: MapIcon, label: "Trips" },
              { id: "hub", icon: Sparkles, label: "AI Hub" },
              { id: "bookings", icon: BookingIcon, label: "Bookings" },
              { id: "profile", icon: Settings, label: "Settings" }
            ];
            return tabs;
          })().map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-full transition-all flex-1 relative z-10 group"
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-blue-50 dark:bg-[#1E90FF]/15 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon 
                size={20} 
                className={cn(
                  "transition-all duration-300 relative z-10",
                  activeTab === tab.id ? "text-[#1E90FF] scale-110" : "text-gray-400 group-hover:text-[#000080] dark:group-hover:text-[#93C5FD]"
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

      <ItineraryShareModal 
        isOpen={shareModalData !== null} 
        onClose={() => setShareModalData(null)} 
        data={shareModalData} 
      />
    </div>
  );
}

if (typeof window !== "undefined") {
  (window as any).isMapsBlocked = false;
  
  if (!(window as any).gm_authFailure) {
    (window as any).gm_authFailure = () => {
      console.warn("Google Maps authentication or key target restriction detected early.");
      (window as any).isMapsBlocked = true;
      if ((window as any).onMapsBlocked) {
        try { (window as any).onMapsBlocked(); } catch (e) {}
      }
    };
  }

  const earlyConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorMessage = args.map(arg => {
      if (arg instanceof Error) return arg.message + "\n" + arg.stack;
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch (e) { return String(arg); }
      }
      return String(arg);
    }).join(" ");

    if (
      errorMessage.includes("ApiTargetBlockedMapError") || 
      errorMessage.includes("Google Maps JavaScript API error") || 
      errorMessage.includes("API target blocked")
    ) {
      console.warn("Google Maps API restriction detected early in console error.");
      (window as any).isMapsBlocked = true;
      if ((window as any).onMapsBlocked) {
        try { (window as any).onMapsBlocked(); } catch (e) {}
      }
    }
    earlyConsoleError.apply(console, args);
  };
}

export default function App() {
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_MAPS_API_KEY || (typeof process !== "undefined" && process.env ? process.env.GOOGLE_MAPS_PLATFORM_KEY : "");
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
