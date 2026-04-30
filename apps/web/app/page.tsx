"use client";

import { motion } from "framer-motion";
import { Map, Zap, Search, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden relative selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.15),transparent_50%)]" />
      
      <main className="relative max-w-7xl mx-auto px-6 pt-32 pb-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">LeadMap Pro v1.0</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-br from-white via-white/90 to-white/50 bg-clip-text text-transparent">
            Next-Generation <br/> Lead Intelligence
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 mb-12 leading-relaxed">
            Harness the power of deterministic scraping and MapLibre visualizations. 
            Extract, enrich, and score leads in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all duration-300 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)]">
              Start Mapping
            </button>
            <button className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-white/10 transition-all duration-300">
              View Documentation
            </button>
          </div>
        </motion.div>

        <div className="mt-32 grid md:grid-cols-3 gap-6">
          {[
            { icon: Search, title: "Grid Search Algorithm", desc: "Bypass the 120-result limit using smart deterministic grid routing." },
            { icon: Zap, title: "Real-Time AI Enrichment", desc: "Instantly crawl and extract emails, socials, and tech stacks." },
            { icon: Map, title: "MapLibre GL Integration", desc: "Visualize competitor density with interactive heatmaps." }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-colors duration-300 group"
            >
              <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white/90">{feature.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
