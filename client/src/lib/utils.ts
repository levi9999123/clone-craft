import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidCoords(lat: number | null, lon: number | null): boolean {
  if (lat === null || lon === null) return false;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

export function formatCoordinates(lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) return 'Нет координат';
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

export const truncateFilename = (filename: string, maxLength = 20): string => {
  if (filename.length <= maxLength) return filename;
  const ext = filename.split('.').pop() || '';
  const name = filename.substring(0, filename.length - ext.length - 1);
  return `${name.substring(0, maxLength - ext.length - 3)}...${ext}`;
};

// Find duplicate photos based on coordinates (same location within 10 meters)
// And find close points (within 25 meters)
export function findDuplicates(photos: Photo[]): Photo[][] {
  const duplicateGroups: Photo[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < photos.length; i++) {
    if (processed.has(i)) continue;
    
    const photo = photos[i];
    if (photo.lat === null || photo.lon === null) continue;

    const duplicates: Photo[] = [photo];
    
    for (let j = i + 1; j < photos.length; j++) {
      if (processed.has(j)) continue;
      
      const comparePhoto = photos[j];
      if (comparePhoto.lat === null || comparePhoto.lon === null) continue;

      // Так как мы уже проверили координаты на null выше, можем безопасно приводить их к number
      const distance = calculateDistance(
        photo.lat as number, 
        photo.lon as number, 
        comparePhoto.lat as number, 
        comparePhoto.lon as number
      );
      
      // Точки на расстоянии менее 25 метров (0.025 км) считаются близкими
      if (distance < 0.025) { // 25 meters
        duplicates.push(comparePhoto);
        // Добавляем информацию о расстоянии для отображения
        comparePhoto.distance = distance;
        processed.add(j);
      }
    }
    
    if (duplicates.length > 1) {
      // Сортируем по расстоянию для лучшего отображения
      duplicateGroups.push(duplicates.sort((a, b) => {
        // Базовая точка всегда первая
        if (a.id === photo.id) return -1;
        if (b.id === photo.id) return 1;
        // Сортировка по расстоянию
        return (a.distance || 0) - (b.distance || 0);
      }));
    }
    
    processed.add(i);
  }
  
  return duplicateGroups;
}

// Find photos near a reference photo
export function findNearbyPhotos(photos: Photo[], referencePhoto: Photo, maxDistance = 1): Photo[] {
  // Проверяем, что у опорной фотографии есть координаты
  if (referencePhoto.lat === null || referencePhoto.lon === null) return [];
  
  return photos
    .filter(photo => {
      // Исключаем саму опорную фотографию и фотографии без координат
      if (photo.id === referencePhoto.id) return false;
      if (photo.lat === null || photo.lon === null) return false;
      
      // Так как мы уже проверили координаты на null выше, 
      // можем безопасно приводить их к number
      const distance = calculateDistance(
        referencePhoto.lat as number, 
        referencePhoto.lon as number, 
        photo.lat as number, 
        photo.lon as number
      );
      
      photo.distance = distance;
      return distance <= maxDistance;
    })
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

export interface Photo {
  id: number;
  file?: File;
  url?: string;
  name: string;
  lat: number | null;
  lon: null | number;
  dataUrl?: string;
  distance?: number;
  hasNearbyObjects?: boolean;
  nearbyObjectsCount?: number;
}
