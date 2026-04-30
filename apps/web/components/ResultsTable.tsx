"use client";

import { motion } from "framer-motion";

interface Lead {
  id: string;
  name: string;
  location: string;
  source: string;
  status?: string;
}

interface ResultsTableProps {
  leads: Lead[];
}

export default function ResultsTable({ leads }: ResultsTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-white/5 text-xs uppercase text-zinc-300">
            <tr>
              <th className="px-6 py-4 font-semibold">Business Name</th>
              <th className="px-6 py-4 font-semibold">Location</th>
              <th className="px-6 py-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                  No leads extracted yet.
                </td>
              </tr>
            ) : (
              leads.map((lead, i) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={lead.id} 
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-white">{lead.name}</td>
                  <td className="px-6 py-4">{lead.location}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                      Extracted
                    </span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
