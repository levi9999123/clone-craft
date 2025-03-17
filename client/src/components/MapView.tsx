import { useEffect, useRef, useState } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { findDuplicates } from '@/lib/utils';

interface MapViewProps {
  onToggleNearbyPanel: () => void;
  onToggleDuplicatePanel: () => void;
  isPanelVisible: 'nearby' | 'duplicate' | null;
}

export default function MapView({ 
  onToggleNearbyPanel, 
  onToggleDuplicatePanel,
  isPanelVisible
}: MapViewProps) {
  const { photos, selectPhoto, selectedPhoto, setDuplicateGroups } = usePhotoContext();
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInitialized) return;
    if (typeof window === 'undefined' || !window.L) return;

    const L = window.L;

    // Create map
    const map = L.map(mapContainerRef.current).setView([55.7558, 37.6173], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Create marker cluster group
    try {
      // Check if markerCluster is available in the global scope
      const markers = L.markerClusterGroup ? L.markerClusterGroup() : L.layerGroup();
      map.addLayer(markers);
      
      mapRef.current = map;
      markersRef.current = markers;
      setMapInitialized(true);
    } catch (error) {
      console.error("Error initializing marker cluster:", error);
      // Fallback to regular layer group if markerClusterGroup is not available
      const markers = L.layerGroup();
      map.addLayer(markers);
      
      mapRef.current = map;
      markersRef.current = markers;
      setMapInitialized(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
      }
    };
  }, [mapInitialized]);

  // Update markers when photos change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current || !mapInitialized) return;
    if (typeof window === 'undefined' || !window.L) return;
    
    const L = window.L;
    
    // Clear existing markers
    markersRef.current.clearLayers();
    
    // Add markers for photos with coordinates
    const bounds = L.latLngBounds([]);
    let hasValidCoords = false;
    
    photos.forEach(photo => {
      if (photo.lat !== null && photo.lon !== null) {
        const isSelected = selectedPhoto?.id === photo.id;
        const markerIcon = L.divIcon({
          html: `<div style="
            background-color: ${isSelected ? '#ff9500' : '#007bff'};
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 4px rgba(0,0,0,0.3);
          "></div>`,
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        
        const marker = L.marker([photo.lat, photo.lon], { icon: markerIcon });
        marker.on('click', () => {
          selectPhoto(photo);
        });
        
        marker.bindPopup(`
          <div style="text-align: center;">
            <strong>${photo.name}</strong><br>
            <span>${photo.lat.toFixed(6)}, ${photo.lon.toFixed(6)}</span>
            ${photo.dataUrl ? `<br><img src="${photo.dataUrl}" alt="${photo.name}" style="max-width: 100px; max-height: 100px; margin-top: 5px; border-radius: 3px;">` : ''}
          </div>
        `);
        
        markersRef.current?.addLayer(marker);
        bounds.extend([photo.lat, photo.lon]);
        hasValidCoords = true;
      }
    });
    
    // Find duplicate photos
    const duplicates = findDuplicates(photos);
    setDuplicateGroups(duplicates);
    
    // Fit map to bounds if there are valid coordinates
    if (hasValidCoords && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [photos, selectedPhoto, mapInitialized, selectPhoto, setDuplicateGroups]);

  // Center map on selected photo
  useEffect(() => {
    if (!mapRef.current || !selectedPhoto || selectedPhoto.lat === null || selectedPhoto.lon === null) return;
    
    mapRef.current.setView([selectedPhoto.lat, selectedPhoto.lon], 15);
  }, [selectedPhoto]);

  return (
    <div id="map-container" className="flex-grow relative">
      <div id="map" ref={mapContainerRef} className="h-full w-full"></div>
      
      <div className="absolute top-3 right-3 space-x-2 z-[1000]">
        <button 
          className="px-3 py-2 rounded shadow-lg transition-colors font-bold text-white"
          style={{ 
            backgroundColor: isPanelVisible === 'nearby' ? '#ff9500' : '#007bff', 
            textShadow: '0px 1px 2px rgba(0,0,0,0.3)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.2)'
          }}
          onClick={onToggleNearbyPanel}
        >
          <i className="fas fa-map-marked-alt mr-1"></i> Ближайшие
        </button>
        
        <button 
          className="px-3 py-2 rounded shadow-lg transition-colors font-bold text-white"
          style={{ 
            backgroundColor: isPanelVisible === 'duplicate' ? '#ff9500' : '#007bff', 
            textShadow: '0px 1px 2px rgba(0,0,0,0.3)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.2)'
          }}
          onClick={onToggleDuplicatePanel}
        >
          <i className="fas fa-clone mr-1"></i> Дубликаты
        </button>
      </div>
      
      <div className="map-legend absolute bottom-3 left-3 p-3 rounded shadow-lg text-sm z-[1000]" 
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 0 2px rgba(255,255,255,0.6)'
        }}>
        <div className="flex items-center mb-2">
          <div className="w-5 h-5 rounded-full mr-2" 
            style={{ 
              backgroundColor: '#007bff', 
              border: '2px solid white', 
              boxShadow: '0 0 4px rgba(0,0,0,0.3)' 
            }}></div>
          <span className="font-semibold">Фото с координатами</span>
        </div>
        <div className="flex items-center">
          <div className="w-5 h-5 rounded-full mr-2" 
            style={{ 
              backgroundColor: '#ff9500', 
              border: '2px solid white', 
              boxShadow: '0 0 4px rgba(0,0,0,0.3)' 
            }}></div>
          <span className="font-semibold">Выбранное фото</span>
        </div>
      </div>
    </div>
  );
}
