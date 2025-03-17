import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import MapView from '@/components/MapView';
import { usePhotoContext } from '@/context/PhotoContext';
import NearbyPanel from '@/components/NearbyPanel';
import DuplicatePanel from '@/components/DuplicatePanel';
import SafetyCheckPanel from '@/components/SafetyCheckPanel';
import PhotoModal from '@/components/modals/PhotoModal';
import URLModal from '@/components/modals/URLModal';
import CoordsModal from '@/components/modals/CoordsModal';
import PhotoPreview from '@/components/PhotoPreview';
import { Photo, calculateDistance, findDuplicates } from '@/lib/utils';
import { NearbyObject } from '@/components/SafetyCheckService';
import { checkLocationSafety } from '@/services/overpassService';

export default function Home() {
  const { selectedPhoto, photos } = usePhotoContext();
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
  
  // Эффект для проверки безопасности местоположения
  useEffect(() => {
    const checkSafety = async () => {
      if (selectedPhoto && selectedPhoto.lat !== null && selectedPhoto.lon !== null) {
        if (isPanelVisible === 'safety') {
          // Показываем индикатор загрузки только если панель открыта
          showLoading('Проверка безопасности местоположения...', 1);
          
          try {
            // Получаем список близлежащих запрещенных объектов
            const objects = await checkLocationSafety(selectedPhoto.lat, selectedPhoto.lon);
            setRestrictedObjects(objects);
            
            console.log(`Обнаружено объектов вблизи: ${objects.length}`);
          } catch (error) {
            console.error('Ошибка при проверке безопасности:', error);
          } finally {
            hideLoading();
          }
        } else {
          // Очищаем результаты, если панель закрыта
          setRestrictedObjects([]);
        }
      } else {
        // Если фото не выбрано или у него нет координат, сбрасываем список объектов
        setRestrictedObjects([]);
      }
    };
    
    checkSafety();
  }, [selectedPhoto, isPanelVisible]);

  const togglePanel = (panelType: 'nearby' | 'duplicate' | 'safety') => {
    setIsPanelVisible(current => current === panelType ? null : panelType);
  };
  
  const toggleSafetyPanel = async () => {
    try {
      // Всегда переключаем панель, независимо от наличия фото
      setIsPanelVisible(current => current === 'safety' ? null : 'safety');
      
      // Если есть выбранное фото с координатами, выполняем проверку безопасности
      if (selectedPhoto && selectedPhoto.lat !== null && selectedPhoto.lon !== null) {
        showLoading('Проверка безопасности местоположения...', 1);
        
        try {
          // Получаем список близлежащих запрещенных объектов
          const objects = await checkLocationSafety(selectedPhoto.lat, selectedPhoto.lon);
          setRestrictedObjects(objects);
          console.log('Обнаружено объектов вблизи: ', objects.length);
        } catch (error) {
          console.error('Ошибка при проверке безопасности:', error);
          // Отображаем уведомление об ошибке пользователю
          alert('Не удалось выполнить проверку безопасности. Пожалуйста, попробуйте еще раз.');
        } finally {
          hideLoading();
        }
      } else {
        // Если нет выбранного фото, очищаем список объектов
        setRestrictedObjects([]);
      }
    } catch (error) {
      console.error('Непредвиденная ошибка при открытии панели безопасности:', error);
      hideLoading();
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
        {isPanelVisible === 'safety' && <SafetyCheckPanel 
          isOpen={isPanelVisible === 'safety'} 
          onClose={() => setIsPanelVisible(null)} 
          restrictedObjects={restrictedObjects} 
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
