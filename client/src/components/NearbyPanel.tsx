import { useEffect, useState } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import PhotoItem from './PhotoItem';
import { findNearbyPhotos } from '@/lib/utils';

interface NearbyPanelProps {
  onClose: () => void;
}

export default function NearbyPanel({ onClose }: NearbyPanelProps) {
  const { photos, selectedPhoto, selectPhoto, removePhoto } = usePhotoContext();
  const [nearbyPhotos, setNearbyPhotos] = useState<any[]>([]);
  const [searchRadius, setSearchRadius] = useState(1); // default 1km
  
  useEffect(() => {
    if (!selectedPhoto) return;
    
    const nearby = findNearbyPhotos(photos, selectedPhoto, searchRadius);
    setNearbyPhotos(nearby);
  }, [photos, selectedPhoto, searchRadius]);
  
  if (!selectedPhoto) {
    return (
      <div className="w-80 bg-white shadow-md border-l border-gray-200 overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-primary">Ближайшие фотографии</h3>
          <button className="text-gray-500 hover:text-primary" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-4">
          <p className="text-gray-500 text-center">Выберите фотографию, чтобы увидеть ближайшие</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-80 bg-white shadow-md border-l border-gray-200 overflow-y-auto">
      <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-bold text-primary">Ближайшие фотографии</h3>
        <button className="text-gray-500 hover:text-primary" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Радиус поиска: {searchRadius} км
          </label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={searchRadius}
            onChange={(e) => setSearchRadius(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        {nearbyPhotos.length > 0 ? (
          <div className="space-y-2">
            {nearbyPhotos.map(photo => (
              <PhotoItem
                key={photo.id}
                photo={photo}
                onRemove={() => removePhoto(photo.id)}
                onClick={() => selectPhoto(photo)}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">Нет ближайших фотографий в указанном радиусе</p>
        )}
      </div>
    </div>
  );
}
