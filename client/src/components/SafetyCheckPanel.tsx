import { useState, useEffect } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { NearbyObject, isSafeDistance, MINIMUM_SAFE_DISTANCE } from './SafetyCheckService';
import { checkLocationSafety } from '@/services/overpassService';
import { Photo } from '@/lib/utils';

interface SafetyCheckPanelProps {
  isOpen: boolean;
  onClose: () => void;
  restrictedObjects: NearbyObject[];
}

export default function SafetyCheckPanel({ 
  isOpen, 
  onClose,
  restrictedObjects
}: SafetyCheckPanelProps) {
  const { photos, selectedPhoto, selectPhoto } = usePhotoContext();
  const [sortedObjects, setSortedObjects] = useState<NearbyObject[]>([]);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [checkedPhotos, setCheckedPhotos] = useState<Map<number, NearbyObject[]>>(new Map());
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Отслеживаем изменение выбранной фотографии
  useEffect(() => {
    if (selectedPhoto) {
      setSelectedPhotoId(selectedPhoto.id);
    }
  }, [selectedPhoto]);
  
  // Обновление списка объектов при изменении входных данных для текущей фотографии
  useEffect(() => {
    if (!selectedPhotoId) return;
    
    if (restrictedObjects && restrictedObjects.length > 0) {
      const sorted = [...restrictedObjects].sort((a, b) => a.distance - b.distance);
      setSortedObjects(sorted);
      
      // Сохраняем результаты проверки для этой фотографии
      const newCheckedPhotos = new Map(checkedPhotos);
      newCheckedPhotos.set(selectedPhotoId, sorted);
      setCheckedPhotos(newCheckedPhotos);
      
      // Отображаем полилинии на карте для визуализации расстояний
      drawPolylinesToObjects(sorted);
    } else {
      setSortedObjects([]);
      removePolylines();
      
      // Если не было объектов, отмечаем фото как проверенное с пустым массивом
      const newCheckedPhotos = new Map(checkedPhotos);
      newCheckedPhotos.set(selectedPhotoId, []);
      setCheckedPhotos(newCheckedPhotos);
    }
  }, [restrictedObjects, selectedPhotoId]);
  
  // Функция для отображения полилиний от фото к объектам
  const drawPolylinesToObjects = (objects: NearbyObject[]) => {
    if (!selectedPhoto || !selectedPhoto.lat || !selectedPhoto.lon || !window.L) return;
    
    // Получаем ссылку на карту из глобальной области
    const mapInstance = (window as any).mapInstance;
    if (!mapInstance) return;
    
    // Вначале удаляем все существующие полилинии
    removePolylines();
    
    // Если есть фото и точки объектов, рисуем полилинии
    if (objects.length > 0) {
      objects.forEach(obj => {
        const L = window.L;
        const isUnsafe = !isSafeDistance(obj.distance);
        
        L.polyline(
          [
            [selectedPhoto.lat, selectedPhoto.lon],
            [obj.lat, obj.lon]
          ],
          {
            color: isUnsafe ? 'var(--error)' : 'var(--primary)',
            weight: isUnsafe ? 3 : 2,
            opacity: 0.7,
            dashArray: isUnsafe ? null : '5, 5',
            className: 'safety-polyline'
          }
        ).addTo(mapInstance);
      });
    }
  };
  
  // Функция для удаления всех полилиний
  const removePolylines = () => {
    const mapInstance = (window as any).mapInstance;
    if (!mapInstance) return;
    
    const layers = mapInstance._layers;
    if (layers) {
      Object.keys(layers).forEach(key => {
        const layer = layers[key];
        if (layer.options && layer.options.className === 'safety-polyline') {
          mapInstance.removeLayer(layer);
        }
      });
    }
  };
  
  // Проверка одной фотографии с улучшенной обработкой и учетом границ объектов
  const checkSinglePhoto = async (photo: Photo) => {
    if (!photo.lat || !photo.lon) return;
    
    setIsLoading(true);
    
    try {
      // Используем улучшенную проверку безопасности
      // Импортируем функцию из SafetyCheckService для проверки с учетом границ объектов
      const { checkLocationSafety: checkPhotoSafety } = await import('./SafetyCheckService');
      
      // Запускаем проверку, передавая фото целиком
      const result = await checkPhotoSafety(photo);
      
      // Получаем список объектов из результата
      const objects = result.restrictedObjects || [];
      
      // Сохраняем результаты
      const newCheckedPhotos = new Map(checkedPhotos);
      newCheckedPhotos.set(photo.id, objects);
      setCheckedPhotos(newCheckedPhotos);
      
      // Выбираем эту фотографию для отображения результатов
      selectPhoto(photo);
      setSortedObjects(objects);
      
      // Выводим предупреждение и количество найденных объектов
      if (result.warningMessage) {
        console.log(result.warningMessage);
      }
      console.log(`Обнаружено объектов вблизи: ${objects.length}`);
    } catch (error) {
      console.error("Ошибка при проверке фотографии:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Проверка всех фотографий с индикатором прогресса и учетом границ объектов
  const checkAllPhotos = async () => {
    // Фильтруем только фотографии с координатами
    const photosWithCoords = photos.filter(p => p.lat !== null && p.lon !== null);
    
    if (photosWithCoords.length === 0) return;
    
    setIsCheckingAll(true);
    setIsLoading(true);
    
    try {
      // Получаем улучшенную реализацию функции проверки
      const { checkLocationSafety: checkPhotoSafety } = await import('./SafetyCheckService');
      
      const results = new Map<number, NearbyObject[]>();
      const total = photosWithCoords.length;
      
      // Прогресс загрузки
      const updateProgress = (current: number, photoName: string) => {
        const progressPercent = Math.round((current / total) * 100);
        const progressElement = document.getElementById('batch-progress-bar');
        const progressTextElement = document.getElementById('progress-text');
        
        if (progressElement) {
          progressElement.style.width = `${progressPercent}%`;
          progressElement.setAttribute('aria-valuenow', progressPercent.toString());
        }
        
        if (progressTextElement) {
          progressTextElement.textContent = `Проверено ${current} из ${total}: ${photoName}`;
        }
      };
      
      // Проверяем каждую фотографию последовательно с задержкой
      // чтобы не перегружать API Overpass
      for (let i = 0; i < photosWithCoords.length; i++) {
        const photo = photosWithCoords[i];
        if (!photo.lat || !photo.lon) continue;
        
        // Обновляем индикатор прогресса
        updateProgress(i, photo.name);
        
        try {
          // Используем новую функцию проверки, которая учитывает границы объектов
          const result = await checkPhotoSafety(photo);
          const objects = result.restrictedObjects || [];
          
          // Сохраняем результаты
          results.set(photo.id, objects);
          
          console.log(`Фото ${photo.name}: найдено ${objects.length} объектов поблизости`);
          
          // Добавляем задержку 500мс между запросами, чтобы не перегружать Overpass API
          if (i < photosWithCoords.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Ошибка при проверке фото ${photo.name}:`, error);
          // Продолжаем с другими фото даже при ошибке с текущим
          results.set(photo.id, []);
        }
      }
      
      // Финальное обновление прогресса
      updateProgress(total, "завершено");
      
      // Обновляем состояние
      setCheckedPhotos(results);
      
      // Если есть выбранное фото, обновляем список объектов
      if (selectedPhotoId && results.has(selectedPhotoId)) {
        setSortedObjects(results.get(selectedPhotoId) || []);
      }
      
    } catch (error) {
      console.error("Ошибка при проверке всех фотографий:", error);
    } finally {
      // Короткая задержка перед скрытием прогресс-бара
      setTimeout(() => {
        setIsLoading(false);
        setIsCheckingAll(false);
      }, 500);
    }
  };
  
  // Определение общего статуса безопасности
  const getPhotoSafetyStatus = (objects: NearbyObject[] | undefined) => {
    if (!objects || objects.length === 0) return 'safe';
    return objects.some(obj => !isSafeDistance(obj.distance)) ? 'danger' : 'warning';
  };
  
  // Определение текущего статуса безопасности выбранной фотографии
  const currentObjectsToShow = selectedPhotoId ? checkedPhotos.get(selectedPhotoId) || sortedObjects : [];
  const overallStatus = getPhotoSafetyStatus(currentObjectsToShow);
  
  // Количество небезопасных фотографий
  const getUnsafePhotosCount = () => {
    let count = 0;
    checkedPhotos.forEach((objects) => {
      if (getPhotoSafetyStatus(objects) === 'danger') count++;
    });
    return count;
  };
  
  if (!isOpen) return null;
  
  // Список фотографий с координатами
  const photosWithCoords = photos.filter(p => p.lat !== null && p.lon !== null);
  
  return (
    <div className="absolute top-14 left-3 z-[999] shadow-lg rounded-lg p-4 max-w-md w-full h-auto max-h-[80vh] overflow-y-auto"
      style={{
        backdropFilter: 'blur(10px)',
        backgroundColor: 'var(--panel-bg)',
        boxShadow: '0 4px 20px var(--shadow)',
        border: '1px solid var(--border)',
        transform: isOpen ? 'translateY(0)' : 'translateY(-20px)',
        opacity: isOpen ? 1 : 0,
        transition: 'all 0.3s ease'
      }}>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Проверка запрещенных объектов</h3>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      {/* Панель управления проверкой */}
      <div className="mb-4 p-3 rounded-lg border border-gray-200">
        <div className="flex justify-between mb-3">
          <button 
            className="px-3 py-2 bg-primary text-white rounded shadow hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || photosWithCoords.length === 0}
            onClick={checkAllPhotos}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Проверка...
              </>
            ) : (
              <>
                <i className="fas fa-shield-alt mr-2"></i>
                Проверить все фото
              </>
            )}
          </button>
          
          {selectedPhoto && selectedPhoto.lat !== null && selectedPhoto.lon !== null && (
            <button 
              className="px-3 py-2 bg-accent text-white rounded shadow hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              onClick={() => checkSinglePhoto(selectedPhoto)}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Проверка...
                </>
              ) : (
                <>
                  <i className="fas fa-search-location mr-2"></i>
                  Проверить текущее
                </>
              )}
            </button>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          <p>
            <i className="fas fa-info-circle mr-1"></i>
            Всего фотографий с координатами: {photosWithCoords.length}
          </p>
          {checkedPhotos.size > 0 && (
            <p>
              <i className="fas fa-check-circle mr-1"></i>
              Проверено фотографий: {checkedPhotos.size}
            </p>
          )}
          {getUnsafePhotosCount() > 0 && (
            <p className="text-error">
              <i className="fas fa-exclamation-triangle mr-1"></i>
              Фотографий с нарушениями: {getUnsafePhotosCount()}
            </p>
          )}
          
          {/* Индикатор прогресса для пакетной проверки */}
          {isLoading && isCheckingAll && (
            <div className="mt-3">
              <p id="progress-text" className="text-sm mb-1">Проверка фотографий...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  id="batch-progress-bar"
                  className="bg-primary h-2.5 rounded-full transition-all ease-in-out" 
                  style={{ width: '0%' }}
                  role="progressbar" 
                  aria-valuenow={0} 
                  aria-valuemin={0} 
                  aria-valuemax={100}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Список проверенных фотографий */}
      {checkedPhotos.size > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Проверенные фотографии</h4>
          <div className="grid grid-cols-4 gap-2">
            {Array.from(checkedPhotos.keys()).map(photoId => {
              const photo = photos.find(p => p.id === photoId);
              if (!photo) return null;
              
              const photoStatus = getPhotoSafetyStatus(checkedPhotos.get(photoId));
              const statusColors = {
                safe: 'var(--success)',
                warning: 'var(--accent)',
                danger: 'var(--error)'
              };
              
              return (
                <div 
                  key={photoId}
                  className={`relative rounded overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${photoId === selectedPhotoId ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => {
                    selectPhoto(photo);
                  }}
                >
                  {photo.dataUrl ? (
                    <img 
                      src={photo.dataUrl} 
                      alt={photo.name} 
                      className="w-full h-20 object-cover"
                    />
                  ) : (
                    <div className="w-full h-20 bg-gray-100 flex items-center justify-center">
                      <i className="fas fa-image text-gray-400"></i>
                    </div>
                  )}
                  <div 
                    className="absolute top-1 right-1 w-4 h-4 rounded-full"
                    style={{ backgroundColor: statusColors[photoStatus] }}
                    title={
                      photoStatus === 'danger' 
                        ? 'Есть нарушения!' 
                        : photoStatus === 'warning' 
                          ? 'Есть объекты поблизости' 
                          : 'Безопасно'
                    }
                  ></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Результаты проверки выбранной фотографии */}
      {selectedPhoto ? (
        <>
          <div className="mb-4 p-3 rounded-lg"
            style={{ 
              backgroundColor: overallStatus === 'danger' 
                ? 'rgba(220, 53, 69, 0.1)' 
                : overallStatus === 'warning' 
                  ? 'rgba(255, 193, 7, 0.1)' 
                  : 'rgba(40, 167, 69, 0.1)',
              borderLeft: `4px solid ${overallStatus === 'danger' 
                ? 'var(--error)' 
                : overallStatus === 'warning' 
                  ? 'var(--accent)' 
                  : 'var(--success)'}`
            }}
          >
            <div className="flex items-center mb-2">
              <i className={`fas fa-${overallStatus === 'danger' 
                ? 'exclamation-triangle' 
                : overallStatus === 'warning' 
                  ? 'exclamation-circle' 
                  : 'check-circle'} mr-2`}
                style={{ 
                  color: overallStatus === 'danger' 
                    ? 'var(--error)' 
                    : overallStatus === 'warning' 
                      ? 'var(--accent)' 
                      : 'var(--success)'
                }}
              ></i>
              <span className="font-semibold">
                {overallStatus === 'danger' 
                  ? 'Обнаружены запрещенные объекты в опасной близости!' 
                  : overallStatus === 'warning' 
                    ? 'Обнаружены объекты на допустимом расстоянии' 
                    : 'Точка проверена, запрещенных объектов не обнаружено'}
              </span>
            </div>
            
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {overallStatus === 'danger' 
                ? `Согласно правилам п.3.17, минимально допустимое расстояние до запрещенных объектов - ${MINIMUM_SAFE_DISTANCE} метров.` 
                : overallStatus === 'warning' 
                  ? `Найдено ${currentObjectsToShow.length} объектов рядом с точкой, но все на безопасном расстоянии.` 
                  : 'Точка удовлетворяет правилам безопасности п.3.17.'}
            </p>
            
            <div className="flex items-center mt-2 text-sm">
              <i className="fas fa-map-marker-alt mr-1"></i>
              <span>Координаты: {selectedPhoto.lat?.toFixed(6)}, {selectedPhoto.lon?.toFixed(6)}</span>
              <button 
                className="ml-2 p-1 bg-primary text-white rounded hover:bg-primary-dark"
                onClick={() => {
                  if (selectedPhoto.lat && selectedPhoto.lon) {
                    navigator.clipboard.writeText(`${selectedPhoto.lat}, ${selectedPhoto.lon}`);
                  }
                }}
                title="Скопировать координаты"
              >
                <i className="fas fa-copy text-xs"></i>
              </button>
            </div>
          </div>
          
          {currentObjectsToShow.length > 0 && (
            <div className="mt-3 max-h-[300px] overflow-y-auto pr-1" 
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--border) transparent'
              }}>
              <h4 className="font-semibold mb-2">Объекты поблизости ({currentObjectsToShow.length})</h4>
              
              <div className="space-y-2">
                {currentObjectsToShow.map((obj) => (
                  <div 
                    key={obj.id}
                    className="p-3 rounded-md transition-all"
                    style={{
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 3px var(--shadow)',
                      borderLeft: `4px solid ${isSafeDistance(obj.distance) ? 'var(--success)' : 'var(--error)'}`
                    }}
                  >
                    <div className="flex justify-between">
                      <div className="font-medium">{obj.name}</div>
                      <div className="text-sm font-bold" 
                        style={{ 
                          color: isSafeDistance(obj.distance) ? 'var(--success)' : 'var(--error)' 
                        }}
                      >
                        {obj.distance.toFixed(1)} м
                      </div>
                    </div>
                    
                    <div className="text-xs mt-1 flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                      <div>Тип: {obj.type}</div>
                      <div>
                        {isSafeDistance(obj.distance) 
                          ? <span style={{ color: 'var(--success)' }}>✓ Допустимо</span> 
                          : <span style={{ color: 'var(--error)' }}>✕ Не допустимо</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6" style={{ color: 'var(--text-secondary)' }}>
          <i className="fas fa-map-marker-alt mb-2 text-xl"></i>
          <p>Выберите точку на карте для проверки</p>
        </div>
      )}
    </div>
  );
}