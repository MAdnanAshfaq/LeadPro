"use client";

import { useEffect, useState } from "react";
import io from "socket.io-client";
import Map from "../../components/Map";
import ResultsTable from "../../components/ResultsTable";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  useEffect(() => {
    // Connect to the Node.js API WebSocket
    const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000");

    socket.on("connect", () => {
      console.log("Connected to real-time stream");
    });

    socket.on("job-completed", (data) => {
      console.log("Scrape completed", data);
      if (data.result) {
        setLeads((prev) => [...prev, ...data.result]);
      }
      setIsScraping(false);
    });

    socket.on("job-progress", (data) => {
      console.log("Progress:", data.progress);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !location) return;

    setIsScraping(true);
    setLeads([]);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, location, filters: {} }),
      });
      const data = await res.json();
      console.log("Job queued:", data.jobId);
    } catch (err) {
      console.error(err);
      setIsScraping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 pt-24">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Lead Intelligence</h1>
            <p className="text-zinc-400 mt-1">Real-time mapping and extraction</p>
          </div>
          
          <form onSubmit={handleSearch} className="flex flex-1 md:max-w-lg gap-3">
            <input 
              type="text" 
              placeholder="Niche (e.g., Plumbers)" 
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="City (e.g., Miami)" 
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={isScraping}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 rounded-xl font-medium transition-colors flex items-center justify-center min-w-[120px]"
            >
              {isScraping ? (
                <span className="flex h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </button>
          </form>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 h-[600px]">
          {/* Results Table Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col"
          >
            <h2 className="text-xl font-semibold mb-4 text-white/90">Extracted Leads <span className="text-indigo-400">({leads.length})</span></h2>
            <div className="flex-1 overflow-auto rounded-2xl">
              <ResultsTable leads={leads.map((l, i) => ({ id: String(i), name: l.name, location: l.location, source: l.source }))} />
            </div>
          </motion.div>

          {/* Map Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="h-full flex flex-col"
          >
            <h2 className="text-xl font-semibold mb-4 text-white/90">Competitor Map</h2>
            <div className="flex-1 rounded-2xl">
              {/* Default coordinates for Miami roughly, will make dynamic later */}
              <Map center={[-80.1917, 25.7617]} zoom={11} />
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
