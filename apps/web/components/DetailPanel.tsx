"use client";

import { motion, AnimatePresence } from "framer-motion";

interface DetailPanelProps {
  lead: any;
  onClose: () => void;
}

export default function DetailPanel({ lead, onClose }: DetailPanelProps) {
  if (!lead) return null;

  const scoreItems = [
    { label: 'Phone', val: lead.phone ? 10 : 0, max: 10 },
    { label: 'Email', val: lead.email ? 15 : 0, max: 15 },
    { label: 'Website', val: lead.website ? 10 : 0, max: 10 },
    { label: 'Rating', val: Math.round((lead.rating / 5) * 20) || 0, max: 20 },
    { label: 'Reviews', val: Math.min(20, Math.round((lead.reviews / 100) * 20)) || 0, max: 20 },
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 bottom-0 w-full max-w-[340px] bg-[#0a0a0a] border-l border-white/10 p-6 overflow-y-auto z-50 shadow-2xl"
      >
        <button onClick={onClose} className="float-right text-zinc-500 hover:text-white transition-colors">✕</button>
        
        <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-medium text-lg mb-4">
          {lead.name.substring(0, 2).toUpperCase()}
        </div>
        
        <h3 className="text-lg font-medium text-white mb-1">{lead.name}</h3>
        <p className="text-sm text-zinc-500 mb-4">{lead.cat || 'Business'}</p>
        
        <div className="flex items-center gap-2 mb-6 text-sm">
          <div className="text-[#f59e0b]">
            {[1,2,3,4,5].map(s => <span key={s} className={s <= Math.round(lead.rating) ? "text-[#f59e0b]" : "text-zinc-700 opacity-50"}>★</span>)}
          </div>
          <span className="font-medium">{lead.rating || 'N/A'}</span>
          <span className="text-zinc-500">({lead.reviews || 0} reviews)</span>
        </div>

        <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mt-6 mb-3">Contact Details</div>
        
        <div className="flex justify-between items-start py-2 border-b border-white/5 text-sm">
          <span className="text-zinc-500">Phone</span>
          {lead.phone ? <a href={`tel:${lead.phone}`} className="text-white hover:text-indigo-400">{lead.phone}</a> : <span className="text-zinc-600">—</span>}
        </div>
        
        <div className="flex justify-between items-start py-2 border-b border-white/5 text-sm">
          <span className="text-zinc-500">Email</span>
          {lead.email ? <a href={`mailto:${lead.email}`} className="text-white hover:text-indigo-400 max-w-[150px] truncate">{lead.email}</a> : <span className="text-zinc-600 italic">Not enriched</span>}
        </div>
        
        <div className="flex justify-between items-start py-2 border-b border-white/5 text-sm">
          <span className="text-zinc-500">Website</span>
          {lead.website ? <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline max-w-[150px] truncate">{lead.website.replace('https://', '')}</a> : <span className="text-zinc-600">—</span>}
        </div>
        
        <div className="flex justify-between items-start py-2 border-b border-white/5 text-sm">
          <span className="text-zinc-500">Address</span>
          <span className="text-right text-zinc-300 max-w-[180px]">{lead.addr || lead.location}</span>
        </div>

        <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mt-8 mb-3">Lead Score — {lead.score || 0}/100</div>
        
        {scoreItems.map((s, i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>{s.label}</span>
              <span>{s.val}/{s.max}</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${s.val === s.max ? 'bg-green-500' : s.val === 0 ? 'bg-red-500' : 'bg-yellow-500'}`} 
                style={{ width: `${(s.val / s.max) * 100}%` }}
              />
            </div>
          </div>
        ))}

        <div className="mt-8 flex flex-col gap-2">
          <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded-lg text-sm text-white transition-colors">Write outreach email ↗</button>
          <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded-lg text-sm text-white transition-colors">Competitor analysis ↗</button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
