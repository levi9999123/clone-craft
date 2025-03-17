import { useEffect, useRef, useState } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { findDuplicates } from '@/lib/utils';
import MapSettings from './MapSettings';
import TooltipWrapper from './TooltipWrapper';
import HelpModal from './modals/HelpModal';
import ExportPanel from './ExportPanel';
import RouteStatsPanel from './RouteStatsPanel';

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
  const polylineRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const distanceMarkersRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [useAnimation, setUseAnimation] = useState(true);
  const [useCluster, setUseCluster] = useState(true);
  
  // Проверяем первый запуск приложения
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('geo-photo-analyzer-help-shown');
    if (!hasSeenHelp) {
      // Таймаут, чтобы дать приложению загрузиться перед показом помощи
      const timer = setTimeout(() => {
        setIsHelpOpen(true);
        localStorage.setItem('geo-photo-analyzer-help-shown', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Функция для динамической загрузки Leaflet
  const loadLeafletScripts = () => {
    return new Promise<void>((resolve) => {
      // Проверка, загружен ли уже Leaflet
      if (window.L) {
        console.log("Leaflet уже загружен");
        resolve();
        return;
      }

      // Загрузка основного CSS Leaflet
      const leafletCss = document.createElement('link');
      leafletCss.rel = 'stylesheet';
      leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      leafletCss.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      leafletCss.crossOrigin = '';
      document.head.appendChild(leafletCss);

      // Загрузка CSS MarkerCluster
      const clusterCss = document.createElement('link');
      clusterCss.rel = 'stylesheet';
      clusterCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
      document.head.appendChild(clusterCss);

      const clusterDefaultCss = document.createElement('link');
      clusterDefaultCss.rel = 'stylesheet';
      clusterDefaultCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
      document.head.appendChild(clusterDefaultCss);

      // Загрузка JS Leaflet
      const leafletScript = document.createElement('script');
      leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      leafletScript.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      leafletScript.crossOrigin = '';
      document.body.appendChild(leafletScript);

      // После загрузки Leaflet загружаем MarkerCluster
      leafletScript.onload = () => {
        console.log("Leaflet загружен, загружаем MarkerCluster");
        const clusterScript = document.createElement('script');
        clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
        document.body.appendChild(clusterScript);

        clusterScript.onload = () => {
          console.log("MarkerCluster загружен");
          resolve();
        };
        
        clusterScript.onerror = (e) => {
          console.error("Ошибка загрузки MarkerCluster:", e);
          resolve(); // Продолжаем даже при ошибке загрузки
        };
      };
      
      leafletScript.onerror = (e) => {
        console.error("Ошибка загрузки Leaflet:", e);
        resolve(); // Продолжаем даже при ошибке загрузки
      };
    });
  };

  // Инициализация карты с использованием useRef для отслеживания состояния инициализации
  const isMapMounted = useRef(false);
  
  useEffect(() => {
    // Проверяем, была ли уже инициализирована карта - используем ref вместо state
    // чтобы избежать лишних перерендеров
    if (isMapMounted.current) {
      console.log("Карта уже инициализирована, пропускаем...");
      return;
    }
    
    // Устанавливаем флаг, что карта инициализируется
    isMapMounted.current = true;
    console.log("Начало инициализации карты");
    
    // Асинхронная функция для подготовки и инициализации карты
    const initializeMap = async () => {
      try {
        // Загрузка необходимых скриптов Leaflet
        await loadLeafletScripts();
        
        // Проверка наличия контейнера и библиотеки Leaflet
        if (!mapContainerRef.current) {
          console.error("Контейнер для карты не найден!");
          isMapMounted.current = false; // Сбрасываем флаг, чтобы можно было попробовать снова
          return;
        }
        
        if (typeof window === 'undefined' || !window.L) {
          console.error("Leaflet не найден в глобальной области!");
          isMapMounted.current = false;
          return;
        }
        
        const L = window.L;
        console.log("Leaflet успешно загружен, начинаем инициализацию");
        
        // Получаем элемент контейнера карты
        const mapElement = mapContainerRef.current;
        
        // Проверяем размеры контейнера
        console.log("Размеры контейнера карты:", 
          mapElement.offsetWidth, 
          mapElement.offsetHeight
        );
        
        // Создаем карту
        const map = L.map(mapElement, {
          center: [55.7558, 37.6173],
          zoom: 6,
          zoomControl: true,
          fadeAnimation: useAnimation,
          zoomAnimation: useAnimation,
          markerZoomAnimation: useAnimation,
          tap: true,
          dragging: true,
          attributionControl: true,
        });
        
        // Добавляем слой с тайлами
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map);
        
        tileLayerRef.current = tileLayer;
        
        // Создаем группу маркеров в зависимости от настроек
        let markers;
        if (typeof L.markerClusterGroup === 'function' && useCluster) {
          console.log("Используем MarkerClusterGroup для кластеризации маркеров");
          markers = L.markerClusterGroup({
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true,
            spiderfyOnMaxZoom: true,
            removeOutsideVisibleBounds: true,
            disableClusteringAtZoom: 18
          });
        } else {
          console.log("Используем обычный LayerGroup для маркеров (без кластеризации)");
          markers = L.layerGroup();
        }
        
        map.addLayer(markers);
        
        // Добавляем элементы управления
        L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);
        
        // Перерасчет размера карты после инициализации
        setTimeout(() => {
          map.invalidateSize(true);
          console.log("Карта успешно инициализирована, размеры обновлены");
        }, 500);
        
        // Сохраняем ссылки на карту и слой маркеров
        mapRef.current = map;
        markersRef.current = markers;
        // Сохраняем в глобальной области для доступа из других компонентов
        (window as any).mapInstance = map;
        setMapInitialized(true);
        
        console.log("Карта создана успешно!");
        
        // Обновляем маркеры, если есть фотографии
        if (photos.length > 0) {
          updateMarkers();
        }
      } catch (error) {
        console.error("Ошибка при инициализации карты:", error);
        isMapMounted.current = false; // Сбрасываем флаг, чтобы можно было попробовать снова
      }
    };
    
    // Запускаем инициализацию
    initializeMap();
    
    // Очистка при размонтировании
    return () => {
      console.log("Компонент карты размонтируется");
      if (mapRef.current) {
        console.log("Удаление карты при размонтировании");
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
        tileLayerRef.current = null;
        polylineRef.current = null;
        routeLayerRef.current = null;
        distanceMarkersRef.current = null;
        (window as any).mapInstance = null;
        isMapMounted.current = false; // Сбрасываем флаг
        setMapInitialized(false); // Сбрасываем state
      }
    };
  }, []); // Пустой массив зависимостей - эффект выполнится только при монтировании

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
  
  // Функция обновления дубликатов (вынесена отдельно)
  const updateDuplicates = () => {
    const duplicates = findDuplicates(photos);
    setDuplicateGroups(duplicates);
  };

  // Функция для построения маршрута по порядку фотографий (от 1 к 2, от 2 к 3 и т.д.)
  const buildSequentialRoute = (points: {lat: number, lon: number, id: number}[]): {lat: number, lon: number, id: number}[] => {
    if (points.length <= 1) return points;
    
    // Сортируем точки по ID - предполагается, что ID отражает порядок добавления фотографий
    return [...points].sort((a, b) => a.id - b.id);
  };
  
  // Функция для очистки маршрутных линий
  const clearRouteLines = () => {
    if (!mapRef.current) return;
    
    // Очищаем предыдущие линии и метки
    if (routeLayerRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    
    if (distanceMarkersRef.current) {
      mapRef.current.removeLayer(distanceMarkersRef.current);
      distanceMarkersRef.current = null;
    }
    
    // Удаляем информацию о маршруте
    const routeInfoElement = document.querySelector('.route-info');
    if (routeInfoElement) {
      routeInfoElement.remove();
    }
  };
  
  // Функция для отображения линий между точками (маршрут)
  const drawRouteLines = () => {
    if (!mapRef.current || !window.L) return;
    
    const L = window.L;
    
    // Сначала очищаем предыдущие линии
    clearRouteLines();
    
    // Очищаем предыдущие линии
    if (routeLayerRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
    }
    
    // Создаем новый слой для маршрута
    routeLayerRef.current = L.layerGroup().addTo(mapRef.current);
    
    // Собираем координаты фотографий
    const photoPoints = photos
      .filter(p => p.lat !== null && p.lon !== null)
      .map(p => ({ lat: p.lat!, lon: p.lon!, id: p.id }));
    
    if (photoPoints.length < 2) return;
    
    // Строим маршрут по порядку загрузки фотографий (1->2->3->4)
    const routePoints = buildSequentialRoute(photoPoints);
    
    // Рисуем линии маршрута
    const polyline = L.polyline(
      routePoints.map((p: {lat: number, lon: number, id: number}) => [p.lat, p.lon]), 
      {
        color: '#3388ff',
        weight: 3,
        opacity: 0.7,
        lineJoin: 'round',
        className: 'route-polyline'
      }
    ).addTo(routeLayerRef.current);
    
    // Добавляем метки с расстояниями
    if (distanceMarkersRef.current) {
      mapRef.current.removeLayer(distanceMarkersRef.current);
    }
    
    distanceMarkersRef.current = L.layerGroup().addTo(mapRef.current);
    
    // Расставляем метки с расстоянием между соседними точками
    for (let i = 0; i < routePoints.length - 1; i++) {
      const point1 = routePoints[i];
      const point2 = routePoints[i + 1];
      
      // Вычисляем расстояние в метрах между точками
      const latlng1 = L.latLng(point1.lat, point1.lon);
      const latlng2 = L.latLng(point2.lat, point2.lon);
      const distanceMeters = latlng1.distanceTo(latlng2);
      
      // Находим середину линии для размещения метки
      const midPoint = L.latLng(
        (point1.lat + point2.lat) / 2,
        (point1.lon + point2.lon) / 2
      );
      
      // Создаем метку с расстоянием
      const distanceLabel = L.divIcon({
        html: `<div class="distance-label">${Math.round(distanceMeters)} м</div>`,
        className: '',
        iconSize: [80, 20],
        iconAnchor: [40, 10]
      });
      
      L.marker(midPoint, { icon: distanceLabel }).addTo(distanceMarkersRef.current);
    }
    
    // Добавляем общее расстояние маршрута
    let totalDistance = 0;
    for (let i = 0; i < routePoints.length - 1; i++) {
      const latlng1 = L.latLng(routePoints[i].lat, routePoints[i].lon);
      const latlng2 = L.latLng(routePoints[i + 1].lat, routePoints[i + 1].lon);
      totalDistance += latlng1.distanceTo(latlng2);
    }
    
    // Добавляем информацию о маршруте в правый нижний угол
    const routeInfoControl = L.control({ position: 'bottomright' });
    routeInfoControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'route-info');
      div.innerHTML = `<div class="route-info-box">
        <strong>Общая длина: ${Math.round(totalDistance)} м</strong><br>
        <span>Точек: ${routePoints.length}</span>
      </div>`;
      return div;
    };
    
    routeInfoControl.addTo(mapRef.current);
  };
  
  // Функция обновления маркеров (теперь без обновления дубликатов)
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
        // Проверяем различные условия для маркера
        const isVeryClose = photo.isVeryClose;
        const hasRestrictedObjects = photo.restrictedObjectsNearby;
        
        // Определяем цвет маркера в зависимости от условий
        let markerColor, markerSize, shadowColor;
        
        if (isSelected) {
          // Выбранный маркер всегда оранжевый
          markerColor = '#ff9500';
          markerSize = 14;
          shadowColor = '0 0 6px rgba(255,149,0,0.8)';
        } else if (hasRestrictedObjects) {
          // Маркер с нарушением правил безопасности (возле запрещенных объектов)
          markerColor = '#9c27b0'; // Пурпурный цвет для запрещенных объектов
          markerSize = 14;
          shadowColor = '0 0 8px rgba(156,39,176,0.7)';
        } else if (isVeryClose) {
          // Маркер рядом с другими точками (менее 25м)
          markerColor = '#ff0000';
          markerSize = 14;
          shadowColor = '0 0 8px rgba(255,0,0,0.7)';
        } else {
          // Обычный маркер
          markerColor = '#007bff';
          markerSize = 12;
          shadowColor = '0 0 4px rgba(0,0,0,0.3)';
        }
        
        const markerIcon = L.divIcon({
          html: `<div style="
            background-color: ${markerColor};
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: ${shadowColor};
          "></div>`,
          className: '',
          iconSize: [markerSize + 4, markerSize + 4],
          iconAnchor: [(markerSize + 4)/2, (markerSize + 4)/2]
        });
        
        const marker = L.marker([photo.lat, photo.lon], { icon: markerIcon });
        marker.on('click', () => {
          selectPhoto(photo);
        });
        
        // Создаем уникальный ID для маркера, чтобы можно было добавить событие копирования
        const markerId = `marker-${photo.id}`;
        
        marker.bindPopup(`
          <div style="text-align: center;">
            <strong>${photo.name}</strong><br>
            <div style="display: flex; align-items: center; justify-content: center; margin: 4px 0;">
              <span>${photo.lat.toFixed(6)}, ${photo.lon.toFixed(6)}</span>
              <button id="${markerId}" title="Скопировать координаты" class="map-button copy-button">
                <i class="fas fa-copy"></i>
              </button>
              <span id="${markerId}-copied" style="
                color: green;
                margin-left: 4px;
                font-weight: bold;
                display: none;
              ">✓</span>
            </div>
            
            ${photo.dataUrl ? `<img src="${photo.dataUrl}" alt="${photo.name}" style="max-width: 100px; max-height: 100px; margin-top: 5px; border-radius: 3px;">` : ''}
            
            ${photo.isVeryClose ? `
              <div style="
                margin-top: 8px;
                padding: 4px;
                background-color: rgba(255,0,0,0.1);
                border-left: 3px solid #ff0000;
                text-align: left;
                font-size: 12px;
              ">
                <i class="fas fa-exclamation-triangle" style="color: #ff0000;"></i> 
                <strong>Внимание:</strong> Есть другие точки ближе 25 метров
              </div>
            ` : ''}
            
            ${photo.restrictedObjectsNearby ? `
              <div style="
                margin-top: ${photo.isVeryClose ? '4px' : '8px'};
                padding: 4px;
                background-color: rgba(156,39,176,0.1);
                border-left: 3px solid #9c27b0;
                text-align: left;
                font-size: 12px;
              ">
                <i class="fas fa-shield-alt" style="color: #9c27b0;"></i> 
                <strong>Нарушение:</strong> Запрещенные объекты на расстоянии менее 50м
                ${photo.nearbyObjectsCount ? `<br><span style="font-size: 11px;">Найдено объектов: ${photo.nearbyObjectsCount}</span>` : ''}
              </div>
            ` : ''}
          </div>
        `);
        
        // Добавляем обработчик события открытия попапа
        marker.on('popupopen', () => {
          setTimeout(() => {
            const copyButton = document.getElementById(markerId);
            const copiedIndicator = document.getElementById(`${markerId}-copied`);
            
            if (copyButton && copiedIndicator) {
              copyButton.addEventListener('click', () => {
                const coordText = `${photo.lat}, ${photo.lon}`;
                navigator.clipboard.writeText(coordText)
                  .then(() => {
                    copiedIndicator.style.display = 'inline';
                    setTimeout(() => {
                      copiedIndicator.style.display = 'none';
                    }, 2000);
                  })
                  .catch(err => {
                    console.error('Не удалось скопировать координаты:', err);
                  });
              });
            }
          }, 100); // Небольшая задержка для уверенности, что DOM обновлен
        });
        
        markersRef.current?.addLayer(marker);
        bounds.extend([photo.lat, photo.lon]);
        hasValidCoords = true;
      }
    });
    
    // Fit map to bounds if there are valid coordinates
    if (hasValidCoords && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Обновляем маркеры при изменении фотографий
  useEffect(() => {
    if (mapInitialized) {
      updateMarkers();
      
      // Также рисуем маршрут, если есть достаточно точек
      const photosWithCoords = photos.filter(p => p.lat !== null && p.lon !== null);
      if (photosWithCoords.length >= 2) {
        drawRouteLines();
      } else {
        // Если фотографий недостаточно для построения маршрута, очищаем линии
        clearRouteLines();
      }
    }
  }, [photos, selectedPhoto, mapInitialized]);
  
  // Отдельный эффект для обновления дубликатов
  useEffect(() => {
    updateDuplicates();
  }, [photos]);

  // Center map on selected photo with animation
  useEffect(() => {
    if (!mapRef.current || !selectedPhoto || selectedPhoto.lat === null || selectedPhoto.lon === null) return;
    
    const options = useAnimation ? { animate: true, duration: 0.8 } : { animate: false };
    mapRef.current.setView([selectedPhoto.lat, selectedPhoto.lon], 15, options);
  }, [selectedPhoto, useAnimation]);

  return (
    <div id="map-container" className="flex-grow relative" style={{ minHeight: '100%', minWidth: '100%', background: 'var(--map-bg)' }}>
      <div id="map" ref={mapContainerRef} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 10, background: 'var(--map-bg)' }}></div>
      
      <div className="absolute top-3 right-3 space-x-2 z-[1000] flex flex-wrap gap-2">
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
            <i className="fas fa-map-marked-alt mr-1"></i> Близкие точки
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
        

        
        <TooltipWrapper text="Проверка запрещенных объектов поблизости" position="bottom">
          <button 
            className="px-3 py-2 rounded shadow-lg transition-colors font-bold text-white"
            style={{ 
              backgroundColor: isPanelVisible === 'safety' ? 'var(--accent)' : 'var(--error)', 
              textShadow: '0px 1px 2px var(--shadow-strong)',
              boxShadow: `0 2px 5px var(--shadow), 0 0 0 2px rgba(255,255,255,0.2)`,
              opacity: selectedPhoto ? 1 : 0.7, 
              cursor: selectedPhoto ? 'pointer' : 'not-allowed'
            }}
            onClick={onToggleSafetyPanel}
          >
            <i className="fas fa-shield-alt mr-1"></i> Проверка объектов
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
              if (isExportOpen) setIsExportOpen(false);
              if (isStatsOpen) setIsStatsOpen(false);
            }}
          >
            <i className="fas fa-cog mr-1"></i> Настройки
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper text="Анализ маршрута и статистика" position="bottom">
          <button 
            className="px-3 py-2 rounded shadow-lg transition-colors font-bold text-white"
            style={{ 
              backgroundColor: isStatsOpen ? 'var(--accent)' : 'var(--primary)', 
              textShadow: '0px 1px 2px var(--shadow-strong)',
              boxShadow: `0 2px 5px var(--shadow), 0 0 0 2px rgba(255,255,255,0.2)`,
              opacity: photos.filter(p => p.lat !== null && p.lon !== null).length >= 2 ? 1 : 0.7,
              cursor: photos.filter(p => p.lat !== null && p.lon !== null).length >= 2 ? 'pointer' : 'not-allowed'
            }}
            onClick={() => {
              if (photos.filter(p => p.lat !== null && p.lon !== null).length < 2) return;
              setIsStatsOpen(!isStatsOpen);
              if (isSettingsOpen) setIsSettingsOpen(false);
              if (isExportOpen) setIsExportOpen(false);
            }}
          >
            <i className="fas fa-chart-pie mr-1"></i> Статистика
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper text="Экспорт маршрута в GPX/KML/GeoJSON" position="bottom">
          <button 
            className="px-3 py-2 rounded shadow-lg transition-colors font-bold text-white"
            style={{ 
              backgroundColor: isExportOpen ? 'var(--accent)' : 'var(--primary)', 
              textShadow: '0px 1px 2px var(--shadow-strong)',
              boxShadow: `0 2px 5px var(--shadow), 0 0 0 2px rgba(255,255,255,0.2)`,
              opacity: photos.filter(p => p.lat !== null && p.lon !== null).length > 0 ? 1 : 0.7,
              cursor: photos.filter(p => p.lat !== null && p.lon !== null).length > 0 ? 'pointer' : 'not-allowed'
            }}
            onClick={() => {
              if (photos.filter(p => p.lat !== null && p.lon !== null).length === 0) return;
              setIsExportOpen(!isExportOpen);
              if (isSettingsOpen) setIsSettingsOpen(false);
              if (isStatsOpen) setIsStatsOpen(false);
            }}
          >
            <i className="fas fa-file-export mr-1"></i> Экспорт
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper text="Показать справку по использованию" position="bottom">
          <button 
            className="px-3 py-2 rounded shadow-lg transition-colors font-bold text-white"
            style={{ 
              backgroundColor: 'var(--info)',
              textShadow: '0px 1px 2px var(--shadow-strong)',
              boxShadow: `0 2px 5px var(--shadow), 0 0 0 2px rgba(255,255,255,0.2)`
            }}
            onClick={() => setIsHelpOpen(true)}
          >
            <i className="fas fa-question-circle mr-1"></i> Справка
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
      

      
      <div className="map-legend absolute bottom-3 left-3 p-3 rounded shadow-lg text-sm z-[1000]" 
        style={{ 
          backgroundColor: 'var(--panel-bg)', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px var(--shadow), 0 0 0 2px rgba(255,255,255,0.1)'
        }}>
        <div className="flex items-center mb-2">
          <div className="w-5 h-5 rounded-full mr-2" 
            style={{ 
              backgroundColor: '#007bff', // Обычный синий цвет маркеров
              border: '2px solid var(--bg)', 
              boxShadow: '0 0 4px var(--shadow)' 
            }}></div>
          <span className="font-semibold">Фото с координатами</span>
        </div>
        <div className="flex items-center mb-2">
          <div className="w-5 h-5 rounded-full mr-2" 
            style={{ 
              backgroundColor: '#ff9500', // Оранжевый для выбранных 
              border: '2px solid var(--bg)', 
              boxShadow: '0 0 6px rgba(255,149,0,0.7)' 
            }}></div>
          <span className="font-semibold">Выбранное фото</span>
        </div>
        <div className="flex items-center mb-2">
          <div className="w-6 h-6 rounded-full mr-2" 
            style={{ 
              backgroundColor: '#ff0000', // Красный для близких точек
              border: '2px solid var(--bg)', 
              boxShadow: '0 0 8px rgba(255,0,0,0.7)' 
            }}></div>
          <span className="font-semibold">Близкие точки (менее 25м)</span>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-6 rounded-full mr-2" 
            style={{ 
              backgroundColor: '#9c27b0', // Пурпурный для запрещенных объектов
              border: '2px solid var(--bg)', 
              boxShadow: '0 0 8px rgba(156,39,176,0.7)' 
            }}></div>
          <span className="font-semibold">У запрещенных объектов (менее 50м)</span>
        </div>
      </div>
      
      {/* Модальное окно справки */}
      <HelpModal 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
      
      {/* Панель экспорта маршрута */}
      <ExportPanel
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        photos={photos}
      />
      
      {/* Панель статистики маршрута */}
      <RouteStatsPanel
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        photos={photos}
      />
    </div>
  );
}