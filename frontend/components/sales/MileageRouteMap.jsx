"use client";

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const StartIcon = L.divIcon({
  html: `<div style="background: #279C6F; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const EndIcon = L.divIcon({
  html: `<div style="background: #F43F5E; width: 14px; height: 14px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Auto-fit component
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], animate: true });
    }
  }, [points, map]);
  return null;
}

const MileageRouteMap = ({ start, end, routeGeometry }) => {
  const polylineCoords = useMemo(() => {
    if (!routeGeometry) return [];
    // RouteGeoJSON is usually [lon, lat] since it's OSRM, but Leaflet needs [lat, lon]
    return routeGeometry.map(coord => [coord[1], coord[0]]);
  }, [routeGeometry]);

  const startCoords = start ? [start.lat, start.lon] : null;
  const endCoords = end ? [end.lat, end.lon] : null;

  // Center point
  const mapCenter = useMemo(() => {
    if (startCoords) return startCoords;
    if (endCoords) return endCoords;
    return [20.5937, 78.9629]; // India center
  }, [startCoords, endCoords]);

  return (
    <div className="w-full h-full relative group">
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {/* Draw Path */}
        {polylineCoords.length > 0 && (
          <Polyline 
            positions={polylineCoords} 
            color="#279C6F" 
            weight={5} 
            opacity={0.8}
            lineCap="round"
          />
        )}

        {/* Markers */}
        {startCoords && (
          <Marker position={startCoords} icon={StartIcon}>
            <Popup className="custom-popup">Start Point</Popup>
          </Marker>
        )}
        
        {endCoords && (
          <Marker position={endCoords} icon={EndIcon}>
            <Popup className="custom-popup">End Point</Popup>
          </Marker>
        )}

        {/* Dynamic Fitting */}
        <FitBounds points={[startCoords, endCoords, ...polylineCoords].filter(Boolean)} />
      </MapContainer>
      
      {/* Decorative Overlays to mask leaflet edges */}
      <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/5 to-transparent pointer-events-none z-[400]" />
    </div>
  );
};

export default MileageRouteMap;
