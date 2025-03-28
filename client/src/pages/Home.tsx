import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import MapView from '@/components/MapView';
import { usePhotoContext } from '@/context/PhotoContext';
import NearbyPanel from '@/components/NearbyPanel';
import DuplicatePanel from '@/components/DuplicatePanel';
import SafetyCheckPanelNew from '@/components/SafetyCheckPanelNew';
import PhotoModal from '@/components/modals/PhotoModal';
import URLModal from '@/components/modals/URLModal';
import CoordsModal from '@/components/modals/CoordsModal';
import PhotoPreview from '@/components/PhotoPreview';
import { Photo, calculateDistance, findDuplicates } from '@/lib/utils';
import { NearbyObject } from '@/components/SafetyCheckService';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { selectedPhoto, photos, setDuplicateGroups } = usePhotoContext();
  const { toast } = useToast();
  const [isPanelVisible, setIsPanelVisible] = useState<'nearby' | 'duplicate' | 'safety' | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isCoordsModalOpen, setIsCoordsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' });
  const [restrictedObjects, setRestrictedObjects] = useState<NearbyObject[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  // Эффект для отображения панели при выборе фото
  useEffect(() => {
    if (selectedPhoto) {
      setIsPanelVisible('nearby');
    }
  }, [selectedPhoto]);
  
  // Эффект для автоматической проверки близких точек
  useEffect(() => {
    // Обновляем флаги для близких точек каждый раз при изменении списка фотографий
    if (photos.length >= 2) {
      // Вначале сбросим все флаги isVeryClose
      photos.forEach(photo => {
        photo.isVeryClose = false;
      });
      
      // Найдем все дубликаты (это также обновит флаги isVeryClose)
      const groups = findDuplicates(photos);
      console.log(`Обнаружено ${groups.length} групп близких точек (менее 25м)`);
      
      // Дополнительная проверка расстояний между точками
      // (двойная проверка для надежности)
      for (let i = 0; i < photos.length; i++) {
        const photo1 = photos[i];
        if (!photo1.lat || !photo1.lon) continue;
        
        for (let j = i + 1; j < photos.length; j++) {
          const photo2 = photos[j];
          if (!photo2.lat || !photo2.lon) continue;
          
          const distance = calculateDistance(
            photo1.lat, photo1.lon, 
            photo2.lat, photo2.lon
          );
          
          // Проверяем близкие точки (менее 25 метров)
          if (distance * 1000 < 25) {
            photo1.isVeryClose = true;
            photo2.isVeryClose = true;
            console.log(`Близкие точки: ${photo1.name} и ${photo2.name}, расстояние: ${(distance * 1000).toFixed(2)}м`);
          }
        }
      }
    }
  }, [photos]);
  
  // Очищаем результаты при закрытии панели безопасности
  useEffect(() => {
    if (isPanelVisible !== 'safety') {
      setRestrictedObjects([]);
    }
  }, [isPanelVisible]);

  const togglePanel = (panelType: 'nearby' | 'duplicate' | 'safety') => {
    if (panelType === 'nearby') {
      // Для отображения панели близких точек нужны фотографии с координатами
      const photosWithCoords = photos.filter(p => p.lat !== null && p.lon !== null);
      if (photosWithCoords.length === 0) {
        toast({
          title: "Нет фотографий с координатами",
          description: "Загрузите фотографии с координатами, чтобы найти близкие точки",
          variant: "destructive"
        });
        return;
      }
      
      // Автоматически находим все близкие точки
      const closePhotos = photos.filter(photo => photo.isVeryClose);
      if (closePhotos.length === 0) {
        toast({
          title: "Близких точек не найдено",
          description: "Не найдены точки, расположенные ближе 25 метров друг от друга",
          variant: "default"
        });
        return;
      }
      
      setIsPanelVisible(current => current === panelType ? null : panelType);
    } else if (panelType === 'duplicate') {
      // Для отображения панели дубликатов нужны фотографии с координатами
      const photosWithCoords = photos.filter(p => p.lat !== null && p.lon !== null);
      if (photosWithCoords.length === 0) {
        toast({
          title: "Нет фотографий с координатами",
          description: "Загрузите фотографии с координатами, чтобы найти дубликаты",
          variant: "destructive"
        });
        return;
      }
      
      // Обновляем группы дубликатов перед открытием панели
      const duplicates = findDuplicates(photos);
      setDuplicateGroups(duplicates);
      
      // Проверяем, есть ли дубликаты
      if (duplicates.length === 0) {
        toast({
          title: "Близких точек не найдено",
          description: "Не найдены точки, расположенные ближе 25 метров друг от друга",
          variant: "default"
        });
        return;
      }
      
      setIsPanelVisible(current => current === panelType ? null : panelType);
    } else {
      // Для других типов панелей просто переключаем состояние
      setIsPanelVisible(current => current === panelType ? null : panelType);
    }
  };
  
  // Просто открывает/закрывает панель проверки безопасности - теперь без проверок на наличие фото
  const toggleSafetyPanel = () => {
    try {
      // Очищаем результаты при открытии панели
      if (isPanelVisible !== 'safety') {
        setRestrictedObjects([]);
      }
      
      // Просто открываем панель безопасности без проверок
      setIsPanelVisible(current => current === 'safety' ? null : 'safety');
    } catch (error) {
      console.error('Ошибка при открытии панели безопасности:', error);
    }
  };

  const showLoading = (message: string, total: number) => {
    setIsLoading(true);
    setLoadingProgress({ current: 0, total, message });
  };

  const updateLoadingProgress = (current: number) => {
    setLoadingProgress(prev => ({ ...prev, current }));
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar 
        onOpenUrlModal={() => setIsUrlModalOpen(true)}
        onOpenCoordsModal={() => setIsCoordsModalOpen(true)}
        onOpenPhotoModal={(photo: Photo) => {
          setIsPhotoModalOpen(true);
        }}
        onPreviewPhoto={(photo: Photo) => setPreviewPhoto(photo)}
        showLoading={showLoading}
        updateLoadingProgress={updateLoadingProgress}
        hideLoading={hideLoading}
      />
      
      <div className="flex-grow flex relative" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <MapView 
          onToggleNearbyPanel={() => togglePanel('nearby')}
          onToggleDuplicatePanel={() => togglePanel('duplicate')}
          onToggleSafetyPanel={toggleSafetyPanel}
          isPanelVisible={isPanelVisible}
        />
        
        {isPanelVisible === 'nearby' && <NearbyPanel onClose={() => setIsPanelVisible(null)} />}
        {isPanelVisible === 'duplicate' && <DuplicatePanel onClose={() => setIsPanelVisible(null)} />}
        {isPanelVisible === 'safety' && <SafetyCheckPanelNew 
          isOpen={isPanelVisible === 'safety'} 
          onClose={() => setIsPanelVisible(null)} 
        />}
      </div>

      {isPhotoModalOpen && <PhotoModal onClose={() => setIsPhotoModalOpen(false)} />}
      {isUrlModalOpen && <URLModal onClose={() => setIsUrlModalOpen(false)} />}
      {isCoordsModalOpen && <CoordsModal onClose={() => setIsCoordsModalOpen(false)} />}
      {previewPhoto && <PhotoPreview photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-primary text-3xl mb-4"></i>
              <p className="text-lg font-semibold">{loadingProgress.message}</p>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300" 
                  style={{ width: `${loadingProgress.total ? (loadingProgress.current / loadingProgress.total) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {loadingProgress.current} из {loadingProgress.total} файлов
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
