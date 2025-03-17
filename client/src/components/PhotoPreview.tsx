import React from 'react';
import { Photo } from '@/lib/utils';
import { formatCoordinates } from '@/lib/utils';
import { X, Map, Camera } from 'lucide-react';

interface PhotoPreviewProps {
  photo: Photo;
  onClose: () => void;
}

export default function PhotoPreview({ photo, onClose }: PhotoPreviewProps) {
  const hasPreview = !!photo.dataUrl;
  const hasCoords = photo.lat !== null && photo.lon !== null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {photo.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
          <div className="flex-grow flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 overflow-hidden">
            {hasPreview ? (
              <img
                src={photo.dataUrl}
                alt={photo.name}
                className="max-w-full max-h-[60vh] object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 p-8">
                <Camera className="h-16 w-16 mb-4" />
                <p>Предпросмотр изображения недоступен</p>
              </div>
            )}
          </div>

          <div className="w-full md:w-64 p-4 border-t md:border-t-0 md:border-l overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Имя файла
                </h4>
                <p className="text-gray-900 dark:text-white break-all">{photo.name}</p>
              </div>

              {hasCoords && (
                <div>
                  <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Координаты
                  </h4>
                  <p className="text-gray-900 dark:text-white">
                    {formatCoordinates(photo.lat, photo.lon)}
                  </p>
                  <button 
                    className="mt-2 flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                    onClick={() => {
                      const mapUrl = `https://www.google.com/maps?q=${photo.lat},${photo.lon}`;
                      window.open(mapUrl, '_blank');
                    }}
                  >
                    <Map className="h-4 w-4 mr-1" />
                    Открыть в Google Maps
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}