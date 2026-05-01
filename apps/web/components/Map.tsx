"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Search, Loader2, MapPin, Star } from "lucide-react";

interface MapProps {
  center: [number, number];
  zoom: number;
  leads?: any[];
  onMarkerClick?: (lead: any) => void;
  onLocationSelect?: (name: string, lat: number, lng: number) => void;
  onViewportChange?: (lat: number, lng: number) => void;
  hoveredLeadId?: string | null;
}

export default function Map({ center, zoom, leads = [], onMarkerClick, onLocationSelect, onViewportChange, hoveredLeadId }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const popupRef = useRef<maplibregl.Popup | null>(null);
  
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-light': {
            type: 'raster',
            tiles: [
              "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
          }
        },
        layers: [
          {
            id: 'carto-light-layer',
            type: 'raster',
            source: 'carto-light',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      },
      center: center,
      zoom: zoom,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    // Automatic Search logic
    map.current.on('moveend', () => {
      if (!map.current) return;
      const newCenter = map.current.getCenter();
      onViewportChange?.(newCenter.lat, newCenter.lng);
    });

    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (map.current && center) {
      // Avoid flyTo if we're already at the center (e.g. from a moveend trigger)
      const currentCenter = map.current.getCenter();
      if (Math.abs(currentCenter.lng - center[0]) > 0.01 || Math.abs(currentCenter.lat - center[1]) > 0.01) {
        map.current.flyTo({ center, zoom });
      }
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!map.current) return;
    
    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    leads.forEach(lead => {
      const id = lead.id || lead.name;
      const lat = lead.lat || (center[1] + (Math.random() - 0.5) * 0.05);
      const lng = lead.lng || (center[0] + (Math.random() - 0.5) * 0.05);

      const el = document.createElement('div');
      el.className = `w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-all cursor-pointer ${hoveredLeadId === id ? 'bg-indigo-600 scale-125 z-50' : 'bg-indigo-500 hover:bg-indigo-600'}`;
      
      // Add a Google Maps-style business icon (simplified)
      el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Show Popup
        if (popupRef.current) popupRef.current.remove();
        
        const popupContent = document.createElement('div');
        popupContent.className = "p-2 min-w-[150px] font-sans";
        popupContent.innerHTML = `
          <div class="font-bold text-zinc-900 text-sm mb-1">${lead.name}</div>
          <div class="flex items-center gap-1 text-xs text-zinc-500 mb-2">
            <span class="text-orange-500">★</span> ${lead.rating || 'N/A'} (${lead.reviews || 0})
          </div>
          <button class="w-full bg-indigo-600 text-white text-[10px] py-1 rounded font-medium hover:bg-indigo-700 transition-colors">View Intelligence</button>
        `;
        
        popupContent.querySelector('button')?.addEventListener('click', () => onMarkerClick?.(lead));

        popupRef.current = new maplibregl.Popup({ offset: 15, closeButton: false })
          .setLngLat([lng, lat])
          .setDOMContent(popupContent)
          .addTo(map.current!);
          
        onMarkerClick?.(lead);
      });

      const marker = new maplibregl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      markersRef.current[id] = marker;
    });
  }, [leads, center, onMarkerClick, hoveredLeadId]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&limit=5`);
        const data = await response.json();
        setSuggestions(data);
      } catch (error) { console.error("Search error:", error); } finally { setLoading(false); }
    }, 500);
  };

  const handleSelectLocation = (s: any) => {
    const lat = parseFloat(s.lat);
    const lon = parseFloat(s.lon);
    if (map.current) map.current.flyTo({ center: [lon, lat], zoom: 12 });
    if (onLocationSelect) onLocationSelect(s.display_name, lat, lon);
    setSearchValue("");
    setSuggestions([]);
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-white">
      <div className="absolute top-4 left-4 z-50 w-full max-w-[300px]">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search city or address..."
            className="w-full bg-white text-zinc-900 text-sm rounded-xl pl-10 pr-4 py-2.5 shadow-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-zinc-100 overflow-hidden py-1">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectLocation(s)}
                  className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 flex items-start gap-3 transition-colors"
                >
                  <MapPin className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{s.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div 
        ref={mapContainer} 
        className="w-full h-full min-h-[300px] z-10" 
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} 
      />
    </div>
  );
}
