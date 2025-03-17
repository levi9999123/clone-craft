import { useState, useEffect } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { useModal } from '@/context/ModalContext';
import { Photo } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface PhotoSelectModalProps {
  onSelectedPhotos: (photos: Photo[]) => Promise<void>;
  title?: string;
}

export default function PhotoSelectModal({ 
  onSelectedPhotos,
  title = "Выберите фотографии для проверки" 
}: PhotoSelectModalProps) {
  const { photos } = usePhotoContext();
  const { activeModals, closeModal } = useModal();
  const { toast } = useToast();
  
  // Состояние для хранения выбранных фотографий
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  // Список фотографий с координатами
  const photosWithCoords = photos.filter(p => p.lat !== null && p.lon !== null);
  
  // При открытии модального окна, заполняем все фотографии с координатами
  useEffect(() => {
    if (activeModals.photoSelect) {
      setSelectedPhotoIds(new Set(photosWithCoords.map(p => p.id)));
    }
  }, [activeModals.photoSelect, photosWithCoords]);
  
  // Переключение выбора фотографии
  const togglePhotoSelection = (photoId: number) => {
    const newSelection = new Set(selectedPhotoIds);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotoIds(newSelection);
  };
  
  // Выбрать все фотографии
  const selectAllPhotos = () => {
    const allIds = new Set(photosWithCoords.map(p => p.id));
    setSelectedPhotoIds(allIds);
  };
  
  // Снять выбор со всех фотографий
  const deselectAllPhotos = () => {
    setSelectedPhotoIds(new Set());
  };
  
  // Обработка подтверждения выбора фотографий
  const handleConfirm = async () => {
    if (selectedPhotoIds.size === 0) {
      toast({
        title: "Нет выбранных фотографий",
        description: "Выберите фотографии для проверки",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Получаем выбранные фотографии
      const selectedPhotos = photos.filter(p => 
        p.lat !== null && p.lon !== null && selectedPhotoIds.has(p.id)
      );
      
      // Вызываем функцию обработки выбранных фотографий
      await onSelectedPhotos(selectedPhotos);
      
      // Закрываем модальное окно
      closeModal('photoSelect');
    } catch (error) {
      console.error("Ошибка при обработке выбранных фотографий:", error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при обработке выбранных фотографий",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog 
      open={activeModals.photoSelect} 
      onOpenChange={(isOpen) => {
        if (!isOpen) closeModal('photoSelect');
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {photosWithCoords.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-image text-4xl mb-2 text-gray-300"></i>
              <p>Нет фотографий с координатами</p>
              <p className="text-sm text-gray-500 mt-1">Загрузите фотографии с геометками для проверки</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  onClick={selectAllPhotos}
                  size="sm"
                  disabled={isLoading}
                >
                  <i className="fas fa-check-square mr-1"></i>
                  Выбрать все
                </Button>
                <Button 
                  variant="outline" 
                  onClick={deselectAllPhotos}
                  size="sm"
                  disabled={isLoading}
                >
                  <i className="fas fa-square mr-1"></i>
                  Снять выделение
                </Button>
                <div className="ml-auto text-sm text-gray-500">
                  Выбрано: {selectedPhotoIds.size} из {photosWithCoords.length}
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                {photosWithCoords.map(photo => (
                  <div 
                    key={photo.id}
                    className={`relative rounded-md overflow-hidden cursor-pointer border-2 transition-all
                      ${selectedPhotoIds.has(photo.id) ? 'border-primary shadow-md scale-[1.02]' : 'border-transparent'}`}
                    onClick={() => togglePhotoSelection(photo.id)}
                  >
                    {photo.dataUrl ? (
                      <img 
                        src={photo.dataUrl} 
                        alt={photo.name} 
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                        <i className="fas fa-image text-gray-400"></i>
                      </div>
                    )}
                    
                    <div className="absolute top-2 left-2">
                      <Checkbox 
                        checked={selectedPhotoIds.has(photo.id)}
                        className="bg-white border-2 border-primary rounded-sm"
                        onCheckedChange={() => togglePhotoSelection(photo.id)}
                      />
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-1 text-xs truncate">
                      {photo.name}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button 
              variant="outline"
              disabled={isLoading}
            >
              Отмена
            </Button>
          </DialogClose>
          <Button 
            variant="default" 
            onClick={handleConfirm}
            disabled={selectedPhotoIds.size === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                <span>Обработка...</span>
              </>
            ) : (
              <>
                <i className="fas fa-check mr-2"></i>
                <span>Проверить выбранные ({selectedPhotoIds.size})</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}