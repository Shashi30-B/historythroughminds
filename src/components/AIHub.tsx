import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, MessageSquare, Map, Landmark, Users, Compass, HelpCircle, Award, Sparkles as AdvisorIcon, Volume2 } from "lucide-react";

import TravelPersonalityTest, { TravelPersonality, PERSONALITY_META } from "./TravelPersonalityTest";
import AICompanionChat from "./AICompanionChat";
import VisualTripBoard from "./VisualTripBoard";
import InteractiveMapPlanner from "./InteractiveMapPlanner";
import DragDropItinerary from "./DragDropItinerary";
import IndiaSpecialPlanner from "./IndiaSpecialPlanner";
import GroupCoordinator from "./GroupCoordinator";
import SmartRecommender from "./SmartRecommender";
import SwadeshPassport from "./SwadeshPassport";
import TravelAdvisorHub from "./TravelAdvisorHub";
import { RoadTripPlanner } from "./RoadTripPlanner";
import AIVoiceGuide from "./AIVoiceGuide";

interface AIHubProps {
  activeSubTab?: "chat" | "route" | "board" | "india" | "group" | "passport" | "advisor" | "voice";
  setActiveSubTab?: (tab: "chat" | "route" | "board" | "india" | "group" | "passport" | "advisor" | "voice") => void;
  user?: any | null;
  isLoaded?: boolean;
  language?: string;
}

export default function AIHub({ activeSubTab: propSubTab, setActiveSubTab: propSetSubTab, user, isLoaded, language = "English" }: AIHubProps = {}) {
  const [localSubTab, setLocalSubTab] = useState<"chat" | "route" | "board" | "india" | "group" | "passport" | "advisor" | "voice">("chat");

  const activeSubTab = propSubTab !== undefined ? propSubTab : localSubTab;
  const setActiveSubTab = propSetSubTab !== undefined ? propSetSubTab : setLocalSubTab;
  const [personality, setPersonality] = useState<TravelPersonality | null>(() => {
    try {
      const saved = localStorage.getItem("travolor_personality");
      return saved as TravelPersonality | null;
    } catch {
      return null;
    }
  });

  const handleSelectPersonality = (p: TravelPersonality) => {
    setPersonality(p);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Premium Hero Banner */}
      <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-r from-[#000080] to-[#1E90FF] text-white p-8 md:p-12 shadow-xl group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-24 -mt-24 transition-transform group-hover:scale-110 duration-700 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full -ml-16 -mb-16 transition-transform group-hover:scale-110 duration-700 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
          <div className="space-y-2 max-w-xl">
            <span className="bg-white/15 backdrop-blur px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-sky-200">
              💎 Travolor Premium Co-Pilot Hub
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight leading-none">
              Explore the Future <br className="hidden md:inline" />
              of Travel Planning
            </h2>
            <p className="text-xs md:text-sm text-white/80 leading-relaxed font-semibold">
              Discover localized hidden gems, optimize multi-city routes, split expenses equally, and chat with highly tailored AI specialists.
            </p>
          </div>

          {/* Active Personality Badge if set */}
          {personality ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3.5 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-3xl shrink-0 max-w-sm"
            >
              <div className="text-4xl">{PERSONALITY_META[personality].icon}</div>
              <div className="text-left">
                <span className="text-[8px] uppercase tracking-widest text-sky-200 font-extrabold font-mono">Tuned Travel Vibe</span>
                <h5 className="font-black text-sm text-white leading-tight">{PERSONALITY_META[personality].label}</h5>
                <p className="text-[10px] text-white/70 line-clamp-2 leading-snug mt-1 font-semibold">
                  {PERSONALITY_META[personality].description}
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center gap-3.5 bg-white/5 backdrop-blur border border-white/15 p-4 rounded-3xl text-left shrink-0">
              <span className="text-3xl">🧭</span>
              <div>
                <span className="text-[8px] uppercase tracking-widest text-sky-200 font-extrabold font-mono">Personalization Off</span>
                <h5 className="font-bold text-xs text-white leading-tight">Take the Quiz Below</h5>
                <p className="text-[10px] text-white/60 leading-tight mt-0.5">Define your vibe to unlock personalized itineraries.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Sub Navigation Tabs */}
      <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 p-2 rounded-[2.5rem] shadow-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {[
            { id: "chat", label: "🎒 Companion & Quiz", icon: MessageSquare },
            { id: "voice", label: "🎙️ Voice Guide (USP)", icon: Volume2 },
            { id: "route", label: "🗺️ Map & Itinerary", icon: Map },
            { id: "board", label: "✨ Board & Gems", icon: Compass },
            { id: "advisor", label: "🌟 Advisor & Flights", icon: AdvisorIcon },
            { id: "india", label: "🕌 India Specials", icon: Landmark },
            { id: "group", label: "👥 Group Splitter", icon: Users },
            { id: "passport", label: "🏆 Swadesh Passport", icon: Award }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex-1 md:flex-none px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === tab.id
                  ? "bg-[#1E90FF] text-white shadow-md shadow-blue-500/15"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-1.5 pr-4 text-gray-400 text-xs font-bold font-mono">
          <Sparkles size={12} className="text-[#1E90FF] animate-pulse" />
          ACTIVE SPECIALS
        </div>
      </div>

      {/* Dynamic Sub-Tab Windows */}
      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {activeSubTab === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <div className="lg:col-span-4 h-full">
                <TravelPersonalityTest
                  onSelectPersonality={handleSelectPersonality}
                  activePersonality={personality}
                />
              </div>
              <div className="lg:col-span-8 h-full">
                <AICompanionChat language={language} />
              </div>
            </motion.div>
          )}

          {activeSubTab === "route" && (
            <motion.div
              key="route"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <RoadTripPlanner language={language} />
              <InteractiveMapPlanner />
              <DragDropItinerary />
            </motion.div>
          )}

          {activeSubTab === "board" && (
            <motion.div
              key="board"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <VisualTripBoard />
              <SmartRecommender />
            </motion.div>
          )}

          {activeSubTab === "india" && (
            <motion.div
              key="india"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <IndiaSpecialPlanner />
            </motion.div>
          )}

          {activeSubTab === "group" && (
            <motion.div
              key="group"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <GroupCoordinator user={user} />
            </motion.div>
          )}

          {activeSubTab === "voice" && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <AIVoiceGuide />
            </motion.div>
          )}

          {activeSubTab === "passport" && (
            <motion.div
              key="passport"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <SwadeshPassport user={user} />
            </motion.div>
          )}

          {activeSubTab === "advisor" && (
            <motion.div
              key="advisor"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <TravelAdvisorHub user={user} isLoaded={isLoaded} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
