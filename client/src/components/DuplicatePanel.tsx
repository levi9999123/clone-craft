import { usePhotoContext } from '@/context/PhotoContext';
import PhotoItem from './PhotoItem';
import { calculateDistance } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DuplicatePanelProps {
  onClose: () => void;
}

export default function DuplicatePanel({ onClose }: DuplicatePanelProps) {
  const { duplicateGroups, selectPhoto, removePhoto } = usePhotoContext();
  const { toast } = useToast();
  
  // Функция для отображения расстояния между точками
  const getDistanceDisplay = (photo: any, basePhoto: any) => {
    if (!photo.distance) {
      // Если distance не установлен, вычисляем его
      if (photo.lat && photo.lon && basePhoto.lat && basePhoto.lon) {
        const distance = calculateDistance(
          basePhoto.lat, 
          basePhoto.lon, 
          photo.lat, 
          photo.lon
        );
        // Конвертируем в метры
        const distanceInMeters = distance * 1000;
        return distanceInMeters < 25 
          ? `${distanceInMeters.toFixed(1)} м` 
          : '> 25 м';
      }
      return '';
    }
    
    // Если distance установлен, используем его (конвертируем в метры)
    const distanceInMeters = photo.distance * 1000;
    return distanceInMeters < 25 
      ? `${distanceInMeters.toFixed(1)} м` 
      : '> 25 м';
  };
  
  return (
    <div className="w-80 bg-white shadow-md border-l border-gray-200 overflow-y-auto">
      <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-bold text-primary">Близкие точки (менее 25м)</h3>
        <button className="text-gray-500 hover:text-primary" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="p-4">
        <div className="bg-blue-50 p-3 rounded-md mb-4 text-sm text-blue-800 border border-blue-100">
          <p>Здесь показаны группы точек, расположенные на расстоянии менее 25 метров друг от друга.</p>
        </div>
        
        {duplicateGroups.length > 0 ? (
          duplicateGroups.map((group, groupIndex) => {
            // Первая фотография группы считается базовой
            const basePhoto = group[0];
            
            return (
              <div key={`group-${groupIndex}`} className="mb-6 p-3 border border-gray-100 rounded-md">
                <div className="font-medium text-sm mb-2 bg-gray-50 p-2 rounded text-gray-700">
                  Группа близких точек {groupIndex + 1}
                </div>
                <div className="space-y-2">
                  {/* Базовая точка */}
                  <div className="relative">
                    <div className="absolute -left-2 top-2 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                      База
                    </div>
                    <PhotoItem
                      key={basePhoto.id}
                      photo={basePhoto}
                      onRemove={() => removePhoto(basePhoto.id)}
                      onClick={() => selectPhoto(basePhoto)}
                    />
                  </div>
                  
                  {/* Остальные точки группы */}
                  {group.slice(1).map(photo => {
                    // Вычисляем расстояние в метрах для проверки близости точек
                    const distanceInMeters = photo.distance ? photo.distance * 1000 : null;
                    const isVeryClose = distanceInMeters !== null && distanceInMeters < 25;
                    
                    return (
                      <div key={photo.id} className="relative">
                        <div 
                          className={`absolute -left-2 top-2 text-white text-xs px-1 py-0.5 rounded ${
                            isVeryClose ? 'bg-red-500' : 'bg-green-500'
                          }`}
                        >
                          {getDistanceDisplay(photo, basePhoto)}
                        </div>
                        <PhotoItem
                          photo={photo}
                          onRemove={() => removePhoto(photo.id)}
                          onClick={() => selectPhoto(photo)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 text-center">Близких точек не найдено</p>
        )}
      </div>
    </div>
  );
}
