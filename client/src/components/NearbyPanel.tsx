import { useEffect, useState } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import PhotoItem from './PhotoItem';
import { findNearbyPhotos, calculateDistance, Photo } from '@/lib/utils';
import { drawPolylinesBetweenPoints } from './SafetyCheckService';

interface NearbyPanelProps {
  onClose: () => void;
}

export default function NearbyPanel({ onClose }: NearbyPanelProps) {
  const { photos, selectedPhoto, selectPhoto, removePhoto } = usePhotoContext();
  const [nearbyPhotos, setNearbyPhotos] = useState<Photo[]>([]);
  const [searchRadius, setSearchRadius] = useState(1); // default 1km
  const [showLines, setShowLines] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(true);
  
  // Реализация алгоритма ближайшего соседа
  const findNearestNeighborPath = (points: Photo[]): Photo[] => {
    if (points.length <= 1) return points;
    
    const result: Photo[] = [];
    const unvisited = [...points];
    
    // Начинаем с первой точки (может быть референсная фотография)
    let current = unvisited.shift()!;
    result.push(current);
    
    // Пока есть непосещенные точки
    while (unvisited.length > 0) {
      let minDistance = Infinity;
      let nextIndex = -1;
      
      // Находим ближайшую точку к текущей
      for (let i = 0; i < unvisited.length; i++) {
        if (current.lat === null || current.lon === null || 
            unvisited[i].lat === null || unvisited[i].lon === null) continue;
            
        const distance = calculateDistance(
          current.lat as number, 
          current.lon as number, 
          unvisited[i].lat as number, 
          unvisited[i].lon as number
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nextIndex = i;
        }
      }
      
      // Если нашли следующую точку
      if (nextIndex !== -1) {
        current = unvisited[nextIndex];
        unvisited.splice(nextIndex, 1);
        result.push(current);
      } else {
        break; // Если не нашли (например, нет координат), выходим
      }
    }
    
    return result;
  };
  
  // Функция для отрисовки линий между точками
  const drawPathLines = () => {
    if (!selectedPhoto || !window.L || !nearbyPhotos.length) return;
    
    const mapInstance = (window as any).mapInstance;
    if (!mapInstance) return;
    
    // Сначала удаляем все существующие полилинии
    const layers = mapInstance._layers;
    if (layers) {
      Object.keys(layers).forEach(key => {
        const layer = layers[key];
        if (layer.options && layer.options.className === 'nearest-neighbor-line') {
          mapInstance.removeLayer(layer);
        }
      });
    }
    
    if (showLines) {
      // Начинаем с выбранной фотографии
      let pathPoints: Photo[] = [selectedPhoto, ...nearbyPhotos];
      
      // Применяем алгоритм ближайшего соседа
      pathPoints = findNearestNeighborPath(pathPoints);
      
      // Создаем массив точек для отображения полилиний
      const points = pathPoints
        .filter(p => p.lat !== null && p.lon !== null)
        .map(p => ({
          lat: p.lat as number,
          lon: p.lon as number
        }));
      
      // Рисуем линии между последовательными точками
      if (points.length >= 2) {
        const L = window.L;
        for (let i = 0; i < points.length - 1; i++) {
          L.polyline(
            [
              [points[i].lat, points[i].lon],
              [points[i+1].lat, points[i+1].lon]
            ],
            {
              color: '#3388ff',
              weight: 3,
              opacity: 0.7,
              dashArray: '5, 5',
              className: 'nearest-neighbor-line'
            }
          ).addTo(mapInstance);
        }
      }
    }
  };
  
  useEffect(() => {
    if (!selectedPhoto) return;
    
    // Конвертируем радиус из км в единицы поиска
    const nearby = findNearbyPhotos(photos, selectedPhoto, searchRadius);
    
    // Сортируем по расстоянию, если включена опция
    const sorted = sortByDistance 
      ? [...nearby].sort((a, b) => (a.distance || 0) - (b.distance || 0))
      : nearby;
      
    setNearbyPhotos(sorted);
  }, [photos, selectedPhoto, searchRadius, sortByDistance]);
  
  // Отдельный эффект для отрисовки линий
  useEffect(() => {
    drawPathLines();
  }, [nearbyPhotos, showLines, selectedPhoto]);
  
  if (!selectedPhoto) {
    return (
      <div className="w-80 bg-white shadow-md border-l border-gray-200 overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-primary">Близкие точки</h3>
          <button className="text-gray-500 hover:text-primary" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-4">
          <p className="text-gray-500 text-center">Выберите фотографию, чтобы увидеть близкие точки</p>
        </div>
      </div>
    );
  }
  
  // Для радиуса в метрах, отображаем в метрах
  const radiusDisplay = searchRadius * 1000; // конвертируем в метры для отображения
  
  return (
    <div className="w-80 bg-white shadow-md border-l border-gray-200 overflow-y-auto">
      <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-bold text-primary">Близкие точки</h3>
        <button className="text-gray-500 hover:text-primary" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Радиус поиска: {radiusDisplay.toFixed(0)} м
          </label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={searchRadius}
            onChange={(e) => setSearchRadius(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div className="flex justify-between mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="sort-by-distance"
              checked={sortByDistance}
              onChange={(e) => setSortByDistance(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="sort-by-distance" className="text-sm">
              Сортировать по расстоянию
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="show-lines"
              checked={showLines}
              onChange={(e) => setShowLines(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="show-lines" className="text-sm">
              Показать маршрут
            </label>
          </div>
        </div>
        
        {nearbyPhotos.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Найдено: {nearbyPhotos.length} фото
            </p>
            {nearbyPhotos.map(photo => (
              <PhotoItem
                key={photo.id}
                photo={photo}
                onRemove={() => removePhoto(photo.id)}
                onClick={() => selectPhoto(photo)}
                isSelected={selectedPhoto?.id === photo.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">Нет близких точек (менее 25 м) в указанном радиусе</p>
        )}
      </div>
    </div>
  );
}
