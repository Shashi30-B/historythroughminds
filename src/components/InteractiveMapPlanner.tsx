import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Map, Pin, Sparkles, Navigation, Play, Trash2, Plus, Zap, Shuffle } from "lucide-react";

interface Node {
  id: string;
  name: string;
  x: number; // coordinate representation
  y: number;
  lat: number;
  lng: number;
  description: string;
}

const PRESETS: Record<string, Node[]> = {
  goa: [
    { id: "1", name: "Anjuna Beach", x: 120, y: 80, lat: 15.5828, lng: 73.7411, description: "Famed for golden sands, trance parties, and flea markets." },
    { id: "2", name: "Calangute Beach", x: 140, y: 120, lat: 15.5442, lng: 73.7550, description: "Busiest beach in North Goa with heavy water sports." },
    { id: "3", name: "Fort Aguada", x: 110, y: 180, lat: 15.4926, lng: 73.7739, description: "17th-century Portuguese fortress and lighthouse." },
    { id: "4", name: "Panaji City", x: 220, y: 220, lat: 15.4909, lng: 73.8278, description: "State capital with colorful Latin quarters." },
    { id: "5", name: "Basilica of Bom Jesus", x: 340, y: 240, lat: 15.5039, lng: 73.9115, description: "UNESCO World Heritage site holding relic of St. Francis Xavier." }
  ],
  golden: [
    { id: "1", name: "India Gate, Delhi", x: 150, y: 60, lat: 28.6129, lng: 77.2295, description: "War memorial archway on the Rajpath." },
    { id: "2", name: "Taj Mahal, Agra", x: 280, y: 180, lat: 27.1751, lng: 78.0421, description: "The ultimate monument of eternal love." },
    { id: "3", name: "Fatehpur Sikri", x: 230, y: 220, lat: 27.0945, lng: 77.6679, description: "Red sandstone Mughal palace city ruins." },
    { id: "4", name: "Hawa Mahal, Jaipur", x: 80, y: 200, lat: 26.9239, lng: 75.8267, description: "Palace of winds with intricate pink screens." },
    { id: "5", name: "Amer Fort, Jaipur", x: 90, y: 130, lat: 26.9855, lng: 75.8513, description: "Stunning hilltop fortress with majestic halls." }
  ]
};

export default function InteractiveMapPlanner() {
  const [activePreset, setActivePreset] = useState<"goa" | "golden">("goa");
  const [nodes, setNodes] = useState<Node[]>(PRESETS.goa);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [customName, setCustomName] = useState("");
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  // Calculate distance between two points using Haversine formula
  const getHaversineDistance = (n1: Node, n2: Node) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((n2.lat - n1.lat) * Math.PI) / 180;
    const dLng = ((n2.lng - n1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((n1.lat * Math.PI) / 180) *
        Math.cos((n2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    // Recalculate total distance & driving times
    if (nodes.length <= 1) {
      setTotalDistance(0);
      setTotalTime(0);
      return;
    }

    let dist = 0;
    for (let i = 0; i < nodes.length - 1; i++) {
      dist += getHaversineDistance(nodes[i], nodes[i + 1]);
    }
    setTotalDistance(dist);
    // Assumed average speed of 45 km/h for road travel
    const hrs = dist / 45;
    setTotalTime(hrs * 60); // in minutes
  }, [nodes]);

  const loadPreset = (key: "goa" | "golden") => {
    setActivePreset(key);
    setNodes(PRESETS[key]);
    setSelectedNode(null);
  };

  // Add custom coordinate point click on visual stage
  const handleStageClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    // Formulate realistic lat/lng surrounding current center
    const baseNode = nodes[0] || { lat: 15.5, lng: 73.8 };
    const latOffset = (200 - y) * 0.0015;
    const lngOffset = (x - 200) * 0.0015;

    const newNode: Node = {
      id: Date.now().toString(),
      name: customName.trim() || `Attraction Pin #${nodes.length + 1}`,
      x,
      y,
      lat: baseNode.lat + latOffset,
      lng: baseNode.lng + lngOffset,
      description: "Custom plotted destination node."
    };

    setNodes([...nodes, newNode]);
    setSelectedNode(newNode);
    setCustomName("");
  };

  const deleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = nodes.filter(n => n.id !== id);
    setNodes(updated);
    if (selectedNode?.id === id) {
      setSelectedNode(null);
    }
  };

  // Greedy Route Optimization (TSP Nearest Neighbor)
  const optimizeRoute = () => {
    if (nodes.length <= 2) return;

    const unvisited = [...nodes];
    const optimized: Node[] = [];
    
    // Start with the first node
    let current = unvisited.shift()!;
    optimized.push(current);

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const d = getHaversineDistance(current, unvisited[i]);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }

      current = unvisited.splice(nearestIdx, 1)[0];
      optimized.push(current);
    }

    setNodes(optimized);
  };

  // Draw smooth SVG path
  let pathD = "";
  if (nodes.length > 1) {
    pathD = `M ${nodes[0].x} ${nodes[0].y}`;
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      // Draw bezier curves for an elegant aesthetics instead of straight robotic lines
      const cpX1 = prev.x + (curr.x - prev.x) * 0.5;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) * 0.5;
      const cpY2 = curr.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
  }

  return (
    <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-xl text-left">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Planner controls */}
        <div className="flex-1 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-[#1E90FF] flex items-center justify-center">
                <Map size={20} />
              </div>
              <div>
                <h4 className="text-[#000080] dark:text-[#1E90FF] font-black text-lg">Interactive Map Planner</h4>
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Plot, Rearrange & Optimize Routes</p>
              </div>
            </div>
          </div>

          {/* Quick Select Preset Paths */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-2">Select Active Circuit</span>
            <div className="flex gap-2">
              <button
                onClick={() => loadPreset("goa")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  activePreset === "goa"
                    ? "bg-[#1E90FF]/10 text-[#1E90FF] border-[#1E90FF]/30"
                    : "bg-gray-50 dark:bg-slate-900 border-gray-100/10 text-gray-500 hover:text-gray-700"
                }`}
              >
                🏝️ South Goa Hop
              </button>
              <button
                onClick={() => loadPreset("golden")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  activePreset === "golden"
                    ? "bg-[#1E90FF]/10 text-[#1E90FF] border-[#1E90FF]/30"
                    : "bg-gray-50 dark:bg-slate-900 border-gray-100/10 text-gray-500 hover:text-gray-700"
                }`}
              >
                🕌 Golden Triangle
              </button>
            </div>
          </div>

          {/* New Node Setup */}
          <div className="bg-gray-50/50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 p-4 rounded-3xl">
            <span className="text-[10px] uppercase tracking-wider text-[#1E90FF] font-extrabold block mb-2">Plotted Point Label</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Type location name, then tap on the canvas map"
                className="flex-1 bg-white dark:bg-[#060818] border border-gray-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Optimize CTA */}
          <div className="flex gap-2">
            <button
              onClick={optimizeRoute}
              disabled={nodes.length <= 2}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/10 cursor-pointer"
            >
              <Zap size={14} className="animate-bounce" />
              Optimize Route Path
            </button>
            <button
              onClick={() => setNodes([])}
              className="px-4 py-3 rounded-2xl bg-gray-50 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-950/20 text-gray-400 hover:text-rose-500 transition-all cursor-pointer border border-gray-100/10"
              title="Clear all"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-slate-800 font-mono text-xs">
            <div className="bg-blue-50/40 dark:bg-blue-950/10 p-3 rounded-2xl border border-blue-500/5">
              <span className="text-[9px] text-gray-400 uppercase tracking-widest font-extrabold block">Route Distance</span>
              <span className="text-sm font-black text-[#1E90FF] block mt-1">{totalDistance.toFixed(1)} km</span>
            </div>
            <div className="bg-teal-50/40 dark:bg-teal-950/10 p-3 rounded-2xl border border-teal-500/5">
              <span className="text-[9px] text-gray-400 uppercase tracking-widest font-extrabold block">Est. Drive Time</span>
              <span className="text-sm font-black text-teal-600 dark:text-teal-400 block mt-1">
                {totalTime < 60 ? `${Math.round(totalTime)} mins` : `${Math.floor(totalTime / 60)}h ${Math.round(totalTime % 60)}m`}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Canvas Board */}
        <div className="w-full lg:w-[450px] space-y-4">
          <div className="relative h-[340px] w-full rounded-[2rem] bg-[#FAFAFE] dark:bg-[#060818] border border-gray-100 dark:border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
            {/* Background Map Grid Pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="canvas-map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-slate-800" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#canvas-map-grid)" />
            </svg>

            {/* Stage Canvas */}
            <svg
              className="absolute inset-0 w-full h-full cursor-crosshair z-10"
              onClick={handleStageClick}
            >
              {/* Route line */}
              {nodes.length > 1 && (
                <>
                  <path d={pathD} fill="none" stroke="#1E90FF" strokeWidth="6" strokeLinecap="round" className="opacity-15 blur-[2px]" />
                  <path d={pathD} fill="none" stroke="#1E90FF" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5,3" />
                </>
              )}

              {/* Pins */}
              {nodes.map((n, idx) => {
                const isSelected = selectedNode?.id === n.id;
                return (
                  <g
                    key={n.id}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(n);
                    }}
                  >
                    {isSelected && (
                      <circle cx={n.x} cy={n.y} r="18" fill="#1E90FF" className="opacity-25 animate-pulse" />
                    )}
                    {/* Circle Indicator */}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={isSelected ? "10" : "7"}
                      fill={isSelected ? "#1E90FF" : "#000080"}
                      stroke="white"
                      strokeWidth="2"
                      className="transition-all duration-300"
                    />
                    {/* Label Index */}
                    <text
                      x={n.x}
                      y={n.y + 3}
                      textAnchor="middle"
                      fill="white"
                      className="text-[8px] font-extrabold font-mono"
                    >
                      {idx + 1}
                    </text>
                  </g>
                );
              })}
            </svg>

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-gray-400 z-0">
                <Navigation className="animate-bounce text-gray-300 mb-3" size={32} />
                <p className="text-xs font-bold">Tap anywhere on the grid canvas to plot route pins!</p>
                <p className="text-[10px] mt-1">First give a name above to label your plotted points.</p>
              </div>
            )}

            {/* Info Card inside map */}
            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-[#0B0F2B]/95 border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-xl z-20 backdrop-blur text-left flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-[#1E90FF] shrink-0 flex items-center justify-center text-xs font-black font-mono">
                    {nodes.indexOf(selectedNode) + 1}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-xs text-[#000080] dark:text-[#1E90FF] leading-tight">{selectedNode.name}</h5>
                    <p className="text-[9px] text-gray-400 font-bold font-mono tracking-tight mt-0.5">
                      Lat: {selectedNode.lat.toFixed(4)}°N | Lng: {selectedNode.lng.toFixed(4)}°E
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                      {selectedNode.description}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteNode(selectedNode.id, e)}
                    className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 text-rose-500 flex items-center justify-center transition-all shrink-0"
                    title="Remove Node"
                  >
                    <Trash2 size={12} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* List display */}
          <div className="bg-gray-50/50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 p-4 rounded-3xl max-h-[120px] overflow-y-auto">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block mb-2 font-mono">Current Route Stop Sequence</span>
            <div className="space-y-1.5">
              {nodes.map((n, idx) => (
                <div key={n.id} className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <span className="truncate">
                    {idx + 1}. <strong className="text-slate-900 dark:text-white font-bold">{n.name}</strong>
                  </span>
                  <span className="text-[9px] font-mono text-gray-400 shrink-0">Stop #{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
