import { Photo } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { checkLocationSafety } from '@/components/SafetyCheckService';

// Generate a unique ID for each photo
let nextId = 1;

// Process image file to extract coordinates (from EXIF or OCR)
export async function processFile(file: File): Promise<Photo> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        
        try {
          // First try to read EXIF data from the image
          const exifCoords = await extractExifCoordinates(file);
          
          if (exifCoords.lat !== null && exifCoords.lon !== null) {
            resolve({
              id: nextId++,
              file,
              name: file.name,
              lat: exifCoords.lat,
              lon: exifCoords.lon,
              dataUrl
            });
          } else {
            // If EXIF data doesn't contain coordinates, try OCR
            const formData = new FormData();
            formData.append('files', file);
            
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) {
              throw new Error(`OCR service responded with status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result && result.length > 0) {
              const photoData = result[0];
              resolve({
                id: nextId++,
                file,
                name: file.name,
                lat: photoData.lat || null,
                lon: photoData.lon || null,
                dataUrl
              });
            } else {
              resolve({
                id: nextId++,
                file,
                name: file.name,
                lat: null,
                lon: null,
                dataUrl
              });
            }
          }
        } catch (error) {
          console.error('Error processing file:', error);
          resolve({
            id: nextId++,
            file,
            name: file.name,
            lat: null,
            lon: null,
            dataUrl
          });
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
}

// Process multiple files with progress tracking and safety check
export async function processFiles(files: File[], onProgress?: (current: number) => void): Promise<Photo[]> {
  const photos: Photo[] = [];
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  // Обработка файлов пакетами для ускорения загрузки
  const BATCH_SIZE = 5; // Обрабатываем до 5 файлов одновременно
  let completedCount = 0;
  
  for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
    // Берем текущий пакет файлов
    const batch = imageFiles.slice(i, i + BATCH_SIZE);
    
    // Обрабатываем все файлы в пакете параллельно
    const batchResults = await Promise.all(
      batch.map(async file => {
        const photo = await processFile(file);
        completedCount++;
        
        if (onProgress) {
          onProgress(completedCount);
        }
        
        return photo;
      })
    );
    
    // Добавляем результаты в общий массив
    photos.push(...batchResults);
  }
  
  // Параллельно выполняем проверку безопасности для всех фотографий с координатами
  const photosWithCoords = photos.filter(photo => photo.lat !== null && photo.lon !== null);
  
  if (photosWithCoords.length > 0) {
    console.log(`Начало параллельной проверки безопасности для ${photosWithCoords.length} фотографий...`);
    
    // Выполняем все проверки безопасности параллельно
    const safetyChecks = await Promise.allSettled(
      photosWithCoords.map(async photo => {
        try {
          console.log(`Проверка безопасности для фото ${photo.name}...`);
          // Используем новый формат вызова с передачей объекта фото
          const result = await checkLocationSafety(photo);
          const nearbyObjects = result.restrictedObjects || [];
          
          if (nearbyObjects.length > 0) {
            // Добавляем флаг небезопасности к фотографии, если есть объекты рядом
            photo.hasNearbyObjects = true;
            photo.nearbyObjectsCount = nearbyObjects.length;
            console.log(`Фото ${photo.name}: найдено ${nearbyObjects.length} объектов поблизости`);
          } else {
            photo.hasNearbyObjects = false;
            console.log(`Фото ${photo.name}: объектов поблизости не обнаружено`);
          }
          return { photo, success: true };
        } catch (error) {
          console.error(`Не удалось выполнить проверку безопасности для фото ${photo.name}:`, error);
          return { photo, success: false, error };
        }
      })
    );
    
    console.log(`Завершение параллельной проверки безопасности: успешно ${
      safetyChecks.filter(result => result.status === 'fulfilled').length
    } из ${safetyChecks.length}`);
  }
  
  return photos;
}

// Process image from URL
export async function processUrl(url: string): Promise<Photo | null> {
  try {
    console.log(`Начало обработки URL: ${url}`);
    
    // Выполняем оба запроса параллельно для ускорения
    const [responsePromise, imageResponsePromise] = await Promise.allSettled([
      // Запрос на обработку URL сервером для извлечения координат
      fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      }),
      
      // Одновременно пытаемся загрузить само изображение для превью
      fetch(url, {
        headers: { 'Accept': 'image/*' }
      })
    ]);
    
    // Обрабатываем результат извлечения координат
    if (responsePromise.status === 'rejected') {
      throw new Error(`Ошибка при обработке URL: ${responsePromise.reason}`);
    }
    
    const response = responsePromise.value;
    if (!response.ok) {
      throw new Error(`Ошибка при обработке URL: ${response.status} - ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Пытаемся получить изображение для предпросмотра
    let dataUrl: string | undefined;
    if (imageResponsePromise.status === 'fulfilled') {
      try {
        const imageResponse = imageResponsePromise.value;
        if (imageResponse.ok) {
          const blob = await imageResponse.blob();
          dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.error('Ошибка при получении предпросмотра изображения:', e);
      }
    }
    
    const photo = {
      id: nextId++,
      url,
      name: url.split('/').pop() || url,
      lat: result.lat || null,
      lon: result.lon || null,
      dataUrl,
      hasNearbyObjects: false,
      nearbyObjectsCount: 0
    };
    
    // Если есть координаты, проверяем безопасность параллельно с остальной обработкой
    if (photo.lat !== null && photo.lon !== null) {
      // Запускаем проверку безопасности, но не ждем её завершения
      console.log(`Проверка безопасности для URL ${photo.name}...`);
      checkLocationSafety(photo) // Передаем объект целиком
        .then(result => {
          const restrictedObjects = result.restrictedObjects || [];
          if (restrictedObjects.length > 0) {
            // Добавляем флаг небезопасности к фотографии, если есть объекты рядом
            photo.hasNearbyObjects = true;
            photo.nearbyObjectsCount = restrictedObjects.length;
            console.log(`URL ${photo.name}: найдено ${restrictedObjects.length} объектов поблизости`);
          } else {
            photo.hasNearbyObjects = false;
            console.log(`URL ${photo.name}: объектов поблизости не обнаружено`);
          }
        })
        .catch(error => {
          console.error(`Не удалось выполнить проверку безопасности для URL ${photo.name}:`, error);
        });
    }
    
    return photo;
  } catch (error) {
    console.error('Ошибка обработки URL:', error);
    throw error;
  }
}

// Extract coordinates from EXIF data
async function extractExifCoordinates(file: File): Promise<{ lat: number | null, lon: number | null }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      if (!e.target?.result) {
        resolve({ lat: null, lon: null });
        return;
      }
      
      try {
        // @ts-ignore - EXIF.js is loaded globally in index.html
        EXIF.getData(file, function() {
          try {
            // @ts-ignore - EXIF.js is loaded globally in index.html
            const exifData = EXIF.getAllTags(this);
            
            if (exifData && exifData.GPSLatitude && exifData.GPSLongitude) {
              const latRef = exifData.GPSLatitudeRef || 'N';
              const lonRef = exifData.GPSLongitudeRef || 'E';
              
              const latDegrees = exifData.GPSLatitude[0].numerator / exifData.GPSLatitude[0].denominator;
              const latMinutes = exifData.GPSLatitude[1].numerator / exifData.GPSLatitude[1].denominator;
              const latSeconds = exifData.GPSLatitude[2].numerator / exifData.GPSLatitude[2].denominator;
              
              const lonDegrees = exifData.GPSLongitude[0].numerator / exifData.GPSLongitude[0].denominator;
              const lonMinutes = exifData.GPSLongitude[1].numerator / exifData.GPSLongitude[1].denominator;
              const lonSeconds = exifData.GPSLongitude[2].numerator / exifData.GPSLongitude[2].denominator;
              
              let lat = latDegrees + (latMinutes / 60) + (latSeconds / 3600);
              let lon = lonDegrees + (lonMinutes / 60) + (lonSeconds / 3600);
              
              if (latRef === 'S') lat = -lat;
              if (lonRef === 'W') lon = -lon;
              
              resolve({ lat, lon });
              return;
            }
          } catch (error) {
            console.error('Error extracting EXIF data:', error);
          }
          
          resolve({ lat: null, lon: null });
        });
      } catch (error) {
        console.error('Error processing EXIF data:', error);
        resolve({ lat: null, lon: null });
      }
    };
    
    reader.onerror = function() {
      resolve({ lat: null, lon: null });
    };
    
    reader.readAsArrayBuffer(file);
  });
}
