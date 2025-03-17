import { formatCoordinates } from '@/lib/utils';
import type { Photo } from '@/lib/utils';
import { useState } from 'react';

interface PhotoItemProps {
  photo: Photo;
  onRemove: () => void;
  onClick: () => void;
  isSelected?: boolean;
}

export default function PhotoItem({ 
  photo, 
  onRemove, 
  onClick,
  isSelected = false
}: PhotoItemProps) {
  const [showCopied, setShowCopied] = useState(false);
  
  // Функция для копирования координат в буфер обмена
  const copyCoordinates = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (photo.lat !== null && photo.lon !== null) {
      const coordText = `${photo.lat}, ${photo.lon}`;
      navigator.clipboard.writeText(coordText)
        .then(() => {
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 2000);
        })
        .catch(err => {
          console.error('Не удалось скопировать координаты:', err);
        });
    }
  };
  
  // Расстояние в метрах
  const distanceDisplay = photo.distance !== undefined 
    ? `${(photo.distance * 1000).toFixed(0)} м` 
    : '';
  
  return (
    <div 
      className={`photo-item bg-white relative border ${isSelected ? 'border-accent' : 'border-gray-200'} p-2 rounded-lg grid grid-cols-[60px_1fr_80px] gap-2 items-center hover:bg-highlight hover:border-primary transition-all`}
    >
      {photo.dataUrl ? (
        <img 
          src={photo.dataUrl} 
          alt={photo.name} 
          className="w-[60px] h-[60px] object-cover rounded cursor-pointer hover:scale-105 transition-transform"
          onClick={onClick}
        />
      ) : (
        <div 
          className="w-[60px] h-[60px] bg-gray-200 rounded flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
          onClick={onClick}
        >
          <i className="fas fa-image text-gray-400 text-xl"></i>
        </div>
      )}
      
      <div className="overflow-hidden">
        <div className="font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis">
          {photo.name}
        </div>
        {photo.lat !== null && photo.lon !== null ? (
          <div className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis flex items-center">
            <span>{formatCoordinates(photo.lat, photo.lon)}</span>
            {showCopied && (
              <span className="ml-1 text-green-500 font-bold">✓</span>
            )}
          </div>
        ) : (
          <div className="text-xs text-red-500">Координаты отсутствуют</div>
        )}
        {distanceDisplay && (
          <div className="text-xs text-primary">
            Расстояние: {distanceDisplay}
          </div>
        )}
      </div>
      
      <div className="flex gap-1 justify-end">
        {photo.lat !== null && photo.lon !== null && (
          <button 
            className="bg-primary text-white p-1 rounded hover:bg-primary-dark transition-colors"
            onClick={copyCoordinates}
            title="Скопировать координаты"
          >
            <i className="fas fa-copy"></i>
          </button>
        )}
        
        <button 
          className="bg-error text-white p-1 rounded hover:bg-red-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Удалить фото"
        >
          <i className="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
  );
}
