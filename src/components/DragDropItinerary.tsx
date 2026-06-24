import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ListOrdered, ArrowUp, ArrowDown, Plus, Trash2, Clock, MapPin, CheckCircle, Sparkles, DollarSign } from "lucide-react";

interface Activity {
  id: string;
  time: string;
  title: string;
  cost: number;
  location: string;
  completed: boolean;
}

interface DayPlan {
  day: number;
  title: string;
  activities: Activity[];
}

const INITIAL_DAYS: DayPlan[] = [
  {
    day: 1,
    title: "Arrival & Historic Explorer",
    activities: [
      { id: "a1", time: "09:00 AM", title: "Check-in at Heritage Resort", cost: 0, location: "Colaba, Mumbai", completed: true },
      { id: "a2", time: "11:30 AM", title: "Guided tour of Gateway of India", cost: 250, location: "Apollo Bandar, Mumbai", completed: false },
      { id: "a3", time: "02:00 PM", title: "Delectable Parsi lunch at Britannia & Co.", cost: 850, location: "Fort, Mumbai", completed: false },
      { id: "a4", time: "05:00 PM", title: "Evening walk along Marine Drive", cost: 0, location: "Netaji Subhash Road", completed: false }
    ]
  },
  {
    day: 2,
    title: "Beaches & Culinary Delights",
    activities: [
      { id: "b1", time: "08:30 AM", title: "Sunrise beach yoga session", cost: 300, location: "Juhu Beach", completed: false },
      { id: "b2", time: "11:00 AM", title: "Visit ancient Kanheri Caves", cost: 100, location: "Sanjay Gandhi National Park", completed: false },
      { id: "b3", time: "03:00 PM", title: "Traditional shopping tour", cost: 0, location: "Colaba Causeway", completed: false },
      { id: "b4", time: "07:30 PM", title: "Seafood dinner & beach shack party", cost: 1500, location: "Baga Shack, North Goa", completed: false }
    ]
  }
];

export default function DragDropItinerary() {
  const [days, setDays] = useState<DayPlan[]>(() => {
    try {
      const saved = localStorage.getItem("travolor_drag_drop_days");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_DAYS;
  });
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // Sync state to local storage when changed
  useEffect(() => {
    localStorage.setItem("travolor_drag_drop_days", JSON.stringify(days));
  }, [days]);

  // Clear demo days and start fresh
  const handleStartFresh = () => {
    if (window.confirm("Are you sure you want to clear this entire itinerary to build your own from scratch?")) {
      setDays([
        {
          day: 1,
          title: "My Custom Explorations",
          activities: []
        }
      ]);
      setSelectedDayIdx(0);
      localStorage.removeItem("travolor_drag_drop_days");
    }
  };

  // New activity form state
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("10:00 AM");
  const [newCost, setNewCost] = useState(0);
  const [newLoc, setNewLoc] = useState("");

  const currentDay = days[selectedDayIdx];

  // Reorder activity up
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const list = [...currentDay.activities];
    const temp = list[idx];
    list[idx] = list[idx - 1];
    list[idx - 1] = temp;

    updateActivities(list);
  };

  // Reorder activity down
  const moveDown = (idx: number) => {
    if (idx === currentDay.activities.length - 1) return;
    const list = [...currentDay.activities];
    const temp = list[idx];
    list[idx] = list[idx + 1];
    list[idx + 1] = temp;

    updateActivities(list);
  };

  const updateActivities = (newList: Activity[]) => {
    const updatedDays = days.map((d, dIdx) => {
      if (dIdx === selectedDayIdx) {
        return { ...d, activities: newList };
      }
      return d;
    });
    setDays(updatedDays);
  };

  // Add custom location/activity
  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newAct: Activity = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      time: newTime,
      cost: Number(newCost) || 0,
      location: newLoc.trim() || "Local Attraction",
      completed: false
    };

    updateActivities([...currentDay.activities, newAct]);

    // reset forms
    setNewTitle("");
    setNewCost(0);
    setNewLoc("");
  };

  // Delete activity
  const handleDeleteActivity = (id: string) => {
    const filtered = currentDay.activities.filter(a => a.id !== id);
    updateActivities(filtered);
  };

  // Toggle activity checkbox
  const toggleCompleted = (id: string) => {
    const list = currentDay.activities.map((a) => {
      if (a.id === id) {
        return { ...a, completed: !a.completed };
      }
      return a;
    });
    updateActivities(list);
  };

  // Move entire day up
  const moveDayUp = () => {
    if (selectedDayIdx === 0) return;
    const list = [...days];
    const temp = list[selectedDayIdx];
    list[selectedDayIdx] = list[selectedDayIdx - 1];
    list[selectedDayIdx - 1] = temp;
    
    // swap their numerical index
    list[selectedDayIdx].day = selectedDayIdx + 1;
    list[selectedDayIdx - 1].day = selectedDayIdx;

    setDays(list);
    setSelectedDayIdx(selectedDayIdx - 1);
  };

  // Move entire day down
  const moveDayDown = () => {
    if (selectedDayIdx === days.length - 1) return;
    const list = [...days];
    const temp = list[selectedDayIdx];
    list[selectedDayIdx] = list[selectedDayIdx + 1];
    list[selectedDayIdx + 1] = temp;

    // swap numerical indices
    list[selectedDayIdx].day = selectedDayIdx + 1;
    list[selectedDayIdx + 1].day = selectedDayIdx + 2;

    setDays(list);
    setSelectedDayIdx(selectedDayIdx + 1);
  };

  // Add new day to itinerary
  const handleAddNewDay = () => {
    const newDayNum = days.length + 1;
    const newDay: DayPlan = {
      day: newDayNum,
      title: `Day ${newDayNum} Custom Explorations`,
      activities: []
    };
    setDays([...days, newDay]);
    setSelectedDayIdx(newDayNum - 1);
  };

  return (
    <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-xl text-left">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-[#1E90FF] flex items-center justify-center">
            <ListOrdered size={20} />
          </div>
          <div>
            <h4 className="text-[#000080] dark:text-[#1E90FF] font-black text-lg">Interactive Itinerary Editor</h4>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Move Activities, Reorder Days & Add Places</p>
          </div>
        </div>

        {/* Day Toggles & Reset */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleStartFresh}
            className="px-3.5 py-2 rounded-xl text-[10px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 transition-all flex items-center gap-1 cursor-pointer"
            title="Wipe entire plan and start fresh"
          >
            🧹 Start Fresh
          </button>

          <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 dark:bg-slate-900 p-1 rounded-2xl">
            {days.map((d, dIdx) => (
              <button
                key={d.day}
                onClick={() => setSelectedDayIdx(dIdx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedDayIdx === dIdx
                    ? "bg-white dark:bg-slate-800 text-[#1E90FF] shadow-md"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
              >
                Day {d.day}
              </button>
            ))}
            <button
              onClick={handleAddNewDay}
              className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-[#1E90FF]/10 text-[#1E90FF] flex items-center justify-center transition-all cursor-pointer font-bold"
              title="Add new day"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Day details & Add location form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-3xl bg-blue-50/30 dark:bg-[#151D44]/10 border border-blue-500/5">
            <h5 className="font-extrabold text-sm text-[#000080] dark:text-blue-400 uppercase tracking-wider mb-1">
              Day {currentDay.day} Sequence
            </h5>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-bold mb-3">{currentDay.title}</p>

            {/* Move Day Controls */}
            <div className="flex gap-2">
              <button
                disabled={selectedDayIdx === 0}
                onClick={moveDayUp}
                className="flex-1 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-gray-100 text-[10px] font-bold text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-all border border-gray-100 dark:border-slate-700/60 flex items-center justify-center gap-1"
              >
                <ArrowUp size={11} /> Move Day Up
              </button>
              <button
                disabled={selectedDayIdx === days.length - 1}
                onClick={moveDayDown}
                className="flex-1 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-gray-100 text-[10px] font-bold text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-all border border-gray-100 dark:border-slate-700/60 flex items-center justify-center gap-1"
              >
                <ArrowDown size={11} /> Move Day Down
              </button>
            </div>
          </div>

          {/* Add custom location Form */}
          <form onSubmit={handleAddActivity} className="p-4 rounded-3xl bg-gray-50/50 dark:bg-[#0E1335]/30 border border-gray-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={12} className="text-amber-500 animate-pulse" />
              <h5 className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold">Add Custom Activity</h5>
            </div>

            <div className="space-y-2 text-xs font-semibold">
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Activity Title (e.g. Visit Museum)"
                className="w-full bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-100 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="Time (e.g. 02:30 PM)"
                  className="w-full bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-100 focus:outline-none"
                />
                <input
                  type="number"
                  value={newCost || ""}
                  onChange={(e) => setNewCost(Number(e.target.value))}
                  placeholder="Cost in INR (₹)"
                  className="w-full bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <input
                type="text"
                value={newLoc}
                onChange={(e) => setNewLoc(e.target.value)}
                placeholder="Specific Address / Location"
                className="w-full bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#000080] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={12} />
              Add to Day {currentDay.day}
            </button>
          </form>
        </div>

        {/* Dynamic Activity List */}
        <div className="lg:col-span-2 space-y-3 max-h-[380px] overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {currentDay.activities.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl text-gray-400">
                <MapPin className="mx-auto text-gray-300 mb-2" size={24} />
                <p className="text-xs font-bold">This day is currently empty!</p>
                <p className="text-[10px] mt-0.5">Use the left panel to populate custom activities.</p>
              </div>
            ) : (
              currentDay.activities.map((act, idx) => (
                <motion.div
                  layout
                  key={act.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-3xl border transition-all flex items-center justify-between gap-4 ${
                    act.completed
                      ? "bg-gray-50/50 dark:bg-slate-900/10 border-gray-100/60 dark:border-slate-800/40 opacity-75"
                      : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 shadow-sm"
                  }`}
                >
                  {/* Left checkbox & Time */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleCompleted(act.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        act.completed
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-gray-200 dark:border-slate-700 hover:border-[#1E90FF]"
                      }`}
                    >
                      {act.completed && <CheckCircle size={12} className="fill-emerald-500 text-white" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 font-mono text-[9px] font-bold">
                        <Clock size={10} />
                        {act.time}
                        {act.cost > 0 && (
                          <span className="text-emerald-500 font-bold bg-emerald-500/5 px-1.5 rounded-md">
                            ₹{act.cost}
                          </span>
                        )}
                      </div>
                      <h5 className={`font-bold text-xs leading-snug truncate ${
                        act.completed ? "line-through text-gray-400 dark:text-gray-500" : "text-slate-800 dark:text-white"
                      }`}>
                        {act.title}
                      </h5>
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                        <MapPin size={9} />
                        {act.location}
                      </span>
                    </div>
                  </div>

                  {/* Reordering Controls Right */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => moveUp(idx)}
                      className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-all flex items-center justify-center border border-gray-100/10"
                      title="Move Up"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      disabled={idx === currentDay.activities.length - 1}
                      onClick={() => moveDown(idx)}
                      className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-all flex items-center justify-center border border-gray-100/10"
                      title="Move Down"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteActivity(act.id)}
                      className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 text-rose-500 flex items-center justify-center transition-all ml-1"
                      title="Remove Place"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
