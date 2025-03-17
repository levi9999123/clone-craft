import { usePhotoContext } from '@/context/PhotoContext';
import PhotoItem from './PhotoItem';

interface DuplicatePanelProps {
  onClose: () => void;
}

export default function DuplicatePanel({ onClose }: DuplicatePanelProps) {
  const { duplicateGroups, selectPhoto, removePhoto } = usePhotoContext();
  
  return (
    <div className="w-80 bg-white shadow-md border-l border-gray-200 overflow-y-auto">
      <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-bold text-primary">Вероятные дубликаты</h3>
        <button className="text-gray-500 hover:text-primary" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="p-4">
        {duplicateGroups.length > 0 ? (
          duplicateGroups.map((group, groupIndex) => (
            <div key={`group-${groupIndex}`} className="mb-6">
              <div className="font-medium text-sm mb-2 text-gray-700">
                Группа дубликатов {groupIndex + 1}
              </div>
              <div className="space-y-2">
                {group.map(photo => (
                  <PhotoItem
                    key={photo.id}
                    photo={photo}
                    onRemove={() => removePhoto(photo.id)}
                    onClick={() => selectPhoto(photo)}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center">Дубликаты не найдены</p>
        )}
      </div>
    </div>
  );
}
