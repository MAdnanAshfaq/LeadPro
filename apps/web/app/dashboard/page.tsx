"use client";

import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import ResultsTable from "../../components/ResultsTable";
import DetailPanel from "../../components/DetailPanel";
import Map from "../../components/Map";

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [query, setQuery] = useState("Plumbers");
  const [location, setLocation] = useState("Miami");
  const [targetTitle, setTargetTitle] = useState("Owner");
  const [radius, setRadius] = useState("25 km radius");
  const [isScraping, setIsScraping] = useState(false);
  const [currentTab, setCurrentTab] = useState("leads");
  const [openLead, setOpenLead] = useState<any | null>(null);
  const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);

  // Default Map center (Miami)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-80.1917, 25.7617]);
  
  const lastAutoSearchCoords = useRef<[number, number] | null>(null);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL || "/");

    socket.on("job-completed", (data) => {
      if (data.result) {
        setLeads((prev) => {
          // Unique leads only
          const existingNames = new Set(prev.map(l => l.name));
          const newLeads = data.result.filter((l: any) => !existingNames.has(l.name));
          return [...prev, ...newLeads];
        });
      }
      setIsScraping(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const triggerSearch = async (q: string, loc: string, title?: string) => {
    if (!q || !loc) return;
    setIsScraping(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      await fetch(`${baseUrl}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, location: loc, targetTitle: title || targetTitle, filters: {} }),
      });
    } catch (err) {
      console.error(err);
      setIsScraping(false);
    }
  };

  const [hasSearched, setHasSearched] = useState(false);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeads([]); // Clear everything for a fresh search
    setOpenLead(null);
    setHasSearched(true);
    
    // Geocode the location string to move the map
    if (location) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`);
        const data = await res.json();
        if (data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setMapCenter([lon, lat]);
          lastAutoSearchCoords.current = [lat, lon];
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      }
    }

    triggerSearch(query, location, targetTitle);
  };

  const handleAutoSearch = (lat: number, lng: number) => {
    if (!hasSearched || isScraping) return; // Only auto-scan AFTER the first manual search

    if (lastAutoSearchCoords.current) {
      const dist = Math.sqrt(Math.pow(lat - lastAutoSearchCoords.current[0], 2) + Math.pow(lng - lastAutoSearchCoords.current[1], 2));
      if (dist < 0.01) return; // increase threshold slightly to prevent jitter
    }
    
    lastAutoSearchCoords.current = [lat, lng];
    const locString = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    triggerSearch(query, locString, targetTitle);
  };

  const filteredLeads = leads.filter(l => {
    if (currentTab === 'hot') return l.hot;
    if (currentTab === 'enriched') return l.email || (l.contacts && l.contacts.length > 0);
    return true;
  });

  const totalLeads = leads.length;
  const totalEmails = leads.filter(l => l.email || (l.contacts && l.contacts.length > 0)).length;
  const totalPhones = leads.filter(l => l.phone).length;
  const avgRating = totalLeads ? (leads.reduce((a, l) => a + (l.rating || 0), 0) / totalLeads).toFixed(1) : "0.0";

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Top Header Row */}
      <div className="flex-shrink-0 h-16 border-b border-white/10 px-6 flex items-center justify-between z-10 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-medium tracking-tight">LeadMap Pro Intelligence</h2>
          <span className="bg-indigo-500/10 text-indigo-400 text-xs font-medium px-3 py-1 rounded-full">{totalLeads} leads identified</span>
        </div>
        <div className="flex items-center gap-4">
           {isScraping && (
             <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse">
               <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
               Deep Scanning Personnel...
             </div>
           )}
           <div className="w-8 h-8 rounded-full bg-white/10"></div>
        </div>
      </div>

      {/* Split Dashboard Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane - Data & Controls */}
        <div className="w-1/2 flex flex-col border-r border-white/10 overflow-y-auto">
          <div className="p-6">
            <form onSubmit={handleManualSearch} className="space-y-3 mb-6">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Industry (e.g. Plumbers)" 
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="City or ZIP" 
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative group">
                  <span className="absolute left-3 top-2.5 text-[10px] text-zinc-500 uppercase font-bold">Target Title</span>
                  <input 
                    type="text" 
                    placeholder="Owner, CEO, Manager..." 
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-[85px] pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    value={targetTitle}
                    onChange={(e) => setTargetTitle(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isScraping}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                >
                  {isScraping ? "Scraping..." : "Search Intelligence ↗"}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Total Leads</div>
                <div className="text-2xl font-medium text-white">{totalLeads}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Emails</div>
                <div className="text-2xl font-medium text-indigo-400">{totalEmails}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Phones</div>
                <div className="text-2xl font-medium text-white">{totalPhones}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Avg Rating</div>
                <div className="text-2xl font-medium text-yellow-500">{avgRating}</div>
              </div>
            </div>

            <div className="flex border-b border-white/10 mb-4">
              <button onClick={() => setCurrentTab('leads')} className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors uppercase tracking-wider ${currentTab === 'leads' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>All Leads</button>
              <button onClick={() => setCurrentTab('hot')} className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors uppercase tracking-wider ${currentTab === 'hot' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>High Score</button>
              <button onClick={() => setCurrentTab('enriched')} className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors uppercase tracking-wider ${currentTab === 'enriched' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>With Emails</button>
            </div>
            
            <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]">
              <ResultsTable 
                leads={filteredLeads} 
                onOpenLead={setOpenLead} 
                onHoverLead={setHoveredLeadId}
                hoveredLeadId={hoveredLeadId}
              />
            </div>

          </div>
        </div>

        {/* Right Pane - Map Integration */}
        <div className="w-1/2 relative bg-[#0a0a0a] p-4 flex flex-col h-full overflow-hidden">
          <div className="flex-1 w-full relative min-h-0">
            <Map 
              center={mapCenter} 
              zoom={11} 
              leads={leads} 
              onMarkerClick={setOpenLead}
              onLocationSelect={(name, lat, lng) => {
                setLocation(name);
                setMapCenter([lng, lat]);
                triggerSearch(query, name);
              }}
              onViewportChange={handleAutoSearch}
              hoveredLeadId={hoveredLeadId}
            />
          </div>
        </div>

      </div>

      <DetailPanel lead={openLead} onClose={() => setOpenLead(null)} />
    </div>
  );
}
