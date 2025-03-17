import { useEffect, useState } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { formatCoordinates } from '@/lib/utils';

interface PhotoModalProps {
  onClose: () => void;
}

export default function PhotoModal({ onClose }: PhotoModalProps) {
  const { selectedPhoto, updatePhotoCoordinates } = usePhotoContext();
  const [coords, setCoords] = useState('');
  
  useEffect(() => {
    if (selectedPhoto) {
      setCoords(formatCoordinates(selectedPhoto.lat, selectedPhoto.lon));
    }
  }, [selectedPhoto]);
  
  if (!selectedPhoto) return null;
  
  const handleSave = () => {
    if (!selectedPhoto) return;
    
    // Parse coordinates from input
    const coordsMatch = coords.match(/([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lon = parseFloat(coordsMatch[2]);
      
      if (!isNaN(lat) && !isNaN(lon)) {
        updatePhotoCoordinates(selectedPhoto.id, lat, lon);
      }
    }
    
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-2xl relative overflow-hidden">
        <button 
          className="absolute top-2 right-2 text-gray-500 hover:text-primary text-2xl"
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
        
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold">{selectedPhoto.name}</h3>
        </div>
        
        <div className="p-4">
          {selectedPhoto.dataUrl ? (
            <img 
              src={selectedPhoto.dataUrl} 
              alt={selectedPhoto.name} 
              className="max-h-[50vh] mx-auto rounded border border-gray-200 object-contain"
            />
          ) : (
            <div className="max-h-[50vh] w-full bg-gray-200 flex items-center justify-center">
              <i className="fas fa-image text-gray-400 text-6xl"></i>
            </div>
          )}
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="space-y-2">
              <div className="font-medium">Координаты:</div>
              <input 
                type="text" 
                value={coords} 
                onChange={(e) => setCoords(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-primary focus:outline-none"
                placeholder="Формат: 55.7558, 37.6173"
              />
            </div>
          </div>
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
            onClick={handleSave}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
