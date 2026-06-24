import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Send, Bot, Sparkles, HelpCircle, Utensils, Landmark, Lightbulb, Compass } from "lucide-react";

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

const CHIPS: Record<string, string[]> = {
  copilot: [
    "What are the best 3-day routes in India?",
    "Tell me about visa requirements for Indian citizens visiting Europe.",
    "Recommend some off-beat hill stations near Mumbai."
  ],
  foodie: [
    "What street food must I try in Old Delhi?",
    "Recommend iconic heritage restaurants in Kolkata.",
    "Where can I find authentic wood-fired pizzas in Goa?"
  ],
  historian: [
    "Tell me the ancient history behind Hampi's ruins.",
    "What secrets lie inside Jaipur's Hawa Mahal?",
    "Explain the architectural marvel of Brihadeeswarar Temple."
  ],
  budget: [
    "How can I travel across Kerala on a ultra-low budget?",
    "Suggest free-entry tourist attractions in Singapore.",
    "What are the best hacks to save money on booking trains in India?"
  ]
};

export default function AICompanionChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "bot",
      text: "Namaste! I am your premium AI Travel Co-Pilot. Ask me anything about routes, destinations, local foods, cultural experiences, packing, visa guides, or budget hacks. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [botRole, setBotRole] = useState<"copilot" | "foodie" | "historian" | "budget">("copilot");
  const [chatMode, setChatMode] = useState<"fast" | "general" | "complex">("general");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      // Map existing messages to format expected by server
      const apiMessages = messages.map(m => ({
        text: m.text,
        role: m.sender === "user" ? "user" : "model"
      }));
      apiMessages.push({ text: textToSend, role: "user" });

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          mode: chatMode,
          botRole: botRole,
          language: "English"
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: data.reply || data.text || "I apologize, I could not generate a response. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error("Chat endpoint error");
      }
    } catch (err) {
      console.error("Failed to send chat message:", err);
      // Fallback
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: `I'm currently operating in offline backup mode. Regarding your question about "${textToSend}": I highly recommend checking out local transport timetables and reviewing curated budget guides! To provide deep generative answers, please ensure your GEMINI_API_KEY is properly configured. Let me know if you have any other questions!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-4 sm:p-6 shadow-xl h-[650px] flex flex-col overflow-hidden text-left">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#000080] to-[#1E90FF] text-white flex items-center justify-center relative">
            <Bot size={22} className={loading ? "animate-spin" : "animate-pulse"} />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-[#0B0F2B]" />
          </div>
          <div>
            <h4 className="text-[#000080] dark:text-[#1E90FF] font-black text-lg flex items-center gap-2">
              AI Travel Companion
            </h4>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Premium Custom Travel Guidance</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Persona selector */}
          <select
            value={botRole}
            onChange={(e: any) => setBotRole(e.target.value)}
            className="text-xs bg-gray-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl px-2.5 py-1.5 outline-none border border-gray-100 dark:border-slate-800 hover:bg-gray-100 transition-all font-bold"
          >
            <option value="copilot">🌐 Co-Pilot Agent</option>
            <option value="foodie">🍲 Culinary Expert</option>
            <option value="historian">🏛️ Historical Guide</option>
            <option value="budget">💡 Budget Hacks Specialist</option>
          </select>

          {/* Speed / Intelligence Mode */}
          <div className="bg-gray-100 dark:bg-slate-900 p-0.5 rounded-xl flex items-center text-[9px] font-extrabold shadow-inner border border-gray-100/10">
            {(["fast", "general", "complex"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setChatMode(m)}
                className={`px-2 py-1 rounded-lg transition-all capitalize ${
                  chatMode === m
                    ? "bg-white dark:bg-slate-800 text-[#1E90FF] shadow-sm font-black"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-800">
        {messages.map((m) => {
          const isBot = m.sender === "bot";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 max-w-[85%] ${isBot ? "self-start" : "ml-auto flex-row-reverse"}`}
            >
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs ${
                  isBot
                    ? "bg-blue-50 dark:bg-blue-950/20 text-[#1E90FF]"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {isBot ? <Bot size={14} /> : "👤"}
              </div>
              <div className="flex flex-col gap-1">
                <div
                  className={`px-4 py-3 rounded-2xl text-xs font-semibold leading-relaxed ${
                    isBot
                      ? "bg-blue-50/50 dark:bg-[#151D44]/30 text-slate-700 dark:text-slate-200 border border-blue-500/5"
                      : "bg-[#1E90FF] text-white shadow-md shadow-blue-500/10"
                  }`}
                  style={{ borderRadius: isBot ? "0px 16px 16px 16px" : "16px 0px 16px 16px" }}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>
                <span className={`text-[8px] font-bold text-gray-400 font-mono tracking-wider ${isBot ? "text-left" : "text-right"}`}>
                  {m.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-2.5 max-w-[85%]">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-[#1E90FF] shrink-0 flex items-center justify-center text-xs">
              <Bot size={14} className="animate-spin" />
            </div>
            <div className="bg-blue-50/40 dark:bg-[#151D44]/20 px-4 py-3 rounded-2xl border border-blue-500/5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E90FF] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E90FF] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E90FF] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Recommended Prompt Chips */}
      <div className="py-2 border-t border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={11} className="text-[#1E90FF] animate-pulse" />
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#1E90FF] font-mono">Suggested Questions</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1.5 whitespace-nowrap scrollbar-none">
          {CHIPS[botRole].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-[#1E90FF] transition-all shrink-0 cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Input Tray */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-slate-800"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask the ${botRole} specialist anything...`}
          className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:border-[#1E90FF]/40 transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          className="w-11 h-11 rounded-2xl bg-[#1E90FF] hover:bg-[#000080] text-white flex items-center justify-center transition-all shadow-lg hover:shadow-blue-500/20 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
