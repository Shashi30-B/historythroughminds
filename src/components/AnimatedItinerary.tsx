import React from 'react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import { Calendar, Compass, MapPin, Sparkles, Navigation, Info, ArrowUpRight } from 'lucide-react';

interface AnimatedItineraryProps {
  itinerary: string;
  locationInput: string;
  startLocation: string;
}

interface ParsedSection {
  type: 'intro' | 'day' | 'outro';
  dayNum?: number;
  title?: string;
  content: string;
}

export function AnimatedItinerary({ itinerary, locationInput, startLocation }: AnimatedItineraryProps) {
  // Robust parser to extract Intro, Day Cards, and Outro/Pro-tips
  const parseItinerary = (text: string): ParsedSection[] => {
    if (!text) return [];

    const sections: ParsedSection[] = [];
    
    // Pattern to look for Day Headers: e.g. "Day 1:", "Day 01:", "### Day 1:", "## Day 2", "Day 1 - Theme"
    const dayHeaderRegex = /(?:^|\n)(?:###?\s*)?(Day\s+\d+)(?::|\s\-)?([^\n]*)/gi;
    
    const matches: { index: number; length: number; dayNum: string; title: string }[] = [];
    let match;
    dayHeaderRegex.lastIndex = 0;
    while ((match = dayHeaderRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        dayNum: match[1].trim(),
        title: match[2].trim()
      });
    }

    if (matches.length === 0) {
      // Fallback: If no matches, treat entire text as intro
      return [{ type: 'intro', content: text }];
    }

    // 1. Extract Intro Section (everything before Day 1)
    const introContent = text.substring(0, matches[0].index).trim();
    if (introContent) {
      sections.push({ type: 'intro', content: introContent });
    }

    // 2. Loop through each Day section
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];
      
      let dayContent = "";
      if (nextMatch) {
        dayContent = text.substring(currentMatch.index + currentMatch.length, nextMatch.index).trim();
      } else {
        dayContent = text.substring(currentMatch.index + currentMatch.length).trim();
      }

      // Check if last day has Pro-Tips or Recommendations appended
      let outroContent = "";
      const proTipsRegex = /(?:^|\n)(?:###?\s*)?(?:💡\s*)?(Travolor\s+Pro-Tips|Pro-Tips|Tips|Recommendations)/i;
      const proTipsMatch = dayContent.match(proTipsRegex);
      
      if (proTipsMatch && proTipsMatch.index !== undefined) {
        outroContent = dayContent.substring(proTipsMatch.index).trim();
        dayContent = dayContent.substring(0, proTipsMatch.index).trim();
      }

      // Parse day integer safely
      const numMatch = currentMatch.dayNum.match(/\d+/);
      const dayInt = numMatch ? parseInt(numMatch[0], 10) : (i + 1);

      sections.push({
        type: 'day',
        dayNum: dayInt,
        title: currentMatch.title.replace(/^:\s*/, '').trim() || `Explore & Discover`,
        content: dayContent
      });

      if (outroContent) {
        sections.push({ type: 'outro', content: outroContent });
      }
    }

    return sections;
  };

  const parsedSections = parseItinerary(itinerary);

  // Animation variants for smooth scroll-triggered entrances
  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.97 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring" as const,
        stiffness: 70, 
        damping: 14, 
        mass: 0.8,
        duration: 0.7
      }
    }
  };

  // Render helpers with custom components for beautiful, consistent markdown styling
  const markdownComponents = {
    h4: ({ children }: any) => (
      <h4 className="text-base font-black text-[#000080] dark:text-[#93C5FD] mt-4 mb-2 flex items-center gap-2 tracking-tight">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {children}
      </h4>
    ),
    li: ({ children }: any) => (
      <li className="text-sm text-slate-600 dark:text-slate-300 mb-2 list-none flex items-start gap-2 text-left">
        <span className="text-amber-500 mt-1 shrink-0 text-xs">✦</span>
        <div className="flex-1">{children}</div>
      </li>
    ),
    p: ({ children }: any) => {
      const textContent = React.Children.toArray(children).join('');
      // Beautiful banner style for Taxi/Transport tips
      if (
        textContent.startsWith('🚕') || 
        textContent.toLowerCase().includes('transport tip') || 
        textContent.toLowerCase().includes('taxi tip')
      ) {
        return (
          <div className="bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100/60 dark:border-sky-900/30 text-sky-900 dark:text-sky-300 p-4 rounded-2xl text-xs font-semibold my-4 flex items-start gap-2.5">
            <span className="text-base leading-none shrink-0 mt-0.5">🚕</span>
            <div className="flex-1 text-left">{children}</div>
          </div>
        );
      }
      return <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed my-2.5 text-left">{children}</p>;
    }
  };

  return (
    <div className="space-y-8 relative">
      {parsedSections.map((section, index) => {
        if (section.type === 'intro') {
          return (
            <motion.div
              key={`intro-${index}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-left bg-gradient-to-br from-blue-50/50 via-white to-orange-50/30 dark:from-slate-900/40 dark:via-slate-950 dark:to-slate-900/20 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800/80 shadow-sm"
            >
              <div className="markdown-body prose prose-slate max-w-none prose-headings:text-[#000080] dark:prose-headings:text-white prose-headings:font-black prose-p:text-slate-600 dark:prose-p:text-slate-300">
                <Markdown components={markdownComponents}>{section.content}</Markdown>
              </div>
            </motion.div>
          );
        }

        if (section.type === 'outro') {
          return (
            <motion.div
              key={`outro-${index}`}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="text-left bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950 p-6 md:p-8 rounded-[2.5rem] border border-amber-500/20 dark:border-amber-900/30 shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2.5 mb-4 text-amber-800 dark:text-amber-400">
                <Sparkles className="shrink-0 animate-pulse" size={20} />
                <h3 className="text-lg font-black tracking-tight uppercase">Travolor Local Co-Pilot Tips</h3>
              </div>
              <div className="markdown-body prose prose-slate max-w-none prose-p:text-slate-600 dark:prose-p:text-slate-300">
                <Markdown components={markdownComponents}>{section.content}</Markdown>
              </div>
            </motion.div>
          );
        }

        // Render standard scroll-animated Day Card
        return (
          <div key={`day-${section.dayNum}`} className="relative pl-6 md:pl-12 group">
            {/* Elegant vertical timeline connector line */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/40 via-amber-400/30 to-blue-500/40 group-last:bottom-auto group-last:h-12" />

            {/* Glowing Day badge node on timeline */}
            <div className="absolute left-[-6px] md:left-[6px] top-6 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-950 border-2 border-blue-500 group-hover:border-amber-500 group-hover:scale-125 transition-all duration-300 shadow-[0_0_10px_rgba(30,144,255,0.4)]" />

            <motion.div
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-120px" }}
              className="bg-white dark:bg-slate-900/50 p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800/80 hover:border-amber-500/20 dark:hover:border-amber-500/10 transition-all duration-300 hover:shadow-2xl"
            >
              {/* Card Header row with badge & action tags */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="bg-[#000080] text-white dark:bg-[#1E90FF]/10 dark:text-[#1E90FF] text-xs font-black px-4 py-1.5 rounded-full tracking-wider uppercase shadow-md shrink-0">
                    Day {section.dayNum}
                  </div>
                  <h3 className="text-xl font-black text-[#000080] dark:text-white tracking-tight leading-tight text-left">
                    {section.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto text-[10px] font-black text-gray-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/40 px-3 py-1 rounded-full border border-gray-100/50 dark:border-slate-800/40">
                  <Calendar size={11} className="text-[#1E90FF]" /> {section.dayNum === 1 ? 'Arrival' : `Route Path`}
                </div>
              </div>

              {/* Day Contents */}
              <div className="markdown-body prose prose-slate max-w-none">
                <Markdown components={markdownComponents}>{section.content}</Markdown>
              </div>

              {/* Premium micro interaction footer hint inside card */}
              <div className="mt-4 pt-3 border-t border-dashed border-gray-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1.5">
                  <MapPin size={10} className="text-amber-500" /> Curated for family convenience
                </span>
                <span className="uppercase text-[9px] font-black tracking-wider text-emerald-500 flex items-center gap-1">
                  Verified Optimal • 100% Paisa Vasool
                </span>
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
