import { useState } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { NearbyObject, isSafeDistance, checkLocationSafety } from './SafetyCheckService';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SafetyCheckPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SafetyCheckPanel({ isOpen, onClose }: SafetyCheckPanelProps) {
  const { photos, selectedPhoto } = usePhotoContext();
  const [isLoading, setIsLoading] = useState(false);
  const [checkResults, setCheckResults] = useState<{
    objects: NearbyObject[];
    photo: any;
    timestamp: Date;
  } | null>(null);
  const { toast } = useToast();
  
  // Функция для удаления линий на карте
  const removePolylines = () => {
    const map = (window as any).globalMap;
    if (!map) return;
    
    if ((window as any).globalPolylines) {
      (window as any).globalPolylines.forEach((item: any) => {
        if (item.polyline) map.removeLayer(item.polyline);
        if (item.marker) map.removeLayer(item.marker);
      });
      (window as any).globalPolylines = [];
    }
  };
  
  // Проверка безопасности
  const runSafetyCheck = async () => {
    // Получаем фото с координатами
    const photosWithCoords = photos.filter(p => p.lat !== null && p.lon !== null);
    
    if (photosWithCoords.length === 0) {
      toast({
        title: "Нет фотографий с координатами",
        description: "Загрузите фотографии с координатами для проверки",
        variant: "destructive"
      });
      return;
    }
    
    // Запускаем проверку
    setIsLoading(true);
    
    try {
      // Используем текущее выбранное фото или первое в списке
      const photoToCheck = selectedPhoto || photosWithCoords[0];
      
      if (photoToCheck && photoToCheck.lat && photoToCheck.lon) {
        console.log(`Запрос к Overpass API для (${photoToCheck.lat}, ${photoToCheck.lon})`);
        
        // Выполняем один запрос к API
        const result = await checkLocationSafety(photoToCheck);
        
        if (result && result.restrictedObjects) {
          // Сортируем объекты по расстоянию
          const sortedObjects = result.restrictedObjects.sort((a, b) => a.distance - b.distance);
          
          // Сохраняем результаты проверки
          setCheckResults({
            objects: sortedObjects,
            photo: photoToCheck,
            timestamp: new Date()
          });
          
          // Подготавливаем данные для отчета (минимальные данные)
          const reportData = {
            photos: [
              {
                id: photoToCheck.id,
                name: photoToCheck.name,
                lat: photoToCheck.lat,
                lon: photoToCheck.lon
              }
            ],
            objects: sortedObjects,
            date: new Date().toISOString()
          };
          
          // Сохраняем в localStorage (без превью изображений, чтобы избежать ошибки квоты)
          try {
            localStorage.setItem('safetyCheckReport', JSON.stringify(reportData));
          } catch (err) {
            console.error('Ошибка сохранения отчета в localStorage:', err);
            // Продолжаем работу даже если не удалось сохранить
            toast({
              title: "Внимание",
              description: "Не удалось сохранить полные данные отчета, но результаты проверки доступны",
              variant: "default"
            });
          }
          
          // Определяем статус проверки
          const hasDangerousObjects = sortedObjects.some(obj => !isSafeDistance(obj.distance));
          
          // Отображаем тост с результатами
          toast({
            title: hasDangerousObjects 
              ? "Внимание! Запрещенные объекты рядом" 
              : sortedObjects.length > 0 
                ? "Объекты найдены" 
                : "Проверка завершена",
            description: sortedObjects.length > 0
              ? `Найдено ${sortedObjects.length} объектов${hasDangerousObjects ? ', есть нарушения безопасного расстояния' : ', все на безопасном расстоянии'}`
              : "Запрещенных объектов поблизости не найдено",
            variant: hasDangerousObjects ? "destructive" : "default"
          });
        } else {
          setCheckResults({
            objects: [],
            photo: photoToCheck,
            timestamp: new Date()
          });
          
          toast({
            title: "Проверка завершена",
            description: "Запрещенных объектов поблизости не найдено",
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
  
  // Открываем полный отчет
  const openFullReport = () => {
    try {
      // Открываем в том же окне для избежания проблем с блокировкой всплывающих окон
      window.location.href = '/report';
    } catch (error) {
      console.error('Ошибка при открытии отчета:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось открыть отчет. Повторите попытку.",
        variant: "destructive"
      });
    }
  };
  
  // Список объектов для отображения
  const getObjectSafetyStatusClass = (isSafe: boolean) => {
    return isSafe 
      ? 'bg-green-50 dark:bg-green-900/20' 
      : 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="absolute top-14 right-3 z-[999] shadow-lg rounded-lg p-4 max-w-md w-full h-auto max-h-[80vh] overflow-y-auto"
      style={{
        backdropFilter: 'blur(10px)',
        backgroundColor: 'var(--panel-bg)',
        boxShadow: '0 4px 20px var(--shadow)',
        border: '1px solid var(--border)'
      }}>
      
      {/* Заголовок */}
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
        <Button 
          className="w-full"
          variant="default"
          disabled={isLoading || photos.filter(p => p.lat !== null && p.lon !== null).length === 0}
          onClick={runSafetyCheck}
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              <span>Выполняется проверка...</span>
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
      {checkResults && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">Результаты проверки</h4>
            <span className="text-xs text-gray-500">
              {new Date(checkResults.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-md">
            <div className="text-sm mb-1">
              <span className="font-medium">Проверенная фотография:</span> {checkResults.photo.name}
            </div>
            <div className="text-sm">
              <span className="font-medium">Координаты:</span> {checkResults.photo.lat?.toFixed(6)}, {checkResults.photo.lon?.toFixed(6)}
            </div>
          </div>
          
          {checkResults.objects.length > 0 ? (
            <>
              <div className="mb-2 flex items-center">
                <span className="font-medium">Найдено объектов: {checkResults.objects.length}</span>
                {checkResults.objects.some(obj => !isSafeDistance(obj.distance)) && (
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-800">
                    Обнаружены нарушения
                  </span>
                )}
              </div>
              
              <div className="space-y-2 max-h-52 overflow-y-auto pr-2 mb-4">
                {checkResults.objects.map((obj, index) => {
                  const isSafe = isSafeDistance(obj.distance);
                  
                  return (
                    <div 
                      key={`${obj.id}-${index}`}
                      className={`p-2 rounded-md ${getObjectSafetyStatusClass(isSafe)}`}
                    >
                      <div className="flex justify-between">
                        <div className="font-medium">{obj.name}</div>
                        <div className={`font-semibold ${!isSafe ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {obj.distance.toFixed(1)}м
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Тип: {obj.type || 'Неизвестный тип'}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Кнопка для открытия полного отчета */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={openFullReport}
              >
                <i className="fas fa-file-alt mr-2"></i>
                Посмотреть полный отчет
              </Button>
            </>
          ) : (
            <div className="text-center py-3 text-green-600">
              <i className="fas fa-check-circle text-2xl mb-2"></i>
              <p>Запрещенных объектов поблизости не обнаружено</p>
            </div>
          )}
        </div>
      )}
      
      {/* Если еще нет результатов проверки */}
      {!checkResults && !isLoading && (
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
          <li>После получения результатов нажмите "Посмотреть полный отчет"</li>
        </ol>
      </div>
    </div>
  );
}