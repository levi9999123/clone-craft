import { useEffect, useState } from 'react';
import { NearbyObject, isSafeDistance, MINIMUM_SAFE_DISTANCE } from '@/components/SafetyCheckService';
import { Photo } from '@/lib/utils';

export default function ReportPage() {
  const [reportData, setReportData] = useState<{
    photos: Photo[];
    objects: Map<number, NearbyObject[]>;
    date: Date;
  } | null>(null);

  useEffect(() => {
    // Получаем данные проверки из localStorage
    const reportDataString = localStorage.getItem('safetyCheckReport');
    if (reportDataString) {
      try {
        const data = JSON.parse(reportDataString);
        
        // Преобразуем объект Map обратно из JSON
        const objectsMap = new Map();
        if (data.objectsEntries) {
          data.objectsEntries.forEach(([photoId, objects]: [string, NearbyObject[]]) => {
            objectsMap.set(parseInt(photoId), objects);
          });
        }
        
        setReportData({
          photos: data.photos || [],
          objects: objectsMap,
          date: new Date(data.date || Date.now())
        });
      } catch (error) {
        console.error('Ошибка при чтении данных отчета:', error);
      }
    }
  }, []);

  if (!reportData) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-screen">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h2 className="text-2xl font-bold">Загрузка отчета...</h2>
          <p className="text-gray-500">Пожалуйста, подождите, мы получаем данные отчёта</p>
        </div>
      </div>
    );
  }

  // Получаем общую статистику
  const totalPhotos = reportData.photos.length;
  const photosWithCoordinates = reportData.photos.filter(p => p.lat !== null && p.lon !== null).length;
  const checkedPhotos = reportData.objects.size;
  
  const unsafePhotos = Array.from(reportData.objects.entries()).filter(([_, objects]) => 
    objects.some(obj => !isSafeDistance(obj.distance))
  ).length;
  
  const totalObjects = Array.from(reportData.objects.values()).reduce((sum, objects) => sum + objects.length, 0);
  const unsafeObjects = Array.from(reportData.objects.values()).reduce((sum, objects) => 
    sum + objects.filter(obj => !isSafeDistance(obj.distance)).length, 0
  );

  // Форматируем дату отчета
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <header className="mb-8 pb-4 border-b text-center">
        <h1 className="text-3xl font-bold mb-2">Отчет о проверке безопасности фотографий</h1>
        <p className="text-gray-500">Создан: {formatDate(reportData.date)}</p>
      </header>

      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Всего фото" value={totalPhotos} />
        <StatCard title="С координатами" value={photosWithCoordinates} />
        <StatCard title="Проверено" value={checkedPhotos} />
        <StatCard title="С нарушениями" value={unsafePhotos} color={unsafePhotos > 0 ? 'red' : 'green'} />
      </div>

      <div className="mb-8 bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold mb-3">Общая статистика объектов</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Всего объектов найдено" value={totalObjects} />
          <StatCard 
            title="Опасно близких объектов" 
            value={unsafeObjects} 
            color={unsafeObjects > 0 ? 'red' : 'green'} 
          />
        </div>
        
        {unsafeObjects > 0 && (
          <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-800">
              <strong>Внимание!</strong> Обнаружены запрещенные объекты на расстоянии менее {MINIMUM_SAFE_DISTANCE} метров от точек съемки. 
              Рекомендуется переместиться на безопасное расстояние и сделать новые снимки.
            </p>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Подробная информация по фотографиям</h2>
        
        {reportData.photos.map(photo => {
          if (!photo.lat || !photo.lon) return null;
          
          const photoObjects = reportData.objects.get(photo.id) || [];
          const hasDangerousObjects = photoObjects.some(obj => !isSafeDistance(obj.distance));
          
          return (
            <div key={photo.id} className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className={`w-3 h-3 rounded-full mr-3 ${
                      hasDangerousObjects 
                        ? 'bg-red-500' 
                        : photoObjects.length > 0 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                  ></div>
                  <h3 className="text-lg font-bold">{photo.name}</h3>
                </div>
                <span className="text-sm text-gray-500">
                  ID: {photo.id} | Координаты: {photo.lat.toFixed(6)}, {photo.lon.toFixed(6)}
                </span>
              </div>
              
              {/* Содержимое блока фотографии */}
              <div className="p-4">
                {/* Отображение фотографии */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-100 rounded-lg p-2 flex items-center justify-center" style={{ minHeight: '200px' }}>
                    {photo.dataUrl ? (
                      <img 
                        src={photo.dataUrl} 
                        alt={photo.name} 
                        className="max-h-64 max-w-full object-contain rounded" 
                      />
                    ) : (
                      <div className="text-gray-500 flex flex-col items-center justify-center p-4">
                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <p>Фотография: {photo.name}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="mb-2">
                      <span className="font-semibold">Имя файла:</span> {photo.name}
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold">Координаты:</span> {photo.lat.toFixed(6)}, {photo.lon.toFixed(6)}
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold">Статус:</span>{' '}
                      {hasDangerousObjects ? (
                        <span className="text-red-600 font-semibold">Обнаружены нарушения безопасного расстояния</span>
                      ) : photoObjects.length > 0 ? (
                        <span className="text-yellow-600 font-semibold">Обнаружены объекты на безопасном расстоянии</span>
                      ) : (
                        <span className="text-green-600 font-semibold">Запрещенных объектов не обнаружено</span>
                      )}
                    </div>
                    <div>
                      <span className="font-semibold">Количество найденных объектов:</span> {photoObjects.length}
                    </div>
                  </div>
                </div>
                
                {/* Список найденных объектов */}
                {photoObjects.length === 0 ? (
                  <p className="text-green-600 py-2">Запрещенных объектов поблизости не обнаружено.</p>
                ) : (
                  <div>
                    <div className="mb-3 flex items-center">
                      <span className="font-semibold">Найденные объекты:</span>
                      {hasDangerousObjects && (
                        <span className="ml-3 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Включая объекты на опасном расстоянии
                        </span>
                      )}
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Объект</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Расстояние</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {photoObjects.map((obj, index) => {
                            const isSafe = isSafeDistance(obj.distance);
                            
                            return (
                              <tr key={`${obj.id}-${index}`} className={!isSafe ? 'bg-red-50' : ''}>
                                <td className="py-2 px-3 text-sm">{obj.name}</td>
                                <td className="py-2 px-3 text-sm">{obj.type}</td>
                                <td className={`py-2 px-3 text-sm font-medium ${!isSafe ? 'text-red-700' : ''}`}>
                                  {obj.distance.toFixed(1)} м
                                </td>
                                <td className="py-2 px-3 text-sm">
                                  {isSafe ? (
                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                      Безопасно
                                    </span>
                                  ) : (
                                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                      Нарушение! (&lt;{MINIMUM_SAFE_DISTANCE}м)
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="text-center text-gray-500 py-6 border-t">
        <p>© {new Date().getFullYear()} Система проверки фотографий на близость к запрещенным объектам</p>
        <p className="text-sm mt-1">Отчёт сгенерирован автоматически</p>
      </footer>
    </div>
  );
}

function StatCard({ title, value, color = 'blue' }: { title: string; value: number; color?: 'blue' | 'green' | 'red' }) {
  const getColorClass = () => {
    switch (color) {
      case 'red': return 'text-red-600';
      case 'green': return 'text-green-600';
      default: return 'text-blue-600';
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${getColorClass()}`}>{value}</p>
    </div>
  );
}