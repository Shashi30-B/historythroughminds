import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Award, Check, Download, Share2, Sparkles, BookOpen, Trash2, Camera, User, Heart, ChevronRight, Compass } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  category: string;
  icon: string;
  description: string;
  challenge: string;
  color: string;
}

const SHIELDS: Achievement[] = [
  {
    id: "heritage",
    title: "Heritage Custodian",
    category: "Historical",
    icon: "🕌",
    description: "Witnessed the grandeur of ancient India.",
    challenge: "Visit a UNESCO Heritage Site (Taj Mahal, Hampi, Ellora, etc.)",
    color: "from-amber-500 to-yellow-600"
  },
  {
    id: "himalayan",
    title: "Himalayan Nomad",
    category: "Altitude",
    icon: "🏔️",
    description: "Scaled the majestic heights of the Himalayas.",
    challenge: "Scale any pass or visit a hill valley in North/Northeast India",
    color: "from-blue-500 to-sky-600"
  },
  {
    id: "coastal",
    title: "Coastal Explorer",
    category: "Beaches",
    icon: "🏖️",
    description: "Trod the warm sands of the Indian peninsula.",
    challenge: "Explore beach lines or backwaters of Goa, Gokarna, Kerala, etc.",
    color: "from-teal-500 to-emerald-600"
  },
  {
    id: "culinary",
    title: "Thali Connoisseur",
    category: "Cuisine",
    icon: "🍛",
    description: "Savor the rich culinary palette of local thalis.",
    challenge: "Indulge in a highly authentic regional thali (Gujarati, Rajasthani, etc.)",
    color: "from-orange-500 to-red-600"
  },
  {
    id: "spiritual",
    title: "Spiritual Seeker",
    category: "Peace",
    icon: "🪔",
    description: "Sought inner calm at ancient sacred rivers.",
    challenge: "Join the evening Ganga Aarti or visit any spiritual temple hub",
    color: "from-indigo-500 to-purple-600"
  },
  {
    id: "railway",
    title: "Swadesh Express",
    category: "Railways",
    icon: "🚂",
    description: "Rode the veins of the nation's rail network.",
    challenge: "Travel in a Vande Bharat Express or any historic toy train line",
    color: "from-rose-500 to-pink-600"
  }
];

interface SwadeshPassportProps {
  user?: { id: string; name: string; email: string; photo?: string } | null;
}

export default function SwadeshPassport({ user }: SwadeshPassportProps = {}) {
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("swadesh_passport_name") || user?.name || "Indian Explorer";
  });

  useEffect(() => {
    if (user?.name) {
      setUserName(user.name);
    }
  }, [user]);

  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("swadesh_passport_completed");
      return saved ? JSON.parse(saved) : ["heritage"]; // default unlocked to keep it engaging
    } catch {
      return ["heritage"];
    }
  });
  const [tripsData, setTripsData] = useState<Record<string, { place: string; date: string }>>(() => {
    try {
      const saved = localStorage.getItem("swadesh_passport_trips");
      return saved ? JSON.parse(saved) : { "heritage": { place: "Taj Mahal", date: "Jan 2026" } };
    } catch {
      return { "heritage": { place: "Taj Mahal", date: "Jan 2026" } };
    }
  });

  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);
  const [editPlace, setEditPlace] = useState("");
  const [editDate, setEditDate] = useState("");
  const [isPosterGenerating, setIsPosterGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("swadesh_passport_name", userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem("swadesh_passport_completed", JSON.stringify(completedIds));
  }, [completedIds]);

  useEffect(() => {
    localStorage.setItem("swadesh_passport_trips", JSON.stringify(tripsData));
  }, [tripsData]);

  // Handle completion toggle
  const toggleAchievement = (id: string) => {
    if (completedIds.includes(id)) {
      setCompletedIds(completedIds.filter((cid) => cid !== id));
      // Clean trip data
      const updated = { ...tripsData };
      delete updated[id];
      setTripsData(updated);
    } else {
      setCompletedIds([...completedIds, id]);
      setTripsData({
        ...tripsData,
        [id]: { place: "Planned Destination", date: "Just Now" }
      });
      // Automatically open editing drawer/fields
      setActiveEditingId(id);
      setEditPlace("");
      setEditDate("");
    }
  };

  const handleSaveTripDetails = (id: string) => {
    setTripsData({
      ...tripsData,
      [id]: {
        place: editPlace.trim() || "Planned Trip",
        date: editDate.trim() || "Soon"
      }
    });
    setActiveEditingId(null);
  };

  // Get Explorer Title
  const getExplorerTitle = (count: number) => {
    if (count === 0) return "Bharat Novice Explorer";
    if (count <= 2) return "Vande Bharat Wanderer";
    if (count <= 4) return "Bharat Darshan Pioneer";
    return "Swadesh Maharaja Explorer";
  };

  const getExplorerEmoji = (count: number) => {
    if (count === 0) return "🐣";
    if (count <= 2) return "🚂";
    if (count <= 4) return "🏔️";
    return "👑";
  };

  // Calculate percentage
  const explorationPercentage = Math.round((completedIds.length / SHIELDS.length) * 100);

  // Canvas drawing: Generate digital passport
  const generatePassportPoster = () => {
    if (!canvasRef.current) return;
    setIsPosterGenerating(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Standard portrait size (1080 x 1350)
    canvas.width = 1080;
    canvas.height = 1350;

    // 1. Dark Saffron to Royal Blue Indian Pride Gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, "#100938"); // deep blue night
    bgGrad.addColorStop(0.5, "#1B125C"); // royal blue
    bgGrad.addColorStop(1, "#26134D"); // violet dusk
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative golden circular mandate
    ctx.strokeStyle = "rgba(245, 158, 11, 0.08)";
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 450, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(245, 158, 11, 0.04)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 470, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Thick Outer Border with subtle Saffron/Green accents
    ctx.strokeStyle = "#F59E0B"; // Golden Saffron
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.strokeStyle = "#10B981"; // Emerald Green Inner Frame
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

    // 3. Header Branding
    ctx.textAlign = "center";
    ctx.fillStyle = "#F59E0B";
    ctx.font = 'black 22px "Inter", sans-serif';
    ctx.letterSpacing = "10px";
    ctx.fillText("🇮🇳 SWADESH CO-PILOT CHALLENGE", canvas.width / 2, 90);

    // 4. Main Passport Card Frame
    const cardX = 100;
    const cardY = 150;
    const cardW = canvas.width - 200;
    const cardH = 1050;

    // Custom Rounded card path
    ctx.fillStyle = "#0F1335";
    ctx.strokeStyle = "rgba(245, 158, 11, 0.15)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cardX, cardY, cardW, cardH, 40) : ctx.rect(cardX, cardY, cardW, cardH);
    ctx.fill();
    ctx.stroke();

    // 5. Passport Cover details
    ctx.fillStyle = "#FFFFFF";
    ctx.font = 'black 54px "Inter", sans-serif';
    ctx.letterSpacing = "2px";
    ctx.fillText("BHARAT TRAVEL PASSPORT", canvas.width / 2, cardY + 90);

    // Decorative Passport Emblem Symbol placeholder
    ctx.fillStyle = "#F59E0B";
    ctx.font = '80px "Inter", sans-serif';
    ctx.fillText("🧭", canvas.width / 2, cardY + 200);

    // User Profile Information Box
    const infoY = cardY + 280;
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cardX + 60, infoY, cardW - 120, 160, 24) : ctx.rect(cardX + 60, infoY, cardW - 120, 160);
    ctx.fill();
    ctx.stroke();

    // Text info inside the Passport box
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.letterSpacing = "1.5px";
    ctx.fillText("PASSPORT HOLDER NAME", cardX + 100, infoY + 45);
    ctx.fillText("EXPLORER RANK / LEVEL", cardX + 440, infoY + 45);

    // Values
    ctx.fillStyle = "#FFFFFF";
    ctx.font = 'black 26px "Inter", sans-serif';
    ctx.fillText(userName.toUpperCase(), cardX + 100, infoY + 85);
    
    ctx.fillStyle = "#F59E0B";
    const title = getExplorerTitle(completedIds.length);
    const emoji = getExplorerEmoji(completedIds.length);
    ctx.fillText(`${emoji} ${title}`, cardX + 440, infoY + 85);

    // Percentage bar
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText(`SWADESH PATH COMPLETION: ${explorationPercentage}% UNLOCKED`, cardX + 100, infoY + 130);

    // Progress bar fill on canvas
    const pBarW = cardW - 440;
    const pBarX = cardX + 340;
    const pBarY = infoY + 120;
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(pBarX, pBarY, pBarW, 14, 7) : ctx.rect(pBarX, pBarY, pBarW, 14);
    ctx.fill();

    ctx.fillStyle = "#10B981"; // Emerald green
    ctx.beginPath();
    const fillWidth = Math.max(15, (explorationPercentage / 100) * pBarW);
    ctx.roundRect ? ctx.roundRect(pBarX, pBarY, fillWidth, 14, 7) : ctx.rect(pBarX, pBarY, fillWidth, 14);
    ctx.fill();

    // 6. Grid of 6 Achievements/Visas (stamped vs unstamped)
    ctx.textAlign = "center";
    const startGridX = cardX + 90;
    const startGridY = cardY + 490;
    const colGap = 240;
    const rowGap = 210;

    SHIELDS.forEach((shield, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const sx = startGridX + col * colGap;
      const sy = startGridY + row * rowGap;

      const isCompleted = completedIds.includes(shield.id);

      // Circle container for stamp
      ctx.fillStyle = isCompleted ? "rgba(245, 158, 11, 0.08)" : "rgba(255, 255, 255, 0.02)";
      ctx.strokeStyle = isCompleted ? "#F59E0B" : "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = isCompleted ? 3.5 : 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner double border for stamp aesthetic
      if (isCompleted) {
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, 62, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Emoji
      ctx.font = '54px "Inter", sans-serif';
      ctx.fillText(shield.icon, sx, sy + 18);

      // Text Title under stamp
      ctx.fillStyle = isCompleted ? "#FFFFFF" : "rgba(255, 255, 255, 0.25)";
      ctx.font = 'bold 15px "Inter", sans-serif';
      ctx.fillText(shield.title, sx, sy + 100);

      // Stamped overlay text
      if (isCompleted) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-Math.PI / 8); // Rotate stamp slightly for authenticity
        ctx.strokeStyle = "rgba(16, 185, 129, 0.75)"; // green stamp
        ctx.fillStyle = "rgba(16, 185, 129, 0.06)";
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-55, -20, 110, 32, 6) : ctx.rect(-55, -20, 110, 32);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
        ctx.font = 'black 11px "Inter", sans-serif';
        ctx.letterSpacing = "2px";
        ctx.fillText("VALIDATED", 0, 1);
        ctx.restore();
      }
    });

    // 7. Slogan and app address
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = 'bold 14px "Inter", sans-serif';
    ctx.letterSpacing = "1px";
    ctx.fillText("EXPLORE INDIA • SAVE REGIONAL LOCALES • TRAVOLOR AI CO-PILOT", canvas.width / 2, cardY + 950);

    ctx.fillStyle = "#1E90FF";
    ctx.font = 'black 15px "Inter", sans-serif';
    ctx.letterSpacing = "2px";
    ctx.fillText("SCAN TO GENERATE YOUR DIGITAL TRAVEL PASSPORT", canvas.width / 2, cardY + 990);

    // Save as state URL
    const url = canvas.toDataURL("image/png");
    setPosterUrl(url);
    setIsPosterGenerating(false);
  };

  const handleOpenSharePoster = () => {
    setShowShareModal(true);
    // Draw canvas with brief timeout for ref alignment
    setTimeout(() => {
      generatePassportPoster();
    }, 200);
  };

  const downloadPosterImage = () => {
    if (!posterUrl) return;
    const link = document.createElement("a");
    link.download = `Swadesh_Passport_${userName.replace(/\s+/g, "_")}.png`;
    link.href = posterUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyShareText = () => {
    const text = `🇮🇳 *MY DIGITAL BHARAT PASSPORT* 🇮🇳
Rank: *${getExplorerTitle(completedIds.length)}* ${getExplorerEmoji(completedIds.length)}
Progress: *${explorationPercentage}%* Explored!

🎒 Achievements Unlocked:
${SHIELDS.map((shield) => {
  const comp = completedIds.includes(shield.id);
  const data = tripsData[shield.id];
  return `${comp ? "✅" : "⬜"} *${shield.title}* ${data ? `(Visited ${data.place} - ${data.date})` : ""}`;
}).join("\n")}

_Map your own Swadesh journeys & unlock badges instantly on Travolor AI!_`;

    navigator.clipboard.writeText(text);
    alert("Share summary copied to clipboard! Share on WhatsApp & challenge your friends!");
  };

  return (
    <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-xl text-left space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header section with Custom Identity Input */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center">
            <Award size={20} className="animate-bounce" />
          </div>
          <div>
            <h4 className="text-[#000080] dark:text-[#1E90FF] font-black text-lg">Digital Swadesh Passport</h4>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Gamified Bharat Exploration & Sharing</p>
          </div>
        </div>

        {/* Name Customization Input */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3.5 py-1.5 rounded-2xl border border-gray-100 dark:border-slate-800 max-w-xs w-full sm:w-auto">
          <span className="text-gray-400"><User size={14} /></span>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Explorer Name"
            maxLength={20}
            className="bg-transparent text-xs font-black text-[#000080] dark:text-white outline-none w-full"
          />
        </div>
      </div>

      {/* Profile Overview Card (Gamification details) */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        
        <div className="space-y-3 flex-1 text-center md:text-left">
          <span className="bg-amber-400 text-slate-950 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
            {getExplorerEmoji(completedIds.length)} {getExplorerTitle(completedIds.length)}
          </span>
          <h5 className="text-xl md:text-3xl font-black tracking-tight">{userName}'s Swadesh Index</h5>
          <p className="text-xs text-sky-200/80 font-bold max-w-md">
            Unlock all 6 digital visas by visiting UNESCO heritage sights, scaling mountain passes, and trying authentic local culinary thalis!
          </p>
        </div>

        {/* Circle Progress Tracker */}
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur border border-white/10 p-4 rounded-2xl shrink-0">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                className="text-white/10"
                strokeWidth="6"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                className="text-[#10B981]"
                strokeWidth="6"
                strokeDasharray={176}
                strokeDashoffset={176 - (176 * explorationPercentage) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-xs font-black font-mono">{explorationPercentage}%</span>
          </div>

          <div className="text-left space-y-0.5">
            <span className="text-[9px] text-sky-200 uppercase tracking-wider font-extrabold block">Achievements</span>
            <span className="text-lg font-black block">{completedIds.length} / 6 Unlocked</span>
            <button
              onClick={handleOpenSharePoster}
              className="text-[10px] font-black text-amber-400 hover:text-amber-300 underline flex items-center gap-1 cursor-pointer"
            >
              <Camera size={11} /> Generate Share Card
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Achievement Stamps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SHIELDS.map((shield) => {
          const isCompleted = completedIds.includes(shield.id);
          const meta = tripsData[shield.id];

          return (
            <div
              key={shield.id}
              className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between h-[230px] relative overflow-hidden ${
                isCompleted 
                  ? "bg-slate-50/50 dark:bg-[#0A0D28]/40 border-amber-500/30 shadow-md" 
                  : "bg-gray-50/30 dark:bg-slate-900/10 border-slate-200/40 dark:border-slate-800/40 opacity-80"
              }`}
            >
              {/* Top Row: Icon Badge & Checkbox */}
              <div className="flex items-start justify-between">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${shield.color} text-white flex items-center justify-center text-3xl shadow-md ${isCompleted ? 'animate-pulse' : 'opacity-40'}`}>
                  {shield.icon}
                </div>
                
                {/* Custom Checkbox */}
                <button
                  onClick={() => toggleAchievement(shield.id)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                    isCompleted 
                      ? "bg-emerald-500 border-emerald-500 text-white" 
                      : "border-gray-300 dark:border-slate-700 hover:border-[#1E90FF]"
                  }`}
                  title={isCompleted ? "Mark as Uncompleted" : "Mark as Completed"}
                >
                  <Check size={14} className={isCompleted ? "opacity-100" : "opacity-0"} />
                </button>
              </div>

              {/* Text Information */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">{shield.category} Badge</span>
                <h6 className={`font-black text-sm leading-tight ${isCompleted ? 'text-slate-800 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                  {shield.title}
                </h6>
                <p className="text-[10px] text-gray-400 leading-snug line-clamp-2 font-medium">
                  Challenge: {shield.challenge}
                </p>
              </div>

              {/* Bottom Customizer Row: Displays details if completed */}
              <div className="pt-3 border-t border-gray-100/60 dark:border-slate-800/60 flex items-center justify-between min-h-[40px]">
                {isCompleted ? (
                  activeEditingId === shield.id ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        placeholder="Where? (e.g. Goa)"
                        value={editPlace}
                        onChange={(e) => setEditPlace(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[10px] font-bold outline-none flex-1 max-w-[120px] dark:text-white"
                        maxLength={18}
                      />
                      <input
                        type="text"
                        placeholder="When? (e.g. Feb 2026)"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[10px] font-bold outline-none w-16 dark:text-white"
                        maxLength={10}
                      />
                      <button
                        onClick={() => handleSaveTripDetails(shield.id)}
                        className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center w-full">
                      <div className="text-[10px] text-slate-600 dark:text-slate-300 font-bold leading-tight">
                        <span className="text-[8px] text-gray-400 uppercase font-black tracking-wider block">Logged Spot:</span>
                        ✈️ {meta?.place} ({meta?.date})
                      </div>
                      <button
                        onClick={() => {
                          setActiveEditingId(shield.id);
                          setEditPlace(meta?.place || "");
                          setEditDate(meta?.date || "");
                        }}
                        className="text-[9px] font-extrabold text-[#1E90FF] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  )
                ) : (
                  <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-none flex items-center gap-1">
                    🔒 LOCKED VERIFICATION
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Share Poster Modal Overlay */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[201] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 text-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:h-auto"
            >
              {/* Left Side Preview */}
              <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center border-r border-slate-800 overflow-hidden relative">
                <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase mb-4 block">PREVIEW DIGITAL PASSPORT POSTER</span>
                
                <div className="relative max-w-[280px] sm:max-w-[320px] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                  {isPosterGenerating ? (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
                      <p className="text-xs text-slate-400 font-bold">Stamping Passport stamps...</p>
                    </div>
                  ) : posterUrl ? (
                    <img src={posterUrl} alt="Swadesh Passport Poster" className="w-full h-full object-contain cursor-pointer" />
                  ) : null}
                </div>
                
                <p className="text-[10px] text-gray-400 font-bold mt-4 text-center">
                  💡 High density design crafted perfectly for Instagram Stories & WhatsApp status updates.
                </p>
              </div>

              {/* Right Side Info & Actions */}
              <div className="w-full md:w-[360px] p-6 sm:p-8 flex flex-col justify-between text-left">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                      Vocal For Local Pride
                    </span>
                    <h4 className="text-2xl font-black tracking-tight">Passport Verified!</h4>
                    <p className="text-xs text-slate-400 font-bold leading-normal">
                      Excellent work! You have unlocked {completedIds.length} out of 6 Swadesh achievements. Generate your verification certificate to challenge your travel buddies.
                    </p>
                  </div>

                  {/* Summary items */}
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-bold">Holder Name:</span>
                      <span className="font-black text-white">{userName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-bold">Explorer Rank:</span>
                      <span className="font-black text-amber-400">{getExplorerTitle(completedIds.length)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-bold">Explored Path:</span>
                      <span className="font-black text-emerald-400">{explorationPercentage}% Complete</span>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="space-y-2.5 pt-6 mt-6 border-t border-slate-800">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={downloadPosterImage}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Download size={16} /> Download Passport Poster
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={copyShareText}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Share2 size={14} /> Copy WhatsApp Status text
                  </motion.button>

                  <button
                    onClick={() => setShowShareModal(false)}
                    className="w-full py-2.5 rounded-2xl text-center text-xs text-gray-500 hover:text-white font-bold cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
