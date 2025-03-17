import { useEffect, useState } from 'react';
import { NearbyObject, isSafeDistance, MINIMUM_SAFE_DISTANCE } from '@/components/SafetyCheckService';

export default function SimpleReportPage() {
  const [reportData, setReportData] = useState<{
    photos: any[];
    objects: NearbyObject[];
    date: Date;
  } | null>(null);

  useEffect(() => {
    // Получаем данные проверки из localStorage
    const reportDataString = localStorage.getItem('safetyCheckReport');
    if (reportDataString) {
      try {
        const data = JSON.parse(reportDataString);
        setReportData({
          photos: data.photos || [],
          objects: data.objects || [],
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

  // Базовая статистика
  const hasDangerousObjects = reportData.objects && reportData.objects.some(obj => !isSafeDistance(obj.distance));
  const totalObjects = reportData.objects ? reportData.objects.length : 0;
  const dangerousObjects = reportData.objects ? reportData.objects.filter(obj => !isSafeDistance(obj.distance)).length : 0;
  
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
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="mb-8 pb-4 border-b text-center">
        <h1 className="text-3xl font-bold mb-2">Отчет о проверке безопасности</h1>
        <p className="text-gray-500">Создан: {formatDate(reportData.date)}</p>
      </header>

      {/* Общая статистика */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-sm text-gray-500 mb-1">Проверенных фотографий</p>
          <p className="text-2xl font-bold">{reportData.photos.length}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-sm text-gray-500 mb-1">Найдено объектов</p>
          <p className="text-2xl font-bold text-blue-600">{totalObjects}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-sm text-gray-500 mb-1">С нарушением дистанции</p>
          <p className={`text-2xl font-bold ${dangerousObjects > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {dangerousObjects}
          </p>
        </div>
      </div>
      
      {/* Предупреждение, если есть объекты с нарушением дистанции */}
      {hasDangerousObjects && (
        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <p className="text-red-800">
            <strong>Внимание!</strong> Обнаружены запрещенные объекты на расстоянии менее {MINIMUM_SAFE_DISTANCE} метров. 
            Рекомендуется переместиться на безопасное расстояние и сделать новые снимки.
          </p>
        </div>
      )}

      {/* Информация о фотографиях */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Проверенные фотографии</h2>
        
        {reportData.photos.map((photo, index) => (
          <div key={photo.id || index} className="mb-4 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg">{photo.name}</h3>
              <p className="text-sm text-gray-500">
                Координаты: {photo.lat?.toFixed(6)}, {photo.lon?.toFixed(6)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Список найденных объектов */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Найденные объекты</h2>
        
        {reportData.objects.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Расстояние</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.objects.map((obj, index) => {
                  const isSafe = isSafeDistance(obj.distance);
                  
                  return (
                    <tr key={`${obj.id}-${index}`} className={!isSafe ? 'bg-red-50' : ''}>
                      <td className="py-3 px-4">{obj.name || 'Без названия'}</td>
                      <td className="py-3 px-4">{obj.type || 'Неизвестный тип'}</td>
                      <td className={`py-3 px-4 font-medium ${!isSafe ? 'text-red-700' : ''}`}>
                        {obj.distance.toFixed(1)} м
                      </td>
                      <td className="py-3 px-4">
                        {isSafe ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Безопасно
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
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
        ) : (
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <svg className="mx-auto h-12 w-12 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="mt-2 text-lg font-medium text-gray-900">Запрещенных объектов не обнаружено</p>
            <p className="mt-1 text-sm text-gray-500">Съемка в данной локации безопасна.</p>
          </div>
        )}
      </div>

      {/* Заключение и рекомендации */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Заключение</h3>
        <p className="text-blue-700">
          {hasDangerousObjects
            ? "Обнаружены запрещенные объекты на небезопасном расстоянии. Рекомендуется переместиться для съемки в другую локацию."
            : reportData.objects.length > 0
              ? "Обнаружены объекты, но все находятся на безопасном расстоянии. Съемка разрешена."
              : "Запрещенных объектов не обнаружено. Съемка в данной локации полностью безопасна."
          }
        </p>
      </div>

      {/* Кнопка возврата */}
      <div className="text-center">
        <button 
          onClick={() => window.history.back()} 
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          ← Вернуться назад
        </button>
      </div>

      <footer className="text-center text-gray-500 py-6 mt-12 border-t">
        <p>© {new Date().getFullYear()} Система проверки фотографий на близость к запрещенным объектам</p>
        <p className="text-sm mt-1">Отчёт сгенерирован автоматически</p>
      </footer>
    </div>
  );
}