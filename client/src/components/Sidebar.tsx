import { useRef, useState } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import PhotoItem from './PhotoItem';
import { calculateDistance, formatCoordinates } from '@/lib/utils';
import { processFiles, processUrl } from '@/services/photoService';

interface SidebarProps {
  onOpenUrlModal: () => void;
  onOpenCoordsModal: () => void;
  onOpenPhotoModal: (photo: any) => void;
  showLoading: (message: string, total: number) => void;
  updateLoadingProgress: (current: number) => void;
  hideLoading: () => void;
}

export default function Sidebar({
  onOpenUrlModal,
  onOpenCoordsModal,
  onOpenPhotoModal,
  showLoading,
  updateLoadingProgress,
  hideLoading,
}: SidebarProps) {
  const {
    photos,
    addPhotos,
    clearPhotos,
    removePhoto,
    selectedPhoto,
  } = usePhotoContext();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDistanceCalculating, setIsDistanceCalculating] = useState(false);
  const [point1, setPoint1] = useState('');
  const [point2, setPoint2] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const photosPerPage = 5;
  const totalPages = Math.ceil(photos.length / photosPerPage);
  const currentPhotos = photos.slice(
    (currentPage - 1) * photosPerPage,
    currentPage * photosPerPage
  );
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      await handleFiles(files);
    }
  };
  
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      await handleFiles(files);
    }
  };
  
  const handleFolderUpload = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };
  
  const handleFiles = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Нет изображений для обработки');
      return;
    }
    
    showLoading('Обработка изображений...', imageFiles.length);
    
    try {
      const processedPhotos = await processFiles(imageFiles, (i) => {
        updateLoadingProgress(i);
      });
      
      addPhotos(processedPhotos);
      hideLoading();
    } catch (error) {
      console.error('Error processing files:', error);
      hideLoading();
      alert(`Ошибка при обработке файлов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };
  
  const handleCalculateDistance = () => {
    setIsDistanceCalculating(!isDistanceCalculating);
    setDistance(null);
    setPoint1('');
    setPoint2('');
  };
  
  const computeDistance = () => {
    const p1 = photos.find(p => p.id.toString() === point1);
    const p2 = photos.find(p => p.id.toString() === point2);
    
    if (p1 && p2 && p1.lat !== null && p1.lon !== null && p2.lat !== null && p2.lon !== null) {
      const dist = calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon);
      setDistance(dist);
    } else {
      setDistance(null);
    }
  };
  
  const handlePointChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
  };
  
  const validPoints = photos.filter(p => p.lat !== null && p.lon !== null);
  
  return (
    <div className="w-80 bg-white shadow-md border-r border-gray-200 flex flex-col h-full">
      <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary">G.P.S ANALYZE</h1>
      </div>
      
      <div
        className={`m-4 border-2 border-dashed ${
          isDragOver ? 'border-accent bg-orange-50' : 'border-primary bg-highlight'
        } rounded-lg p-4 text-center cursor-pointer transition-all hover:bg-blue-50`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <i className="fas fa-cloud-upload-alt text-2xl text-primary mb-2"></i>
        <p className={`font-medium ${isDragOver ? 'text-accent' : 'text-primary'}`}>
          Перетащите файлы сюда или нажмите для выбора
        </p>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
        />
      </div>
      
      <div className="px-4 space-y-2">
        <button
          id="load-folder-btn"
          className="w-full bg-accent text-white py-2 px-4 rounded font-medium hover:bg-orange-600 transition-colors shadow-sm"
          onClick={handleFolderUpload}
        >
          <i className="fas fa-folder-open mr-2"></i>Загрузить папку
          <input
            type="file"
            ref={folderInputRef}
            className="hidden"
            webkitdirectory="true"
            directory=""
            multiple
            onChange={handleFileInputChange}
          />
        </button>
        
        <button
          id="load-urls-btn"
          className="w-full bg-accent text-white py-2 px-4 rounded font-medium hover:bg-orange-600 transition-colors shadow-sm"
          onClick={onOpenUrlModal}
        >
          <i className="fas fa-link mr-2"></i>Загрузить по URL
        </button>
        
        <button
          id="save-coordinates"
          className="w-full bg-accent text-white py-2 px-4 rounded font-medium hover:bg-orange-600 transition-colors shadow-sm"
          onClick={onOpenCoordsModal}
        >
          <i className="fas fa-save mr-2"></i>Сохранить координаты
        </button>
        
        <button
          id="calc-distance-btn"
          className="w-full bg-accent text-white py-2 px-4 rounded font-medium hover:bg-orange-600 transition-colors shadow-sm"
          onClick={handleCalculateDistance}
        >
          <i className="fas fa-ruler mr-2"></i>Вычислить расстояние
        </button>
        
        {isDistanceCalculating && (
          <div className="distance-input">
            <label className="font-bold mr-2">Выберите точки:</label>
            <select
              id="point1"
              className="border border-gray-300 rounded px-2 py-1 w-full mb-2 focus:border-primary"
              value={point1}
              onChange={handlePointChange(setPoint1)}
            >
              <option value="">Выберите первую точку</option>
              {validPoints.map(p => (
                <option key={`p1-${p.id}`} value={p.id}>
                  {p.name} ({formatCoordinates(p.lat, p.lon)})
                </option>
              ))}
            </select>
            
            <select
              id="point2"
              className="border border-gray-300 rounded px-2 py-1 w-full mb-2 focus:border-primary"
              value={point2}
              onChange={handlePointChange(setPoint2)}
            >
              <option value="">Выберите вторую точку</option>
              {validPoints.map(p => (
                <option key={`p2-${p.id}`} value={p.id}>
                  {p.name} ({formatCoordinates(p.lat, p.lon)})
                </option>
              ))}
            </select>
            
            <button
              className="w-full bg-primary text-white py-2 px-4 rounded font-medium hover:bg-blue-700 transition-colors shadow-sm mt-2"
              onClick={computeDistance}
              disabled={!point1 || !point2}
            >
              Вычислить
            </button>
            
            {distance !== null && (
              <div className="mt-2 p-2 bg-highlight rounded text-center">
                <span className="font-bold">Расстояние:</span> {distance} км
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-grow overflow-y-auto px-4 pb-4 mt-4">
        <h2 className="font-bold text-gray-700 mb-2">
          Загруженные фотографии: <span>{photos.length}</span>
        </h2>
        <div id="photo-list" className="space-y-2">
          {currentPhotos.map(photo => (
            <PhotoItem
              key={photo.id}
              photo={photo}
              onRemove={() => removePhoto(photo.id)}
              onClick={() => onOpenPhotoModal(photo)}
              isSelected={selectedPhoto?.id === photo.id}
            />
          ))}
          {photos.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              Нет загруженных фотографий
            </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="pagination mt-4 text-center">
            <button
              id="prev-page"
              className="bg-primary text-white px-3 py-2 rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="mx-2">{currentPage}</span> / <span>{totalPages}</span>
            <button
              id="next-page"
              className="bg-primary text-white px-3 py-2 rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <button
          className="clear-btn w-full bg-error text-white py-2 px-4 rounded font-medium hover:bg-red-700 transition-colors shadow-sm"
          onClick={() => {
            if (confirm('Вы уверены, что хотите удалить все фотографии?')) {
              clearPhotos();
              setCurrentPage(1);
            }
          }}
        >
          <i className="fas fa-trash mr-2"></i>Очистить все
        </button>
      </div>
    </div>
  );
}
