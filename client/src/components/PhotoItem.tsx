import { formatCoordinates } from '@/lib/utils';
import type { Photo } from '@/lib/utils';

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
  return (
    <div 
      className={`photo-item bg-white border ${isSelected ? 'border-accent' : 'border-gray-200'} p-2 rounded-lg grid grid-cols-[60px_1fr_40px] gap-2 items-center hover:bg-highlight hover:border-primary transition-all`}
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
        <div className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">
          {formatCoordinates(photo.lat, photo.lon)}
        </div>
        {photo.distance !== undefined && (
          <div className="text-xs text-primary">
            Расстояние: {photo.distance.toFixed(2)} км
          </div>
        )}
      </div>
      
      <button 
        className="bg-error text-white p-1 rounded hover:bg-red-700 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <i className="fas fa-trash-alt"></i>
      </button>
    </div>
  );
}
