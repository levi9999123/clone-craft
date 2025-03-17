import { createContext, useContext, useState, ReactNode } from 'react';
import { Photo } from '@/lib/utils';

interface PhotoContextType {
  photos: Photo[];
  addPhoto: (photo: Photo) => void;
  addPhotos: (photos: Photo[]) => void;
  removePhoto: (id: number) => void;
  clearPhotos: () => void;
  selectedPhoto: Photo | null;
  selectPhoto: (photo: Photo | null) => void;
  updatePhotoCoordinates: (id: number, lat: number, lon: number) => void;
  duplicateGroups: Photo[][];
  setDuplicateGroups: (groups: Photo[][]) => void;
}

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export function PhotoProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<Photo[][]>([]);
  
  const addPhoto = (photo: Photo) => {
    setPhotos(prev => [...prev, photo]);
  };
  
  const addPhotos = (newPhotos: Photo[]) => {
    setPhotos(prev => [...prev, ...newPhotos]);
  };
  
  const removePhoto = (id: number) => {
    setPhotos(prev => prev.filter(photo => photo.id !== id));
    if (selectedPhoto && selectedPhoto.id === id) {
      setSelectedPhoto(null);
    }
  };
  
  const clearPhotos = () => {
    setPhotos([]);
    setSelectedPhoto(null);
    setDuplicateGroups([]);
  };
  
  const selectPhoto = (photo: Photo | null) => {
    setSelectedPhoto(photo);
  };
  
  const updatePhotoCoordinates = (id: number, lat: number, lon: number) => {
    setPhotos(prev => 
      prev.map(photo => 
        photo.id === id ? { ...photo, lat, lon } : photo
      )
    );
    
    if (selectedPhoto && selectedPhoto.id === id) {
      setSelectedPhoto({ ...selectedPhoto, lat, lon });
    }
  };
  
  return (
    <PhotoContext.Provider value={{
      photos,
      addPhoto,
      addPhotos,
      removePhoto,
      clearPhotos,
      selectedPhoto,
      selectPhoto,
      updatePhotoCoordinates,
      duplicateGroups,
      setDuplicateGroups,
    }}>
      {children}
    </PhotoContext.Provider>
  );
}

export function usePhotoContext() {
  const context = useContext(PhotoContext);
  if (context === undefined) {
    throw new Error('usePhotoContext must be used within a PhotoProvider');
  }
  return context;
}
