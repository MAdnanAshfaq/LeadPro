"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapProps {
  center: [number, number];
  zoom: number;
}

export default function Map({ center, zoom }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: center,
      zoom: zoom,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

  }, [center, zoom]);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/10 shadow-lg">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
}
