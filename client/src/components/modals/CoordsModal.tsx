import { useState, useEffect } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { formatCoordinates as formatUtilsCoordinates } from '@/lib/utils';
import { formatCoordinates, CoordinateFormat } from '@/services/coordinateService';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface CoordsModalProps {
  onClose: () => void;
}

export default function CoordsModal({ onClose }: CoordsModalProps) {
  const { photos, addPhoto } = usePhotoContext();
  const [coordsText, setCoordsText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [formatType, setFormatType] = useState<CoordinateFormat>(CoordinateFormat.DECIMAL);
  const [inputCoords, setInputCoords] = useState('');
  const [inputStatus, setInputStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [parsedCoords, setParsedCoords] = useState<{ lat: number | null, lon: number | null }>({ lat: null, lon: null });
  
  // Генерация текста координат при изменении формата или фотографий
  useEffect(() => {
    generateCoordinatesText(formatType);
  }, [photos, formatType]);
  
  // Функция для генерации текста координат в выбранном формате
  const generateCoordinatesText = (format: CoordinateFormat) => {
    const text = photos
      .filter(photo => photo.lat !== null && photo.lon !== null)
      .map(photo => {
        return `${photo.name}: ${formatCoordinates(photo.lat, photo.lon, format)}`;
      })
      .join('\n');
    
    setCoordsText(text || 'Нет фотографий с координатами');
  };
  
  // Обработка ввода координат
  const handleCoordsInput = (value: string) => {
    setInputCoords(value);
    
    // Проверяем валидность введенных координат
    try {
      // Импортируем функцию из сервиса координат
      const { parseCoordinates: parseCoordinatesFromService, isValidCoordinateString } = require('@/services/coordinateService');
      
      const isValid = isValidCoordinateString(value);
      setInputStatus(isValid ? 'valid' : (value ? 'invalid' : 'idle'));
      
      if (isValid) {
        const coords = parseCoordinatesFromService(value);
        setParsedCoords(coords);
      } else {
        setParsedCoords({ lat: null, lon: null });
      }
    } catch (error) {
      console.error('Ошибка при проверке координат:', error);
      setInputStatus('invalid');
      setParsedCoords({ lat: null, lon: null });
    }
  };
  
  // Добавление координаты
  const handleAddCoordinates = () => {
    if (inputStatus !== 'valid' || !parsedCoords.lat || !parsedCoords.lon) {
      return;
    }
    
    // Создаем новое фото с координатами
    const newPhoto = {
      id: Date.now(),
      name: `Точка ${photos.length + 1}`,
      lat: parsedCoords.lat,
      lon: parsedCoords.lon,
    };
    
    // Добавляем через контекст
    addPhoto(newPhoto);
    
    // Сбрасываем ввод
    setInputCoords('');
    setInputStatus('idle');
    setParsedCoords({ lat: null, lon: null });
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(coordsText)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Ошибка при копировании координат:', err);
        alert('Не удалось скопировать координаты');
      });
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-2xl relative">
        <button 
          className="absolute top-2 right-2 text-gray-500 hover:text-primary text-2xl"
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
        
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold">Сохранить координаты</h3>
        </div>
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">Координаты всех загруженных фотографий:</p>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Формат:</label>
              <Select 
                value={formatType}
                onValueChange={(value) => setFormatType(value as CoordinateFormat)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Выберите формат" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CoordinateFormat.DECIMAL}>Десятичные (55.123456, 37.123456)</SelectItem>
                  <SelectItem value={CoordinateFormat.DMS}>Градусы-минуты-секунды (55° 7' 24")</SelectItem>
                  <SelectItem value={CoordinateFormat.DM}>Градусы-минуты (55° 7.4')</SelectItem>
                  <SelectItem value={CoordinateFormat.FORMATTED}>Форматированные (55.123456 N, 37.123456 E)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <textarea 
            id="coords-output" 
            className="w-full h-60 border border-gray-300 rounded p-2 focus:border-primary focus:outline-none" 
            readOnly
            value={coordsText}
          ></textarea>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="bg-blue-50 p-2 rounded text-sm border border-blue-200">
              <h4 className="font-medium text-blue-700 mb-1">Форматы координат:</h4>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                <li>Десятичные: 55.123456, 37.123456</li>
                <li>Градусы-минуты-секунды: 55° 7' 24.4416" N, 37° 7' 24.4416" E</li>
                <li>Градусы-минуты: 55° 7.40736' N, 37° 7.40736' E</li>
                <li>Форматированные: 55.123456 N, 37.123456 E</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 flex justify-between space-x-2">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Координаты для загрузки:</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Введите координаты в любом формате"
                className={`px-3 py-1.5 border rounded focus:outline-none flex-1 ${
                  inputStatus === 'valid' ? 'border-green-500' : 
                  inputStatus === 'invalid' ? 'border-red-500' : 'border-gray-300'
                }`}
                value={inputCoords}
                onChange={(e) => handleCoordsInput(e.target.value)}
              />
              <Button 
                variant="default" 
                size="sm"
                disabled={inputStatus !== 'valid'}
                onClick={handleAddCoordinates}
              >
                <i className="fas fa-plus mr-1"></i> Добавить
              </Button>
            </div>
            {inputStatus === 'valid' && (
              <p className="text-xs text-green-600 mt-1">
                Найдены координаты: {parsedCoords.lat?.toFixed(6)}, {parsedCoords.lon?.toFixed(6)}
              </p>
            )}
            {inputStatus === 'invalid' && (
              <p className="text-xs text-red-500 mt-1">
                Не удалось распознать координаты
              </p>
            )}
          </div>
        
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={onClose}
            >
              Закрыть
            </Button>
            <Button 
              variant="default"
              onClick={handleCopy}
            >
              {copySuccess ? (
                <>
                  <i className="fas fa-check mr-1"></i> Скопировано!
                </>
              ) : (
                <>
                  <i className="fas fa-copy mr-1"></i> Копировать
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
