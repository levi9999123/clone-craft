import { useEffect, useRef, useState } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { findDuplicates } from '@/lib/utils';
import MapSettings from './MapSettings';
import SearchPanel from './SearchPanel';
import TooltipWrapper from './TooltipWrapper';

interface MapViewProps {
  onToggleNearbyPanel: () => void;
  onToggleDuplicatePanel: () => void;
  onToggleSafetyPanel?: () => void;
  isPanelVisible: 'nearby' | 'duplicate' | 'safety' | null;
}

export default function MapView({ 
  onToggleNearbyPanel, 
  onToggleDuplicatePanel,
  onToggleSafetyPanel,
  isPanelVisible
}: MapViewProps) {
  const { photos, selectPhoto, selectedPhoto, setDuplicateGroups } = usePhotoContext();
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [useAnimation, setUseAnimation] = useState(true);
  const [useCluster, setUseCluster] = useState(true);
  
  // Initialize map
  useEffect(() => {
    if (mapInitialized) return;
    
    console.log("Начало эффекта инициализации карты, mapInitialized =", mapInitialized);
    
    // Проверим наличие Leaflet в глобальной области
    const initMap = () => {
      if (!mapContainerRef.current) {
        console.error("Контейнер для карты не найден!");
        return;
      }
      
      if (typeof window === 'undefined' || !window.L) {
        console.error("Leaflet не найден в глобальной области!");
        return;
      }
      
      try {
        console.log("Инициализация карты Leaflet...");
        const L = window.L;
        
        // Создаем карту с явными размерами
        const mapElement = mapContainerRef.current;
        
        // Проверяем, имеет ли контейнер карты нормальный размер
        console.log("Размеры контейнера карты:", 
          mapElement.offsetWidth, 
          mapElement.offsetHeight
        );
        
        // Создание карты с улучшенными опциями
        const map = L.map(mapElement, {
          center: [55.7558, 37.6173],
          zoom: 6,
          zoomControl: true,
          // Добавляем дополнительные настройки
          fadeAnimation: true,
          zoomAnimation: true,
          markerZoomAnimation: true,
          // Опции для лучшего поведения на мобильных устройствах
          tap: true,
          dragging: true,
          attributionControl: true,
        });
        
        // Добавление тайлов OpenStreetMap
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map);
        
        tileLayerRef.current = tileLayer;
        
        // Создание группы маркеров в зависимости от настроек
        let markers;
        if (typeof L.markerClusterGroup === 'function' && useCluster) {
          console.log("Используем MarkerClusterGroup");
          markers = L.markerClusterGroup({
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true,
            spiderfyOnMaxZoom: true,
            removeOutsideVisibleBounds: true,
            disableClusteringAtZoom: 18
          });
        } else {
          console.log(useCluster 
            ? "MarkerClusterGroup недоступен, используем LayerGroup" 
            : "Кластеризация отключена, используем LayerGroup");
          markers = L.layerGroup();
        }
        
        map.addLayer(markers);
        
        // Добавление элементов управления масштабом
        L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);
        
        // Перерасчет размера карты после инициализации
        setTimeout(() => {
          map.invalidateSize(true);
          console.log("Принудительно пересчитаны размеры карты");
        }, 500);
        
        mapRef.current = map;
        markersRef.current = markers;
        // Сохраняем экземпляр карты в глобальной области для доступа из других компонентов
        (window as any).mapInstance = map;
        setMapInitialized(true);
        
        console.log("Карта создана успешно!");
      } catch (error) {
        console.error("Ошибка при инициализации карты:", error);
      }
    };
    
    console.log("Запуск инициализации карты...");
    // Задержка инициализации карты для уверенности, что DOM загружен
    const timerId = setTimeout(() => {
      initMap();
    }, 200);
    
    // Очистка при размонтировании
    return () => {
      console.log("!! КОМПОНЕНТ РАЗМОНТИРУЕТСЯ !!");
      clearTimeout(timerId);
      if (mapRef.current) {
        console.log("Удаление карты при размонтировании компонента");
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
        tileLayerRef.current = null;
        // Очищаем глобальную ссылку на карту
        (window as any).mapInstance = null;
      }
    };
  }, [mapInitialized, useCluster]);

  // Обработчик изменения стиля карты
  const handleMapStyleChange = (tileUrl: string) => {
    if (!mapRef.current || !tileLayerRef.current) return;
    
    const L = window.L;
    // Удаляем текущий слой с картой
    mapRef.current.removeLayer(tileLayerRef.current);
    
    // Добавляем новый слой с указанным URL
    const newTileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(mapRef.current);
    
    tileLayerRef.current = newTileLayer;
  };
  
  // Обработчик переключения кластеризации
  const handleToggleCluster = (enabled: boolean) => {
    setUseCluster(enabled);
    
    // Для изменения кластеризации нужно полностью пересоздать маркеры
    if (mapRef.current && mapInitialized) {
      const L = window.L;
      
      // Сначала удалим текущую группу маркеров
      if (markersRef.current) {
        mapRef.current.removeLayer(markersRef.current);
      }
      
      // Создаем новую группу маркеров в зависимости от настроек
      let newMarkers;
      if (typeof L.markerClusterGroup === 'function' && enabled) {
        newMarkers = L.markerClusterGroup({
          showCoverageOnHover: true,
          zoomToBoundsOnClick: true,
          spiderfyOnMaxZoom: true,
          removeOutsideVisibleBounds: true,
          disableClusteringAtZoom: 18
        });
      } else {
        newMarkers = L.layerGroup();
      }
      
      mapRef.current.addLayer(newMarkers);
      markersRef.current = newMarkers;
      
      // Перерисуем все маркеры
      updateMarkers();
    }
  };
  
  // Обработчик переключения анимаций
  const handleToggleAnimations = (enabled: boolean) => {
    setUseAnimation(enabled);
    
    // Применяем настройки анимации к карте
    if (mapRef.current) {
      mapRef.current.options.fadeAnimation = enabled;
      mapRef.current.options.zoomAnimation = enabled;
      mapRef.current.options.markerZoomAnimation = enabled;
    }
  };
  
  // Функция обновления маркеров (вынесена отдельно для повторного использования)
  const updateMarkers = () => {
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
  };

  // Update markers when photos change
  useEffect(() => {
    updateMarkers();
  }, [photos, selectedPhoto, mapInitialized, selectPhoto, setDuplicateGroups]);

  // Center map on selected photo with animation
  useEffect(() => {
    if (!mapRef.current || !selectedPhoto || selectedPhoto.lat === null || selectedPhoto.lon === null) return;
    
    const options = useAnimation ? { animate: true, duration: 0.8 } : { animate: false };
    mapRef.current.setView([selectedPhoto.lat, selectedPhoto.lon], 15, options);
  }, [selectedPhoto, useAnimation]);

  return (
    <div id="map-container" className="flex-grow relative" style={{ minHeight: '100%', minWidth: '100%', background: 'var(--map-bg)' }}>
      <div id="map" ref={mapContainerRef} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 10, background: 'var(--map-bg)' }}></div>
      
      <div className="absolute top-3 right-3 space-x-2 z-[1000] flex">
        <TooltipWrapper text="Показать ближайшие фотографии" position="bottom">
          <button 
            className="px-3 py-2 rounded shadow-lg transition-colors font-bold text-white"
            style={{ 
              backgroundColor: isPanelVisible === 'nearby' ? 'var(--accent)' : 'var(--primary)', 
              textShadow: '0px 1px 2px var(--shadow-strong)',
              boxShadow: `0 2px 5px var(--shadow), 0 0 0 2px rgba(255,255,255,0.2)`
            }}
            onClick={onToggleNearbyPanel}
          >
            <i className="fas fa-map-marked-alt mr-1"></i> Ближайшие
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper text="Найти дубликаты фотографий" position="bottom">
          <button 
            className="px-3 py-2 rounded shadow-lg transition-colors font-bold text-white"
            style={{ 
              backgroundColor: isPanelVisible === 'duplicate' ? 'var(--accent)' : 'var(--primary)', 
              textShadow: '0px 1px 2px var(--shadow-strong)',
              boxShadow: `0 2px 5px var(--shadow), 0 0 0 2px rgba(255,255,255,0.2)`
            }}
            onClick={onToggleDuplicatePanel}
          >
            <i className="fas fa-clone mr-1"></i> Дубликаты
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper text="Искать фотографии по параметрам" position="bottom">
          <button 
            className="px-3 py-2 rounded shadow-lg transition-colors font-bold text-white"
            style={{ 
              backgroundColor: isSearchOpen ? 'var(--accent)' : 'var(--primary)', 
              textShadow: '0px 1px 2px var(--shadow-strong)',
              boxShadow: `0 2px 5px var(--shadow), 0 0 0 2px rgba(255,255,255,0.2)`
            }}
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSettingsOpen) setIsSettingsOpen(false);
            }}
          >
            <i className="fas fa-search mr-1"></i> Поиск
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper text="Проверка безопасности местоположения" position="bottom">
          <button 
            className="px-3 py-2 rounded shadow-lg transition-colors font-bold text-white"
            style={{ 
              backgroundColor: isPanelVisible === 'safety' ? 'var(--accent)' : 'var(--error)', 
              textShadow: '0px 1px 2px var(--shadow-strong)',
              boxShadow: `0 2px 5px var(--shadow), 0 0 0 2px rgba(255,255,255,0.2)`
            }}
            onClick={onToggleSafetyPanel}
            disabled={!selectedPhoto}
          >
            <i className="fas fa-shield-alt mr-1"></i> Безопасность
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper text="Настроить вид и поведение карты" position="bottom">
          <button 
            className="px-3 py-2 rounded shadow-lg transition-colors font-bold text-white"
            style={{ 
              backgroundColor: isSettingsOpen ? 'var(--accent)' : 'var(--primary)', 
              textShadow: '0px 1px 2px var(--shadow-strong)',
              boxShadow: `0 2px 5px var(--shadow), 0 0 0 2px rgba(255,255,255,0.2)`
            }}
            onClick={() => {
              setIsSettingsOpen(!isSettingsOpen);
              if (isSearchOpen) setIsSearchOpen(false);
            }}
          >
            <i className="fas fa-cog mr-1"></i> Настройки
          </button>
        </TooltipWrapper>
      </div>
      
      {/* Панель настроек карты */}
      <MapSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onChangeMapStyle={handleMapStyleChange}
        onToggleCluster={handleToggleCluster}
        onToggleAnimations={handleToggleAnimations}
      />
      
      {/* Панель поиска фотографий */}
      <SearchPanel 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      
      <div className="map-legend absolute bottom-3 left-3 p-3 rounded shadow-lg text-sm z-[1000]" 
        style={{ 
          backgroundColor: 'var(--panel-bg)', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px var(--shadow), 0 0 0 2px rgba(255,255,255,0.1)'
        }}>
        <div className="flex items-center mb-2">
          <div className="w-5 h-5 rounded-full mr-2" 
            style={{ 
              backgroundColor: 'var(--primary)', 
              border: '2px solid var(--bg)', 
              boxShadow: '0 0 4px var(--shadow)' 
            }}></div>
          <span className="font-semibold">Фото с координатами</span>
        </div>
        <div className="flex items-center">
          <div className="w-5 h-5 rounded-full mr-2" 
            style={{ 
              backgroundColor: 'var(--accent)', 
              border: '2px solid var(--bg)', 
              boxShadow: '0 0 4px var(--shadow)' 
            }}></div>
          <span className="font-semibold">Выбранное фото</span>
        </div>
      </div>
    </div>
  );
}