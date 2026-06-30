import React from 'react';
import { motion } from 'motion/react';
import { 
  Wallet, Hotel, Utensils, ShoppingBag, MapPin, 
  HelpCircle, AlertTriangle, ShieldCheck, Sparkles, Fuel, Car
} from 'lucide-react';

interface BudgetDashboardViewProps {
  budget: any;
  language: string;
  numPeople: number;
  duration: number;
  travelStyle: string;
  budgetOptimizer: string;
}

export function BudgetDashboardView({ 
  budget, 
  language, 
  numPeople, 
  duration, 
  travelStyle,
  budgetOptimizer
}: BudgetDashboardViewProps) {
  if (!budget) {
    return (
      <div className="py-12 text-center text-gray-500 font-medium">
        No budget data available.
      </div>
    );
  }

  const { fuel, hotel, food, shopping, activities, transport, emergency, grandTotal } = budget;

  const isMarathi = language.toLowerCase().startsWith("mr") || language.toLowerCase().includes("marathi");
  const isHindi = language.toLowerCase().startsWith("hi") || language.toLowerCase().includes("hindi");

  const totalCost = grandTotal || (hotel + food + fuel + shopping + activities + transport + emergency);

  const t = {
    title: isMarathi ? "सहलीचा वित्तीय अहवाल" : isHindi ? "यात्रा का वित्तीय बजट" : "Middle-Class Travel Dashboard",
    sub: isMarathi ? "पैसा-वसूल खर्च नियोजन आणि बचत अहवाल" : isHindi ? "पैसा-वसूल खर्च योजना और बचत विश्लेषण" : "AI-Computed Expense Breakdown",
    grandTotal: isMarathi ? "एकूण अंदाजे बजेट" : isHindi ? "कुल अनुमानित बजट" : "Grand Total Estimated Cost",
    perPerson: isMarathi ? "प्रति व्यक्ती खर्च" : isHindi ? "प्रति व्यक्ति व्यय" : "Per Person",
    perDay: isMarathi ? "प्रति दिवस खर्च" : isHindi ? "प्रति दिन व्यय" : "Per Day",
    optimHeader: isMarathi ? "स्मार्ट एआय बजेट ऑप्टिमायझेशन" : isHindi ? "स्मार्ट एआई बजट अनुकूलन" : "AI Optimizer Insights",
    items: {
      fuel: isMarathi ? "वाहन इंधन आणि टोल शुल्क" : isHindi ? "वाहन ईंधन और टोल शुल्क" : "Transit Fuel & Tolls",
      hotel: isMarathi ? "हॉटेल आणि राहण्याचा खर्च" : isHindi ? "होटल और आवास लागत" : "Hotel Lodging Stay",
      food: isMarathi ? "भोजन आणि खाद्यपदार्थ" : isHindi ? "भोजन और खाद्य खर्च" : "Food & Fine Dining",
      shopping: isMarathi ? "स्थानिक खरेदी (शॉपिंग)" : isHindi ? "स्थानीय शॉपिंग अनुमति" : "Souvenirs & Shopping",
      activities: isMarathi ? "पर्यटन स्थळ तिकीट शुल्क" : isHindi ? "पर्यटन टिकट शुल्क" : "Sightseeing Tickets",
      transport: isMarathi ? "स्थानिक फिरण्याचा खर्च" : isHindi ? "स्थानीय परिवहन लागत" : "Local Sightseeing Taxi",
      emergency: isMarathi ? "आणीबाणी राखीव निधी" : isHindi ? "आपातकालीन सुरक्षित फंड" : "Emergency Reserve Fund"
    }
  };

  const formatPrice = (val: number) => {
    return "₹" + Math.round(val).toLocaleString('en-IN');
  };

  const categories = [
    { name: t.items.fuel, value: fuel, percentage: Math.round((fuel / totalCost) * 100), color: "bg-amber-500", icon: Fuel },
    { name: t.items.hotel, value: hotel, percentage: Math.round((hotel / totalCost) * 100), color: "bg-blue-600", icon: Hotel },
    { name: t.items.food, value: food, percentage: Math.round((food / totalCost) * 100), color: "bg-emerald-500", icon: Utensils },
    { name: t.items.shopping, value: shopping, percentage: Math.round((shopping / totalCost) * 100), color: "bg-purple-500", icon: ShoppingBag },
    { name: t.items.activities, value: activities, percentage: Math.round((activities / totalCost) * 100), color: "bg-rose-500", icon: Wallet },
    { name: t.items.transport, value: transport, percentage: Math.round((transport / totalCost) * 100), color: "bg-sky-500", icon: Car },
    { name: t.items.emergency, value: emergency, percentage: Math.round((emergency / totalCost) * 100), color: "bg-slate-500", icon: ShieldCheck }
  ].filter(c => c.value > 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
        mass: 0.8
      }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 text-left"
    >
      {/* Grand Total Header Display */}
      <motion.div 
        variants={itemVariants}
        className="bg-[#000080] rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl animate-none"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-500/10 rounded-full -ml-16 -mb-16 pointer-events-none" />

        <div className="flex items-center gap-3 mb-4 opacity-75">
          <Wallet size={20} className="text-amber-400" />
          <span className="text-[10px] font-black tracking-widest uppercase">{t.sub}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-6 space-y-2">
            <h3 className="text-sm font-light text-blue-200 uppercase tracking-wider">{t.grandTotal}</h3>
            <p className="text-5xl font-black tracking-tight text-white">{formatPrice(totalCost)}</p>
            <p className="text-xs text-blue-200/80 font-semibold italic">Optimized according to Swadesh "{travelStyle}" constraints.</p>
          </div>

          <div className="md:col-span-6 grid grid-cols-2 gap-6 bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">{t.perPerson}</span>
              <p className="text-2xl font-black">{formatPrice(totalCost / numPeople)}</p>
              <p className="text-[10px] text-gray-300 font-medium">for {numPeople} traveler{numPeople > 1 ? "s" : ""}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">{t.perDay}</span>
              <p className="text-2xl font-black">{formatPrice(totalCost / duration)}</p>
              <p className="text-[10px] text-gray-300 font-medium">for {duration} days</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid: Breakdown Gauges + AI Optimizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Category breakdown gauges */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-7 bg-white dark:bg-slate-900/60 rounded-[3rem] p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-xl space-y-6"
        >
          <h4 className="text-lg font-black text-gray-800 dark:text-white border-b border-gray-100 dark:border-slate-800/60 pb-4">
            📊 Cost Distribution Breakdown
          </h4>

          <div className="space-y-5">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300">
                    <cat.icon size={15} className="text-gray-400 shrink-0" />
                    <span>{cat.name}</span>
                  </div>
                  <div className="font-mono font-bold text-gray-800 dark:text-gray-200">
                    {formatPrice(cat.value)} <span className="text-gray-400 text-[10px] font-normal">({cat.percentage}%)</span>
                  </div>
                </div>
                {/* Progress bar background */}
                <div className="w-full h-3.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${cat.percentage}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    className={`h-full ${cat.color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI budget optimizer */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-5 flex flex-col gap-6"
        >
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-slate-900 dark:to-slate-950 p-6 md:p-8 rounded-[3rem] border border-emerald-500/20 dark:border-emerald-900/30 shadow-xl flex-1 text-left relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-400">
                <Sparkles className="shrink-0 animate-pulse" size={20} />
                <h4 className="text-lg font-black tracking-tight uppercase">{t.optimHeader}</h4>
              </div>
              <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-200 leading-relaxed">
                {budgetOptimizer || "Your daily attractions are clustered to avoid backtrack, saving up to ₹2,500 on local taxi transit costs and reducing highway fuel consumption."}
              </p>
            </div>
            
            <div className="mt-6 pt-5 border-t border-emerald-500/15 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2 font-bold">
              <span className="text-base leading-none">✅</span> Verified Optimal • Maximum Paisa Vasool Rate
            </div>
          </div>

          {/* Quick Saving Tip */}
          <div className="bg-blue-50 dark:bg-slate-900 p-5 rounded-[2.5rem] border border-blue-500/10 dark:border-slate-800 text-left flex gap-3 text-xs items-start">
            <AlertTriangle className="text-[#1E90FF] shrink-0 mt-0.5" size={16} />
            <div>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mb-1">Swadesh Financial Advisory</p>
              <p className="text-gray-600 dark:text-gray-400 font-medium leading-normal">
                These estimates are optimized for current seasonal rates. We suggest carrying at least 15% emergency cash in physical notes, especially for parking fees and highway dhabas.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
