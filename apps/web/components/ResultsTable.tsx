"use client";

import { motion } from "framer-motion";

interface ResultsTableProps {
  leads: any[];
  onOpenLead: (lead: any) => void;
  onHoverLead?: (leadId: string | null) => void;
  hoveredLeadId?: string | null;
}

function scoreClass(s: number) {
  return s >= 80 ? 'bg-green-500/20 text-green-400' : s >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400';
}

function renderStars(rating: number) {
  return [1, 2, 3, 4, 5].map(i => (
    <span key={i} className={i <= Math.round(rating) ? "text-[#f59e0b]" : "text-zinc-600 opacity-50"}>★</span>
  ));
}

export default function ResultsTable({ leads, onOpenLead, onHoverLead, hoveredLeadId }: ResultsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-zinc-400">
        <thead className="bg-white/5 text-[11px] uppercase tracking-widest text-zinc-500 border-b border-white/10">
          <tr>
            <th className="px-4 py-3 font-medium w-[200px]">Business</th>
            <th className="px-4 py-3 font-medium w-[130px]">Phone</th>
            <th className="px-4 py-3 font-medium w-[160px]">Email</th>
            <th className="px-4 py-3 font-medium w-[110px]">Website</th>
            <th className="px-4 py-3 font-medium w-[110px]">Rating</th>
            <th className="px-4 py-3 font-medium w-[60px]">Score</th>
            <th className="px-4 py-3 font-medium w-[80px]">Status</th>
            <th className="px-4 py-3 font-medium w-[70px]">Action</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-zinc-600 italic text-xs">
                No leads found or extracted yet.
              </td>
            </tr>
          ) : (
            leads.map((l, i) => (
              <motion.tr 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                key={l.id || i}
                onClick={() => onOpenLead(l)}
                onMouseEnter={() => onHoverLead?.(l.id || l.name)}
                onMouseLeave={() => onHoverLead?.(null)}
                className={`border-b border-white/5 transition-colors cursor-pointer group ${hoveredLeadId === (l.id || l.name) ? 'bg-white/10' : 'hover:bg-white/[0.04]'}`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-white truncate max-w-[180px] group-hover:text-indigo-400 transition-colors">{l.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[180px]">{l.cat || 'Business'}</div>
                </td>
                <td className="px-4 py-3">
                  {l.phone ? (
                    <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()} className="text-indigo-400 hover:underline">{l.phone}</a>
                  ) : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  {l.email ? (
                    <a href={`mailto:${l.email}`} onClick={e => e.stopPropagation()} className="text-indigo-400 hover:underline truncate block max-w-[140px]">{l.email}</a>
                  ) : <span className="text-zinc-600 text-xs italic">Not found</span>}
                </td>
                <td className="px-4 py-3">
                  {l.website ? (
                    <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`} target="_blank" onClick={e => e.stopPropagation()} className="text-indigo-400 hover:underline truncate block max-w-[90px]">{l.website.replace('https://', '')}</a>
                  ) : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs">
                    <div className="flex gap-0.5">{renderStars(l.rating || 0)}</div>
                    <span className="font-medium text-white ml-1">{l.rating || 'N/A'}</span>
                    <span className="text-zinc-500 text-[10px]">({l.reviews || 0})</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center justify-center w-8 h-5 rounded-full text-[10px] font-bold ${scoreClass(l.score || 0)}`}>
                    {l.score || 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${l.status === 'open' ? 'bg-green-500' : 'bg-zinc-600'}`}></span>
                    <span className="text-[11px] text-zinc-400">{l.status === 'open' ? 'Open' : 'Closed'}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={e => { e.stopPropagation(); onOpenLead(l); }} className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors">
                    View ↗
                  </button>
                </td>
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
