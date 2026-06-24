import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, UserPlus, Share2, Vote, MessageSquare, Plus, Trash2, DollarSign, Calculator, Send, Check } from "lucide-react";

interface Member {
  name: string;
  email: string;
  avatar: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  payer: string;
  category: "Hotel" | "Food" | "Fuel" | "Tickets";
}

interface GroupCoordinatorProps {
  user?: { id: string; name: string; email: string; photo?: string } | null;
}

export default function GroupCoordinator({ user }: GroupCoordinatorProps = {}) {
  const [subTab, setSubTab] = useState<"manager" | "splitter">("manager");

  // Determine current user info
  const currentUserName = user?.name || "You";
  const currentUserEmail = user?.email || "historythroughminds@gmail.com";

  // Group Members
  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem("travolor_group_members");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { name: currentUserName, email: currentUserEmail, avatar: "👨‍💻" },
      { name: "Priya", email: "priya@gmail.com", avatar: "👩" },
      { name: "Aarav", email: "aarav@gmail.com", avatar: "🧑" },
      { name: "Rohan", email: "rohan@gmail.com", avatar: "👦" }
    ];
  });

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [shared, setShared] = useState(false);

  // Voting
  const [votes, setVotes] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("travolor_group_votes");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      beach: 5,
      fort: 3,
      scooter: 4
    };
  });
  const [userVoted, setUserVoted] = useState<string | null>(() => {
    return localStorage.getItem("travolor_group_user_voted") || null;
  });

  // Group Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("travolor_group_chat");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: "1", sender: "Priya", text: "Hey guys! Did we finalise the hotel yet?", time: "11:05 AM" },
      { id: "2", sender: "Aarav", text: "Yes! Decided on the beach-side boutique resort.", time: "11:12 AM" },
      { id: "3", sender: "Rohan", text: "Awesome! Let's make sure we try the local specialties on Day 2.", time: "11:20 AM" }
    ];
  });
  const [chatInput, setChatInput] = useState("");

  // Expense Splitter State
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem("travolor_group_expenses");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: "e1", title: "Shared Beach Villa", amount: 12000, payer: currentUserName, category: "Hotel" },
      { id: "e2", title: "Fish Thali Dinner", amount: 3200, payer: "Priya", category: "Food" },
      { id: "e3", title: "Highway Fuel & Transport", amount: 4800, payer: "Rohan", category: "Fuel" }
    ];
  });
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState<number | "">("");
  const [expPayer, setExpPayer] = useState(currentUserName);
  const [expCat, setExpCat] = useState<"Hotel" | "Food" | "Fuel" | "Tickets">("Hotel");

  // Sync state to local storage when changed
  useEffect(() => {
    localStorage.setItem("travolor_group_members", JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem("travolor_group_votes", JSON.stringify(votes));
  }, [votes]);

  useEffect(() => {
    if (userVoted) {
      localStorage.setItem("travolor_group_user_voted", userVoted);
    } else {
      localStorage.removeItem("travolor_group_user_voted");
    }
  }, [userVoted]);

  useEffect(() => {
    localStorage.setItem("travolor_group_chat", JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem("travolor_group_expenses", JSON.stringify(expenses));
  }, [expenses]);

  // Handle user prop changes dynamically
  useEffect(() => {
    if (user?.name) {
      setMembers(prev => {
        const hasUser = prev.some(m => m.name === user.name || m.name === "You");
        if (!hasUser) {
          return [{ name: user.name, email: user.email, avatar: "👨‍💻" }, ...prev];
        }
        return prev.map(m => {
          if (m.name === "You") {
            return { ...m, name: user.name, email: user.email };
          }
          return m;
        });
      });
      setExpPayer(user.name);
    }
  }, [user]);

  // Clear demo data / start fresh
  const handleStartFresh = () => {
    if (window.confirm("Are you sure you want to clear the sample partners and expenses to enter your real ones?")) {
      setMembers([{ name: currentUserName, email: currentUserEmail, avatar: "👨‍💻" }]);
      setExpenses([]);
      setChatMessages([]);
      setVotes({});
      setUserVoted(null);
      setExpPayer(currentUserName);
      localStorage.removeItem("travolor_group_members");
      localStorage.removeItem("travolor_group_votes");
      localStorage.removeItem("travolor_group_user_voted");
      localStorage.removeItem("travolor_group_chat");
      localStorage.removeItem("travolor_group_expenses");
    }
  };

  // Invite Friend action
  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    const avatars = ["👩", "🧑", "👦", "👧", "👱"];
    const randAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    const newMem: Member = {
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      avatar: randAvatar
    };

    setMembers([...members, newMem]);
    setInviteName("");
    setInviteEmail("");
  };

  const handleShare = () => {
    setShared(true);
    setTimeout(() => setShared(false), 2500);
    navigator.clipboard.writeText(window.location.href);
  };

  // Chat message send
  const handleSendGroupMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const msg: ChatMessage = {
      id: Date.now().toString(),
      sender: "You",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages([...chatMessages, msg]);
    setChatInput("");

    // Simulate quick friendly auto-reply
    setTimeout(() => {
      const bots = ["Priya", "Aarav", "Rohan"];
      const replies = [
        "Perfect! Added this to my calendar.",
        "That sounds super fun! Can't wait.",
        "Agree, let's stick to this budget plan!"
      ];
      const randIdx = Math.floor(Math.random() * bots.length);
      const autoMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: bots[randIdx],
        text: replies[randIdx],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, autoMsg]);
    }, 1500);
  };

  // Vote toggle
  const castVote = (id: string) => {
    if (userVoted === id) {
      setVotes({ ...votes, [id]: votes[id] - 1 });
      setUserVoted(null);
    } else {
      const updated = { ...votes };
      if (userVoted) {
        updated[userVoted] = votes[userVoted] - 1;
      }
      updated[id] = votes[id] + 1;
      setVotes(updated);
      setUserVoted(id);
    }
  };

  // Add Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount) return;

    const newExp: Expense = {
      id: Date.now().toString(),
      title: expTitle.trim(),
      amount: Number(expAmount),
      payer: expPayer,
      category: expCat
    };

    setExpenses([...expenses, newExp]);
    setExpTitle("");
    setExpAmount("");
  };

  // Delete Expense
  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // Calculate debt sharing balances
  const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
  const perPersonShare = members.length > 0 ? Math.round(totalSpent / members.length) : 0;

  // Track how much each paid
  const paidMap: Record<string, number> = {};
  members.forEach((m) => {
    paidMap[m.name] = expenses
      .filter(e => e.payer === m.name)
      .reduce((acc, e) => acc + e.amount, 0);
  });

  // Balances: paid - share
  const balances = members.map((m) => ({
    name: m.name,
    balance: (paidMap[m.name] || 0) - perPersonShare
  }));

  // Debt split calculation algorithm
  const settlements: { from: string; to: string; amount: number }[] = [];
  const debtors = balances.filter(b => b.balance < 0).map(b => ({ ...b }));
  const creditors = balances.filter(b => b.balance > 0).map(b => ({ ...b }));

  // Sort descending
  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const oweAmount = Math.min(Math.abs(debtor.balance), creditor.balance);
    if (oweAmount > 0) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(oweAmount)
      });
    }

    debtor.balance += oweAmount;
    creditor.balance -= oweAmount;

    if (Math.abs(debtor.balance) < 1) dIdx++;
    if (creditor.balance < 1) cIdx++;
  }

  const VOTES_TOTAL = Object.values(votes).reduce((acc, v) => acc + v, 0);

  return (
    <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-xl text-left">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-[#1E90FF] flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <h4 className="text-[#000080] dark:text-[#1E90FF] font-black text-lg">Group Coordinator</h4>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Coordinated Trips & Equal Ledger Splitting</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartFresh}
            className="px-3.5 py-2 rounded-xl text-[10px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 transition-all flex items-center gap-1 cursor-pointer"
            title="Clear dummy data and start fresh"
          >
            🧹 Start Fresh
          </button>

          <div className="bg-gray-50 dark:bg-slate-900 p-0.5 rounded-xl flex items-center text-[10px] font-extrabold border border-gray-100/10">
            <button
              onClick={() => setSubTab("manager")}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === "manager"
                  ? "bg-white dark:bg-slate-800 text-[#1E90FF] shadow-sm font-black"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              }`}
            >
              <Users size={12} />
              Invite & Chat
            </button>
            <button
              onClick={() => setSubTab("splitter")}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === "splitter"
                  ? "bg-white dark:bg-slate-800 text-[#1E90FF] shadow-sm font-black"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              }`}
            >
              <Calculator size={12} />
              Expense Splitter
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {subTab === "manager" && (
          <motion.div
            key="manager"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Column: Invite & Members (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-gray-50/50 dark:bg-[#0E1335]/20 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Group Partners</span>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 text-xs text-[#1E90FF] font-bold"
                  >
                    {shared ? <Check size={12} className="text-emerald-500 animate-bounce" /> : <Share2 size={12} />}
                    {shared ? "Link Copied!" : "Share Link"}
                  </button>
                </div>

                {/* Avatar List */}
                <div className="flex flex-wrap gap-2.5 mb-5">
                  {members.map((mem, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-gray-100/10 p-2 rounded-xl text-xs font-bold shadow-sm"
                    >
                      <span className="text-sm">{mem.avatar}</span>
                      <div>
                        <h6 className="text-slate-800 dark:text-white leading-tight">{mem.name}</h6>
                        <span className="text-[8px] text-gray-400 font-mono block leading-none mt-0.5">{mem.email}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Invite Friend Form */}
                <form onSubmit={handleInvite} className="space-y-2.5 pt-3 border-t border-gray-100/50">
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#1E90FF] font-extrabold mb-1">
                    <UserPlus size={12} />
                    Invite Trip Buddy
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                    <input
                      type="text"
                      required
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Name (e.g. Priya)"
                      className="w-full bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-3 py-2 outline-none text-slate-700 dark:text-slate-100"
                    />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-3 py-2 outline-none text-slate-700 dark:text-slate-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#000080] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus size={12} />
                    Send Group Invite
                  </button>
                </form>
              </div>

              {/* Group Voting on Places */}
              <div className="bg-gray-50/50 dark:bg-[#0E1335]/20 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-500 font-black mb-1">
                  <Vote size={14} className="animate-pulse" />
                  Live Attraction Voting
                </div>
                <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                  Where should we watch the sunset on Day 1?
                </h6>

                <div className="space-y-3.5 mt-3">
                  {[
                    { id: "beach", name: "Anjuna Beach Sunset Party", icon: "🏝️" },
                    { id: "fort", name: "Fort Aguada Cliff Watch", icon: "🏰" },
                    { id: "scooter", name: "Panaji Heritage Mandovi Cruise", icon: "🚢" }
                  ].map((opt) => {
                    const count = votes[opt.id] || 0;
                    const pct = VOTES_TOTAL > 0 ? Math.round((count / VOTES_TOTAL) * 100) : 0;
                    const selected = userVoted === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => castVote(opt.id)}
                        className="w-full text-left focus:outline-none block"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          <span className="flex items-center gap-1">
                            {opt.icon} {opt.name} {selected && "✅"}
                          </span>
                          <span className="font-mono">{count} votes ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${selected ? "bg-[#1E90FF]" : "bg-[#000080]/60"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Group Chat (7 cols) */}
            <div className="lg:col-span-7 bg-gray-50/50 dark:bg-[#0E1335]/10 p-4 sm:p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 h-[480px] flex flex-col justify-between overflow-hidden">
              <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-slate-800/60 shrink-0">
                <MessageSquare className="text-[#1E90FF]" size={16} />
                <div>
                  <h5 className="font-bold text-sm text-[#000080] dark:text-blue-400">Road Trip Group Chat</h5>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Online: {members.length} partners</span>
                </div>
              </div>

              {/* Chat Feed */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1 scrollbar-thin">
                {chatMessages.map((msg) => {
                  const isMe = msg.sender === "You";
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}
                    >
                      <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-xs shrink-0">
                        {msg.sender === "You" ? "👨‍💻" : msg.sender === "Priya" ? "👩" : msg.sender === "Aarav" ? "🧑" : "👦"}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[9px] font-bold text-gray-400 font-mono ${isMe ? "text-right" : "text-left"}`}>
                          {msg.sender}
                        </span>
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                            isMe
                              ? "bg-[#1E90FF] text-white"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-gray-100/5 shadow-sm"
                          }`}
                          style={{ borderRadius: isMe ? "14px 0px 14px 14px" : "0px 14px 14px 14px" }}
                        >
                          {msg.text}
                        </div>
                        <span className={`text-[7px] font-bold text-gray-400 font-mono ${isMe ? "text-right" : "text-left"}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Tray */}
              <form onSubmit={handleSendGroupMessage} className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-slate-800/60 shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask group trip buddies..."
                  className="flex-1 bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-100 placeholder-gray-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-10 h-10 bg-[#1E90FF] hover:bg-[#000080] text-white flex items-center justify-center rounded-xl shrink-0 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-blue-500/10"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {subTab === "splitter" && (
          <motion.div
            key="splitter"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header info bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-blue-50/40 dark:bg-blue-950/10 p-3.5 rounded-2xl border border-blue-500/5">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest font-extrabold block">Total Ledger Spent</span>
                <span className="text-base font-black text-[#1E90FF] block mt-1">₹{totalSpent.toLocaleString()}</span>
              </div>
              <div className="bg-purple-50/40 dark:bg-purple-950/10 p-3.5 rounded-2xl border border-purple-500/5">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest font-extrabold block">Number of Sharers</span>
                <span className="text-base font-black text-purple-600 dark:text-purple-400 block mt-1">{members.length} Friends</span>
              </div>
              <div className="bg-emerald-50/40 dark:bg-emerald-950/10 p-3.5 rounded-2xl border border-emerald-500/5">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest font-extrabold block">Per Person Share</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block mt-1">₹{perPersonShare.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <form onSubmit={handleAddExpense} className="p-4 sm:p-5 rounded-[2rem] bg-gray-50/50 dark:bg-[#0E1335]/20 border border-gray-100 dark:border-slate-800 space-y-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#1E90FF] font-black block">Log Shared Expense</span>
                  
                  <div className="space-y-2.5 text-xs font-semibold">
                    <input
                      type="text"
                      required
                      value={expTitle}
                      onChange={(e) => setExpTitle(e.target.value)}
                      placeholder="Expense Title (e.g. Seafood Lunch)"
                      className="w-full bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-100 focus:outline-none"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        required
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                        placeholder="Amount in ₹"
                        className="w-full bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-100 focus:outline-none"
                      />
                      <select
                        value={expCat}
                        onChange={(e: any) => setExpCat(e.target.value)}
                        className="w-full bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-700 dark:text-slate-100 focus:outline-none font-bold"
                      >
                        <option value="Hotel">🏨 Hotel</option>
                        <option value="Food">🍲 Food</option>
                        <option value="Fuel">⛽ Fuel</option>
                        <option value="Tickets">🎟️ Tickets</option>
                      </select>
                    </div>

                    <select
                      value={expPayer}
                      onChange={(e) => setExpPayer(e.target.value)}
                      className="w-full bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-700 dark:text-slate-100 focus:outline-none font-bold"
                    >
                      {members.map((m, mIdx) => (
                        <option key={mIdx} value={m.name}>🧑 Paid by {m.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-tr from-[#000080] to-[#1E90FF] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={12} />
                    Log Shared Ledger
                  </button>
                </form>

                {/* Settlements box */}
                <div className="p-4 sm:p-5 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 space-y-3">
                  <h6 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Calculator size={14} /> Settlement Plan
                  </h6>

                  <div className="space-y-2">
                    {settlements.length === 0 ? (
                      <p className="text-[10px] text-gray-400 font-bold leading-none">Balances are perfectly matched! No settlements needed.</p>
                    ) : (
                      settlements.map((st, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <span>
                            🧑 <strong>{st.from}</strong> owes <strong>{st.to}</strong>
                          </span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{st.amount.toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Expense List (7 cols) */}
              <div className="lg:col-span-7 bg-gray-50/50 dark:bg-[#0E1335]/10 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 space-y-3.5 h-[340px] overflow-y-auto pr-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Ledger Expenses</span>

                <div className="space-y-2.5">
                  {expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {exp.category === "Hotel" ? "🏨" : exp.category === "Food" ? "🍲" : exp.category === "Fuel" ? "⛽" : "🎟️"}
                        </span>
                        <div>
                          <h6 className="font-bold text-xs text-slate-800 dark:text-white leading-tight">{exp.title}</h6>
                          <span className="text-[9px] text-gray-400 font-bold mt-0.5 block leading-none">
                            Paid by {exp.payer} • Category: {exp.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-black text-slate-800 dark:text-white">
                          ₹{exp.amount.toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 text-rose-500 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
