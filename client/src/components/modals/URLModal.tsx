import { useState } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { processUrl } from '@/services/photoService';

interface URLModalProps {
  onClose: () => void;
}

export default function URLModal({ onClose }: URLModalProps) {
  const { addPhotos } = usePhotoContext();
  const [urls, setUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async () => {
    if (!urls.trim()) {
      alert('Пожалуйста, введите URL-адреса изображений');
      return;
    }
    
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url !== '');
    
    if (urlList.length === 0) {
      alert('Пожалуйста, введите корректные URL-адреса изображений');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const processedPhotos = [];
      
      for (const url of urlList) {
        try {
          const photo = await processUrl(url);
          if (photo) {
            processedPhotos.push(photo);
          }
        } catch (error) {
          console.error(`Ошибка при обработке URL ${url}:`, error);
        }
      }
      
      addPhotos(processedPhotos);
      onClose();
    } catch (error) {
      console.error('Ошибка при обработке URL:', error);
      alert(`Ошибка при обработке URL: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-2xl relative">
        <button 
          className="absolute top-2 right-2 text-gray-500 hover:text-primary text-2xl"
          onClick={onClose}
          disabled={isLoading}
        >
          <i className="fas fa-times"></i>
        </button>
        
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold">Загрузка по URL</h3>
        </div>
        
        <div className="p-4">
          <p className="mb-2 text-gray-600">Введите URL-адреса изображений (по одному на строку):</p>
          <textarea 
            id="urls-input" 
            className="w-full h-40 border border-gray-300 rounded p-2 focus:border-primary focus:outline-none" 
            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            disabled={isLoading}
          ></textarea>
        </div>
        
        <div className="p-4 bg-gray-50 flex justify-end space-x-2">
          <button 
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
            onClick={onClose}
            disabled={isLoading}
          >
            Отмена
          </button>
          <button 
            className="url-submit-btn bg-primary text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors relative"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="opacity-0">Загрузить</span>
                <i className="fas fa-spinner fa-spin absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"></i>
              </>
            ) : (
              <span>Загрузить</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
