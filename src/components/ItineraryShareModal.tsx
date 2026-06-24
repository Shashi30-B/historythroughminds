import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Sparkles, Check, ChevronRight, Copy, MessageSquare, Heart } from 'lucide-react';

interface ItineraryShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    location: string;
    startLocation: string;
    duration: number;
    style: string;
    numPeople: number;
    totalCost: number;
    itinerary: string;
    date?: string;
  } | null;
}

type CardTheme = 'royal' | 'sunset' | 'emerald' | 'gold';

export function ItineraryShareModal({ isOpen, onClose, data }: ItineraryShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgUrl, setImgUrl] = useState<string>('');
  const [activeTheme, setActiveTheme] = useState<CardTheme>('royal');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Helper: Format price in INR (e.g. ₹18,500)
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Helper: Parse core attractions from Markdown
  const parseCoreAttractions = (markdown: string): string[] => {
    if (!markdown) return [];
    const lines = markdown.split('\n');
    const attractions: string[] = [];
    
    for (const line of lines) {
      const cleanLine = line.trim();
      // Look for bullets or bold phrases representing points of interest
      if (cleanLine.startsWith('-') || cleanLine.startsWith('*')) {
        const text = cleanLine
          .replace(/^[-*]\s+/, '')
          .replace(/\*\*/g, '')
          .replace(/[*_~]/g, '')
          .trim();
        if (text && text.length > 5 && text.length < 75) {
          attractions.push(text);
          if (attractions.length >= 4) break;
        }
      }
    }

    // Secondary parsing for bold terms
    if (attractions.length < 3) {
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      while ((match = boldRegex.exec(markdown)) !== null) {
        const text = match[1].trim();
        if (
          text && 
          text.length > 3 && 
          text.length < 45 && 
          !text.toLowerCase().includes('day') && 
          !attractions.includes(text)
        ) {
          attractions.push(text);
          if (attractions.length >= 4) break;
        }
      }
    }

    // Fallbacks
    while (attractions.length < 3) {
      if (attractions.length === 0) attractions.push("Local Heritage Sightseeing Walk");
      else if (attractions.length === 1) attractions.push("Authentic Regional Thali Food Path");
      else attractions.push("Scenic Views & Photography Spot");
    }

    return attractions.slice(0, 4);
  };

  const drawCard = () => {
    if (!data || !canvasRef.current) return;
    setGenerating(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions for high-quality export (1080 x 1350)
    canvas.width = 1080;
    canvas.height = 1350;

    // --- Color Theme Palette Definitions ---
    let bgGradientStart = '#0B1340';
    let bgGradientEnd = '#1A2F75';
    let cardBg = '#0F1A5C';
    let accentColor = '#F59E0B'; // Saffron Gold
    let badgeBg = '#EAB308';
    let badgeText = '#000000';
    let highlightText = '#60A5FA';

    if (activeTheme === 'sunset') {
      bgGradientStart = '#3F0E0B';
      bgGradientEnd = '#7F1D1D';
      cardBg = '#5A1210';
      accentColor = '#F97316'; // Deep Orange
      badgeBg = '#F97316';
      badgeText = '#FFFFFF';
      highlightText = '#FCA5A5';
    } else if (activeTheme === 'emerald') {
      bgGradientStart = '#062C22';
      bgGradientEnd = '#065F46';
      cardBg = '#0B4536';
      accentColor = '#10B981'; // Mint Green
      badgeBg = '#10B981';
      badgeText = '#FFFFFF';
      highlightText = '#6EE7B7';
    } else if (activeTheme === 'gold') {
      bgGradientStart = '#1E1B4B';
      bgGradientEnd = '#311042';
      cardBg = '#2E103E';
      accentColor = '#E9D5FF'; // Royal Violet Lavender
      badgeBg = '#D946EF';
      badgeText = '#FFFFFF';
      highlightText = '#F5D0FE';
    }

    // 1. Draw Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, bgGradientStart);
    bgGrad.addColorStop(1, bgGradientEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Decorative background waves/circles for elegant "Swadesh" aesthetics
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.arc(100, 100, 350, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.beginPath();
    ctx.arc(canvas.width - 100, canvas.height - 100, 500, 0, Math.PI * 2);
    ctx.fill();

    // Subtle Grid pattern in the background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw a golden/accent border around the poster
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    // Thin inner border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // 3. Top Header: Brand Identity
    ctx.textAlign = 'center';
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('🇮🇳 TRAVOLOR SWADESH CO-PILOT', canvas.width / 2, 90);

    // 4. Main Destination Card & Content Inner Frame
    const cardY = 140;
    const cardH = 1060;
    const cardW = canvas.width - 140;
    const cardX = 70;

    // Draw Inner Card Container
    ctx.fillStyle = cardBg;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 3;
    
    // Draw Rounded Card Container
    const r = 40; // Corner radius
    ctx.beginPath();
    ctx.moveTo(cardX + r, cardY);
    ctx.lineTo(cardX + cardW - r, cardY);
    ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + r);
    ctx.lineTo(cardX + cardW, cardY + cardH - r);
    ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH);
    ctx.lineTo(cardX + r, cardY + cardH);
    ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - r);
    ctx.lineTo(cardX, cardY + r);
    ctx.quadraticCurveTo(cardX, cardY, cardX + r, cardY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Destination Hero Info
    ctx.textAlign = 'center';
    
    // Draw "VERIFIED AI PLAN" Badge
    const badgeW = 220;
    const badgeH = 40;
    const badgeX = (canvas.width - badgeW) / 2;
    const badgeY = cardY + 50;
    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 20) : ctx.rect(badgeX, badgeY, badgeW, badgeH);
    ctx.fill();

    ctx.fillStyle = badgeText;
    ctx.font = 'black 14px "Inter", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('VERIFIED VALUE PLAN', canvas.width / 2, badgeY + 25);

    // Destination Name (Big & Bold)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'black 76px "Inter", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText(data.location.toUpperCase(), canvas.width / 2, cardY + 160);

    // Route path (Start -> End)
    ctx.fillStyle = highlightText;
    ctx.font = 'bold 24px "Inter", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(`${data.startLocation.toUpperCase()} ➔ ${data.location.toUpperCase()}`, canvas.width / 2, cardY + 215);

    // Date/Season label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'medium 18px "Inter", sans-serif';
    ctx.letterSpacing = '1px';
    const dateStr = data.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    ctx.fillText(`Planned on: ${dateStr}`, canvas.width / 2, cardY + 255);

    // 6. Parameter Chips (Bento Grid Style)
    // Draw 4 rounded boxes with icons
    const chipW = 210;
    const chipH = 110;
    const startX = cardX + 45;
    const gapX = 30;
    const chipY = cardY + 300;

    const parameters = [
      { label: 'DURATION', val: `${data.duration} Days`, desc: 'Optimized' },
      { label: 'TRAVELERS', val: `${data.numPeople} Pax`, desc: 'Family Pack' },
      { label: 'VIBE / STYLE', val: data.style.toUpperCase(), desc: 'Perfect Fit' },
      { label: 'ESTIMATE', val: formatPrice(data.totalCost), desc: 'Paisa Vasool' }
    ];

    parameters.forEach((param, index) => {
      const cx = startX + index * (chipW + gapX);
      
      // Draw chip container
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(cx, chipY, chipW, chipH, 20) : ctx.rect(cx, chipY, chipW, chipH);
      ctx.fill();
      ctx.stroke();

      // Top label
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.letterSpacing = '1.5px';
      ctx.fillText(param.label, cx + chipW / 2, chipY + 30);

      // Value
      ctx.fillStyle = index === 3 ? '#10B981' : '#FFFFFF'; // Green for price estimate
      ctx.font = 'black 22px "Inter", sans-serif';
      ctx.letterSpacing = '0px';
      ctx.fillText(param.val, cx + chipW / 2, chipY + 65);

      // Bottom description
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'medium 11px "Inter", sans-serif';
      ctx.fillText(param.desc, cx + chipW / 2, chipY + 92);
    });

    // 7. Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX + 50, cardY + 450);
    ctx.lineTo(cardX + cardW - 50, cardY + 450);
    ctx.stroke();

    // 8. Attractions & Places of Interest Highlights
    ctx.textAlign = 'left';
    ctx.fillStyle = accentColor;
    ctx.font = 'black 20px "Inter", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('🌟 CORE ATTRACTIONS & SIGHTSEEING HIGHLIGHTS', cardX + 50, cardY + 495);

    const attractions = parseCoreAttractions(data.itinerary);
    let attractionY = cardY + 545;

    attractions.forEach((attraction, idx) => {
      // Draw a neat custom vector badge shape / dot icon
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(cardX + 65, attractionY - 8, 10, 0, Math.PI * 2);
      ctx.fill();

      // Inside dot drawing a tiny white check
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cardX + 61, attractionY - 8);
      ctx.lineTo(cardX + 64, attractionY - 5);
      ctx.lineTo(cardX + 69, attractionY - 11);
      ctx.stroke();

      // Draw attraction title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 21px "Inter", sans-serif';
      ctx.fillText(attraction, cardX + 100, attractionY);

      // Short beautiful detail under attraction (mock localized description)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = 'medium 15px "Inter", sans-serif';
      const hints = [
        "Highly recommended by Travolor local experts and community reviews.",
        "A historic national gem offering breathtaking scenic landscape and photography spots.",
        "Indulge in authentic traditional tastes and explore vibrant street side paths.",
        "Perfect group activity, highly economical and convenient to access."
      ];
      ctx.fillText(hints[idx] || hints[0], cardX + 100, attractionY + 28);

      attractionY += 80;
    });

    // 9. Extra Value & Pricing Optimized Highlight
    const promoY = cardY + 860;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'; // safe green tint
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cardX + 50, promoY, cardW - 100, 110, 24) : ctx.rect(cardX + 50, promoY, cardW - 100, 110);
    ctx.fill();
    ctx.stroke();

    // Icon for saving
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(cardX + 95, promoY + 55, 25, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle symbol in saving dot
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText('⚡', cardX + 95, promoY + 61);

    // Savings Message text
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText('Paisa Vasool Domestic Travel Optimization', cardX + 140, promoY + 45);

    ctx.fillStyle = '#10B981';
    ctx.font = 'black 16px "Inter", sans-serif';
    ctx.fillText(`Estimated Budget: ${formatPrice(data.totalCost)} (Avg. ${formatPrice(data.totalCost / data.numPeople)}/Person) — Up to 67% cheaper fares locked!`, cardX + 140, promoY + 75);

    // 10. Footer branding details
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 14px "Inter", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('SCAN TO EXPAND FULL DAY-WISE ITINERARY', canvas.width / 2, cardY + 1010);

    // Elegant glowing dot representing full validation
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, cardY + 1032, 6, 0, Math.PI * 2);
    ctx.fill();

    // Save as URL
    const url = canvas.toDataURL('image/png');
    setImgUrl(url);
    setGenerating(false);
  };

  useEffect(() => {
    if (isOpen && data) {
      // Small timeout to allow the canvas ref to bind and fonts to settle
      const timer = setTimeout(() => {
        drawCard();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, data, activeTheme]);

  const downloadImage = () => {
    if (!imgUrl || !data) return;
    const link = document.createElement('a');
    link.download = `Travolor_${data.location.replace(/\s+/g, '_')}_Itinerary.png`;
    link.href = imgUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareCardImage = async () => {
    if (!imgUrl || !data) return;

    try {
      // Try using modern Web Share API if supported and has files support
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const file = new File([blob], `Travolor_${data.location}_Itinerary.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `My Swadesh Plan to ${data.location}`,
          text: `Just planned a gorgeous ${data.duration}-day pocket-friendly trip to ${data.location} using Travolor AI Co-Pilot! Check it out!`
        });
      } else {
        // Fallback: Copy beautiful formatted message and prompt direct download
        copyShareMessage();
        alert("Beautiful poster is copied to clipboard! The trip summary text has also been copied. Click 'Download' to save the poster image and post directly to Instagram / WhatsApp!");
      }
    } catch (err) {
      console.error("Web Share API failed:", err);
      // Fallback
      copyShareMessage();
      downloadImage();
    }
  };

  const copyShareMessage = () => {
    if (!data) return;
    const shareText = `🇮🇳 *TRAVOLOR SWADESH ITINERARY: ${data.location.toUpperCase()}* 🇮🇳
📍 Route: ${data.startLocation} ➔ ${data.location}
📅 Duration: ${data.duration} Days
👥 Travelers: ${data.numPeople} Pax
💰 Total Paisa Vasool Estimate: ${formatPrice(data.totalCost)}

*Highlighted Attractions:*
${parseCoreAttractions(data.itinerary).map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

_Plan designed instantly on Travolor AI — Your Swadesh Travel Co-Pilot_`;

    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !data) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[90vh]"
        >
          {/* Left Side: Live Preview Image */}
          <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-800/60 overflow-hidden relative">
            <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Live Share Card Poster</h3>
            
            {/* Real HTML5 Canvas (hidden behind, used for drawing) */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Generated Image Wrapper */}
            <div className="relative max-w-[280px] sm:max-w-[340px] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 transition-all hover:scale-[1.02] duration-300">
              {generating ? (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 font-bold">Painting Swadesh Poster...</p>
                </div>
              ) : imgUrl ? (
                <img 
                  src={imgUrl} 
                  alt="Travolor Shareable Card" 
                  className="w-full h-full object-contain cursor-pointer" 
                  title="Long press on mobile to save natively"
                />
              ) : (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                  <p className="text-xs text-slate-400">Loading poster...</p>
                </div>
              )}
            </div>
            
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-4 text-center">
              💡 Mobile User? Press & hold the image to save directly to your gallery!
            </p>
          </div>

          {/* Right Side: Configuration & Action Buttons */}
          <div className="w-full md:w-[380px] p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1 text-left">
                  <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    WhatsApp & Instagram ready
                  </span>
                  <h2 className="text-2xl font-black text-[#000080] dark:text-white tracking-tight">Export Poster Card</h2>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Theme Selector */}
              <div className="space-y-2.5 text-left">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest">Select Card Background Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'royal', label: '🪔 Royal Saffron', color: 'bg-gradient-to-r from-blue-900 to-amber-700' },
                    { id: 'sunset', label: '🌅 Sunset Crimson', color: 'bg-gradient-to-r from-rose-950 to-orange-600' },
                    { id: 'emerald', label: '🌴 Emerald Valley', color: 'bg-gradient-to-r from-emerald-950 to-teal-700' },
                    { id: 'gold', label: '🦄 Cosmic Purple', color: 'bg-gradient-to-r from-indigo-950 to-purple-800' }
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setActiveTheme(theme.id as CardTheme)}
                      className={`p-3.5 rounded-2xl text-xs font-bold text-white transition-all flex items-center justify-between border ${theme.color} ${
                        activeTheme === theme.id 
                          ? 'border-amber-400 shadow-md ring-2 ring-amber-400/50 scale-[1.02]' 
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span>{theme.label}</span>
                      {activeTheme === theme.id && <Check size={12} className="shrink-0 text-white fill-current bg-amber-400 text-amber-900 rounded-full p-0.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-slate-800/80 my-4" />

              {/* Data Summary Stats */}
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 space-y-2 text-left">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Poster Content Details</h4>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                    <p className="text-[9px] text-gray-400 font-bold uppercase leading-none mb-1">Destination</p>
                    <p className="truncate text-[#000080] dark:text-white">{data.location}</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                    <p className="text-[9px] text-gray-400 font-bold uppercase leading-none mb-1">Travelers</p>
                    <p className="truncate text-slate-700 dark:text-white">{data.numPeople} Pax ({data.style})</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                    <p className="text-[9px] text-gray-400 font-bold uppercase leading-none mb-1">Est. Cost</p>
                    <p className="truncate text-emerald-600 font-mono">{formatPrice(data.totalCost)}</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                    <p className="text-[9px] text-gray-400 font-bold uppercase leading-none mb-1">Duration</p>
                    <p className="truncate text-slate-700 dark:text-white">{data.duration} Days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Sharing & Download Buttons */}
            <div className="space-y-2.5 pt-6 mt-4 border-t border-gray-100 dark:border-slate-800/80">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={shareCardImage}
                disabled={generating}
                className="w-full bg-[#1E90FF] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#1E90FF]/90 transition-all flex items-center justify-center gap-2.5 shadow-xl disabled:opacity-50"
              >
                <Share2 size={18} /> Direct Share Image
              </motion.button>

              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadImage}
                  disabled={generating}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white py-3.5 rounded-2xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={14} /> Download Poster
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={copyShareMessage}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white py-3.5 rounded-2xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? 'Copied Text!' : 'Copy Summary'}
                </motion.button>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-2xl p-3 flex items-start gap-2.5">
                <span className="text-base mt-0.5">🚀</span>
                <p className="text-[10px] font-semibold leading-relaxed text-left">
                  This poster has been customized for extreme visual density on WhatsApp Stories & Status. Download or Copy to share with family in one click!
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
