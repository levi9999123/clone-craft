import React from 'react';
import { Photo } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface RouteStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
}

// Расчет скорости в км/ч в зависимости от типа передвижения
const SPEED_FACTORS = {
  'walking': 4, // 4 км/ч
  'running': 10, // 10 км/ч
  'cycling': 15, // 15 км/ч
  'driving': 60, // 60 км/ч
};

export default function RouteStatsPanel({ isOpen, onClose, photos }: RouteStatsPanelProps) {
  const [travelMode, setTravelMode] = React.useState<keyof typeof SPEED_FACTORS>('walking');
  
  if (!isOpen) return null;

  const photosWithCoords = photos.filter(photo => photo.lat !== null && photo.lon !== null);
  
  // Если нет достаточно точек для построения маршрута
  if (photosWithCoords.length < 2) {
    return (
      <div className="absolute top-20 right-3 z-[1000] w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Статистика маршрута</CardTitle>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <CardDescription>
              Недостаточно данных для анализа
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-center py-6">
              <i className="fas fa-exclamation-circle text-yellow-500 text-4xl mb-3"></i>
              <p className="text-gray-600 dark:text-gray-300">
                Для построения статистики необходимо добавить не менее двух фотографий с координатами.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Сортируем фотографии по ID (порядку добавления)
  const sortedPhotos = [...photosWithCoords].sort((a, b) => a.id - b.id);
  
  // Вычисляем общую дистанцию и расстояния между точками
  let totalDistance = 0;
  const segmentDistances: number[] = [];
  
  for (let i = 0; i < sortedPhotos.length - 1; i++) {
    const p1 = sortedPhotos[i];
    const p2 = sortedPhotos[i + 1];
    
    if (p1.lat !== null && p1.lon !== null && p2.lat !== null && p2.lon !== null) {
      // Функция расчета расстояния между двумя координатами
      const distance = calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon);
      totalDistance += distance;
      segmentDistances.push(distance);
    }
  }
  
  // Расчет времени пути в зависимости от выбранного режима
  const totalTimeHours = totalDistance / 1000 / SPEED_FACTORS[travelMode];
  const hours = Math.floor(totalTimeHours);
  const minutes = Math.floor((totalTimeHours - hours) * 60);
  
  // Находим самый длинный и самый короткий сегмент
  const maxSegment = Math.max(...segmentDistances);
  const minSegment = Math.min(...segmentDistances);
  const avgSegment = totalDistance / segmentDistances.length;
  
  // Функция для расчета расстояния между двумя точками (Haversine formula)
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Радиус Земли в метрах
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // в метрах
  }

  // Форматирование расстояния с правильными единицами измерения
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} км`;
    }
    return `${Math.round(meters)} м`;
  };

  return (
    <div className="absolute top-20 right-3 z-[1000] w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Статистика маршрута</CardTitle>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <CardDescription>
            Анализ маршрута по {photosWithCoords.length} точкам
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Основная информация */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <div className="text-sm text-gray-500 dark:text-gray-400">Общее расстояние</div>
              <div className="text-xl font-bold mt-1">{formatDistance(totalDistance)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <div className="text-sm text-gray-500 dark:text-gray-400">Точки маршрута</div>
              <div className="text-xl font-bold mt-1">{photosWithCoords.length}</div>
            </div>
          </div>
          
          {/* Расчетное время */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium">Расчетное время пути</div>
              <select 
                value={travelMode}
                onChange={(e) => setTravelMode(e.target.value as keyof typeof SPEED_FACTORS)}
                className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
              >
                <option value="walking">Пешком</option>
                <option value="running">Бег</option>
                <option value="cycling">Велосипед</option>
                <option value="driving">Автомобиль</option>
              </select>
            </div>
            <div className="text-lg font-bold">
              {hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин`}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              (при скорости {SPEED_FACTORS[travelMode]} км/ч)
            </div>
          </div>
          
          <Separator />
          
          {/* Статистика сегментов */}
          <div>
            <h4 className="text-sm font-medium mb-2">Статистика сегментов</h4>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Средний</span>
                  <span>{formatDistance(avgSegment)}</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Максимальный</span>
                  <span>{formatDistance(maxSegment)}</span>
                </div>
                <Progress value={(maxSegment / maxSegment) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Минимальный</span>
                  <span>{formatDistance(minSegment)}</span>
                </div>
                <Progress value={(minSegment / maxSegment) * 100} className="h-2" />
              </div>
            </div>
          </div>
          
          {/* Сложность маршрута */}
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Сложность маршрута</h4>
            <div className="flex space-x-2">
              {totalDistance <= 2000 && (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Легкий</Badge>
              )}
              {totalDistance > 2000 && totalDistance <= 5000 && (
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Средний</Badge>
              )}
              {totalDistance > 5000 && (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Сложный</Badge>
              )}
              
              {segmentDistances.some(d => d > 1000) && (
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Длинные переходы</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}