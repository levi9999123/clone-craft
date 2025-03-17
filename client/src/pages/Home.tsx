import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import MapView from '@/components/MapView';
import { usePhotoContext } from '@/context/PhotoContext';
import NearbyPanel from '@/components/NearbyPanel';
import DuplicatePanel from '@/components/DuplicatePanel';
import PhotoModal from '@/components/modals/PhotoModal';
import URLModal from '@/components/modals/URLModal';
import CoordsModal from '@/components/modals/CoordsModal';
import { Photo } from '@/lib/utils';

export default function Home() {
  const { selectedPhoto } = usePhotoContext();
  const [isPanelVisible, setIsPanelVisible] = useState<'nearby' | 'duplicate' | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isCoordsModalOpen, setIsCoordsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' });

  useEffect(() => {
    if (selectedPhoto) {
      setIsPanelVisible('nearby');
    }
  }, [selectedPhoto]);

  const togglePanel = (panelType: 'nearby' | 'duplicate') => {
    setIsPanelVisible(current => current === panelType ? null : panelType);
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
        showLoading={showLoading}
        updateLoadingProgress={updateLoadingProgress}
        hideLoading={hideLoading}
      />
      
      <div className="flex-grow flex relative">
        <MapView 
          onToggleNearbyPanel={() => togglePanel('nearby')}
          onToggleDuplicatePanel={() => togglePanel('duplicate')}
          isPanelVisible={isPanelVisible}
        />
        
        {isPanelVisible === 'nearby' && <NearbyPanel onClose={() => setIsPanelVisible(null)} />}
        {isPanelVisible === 'duplicate' && <DuplicatePanel onClose={() => setIsPanelVisible(null)} />}
      </div>

      {isPhotoModalOpen && <PhotoModal onClose={() => setIsPhotoModalOpen(false)} />}
      {isUrlModalOpen && <URLModal onClose={() => setIsUrlModalOpen(false)} />}
      {isCoordsModalOpen && <CoordsModal onClose={() => setIsCoordsModalOpen(false)} />}

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
