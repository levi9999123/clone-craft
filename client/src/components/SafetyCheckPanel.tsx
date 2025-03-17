import { useState, useEffect } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { NearbyObject, isSafeDistance, MINIMUM_SAFE_DISTANCE, checkLocationSafety } from './SafetyCheckService';
import { Photo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  const [checkedPhotos, setCheckedPhotos] = useState<Map<number, NearbyObject[]>>(new Map());
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
  
  // УПРОЩЕННАЯ функция проверки безопасности
  const checkAllPhotos = async () => {
    const photosWithCoords = photos.filter(p => p.lat !== null && p.lon !== null);
    
    if (photosWithCoords.length === 0) {
      toast({
        title: "Нет фотографий с координатами",
        description: "Загрузите фотографии с координатами для проверки",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Используем текущее выбранное фото или первое в списке
      const photoToCheck = selectedPhoto || photosWithCoords[0];
      
      if (photoToCheck && photoToCheck.lat && photoToCheck.lon) {
        console.log(`ЕДИНСТВЕННЫЙ запрос к Overpass API для (${photoToCheck.lat}, ${photoToCheck.lon})`);
        const result = await checkLocationSafety(photoToCheck);
        
        if (result && result.restrictedObjects) {
          // Сортируем объекты по расстоянию
          const sortedObjs = result.restrictedObjects.sort((a, b) => a.distance - b.distance);
          
          // Обновляем состояние
          setSortedObjects(sortedObjs);
          
          // Сохраняем результаты проверки
          const newCheckedPhotos = new Map(checkedPhotos);
          newCheckedPhotos.set(photoToCheck.id, sortedObjs);
          setCheckedPhotos(newCheckedPhotos);
          
          // Отображаем полилинии к объектам
          drawPolylinesToObjects(sortedObjs);
          
          // Обновляем атрибуты фото
          photoToCheck.restrictedObjectsNearby = sortedObjs.some(obj => !isSafeDistance(obj.distance));
          photoToCheck.nearbyObjectsCount = sortedObjs.length;
          
          // Выбираем фото для отображения результатов
          selectPhoto(photoToCheck);
          setSelectedPhotoId(photoToCheck.id);
          
          // Сохраняем отчет в localStorage для открытия в отдельной вкладке
          // Преобразуем Map в массив для сохранения в JSON
          const reportData = {
            photos: photosWithCoords,
            objectsEntries: Array.from(newCheckedPhotos.entries()),
            date: new Date().toISOString()
          };
          
          localStorage.setItem('safetyCheckReport', JSON.stringify(reportData));
          
          // Открываем отчет в том же окне, перенаправляя пользователя
          try {
            // Сначала пробуем открыть в новой вкладке
            const newWindow = window.open('/report', '_blank');
            
            // Если окно не открылось (заблокировано), показываем ссылку в сообщении
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
              toast({
                title: "Отчет готов!",
                description: (
                  <div>
                    Блокировщик всплывающих окон не позволил открыть отчет. 
                    <a 
                      href="/report" 
                      target="_blank" 
                      className="ml-1 text-primary underline font-medium"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = '/report';
                      }}
                    >
                      Нажмите здесь, чтобы открыть отчет
                    </a>
                  </div>
                ),
                duration: 10000
              });
            }
          } catch (error) {
            // В случае любой ошибки, просто перенаправляем пользователя
            window.location.href = '/report';
          }
          
          // Уведомление
          if (sortedObjs.some(obj => !isSafeDistance(obj.distance))) {
            toast({
              title: "Внимание! Запрещенные объекты рядом",
              description: `Найдено ${sortedObjs.length} объектов, есть нарушения безопасного расстояния. Открыт подробный отчет.`,
              variant: "destructive"
            });
          } else if (sortedObjs.length > 0) {
            toast({
              title: "Объекты найдены",
              description: `Найдено ${sortedObjs.length} объектов, все на безопасном расстоянии. Открыт подробный отчет.`,
              variant: "default"
            });
          } else {
            toast({
              title: "Проверка завершена",
              description: "Запрещенных объектов поблизости не найдено. Открыт подробный отчет.",
              variant: "default"
            });
          }
        } else {
          // Не найдено объектов
          setSortedObjects([]);
          removePolylines();
          
          // Сохраняем пустой отчет и открываем вкладку
          const reportData = {
            photos: photosWithCoords,
            objectsEntries: Array.from(checkedPhotos.entries()),
            date: new Date().toISOString()
          };
          
          localStorage.setItem('safetyCheckReport', JSON.stringify(reportData));
          
          // Используем тот же механизм открытия, что и выше
          try {
            const newWindow = window.open('/report', '_blank');
            
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
              toast({
                title: "Отчет готов!",
                description: (
                  <div>
                    Блокировщик всплывающих окон не позволил открыть отчет. 
                    <a 
                      href="/report" 
                      target="_blank" 
                      className="ml-1 text-primary underline font-medium"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = '/report';
                      }}
                    >
                      Нажмите здесь, чтобы открыть отчет
                    </a>
                  </div>
                ),
                duration: 10000
              });
            }
          } catch (error) {
            window.location.href = '/report';
          }
          
          toast({
            title: "Проверка завершена",
            description: "Запрещенных объектов поблизости не найдено. Открыт подробный отчет.",
            variant: "default"
          });
        }
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
  
  // Определение общего статуса безопасности
  const getPhotoSafetyStatus = (objects: NearbyObject[] | undefined) => {
    if (!objects || objects.length === 0) return 'safe';
    return objects.some(obj => !isSafeDistance(obj.distance)) ? 'danger' : 'warning';
  };
  
  // Определение текущего статуса безопасности выбранной фотографии
  const currentObjectsToShow = selectedPhotoId ? checkedPhotos.get(selectedPhotoId) || sortedObjects : [];
  const overallStatus = getPhotoSafetyStatus(currentObjectsToShow);
  
  if (!isOpen) return null;
  
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
      
      {/* УПРОЩЕННАЯ панель управления проверкой */}
      <div className="mb-4 p-3 rounded-lg border border-gray-200">
        <Button 
          className="safety-check-all-btn w-full"
          variant="default"
          disabled={isLoading || photos.filter(p => p.lat !== null && p.lon !== null).length === 0}
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
              <span>Выполнить проверку</span>
            </>
          )}
        </Button>
        
        <div className="text-sm text-gray-600 mt-2">
          <p>
            <i className="fas fa-info-circle mr-1"></i>
            Всего фотографий с координатами: {photos.filter(p => p.lat !== null && p.lon !== null).length}
          </p>
        </div>
      </div>
      
      {/* Результаты проверки */}
      {currentObjectsToShow.length > 0 && (
        <div className="mb-4 mt-5">
          <h4 className="font-semibold mb-2 flex items-center">
            <span>Результаты проверки</span>
            <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs ${
              overallStatus === 'danger' ? 'bg-red-100 text-red-800' : 
              overallStatus === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
              'bg-green-100 text-green-800'
            }`}>
              {overallStatus === 'danger' ? 'Опасно' : 
               overallStatus === 'warning' ? 'Требуется внимание' : 
               'Безопасно'}
            </span>
          </h4>
          
          <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
            {currentObjectsToShow.map((obj, index) => (
              <div 
                key={`${obj.id}-${index}`}
                className={`p-2 rounded-md ${!isSafeDistance(obj.distance) 
                  ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500' 
                  : 'bg-gray-50 dark:bg-gray-800/50'}`}
              >
                <div className="flex justify-between">
                  <div className="font-medium">{obj.name}</div>
                  <div className={`font-semibold ${!isSafeDistance(obj.distance) ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {obj.distance.toFixed(1)}м
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Тип: {obj.type || 'Неизвестный тип'}
                </div>
              </div>
            ))}
            
            {/* Кнопка для открытия отчета вручную */}
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => {
                // Сохраняем актуальный отчет перед открытием
                const reportData = {
                  photos: photos.filter(p => p.lat !== null && p.lon !== null),
                  objectsEntries: Array.from(checkedPhotos.entries()),
                  date: new Date().toISOString()
                };
                
                localStorage.setItem('safetyCheckReport', JSON.stringify(reportData));
                window.location.href = '/report';
              }}
            >
              <i className="fas fa-file-alt mr-2"></i>
              Открыть полный отчет
            </Button>
          </div>
        </div>
      )}
      
      {/* Нет объектов вблизи выбранного фото */}
      {currentObjectsToShow.length === 0 && (
        <div className="text-center py-5 text-gray-500">
          <i className="fas fa-map-marker-alt text-2xl mb-2"></i>
          <p>Нажмите "Выполнить проверку" для запуска проверки</p>
        </div>
      )}
      
      {/* Инструкции пользователю */}
      <div className="mt-4 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg">
        <p className="mb-1"><i className="fas fa-info-circle mr-2"></i>Как пользоваться проверкой:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Загрузите фотографии с координатами</li>
          <li>Нажмите на кнопку "Выполнить проверку"</li>
          <li>Результаты появятся в таблице и откроются в новой вкладке с подробным отчетом</li>
        </ol>
      </div>
    </div>
  );
}