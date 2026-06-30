import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, ShieldAlert, Utensils, Calendar, Camera, Info, 
  CheckSquare, Phone, AlertTriangle, ExternalLink, HelpCircle
} from 'lucide-react';

interface LocalGuideViewProps {
  features: any;
  checklist: string[];
  emergencyContacts: Array<{ name: string; contact: string }>;
  language: string;
}

export function LocalGuideView({ 
  features, 
  checklist, 
  emergencyContacts,
  language 
}: LocalGuideViewProps) {
  if (!features) {
    return (
      <div className="py-12 text-center text-gray-500 font-medium">
        No local guide insights available.
      </div>
    );
  }

  const isMarathi = language.toLowerCase().startsWith("mr") || language.toLowerCase().includes("marathi");
  const isHindi = language.toLowerCase().startsWith("hi") || language.toLowerCase().includes("hindi");

  const [localChecked, setLocalChecked] = useState<Record<number, boolean>>({});

  const t = {
    gems: isMarathi ? "गुप्त पर्यटन स्थळे (Hidden Gems)" : isHindi ? "छिपे हुए खजाने (Hidden Gems)" : "Travolor Hidden Gems",
    gemsSub: isMarathi ? "गर्दीपासून लांब असलेल्या स्थानिक गुप्त जागा" : isHindi ? "भीड़ से दूर स्थानीय रहस्यमयी स्थान" : "Secret spots away from tourist crowds",
    cuisine: isMarathi ? "अस्सल स्थानिक खाद्यसंस्कृती" : isHindi ? "पारंपरिक स्थानीय भोजन" : "Signature Native Cuisine",
    cuisineSub: isMarathi ? "नक्की चाखून पाहण्यासारखे पदार्थ" : isHindi ? "जरूर चखें जाने वाले पारंपरिक व्यंजन" : "Must-try native specialties & historical eateries",
    crowd: isMarathi ? "गर्दीचा अंदाज आणि सर्वोत्तम वेळ" : isHindi ? "भीड़ का अनुमान और सही समय" : "Crowd Predictions & Best Visit Times",
    emerg: isMarathi ? "सुरक्षा आणि आणीबाणी संपर्क" : isHindi ? "सुरक्षा और आपातकालीन हॉटलाइन" : "Safety & Emergency Hotlines",
    pack: isMarathi ? "सामान भरण्याची चेकलिस्ट" : isHindi ? "सामान पैक करने की चेकलिस्ट" : "Recommended Packing Checklist",
    checklist: isMarathi ? "अंतिम चेकलिस्ट" : isHindi ? "यात्रा चेकलिस्ट" : "Pre-Trip Checklist"
  };

  const toggleCheck = (idx: number) => {
    setLocalChecked(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-10 text-left">
      {/* 1. Hidden Gems & Native Food */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hidden Gems card */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[3rem] p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800/60 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Camera size={20} />
            </div>
            <div>
              <h4 className="text-lg font-black text-gray-800 dark:text-white tracking-tight">{t.gems}</h4>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">{t.gemsSub}</p>
            </div>
          </div>

          <div className="space-y-5">
            {features.hiddenGems && features.hiddenGems.map((gem: any, idx: number) => (
              <div key={idx} className="flex gap-4 items-start p-4 bg-purple-50/5 hover:bg-purple-50/10 rounded-2xl border border-purple-500/5 transition-all">
                <span className="text-base text-purple-600 font-bold leading-none mt-0.5">💎</span>
                <div className="space-y-1">
                  <h5 className="font-extrabold text-sm text-[#000080] dark:text-blue-300">{gem.name}</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed">{gem.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Local Food card */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[3rem] p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800/60 pb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Utensils size={20} />
            </div>
            <div>
              <h4 className="text-lg font-black text-gray-800 dark:text-white tracking-tight">{t.cuisine}</h4>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">{t.cuisineSub}</p>
            </div>
          </div>

          <div className="space-y-5">
            {features.localFood && features.localFood.map((food: any, idx: number) => (
              <div key={idx} className="flex gap-4 items-start p-4 bg-orange-50/5 hover:bg-orange-50/10 rounded-2xl border border-orange-500/5 transition-all">
                <span className="text-base text-orange-600 font-bold leading-none mt-0.5">🍛</span>
                <div className="space-y-1">
                  <h5 className="font-extrabold text-sm text-[#000080] dark:text-blue-300">
                    {food.dish} <span className="text-xs font-normal text-amber-600">(@ {food.joint})</span>
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed">{food.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Crowd density & best visit time + photography spots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50/30 dark:bg-slate-900/40 p-6 rounded-3xl border border-blue-500/10 text-left space-y-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Calendar size={18} />
            <h5 className="font-extrabold text-xs uppercase tracking-wider">Visiting Window</h5>
          </div>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{features.bestVisitingTime}</p>
        </div>

        <div className="bg-purple-50/30 dark:bg-slate-900/40 p-6 rounded-3xl border border-purple-500/10 text-left space-y-2">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <Camera size={18} />
            <h5 className="font-extrabold text-xs uppercase tracking-wider">Photo Hotspots</h5>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-normal font-medium">
            {features.photographySpots?.join(", ") || "Main scenic sunset points, historic gateway entrances."}
          </p>
        </div>

        <div className="bg-emerald-50/30 dark:bg-slate-900/40 p-6 rounded-3xl border border-emerald-500/10 text-left space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Info size={18} />
            <h5 className="font-extrabold text-xs uppercase tracking-wider">Crowd Density Prediction</h5>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-normal font-medium">{features.crowdPrediction}</p>
        </div>
      </div>

      {/* 3. Packing & Pre-Trip Checklists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Packing checklist */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[3rem] p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-xl space-y-5">
          <h4 className="text-lg font-black text-gray-800 dark:text-white border-b border-gray-100 dark:border-slate-800/60 pb-4 flex items-center gap-2">
            🎒 {t.pack}
          </h4>
          <div className="space-y-3">
            {features.packingList && features.packingList.map((item: string, idx: number) => (
              <button 
                key={idx}
                onClick={() => toggleCheck(idx)}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${localChecked[idx] ? "bg-[#1E90FF] border-[#1E90FF]" : "border-gray-300 bg-white dark:bg-slate-900"}`}>
                  {localChecked[idx] && <span className="text-white text-[10px]">✔</span>}
                </div>
                <span className={localChecked[idx] ? "line-through text-gray-400" : ""}>{item}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pre-Trip Verification checklist */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[3rem] p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-xl space-y-5">
          <h4 className="text-lg font-black text-gray-800 dark:text-white border-b border-gray-100 dark:border-slate-800/60 pb-4 flex items-center gap-2">
            ✅ {t.checklist}
          </h4>
          <div className="space-y-3">
            {checklist && checklist.map((item: string, idx: number) => {
              const offsetIdx = idx + 100;
              return (
                <button 
                  key={idx}
                  onClick={() => toggleCheck(offsetIdx)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${localChecked[offsetIdx] ? "bg-emerald-500 border-emerald-500" : "border-gray-300 bg-white dark:bg-slate-900"}`}>
                    {localChecked[offsetIdx] && <span className="text-white text-[10px]">✔</span>}
                  </div>
                  <span className={localChecked[offsetIdx] ? "line-through text-gray-400" : ""}>{item}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Safety Tips & Emergency Contacts helpline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Safety tips */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[3rem] p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-xl space-y-5">
          <h4 className="text-lg font-black text-rose-600 border-b border-gray-100 dark:border-slate-800/60 pb-4 flex items-center gap-2">
            ⚠️ Safety & Health Advisories
          </h4>
          <div className="space-y-4">
            {features.safetyTips && features.safetyTips.map((tip: string, idx: number) => (
              <div key={idx} className="flex gap-3 items-start text-xs font-medium text-gray-600 dark:text-gray-400">
                <span className="text-rose-500 text-sm leading-none mt-0.5">●</span>
                <p className="leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contacts card */}
        <div className="bg-[#000080]/5 rounded-[3rem] p-6 md:p-8 border border-[#000080]/10 shadow-xl space-y-5">
          <h4 className="text-lg font-black text-[#000080] dark:text-white border-b border-gray-100 dark:border-slate-800/60 pb-4 flex items-center gap-2">
            📞 {t.emerg}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyContacts && emergencyContacts.map((contact: any, idx: number) => (
              <div key={idx} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800/80 space-y-1">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase">{contact.name}</span>
                <p className="text-base font-black text-[#1E90FF] flex items-center gap-1.5">
                  <Phone size={14} />
                  {contact.contact}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
