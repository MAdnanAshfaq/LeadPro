"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Globe, Phone, MapPin, Clock, Star, Share2, Navigation, MessageSquare, Bookmark } from "lucide-react";

interface DetailPanelProps {
  lead: any;
  onClose: () => void;
}

export default function DetailPanel({ lead, onClose }: DetailPanelProps) {
  if (!lead) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-white text-zinc-900 overflow-y-auto z-[100] shadow-[-10px_0_50px_rgba(0,0,0,0.1)]"
      >
        {/* Gallery Placeholder */}
        <div className="relative h-48 bg-zinc-100 grid grid-cols-2 gap-0.5">
          <div className="bg-zinc-200 animate-pulse"></div>
          <div className="grid grid-rows-2 gap-0.5">
            <div className="bg-zinc-300 animate-pulse"></div>
            <div className="bg-zinc-200 animate-pulse"></div>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-all">✕</button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">{lead.name}</h1>
            <div className="flex items-center gap-2 text-sm text-zinc-600 mb-2">
              <span className="font-bold">{lead.rating || 'N/A'}</span>
              <div className="flex text-orange-400">
                {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={s <= Math.round(lead.rating) ? "currentColor" : "none"} className={s <= Math.round(lead.rating) ? "" : "text-zinc-300"} />)}
              </div>
              <span>({lead.reviews || 0} reviews)</span>
              <span>•</span>
              <span>{lead.cat || 'Business'}</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-green-600 font-bold text-sm">Open</span>
               <span className="text-zinc-400 text-sm">• Closes 10 PM</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between border-y border-zinc-100 py-4 mb-6">
            {[
              { icon: Globe, label: 'Website', href: lead.website },
              { icon: Navigation, label: 'Directions', href: '#' },
              { icon: MessageSquare, label: 'Reviews', href: '#' },
              { icon: Bookmark, label: 'Save', href: '#' },
            ].map((btn, i) => (
              <button key={i} className="flex flex-col items-center gap-1 group">
                <div className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                  <btn.icon size={18} />
                </div>
                <span className="text-[11px] font-medium text-zinc-600">{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Details List */}
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-4">
              <MapPin className="text-indigo-600 shrink-0 mt-0.5" size={18} />
              <div className="text-zinc-700">{lead.addr || lead.location}</div>
            </div>

            <div className="flex items-start gap-4">
              <Clock className="text-indigo-600 shrink-0 mt-0.5" size={18} />
              <div className="w-full">
                <div className="font-bold text-zinc-900 mb-2">Hours</div>
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <React.Fragment key={day}>
                      <span className="text-zinc-500">{day}</span>
                      <span className="text-right text-zinc-900 font-medium">9 AM–10 PM</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Phone className="text-indigo-600 shrink-0" size={18} />
              <div className="text-zinc-700">{lead.phone || 'Not available'}</div>
            </div>

            <div className="flex items-center gap-4">
              <Globe className="text-indigo-600 shrink-0" size={18} />
              <div className="text-indigo-600 truncate">{lead.website || 'Add website'}</div>
            </div>
          </div>

          {/* Decision Makers Section */}
          {lead.contacts && lead.contacts.length > 0 && (
            <div className="mt-8 pt-8 border-t border-zinc-100">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Decision Makers Identified</div>
              <div className="space-y-3">
                {lead.contacts.map((contact: any, i: number) => (
                  <div key={i} className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-zinc-900">{contact.name}</div>
                        <div className="text-xs text-zinc-500">{contact.title}</div>
                      </div>
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">
                        {contact.status || 'Verified'}
                      </span>
                    </div>
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-indigo-600 hover:underline cursor-pointer">
                         <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                         {contact.email}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-zinc-100">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Lead Intelligence Score</div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-600 flex items-center justify-center text-xl font-bold text-indigo-600">
                {lead.score || 0}
              </div>
              <div className="flex-1">
                 <p className="text-xs text-zinc-500 leading-relaxed">
                   This business has a strong online presence but lacks a direct outreach strategy. High conversion probability for targeted campaigns.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Add React to the scope since we used React.Fragment
import React from 'react';
