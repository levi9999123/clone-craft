import { useState, useEffect } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { NearbyObject, isSafeDistance, MINIMUM_SAFE_DISTANCE, checkLocationSafety } from './SafetyCheckService';
import { Photo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

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
  const [showSelectMode, setShowSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const { toast } = useToast();
  
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
    
    if (objects.length > 0) {
      // Ищем запрещенные объекты (ближе минимального безопасного расстояния)
      const dangerousObjects = objects.filter(obj => !isSafeDistance(obj.distance));
      
      // Если есть запрещенные объекты, показываем линию ТОЛЬКО к ближайшему запрещенному
      if (dangerousObjects.length > 0) {
        // Берем только ближайший запрещенный объект (он уже отсортирован по расстоянию)
        const closestDangerousObject = dangerousObjects[0];
        
        const L = window.L;
        
        // Рисуем одну линию к ближайшему запрещенному объекту
        L.polyline(
          [
            [selectedPhoto.lat, selectedPhoto.lon],
            [closestDangerousObject.lat, closestDangerousObject.lon]
          ],
          {
            color: 'var(--error)', // Красный цвет для запрещенных объектов
            weight: 4,             // Делаем линию потолще
            opacity: 0.85,
            dashArray: null,       // Сплошная линия для запрещенных объектов
            className: 'safety-polyline'
          }
        ).addTo(mapInstance);
      }
      // В противном случае не рисуем линии вообще (все объекты на допустимом расстоянии)
    }
  };
  
  // Функция для удаления всех полилиний
  const removePolylines = () => {
    if (!window.L) return;
    
    // Получаем ссылку на карту из глобальной области
    const mapInstance = (window as any).mapInstance;
    if (!mapInstance) return;
    
    // Находим и удаляем все полилинии с классом safety-polyline
    mapInstance.eachLayer((layer: any) => {
      if (layer.options && layer.options.className === 'safety-polyline') {
        mapInstance.removeLayer(layer);
      }
    });
  };
  
  // Получаем точки объектов, сортируем по расстоянию и отображаем на карте
  const checkSinglePhoto = async (photo: Photo) => {
    if (!photo || !photo.lat || !photo.lon) {
      toast({
        title: "Выберите точку",
        description: "Выберите точку на карте для проверки",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Запрос данных о запрещенных объектах поблизости
      console.log(`Запрос к Overpass API для фото ${photo.name}`);
      const result = await checkLocationSafety(photo);
      
      if (result && result.restrictedObjects) {
        // Сортируем объекты по расстоянию
        const sortedObjs = result.restrictedObjects.sort((a: NearbyObject, b: NearbyObject) => a.distance - b.distance);
        
        // Обновляем состояние
        setSortedObjects(sortedObjs);
        
        // Сохраняем результаты проверки для этой фотографии
        const newCheckedPhotos = new Map(checkedPhotos);
        newCheckedPhotos.set(photo.id, sortedObjs);
        setCheckedPhotos(newCheckedPhotos);
        
        // Отображаем полилинии к объектам
        drawPolylinesToObjects(sortedObjs);
        
        // Обновляем атрибуты фото
        photo.restrictedObjectsNearby = sortedObjs.some((obj: NearbyObject) => !isSafeDistance(obj.distance));
        photo.nearbyObjectsCount = sortedObjs.length;
        
        // Выбираем фото для отображения результатов
        selectPhoto(photo);
        
        // Уведомление
        if (sortedObjs.some((obj: NearbyObject) => !isSafeDistance(obj.distance))) {
          toast({
            title: "Внимание! Запрещенные объекты рядом",
            description: `Найдено ${sortedObjs.length} объектов, есть нарушения безопасного расстояния`,
            variant: "destructive"
          });
        } else if (sortedObjs.length > 0) {
          toast({
            title: "Объекты найдены",
            description: `Найдено ${sortedObjs.length} объектов, все на безопасном расстоянии`,
            variant: "default"
          });
        } else {
          toast({
            title: "Проверка завершена",
            description: "Запрещенных объектов поблизости не найдено",
            variant: "default"
          });
        }
      } else {
        // Не найдено объектов
        setSortedObjects([]);
        removePolylines();
        
        // Отмечаем фото как проверенное с пустым массивом
        const newCheckedPhotos = new Map(checkedPhotos);
        newCheckedPhotos.set(photo.id, []);
        setCheckedPhotos(newCheckedPhotos);
        
        toast({
          title: "Проверка завершена",
          description: "Запрещенных объектов поблизости не найдено",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Ошибка при проверке:", error);
      toast({
        title: "Ошибка проверки",
        description: "Не удалось проверить запрещенные объекты. Попробуйте еще раз.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для проверки нескольких выбранных фотографий
  const checkSelectedPhotos = async () => {
    // Получаем выбранные фотографии
    const photosToCheck = photos.filter(p => 
      p.lat !== null && p.lon !== null && selectedPhotoIds.has(p.id)
    );
    
    if (photosToCheck.length === 0) {
      toast({
        title: "Нет выбранных фотографий",
        description: "Выберите фотографии для проверки",
        variant: "destructive"
      });
      return;
    }
    
    // Устанавливаем статусы загрузки
    setIsCheckingAll(true);
    setIsLoading(true);
    
    try {
      // Закрываем диалоговое окно
      setIsCheckModalOpen(false);
      
      // Показываем сообщение о начале проверки
      toast({
        title: "Проверка запрещенных объектов",
        description: `Проверяем ${photosToCheck.length} фотографий...`,
        variant: "default"
      });
      
      // Обновление прогресса в интерфейсе
      const updateProgressUI = (current: number, total: number, photoName: string) => {
        const percent = Math.round((current / total) * 100);
        const progressBar = document.getElementById('batch-progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar) {
          progressBar.style.width = `${percent}%`;
          progressBar.setAttribute('aria-valuenow', percent.toString());
        }
        
        if (progressText) {
          progressText.textContent = `Проверено ${current} из ${total}: ${photoName}`;
        }
      };
      
      // Создаем новую карту для хранения результатов
      const resultsMap = new Map<number, NearbyObject[]>();
      let completedCount = 0;
      
      // Используем импортированную функцию напрямую - без динамического импорта
      
      // Проверяем каждую фотографию
      for (const photo of photosToCheck) {
        if (!photo.lat || !photo.lon) continue;
        
        try {
          // Запускаем проверку
          const result = await checkLocationSafety(photo);
          const nearbyObjects = result.restrictedObjects || [];
          
          // Обновляем данные фотографии
          photo.restrictedObjectsNearby = nearbyObjects.some((obj: NearbyObject) => !isSafeDistance(obj.distance));
          photo.nearbyObjectsCount = nearbyObjects.length;
          
          // Сохраняем результаты
          resultsMap.set(photo.id, nearbyObjects);
          
          // Обновляем прогресс
          completedCount++;
          updateProgressUI(completedCount, photosToCheck.length, photo.name);
          
        } catch (error) {
          console.error(`Ошибка при проверке фото ${photo.name}:`, error);
          // В случае ошибки также сохраняем пустой результат
          resultsMap.set(photo.id, []);
          completedCount++;
          updateProgressUI(completedCount, photosToCheck.length, photo.name);
        }
      }
      
      // Обновляем состояние компонента с результатами
      setCheckedPhotos(resultsMap);
      
      // Подсчитываем количество небезопасных фотографий
      let unsafeCount = 0;
      resultsMap.forEach((objects) => {
        if (objects.some((obj: NearbyObject) => !isSafeDistance(obj.distance))) {
          unsafeCount++;
        }
      });
      
      // Сбрасываем режим выбора
      setShowSelectMode(false);
      setSelectedPhotoIds(new Set());
      
      // Показываем уведомление с результатами
      if (unsafeCount > 0) {
        toast({
          title: "Внимание! Обнаружены нарушения",
          description: `Найдено ${unsafeCount} фотографий с запрещенными объектами ближе ${MINIMUM_SAFE_DISTANCE} метров`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Проверка завершена",
          description: `Проверено ${completedCount} фотографий. Запрещенных объектов в опасной близости не обнаружено.`,
          variant: "default"
        });
      }
      
      // Обновляем карту без автоматического выбора точки
      setTimeout(() => {
        if ((window as any).mapInstance) {
          ((window as any).mapInstance).invalidateSize();
        }
      }, 100);
      
    } catch (error) {
      console.error("Ошибка при проверке фотографий:", error);
      toast({
        title: "Ошибка проверки",
        description: "Произошла ошибка при проверке фотографий",
        variant: "destructive"
      });
    } finally {
      // Сбрасываем состояние загрузки
      setTimeout(() => {
        setIsLoading(false);
        setIsCheckingAll(false);
      }, 500);
    }
  };

  // Переключение выбора фотографии
  const togglePhotoSelection = (photoId: number) => {
    const newSelection = new Set(selectedPhotoIds);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotoIds(newSelection);
  };

  // Выбрать все фотографии
  const selectAllPhotos = () => {
    const photosWithCoords = photos.filter(p => p.lat !== null && p.lon !== null);
    const allIds = new Set(photosWithCoords.map(p => p.id));
    setSelectedPhotoIds(allIds);
  };

  // Снять выбор со всех фотографий
  const deselectAllPhotos = () => {
    setSelectedPhotoIds(new Set());
  };

  // Показывает диалоговое окно выбора фотографий для проверки
  const checkAllPhotos = () => {
    // Проверяем, есть ли фотографии с координатами
    const photosWithCoords = photos.filter(p => p.lat !== null && p.lon !== null);
    if (photosWithCoords.length === 0) {
      toast({
        title: "Нет фотографий с координатами",
        description: "Загрузите фотографии с координатами для проверки",
        variant: "destructive"
      });
      return;
    }
    
    // Используем функцию из useModal для открытия диалогового окна
    // и передаем ей обработчик выбранных фотографий
    if (typeof window !== 'undefined') {
      const openPhotoModal = () => {
        // По умолчанию выбираем все фотографии с координатами
        setSelectedPhotoIds(new Set(photosWithCoords.map(p => p.id)));
        
        // Открываем модальное окно выбора фотографий
        setIsCheckModalOpen(true);
        setShowSelectMode(true);
      };
      
      // Немного отложим открытие окна, чтобы избежать конфликтов с другими окнами
      setTimeout(() => {
        openPhotoModal();
      }, 50);
    }
  };
  
  // Определение общего статуса безопасности
  const getPhotoSafetyStatus = (objects: NearbyObject[] | undefined) => {
    if (!objects || objects.length === 0) return 'safe';
    return objects.some((obj: NearbyObject) => !isSafeDistance(obj.distance)) ? 'danger' : 'warning';
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
    <div className="absolute top-14 right-3 z-[999] shadow-lg rounded-lg p-4 max-w-md w-full h-auto max-h-[80vh] overflow-y-auto"
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
          <Button 
            className="safety-check-all-btn"
            variant="default"
            disabled={isLoading || photosWithCoords.length === 0}
            onClick={checkAllPhotos}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                <span>Проверка...</span>
              </>
            ) : (
              <>
                <i className="fas fa-shield-alt mr-2"></i>
                <span>Проверка объектов</span>
              </>
            )}
          </Button>
          
          {selectedPhoto && selectedPhoto.lat !== null && selectedPhoto.lon !== null && (
            <Button 
              className="safety-check-current-btn"
              variant="secondary"
              disabled={isLoading}
              onClick={() => checkSinglePhoto(selectedPhoto)}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  <span>Проверка...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-search-location mr-2"></i>
                  <span>Проверить текущее</span>
                </>
              )}
            </Button>
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
      
      {/* Модальное окно выбора фотографий для проверки */}
      {isCheckModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center" 
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)'
          }}
          onClick={(e) => {
            // Закрываем модальное окно по клику на фон
            if (e.target === e.currentTarget) {
              setIsCheckModalOpen(false);
              setShowSelectMode(false);
            }
          }}
        >
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            style={{
              border: '1px solid var(--border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 pb-2 mb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Выберите фотографии для проверки</h3>
                <button 
                  onClick={() => {
                    setIsCheckModalOpen(false);
                    setShowSelectMode(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Закрыть"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="text-sm text-gray-500 mt-1">
                Выберите фотографии, для которых нужно проверить близость к запрещенным объектам
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={selectAllPhotos}
                size="sm"
                className="flex items-center"
              >
                <i className="fas fa-check-square mr-1.5"></i>
                Выбрать все
              </Button>
              <Button 
                variant="outline" 
                onClick={deselectAllPhotos}
                size="sm"
                className="flex items-center"
              >
                <i className="fas fa-square mr-1.5"></i>
                Снять выделение
              </Button>
              <div className="flex-grow"></div>
              <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md text-sm flex items-center">
                <i className="fas fa-info-circle mr-1.5 text-blue-500"></i>
                Выбрано: <span className="font-semibold ml-1">{selectedPhotoIds.size}</span> из <span className="font-semibold ml-1">{photosWithCoords.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4 mb-4">
              {photosWithCoords.map(photo => (
                <div 
                  key={photo.id}
                  className={`relative rounded-md overflow-hidden cursor-pointer border-2 transition-all
                    ${selectedPhotoIds.has(photo.id) 
                      ? 'border-primary shadow-md scale-[1.02]' 
                      : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                  onClick={() => togglePhotoSelection(photo.id)}
                >
                  {photo.dataUrl ? (
                    <img 
                      src={photo.dataUrl} 
                      alt={photo.name} 
                      className="w-full h-28 object-cover"
                    />
                  ) : (
                    <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
                      <i className="fas fa-image text-gray-400"></i>
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2 z-10">
                    <div className={`w-5 h-5 rounded-sm flex items-center justify-center transition-all ${
                      selectedPhotoIds.has(photo.id) 
                        ? 'bg-primary text-white' 
                        : 'bg-white border-2 border-gray-300'
                    }`}>
                      {selectedPhotoIds.has(photo.id) && <i className="fas fa-check text-xs"></i>}
                    </div>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 pt-6 text-white text-xs truncate">
                    {photo.name}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCheckModalOpen(false);
                  setShowSelectMode(false);
                }}
                className="flex items-center"
              >
                <i className="fas fa-times mr-1.5"></i>
                Отмена
              </Button>
              <Button 
                variant="default" 
                onClick={checkSelectedPhotos}
                disabled={selectedPhotoIds.size === 0 || isLoading}
                className="flex items-center"
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-1.5"></i>
                    Обработка...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check mr-1.5"></i>
                    Проверить выбранные ({selectedPhotoIds.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
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
                className="coords-copy-btn ml-2 p-1 bg-primary text-white rounded hover:bg-primary-dark"
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
                {/* Показываем только один объект - самый ближайший */}
                {currentObjectsToShow.length > 0 && (
                  <div 
                    key={currentObjectsToShow[0].id}
                    className="p-3 rounded-md transition-all mb-3"
                    style={{
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 3px var(--shadow)',
                      borderLeft: `4px solid ${isSafeDistance(currentObjectsToShow[0].distance) ? 'var(--success)' : 'var(--error)'}`
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium mr-2 flex-1">{currentObjectsToShow[0].name || 'Здание'}</div>
                      <div className="text-sm font-bold whitespace-nowrap" 
                        style={{ 
                          color: isSafeDistance(currentObjectsToShow[0].distance) ? 'var(--success)' : 'var(--error)' 
                        }}
                      >
                        {currentObjectsToShow[0].distance.toFixed(1)} м
                      </div>
                    </div>
                      
                    {currentObjectsToShow[0].type && currentObjectsToShow[0].type !== 'Не определен' && (
                      <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        <span className="inline-block bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 mr-1">
                          {currentObjectsToShow[0].type}
                        </span>
                      </div>
                    )}
                      
                    <div className="text-xs mt-2 flex justify-between items-center" style={{ color: 'var(--text-secondary)' }}>
                      <div>
                        Координаты: {currentObjectsToShow[0].lat?.toFixed(5)}, {currentObjectsToShow[0].lon?.toFixed(5)}
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                          backgroundColor: isSafeDistance(currentObjectsToShow[0].distance) ? 'var(--success-light)' : 'var(--error-light)',
                          color: isSafeDistance(currentObjectsToShow[0].distance) ? 'var(--success)' : 'var(--error)'
                        }}>
                          {isSafeDistance(currentObjectsToShow[0].distance) 
                            ? <span>✓ Допустимо</span> 
                            : <span>✕ Не допустимо</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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