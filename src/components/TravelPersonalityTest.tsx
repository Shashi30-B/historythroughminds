import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserCheck, Compass, Sparkles, AlertCircle, RefreshCw, Award } from "lucide-react";

export type TravelPersonality =
  | "solo"
  | "family"
  | "couple"
  | "adventure"
  | "luxury"
  | "budget"
  | "spiritual";

export interface TravelPersonalityTestProps {
  onSelectPersonality: (personality: TravelPersonality) => void;
  activePersonality?: TravelPersonality | null;
}

const QUESTIONS = [
  {
    id: 1,
    text: "What is your ideal morning scenario while travelling?",
    options: [
      { text: "Hiking up a misty peak to watch the sunrise", value: "adventure" },
      { text: "Sipping filter coffee in a serene temple courtyard", value: "spiritual" },
      { text: "Enjoying a lavish buffet breakfast overlooking the ocean", value: "luxury" },
      { text: "Hunting down the cheapest, best local street food spot", value: "budget" },
      { text: "Exploring a quiet museum with my camera in hand", value: "solo" },
      { text: "Arranging a fun sightseeing bus with the kids and elders", value: "family" },
      { text: "Having a lazy breakfast in bed with my partner", value: "couple" }
    ]
  },
  {
    id: 2,
    text: "How do you prefer to get around a new destination?",
    options: [
      { text: "Renting a rugged bike or off-road car to explore", value: "adventure" },
      { text: "Walking or taking peaceful local cycle-rickshaws", value: "spiritual" },
      { text: "Pre-booked private luxury sedan with a chauffeur", value: "luxury" },
      { text: "Public buses, trains, or sharing shared cabs", value: "budget" },
      { text: "Renting an active scooter or just backpacking on foot", value: "solo" },
      { text: "Spacious private multi-utility traveler van for everyone", value: "family" },
      { text: "A cozy scenic drive together with romantic stops", value: "couple" }
    ]
  },
  {
    id: 3,
    text: "Which keepsake or memory matters most to you?",
    options: [
      { text: "Action footage from a GoPro or a sports souvenir", value: "adventure" },
      { text: "A sacred item, prasadam, or deep peace of mind", value: "spiritual" },
      { text: "Premium artisanal crafts or photos in high-end outfits", value: "luxury" },
      { text: "Handwritten travel journal and money saved in my wallet", value: "budget" },
      { text: "Candid polaroids of strangers and local conversations", value: "solo" },
      { text: "A framed giggling family group photograph at the monument", value: "family" },
      { text: "A beautiful souvenir representing our shared bond", value: "couple" }
    ]
  }
];

export const PERSONALITY_META: Record<
  TravelPersonality,
  { label: string; icon: string; description: string; tag: string; bg: string; text: string; border: string }
> = {
  solo: {
    label: "Solo Adventurer",
    icon: "🎒",
    description: "You love exploring at your own pace, meeting fascinating locals, and immersing yourself in cultural depths.",
    tag: "Self-Discovery & Freedom",
    bg: "bg-purple-50 dark:bg-purple-950/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-100 dark:border-purple-900/40"
  },
  family: {
    label: "Family Explorer",
    icon: "👨‍👩‍👧‍👦",
    description: "You focus on comfortable itineraries, educational spots, safety, and creating unforgettable bonds for all ages.",
    tag: "Bonding & Comfort",
    bg: "bg-teal-50 dark:bg-teal-950/20",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-100 dark:border-teal-900/40"
  },
  couple: {
    label: "Couple Wanderer",
    icon: "💖",
    description: "You appreciate intimate stays, scenic sunset viewpoints, fine dining, and customized romantic experiences.",
    tag: "Romance & Connection",
    bg: "bg-rose-50 dark:bg-rose-950/20",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-100 dark:border-rose-900/40"
  },
  adventure: {
    label: "Thrill Seeker",
    icon: "🧗",
    description: "You crave adrenaline, off-road road trips, trekking, active outdoor sports, and wild natural challenges.",
    tag: "Adrenaline & Action",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-100 dark:border-orange-900/40"
  },
  luxury: {
    label: "Elite Connoisseur",
    icon: "💎",
    description: "You prioritize five-star luxury resorts, personalized wellness spas, premium transport, and top-tier fine dining.",
    tag: "Opulence & Premium Service",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-100 dark:border-amber-900/40"
  },
  budget: {
    label: "Smart Backpacker",
    icon: "💡",
    description: "You are the master of saving. You find the coolest hostels, free entry gems, budget hacks, and public transit.",
    tag: "Extreme Value & Smart Savings",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900/40"
  },
  spiritual: {
    label: "Spiritual Pilgrim",
    icon: "🧘",
    description: "You seek sacred temples, silent retreats, mindfulness yoga, peaceful ashrams, and spiritual inner harmony.",
    tag: "Peace, Devotion & Serenity",
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    text: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-100 dark:border-yellow-900/40"
  }
};

export default function TravelPersonalityTest({
  onSelectPersonality,
  activePersonality
}: TravelPersonalityTestProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<TravelPersonality | null>(null);

  useEffect(() => {
    if (activePersonality) {
      setTestResult(activePersonality);
    }
  }, [activePersonality]);

  const handleAnswerSelect = (value: string) => {
    const updatedAnswers = [...answers, value];
    setAnswers(updatedAnswers);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate majority vote
      const frequencyMap: Record<string, number> = {};
      let maxCount = 0;
      let winner: TravelPersonality = "solo";

      updatedAnswers.forEach((ans) => {
        frequencyMap[ans] = (frequencyMap[ans] || 0) + 1;
        if (frequencyMap[ans] > maxCount) {
          maxCount = frequencyMap[ans];
          winner = ans as TravelPersonality;
        }
      });

      setTestResult(winner);
      onSelectPersonality(winner);
      localStorage.setItem("travolor_personality", winner);
    }
  };

  const resetTest = () => {
    setCurrentStep(0);
    setAnswers([]);
    setTestResult(null);
  };

  return (
    <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-[#1E90FF] flex items-center justify-center">
            <UserCheck size={20} />
          </div>
          <div className="text-left">
            <h4 className="text-[#000080] dark:text-[#1E90FF] font-black text-lg">Travel Personality</h4>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Personalize Your AI Experience</p>
          </div>
        </div>
        {testResult && (
          <button
            onClick={resetTest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all font-bold border border-gray-100 dark:border-slate-800"
          >
            <RefreshCw size={12} />
            Retake Test
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!testResult ? (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-left"
          >
            {/* Progress Bar */}
            <div className="w-full bg-gray-100 dark:bg-slate-900 rounded-full h-1.5 mb-6">
              <div
                className="bg-gradient-to-r from-[#1E90FF] to-[#000080] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>

            <span className="text-xs font-bold text-[#1E90FF] font-mono">QUESTION {currentStep + 1} OF {QUESTIONS.length}</span>
            <h5 className="text-slate-800 dark:text-slate-100 font-bold text-base mt-1 mb-5 leading-snug">
              {QUESTIONS[currentStep].text}
            </h5>

            <div className="space-y-3">
              {QUESTIONS[currentStep].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(option.value)}
                  className="w-full text-left p-4 rounded-2xl border border-gray-100 dark:border-slate-800 hover:border-[#1E90FF]/40 dark:hover:border-[#1E90FF]/40 bg-gray-50/50 hover:bg-blue-50/40 dark:bg-slate-900/40 dark:hover:bg-[#1E90FF]/5 text-xs text-slate-700 dark:text-slate-200 font-semibold transition-all hover:translate-x-1"
                >
                  {option.text}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-[#000080] to-[#1E90FF] text-white text-4xl shadow-lg shadow-blue-500/10 mb-4 animate-bounce">
              {PERSONALITY_META[testResult].icon}
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Award size={14} className="text-[#1E90FF]" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1E90FF] font-mono">Your Travel Persona</span>
            </div>

            <h5 className="text-slate-800 dark:text-white font-black text-2xl tracking-tight">
              {PERSONALITY_META[testResult].label}
            </h5>

            <div className="inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/20 text-[#1E90FF] border border-blue-100/30">
              ⚡ {PERSONALITY_META[testResult].tag}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 px-4 leading-relaxed max-w-md mx-auto">
              {PERSONALITY_META[testResult].description}
            </p>

            <div className="mt-6 p-4 rounded-3xl bg-amber-500/5 border border-amber-500/10 text-left flex items-start gap-3">
              <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h6 className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">AI Persona Tuning Enabled</h6>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal mt-0.5">
                  Your travel itineraries will now automatically optimize and specialize to match your <strong>{PERSONALITY_META[testResult].label}</strong> travel preference!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
