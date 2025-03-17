import { useState, useEffect } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { formatCoordinates as formatUtilsCoordinates } from '@/lib/utils';
import { formatCoordinates, CoordinateFormat } from '@/services/coordinateService';

interface CoordsModalProps {
  onClose: () => void;
}

export default function CoordsModal({ onClose }: CoordsModalProps) {
  const { photos } = usePhotoContext();
  const [coordsText, setCoordsText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [formatType, setFormatType] = useState<CoordinateFormat>(CoordinateFormat.DECIMAL);
  
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
          <p className="mb-2 text-gray-600">Координаты всех загруженных фотографий:</p>
          <textarea 
            id="coords-output" 
            className="w-full h-60 border border-gray-300 rounded p-2 focus:border-primary focus:outline-none" 
            readOnly
            value={coordsText}
          ></textarea>
        </div>
        
        <div className="p-4 bg-gray-50 flex justify-end space-x-2">
          <button 
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
            onClick={onClose}
          >
            Закрыть
          </button>
          <button 
            className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
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
          </button>
        </div>
      </div>
    </div>
  );
}
