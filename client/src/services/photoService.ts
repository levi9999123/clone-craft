import { Photo } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

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

// Process multiple files with progress tracking
export async function processFiles(files: File[], onProgress?: (current: number) => void): Promise<Photo[]> {
  const photos: Photo[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type.startsWith('image/')) {
      const photo = await processFile(file);
      photos.push(photo);
      
      if (onProgress) {
        onProgress(i + 1);
      }
    }
  }
  
  return photos;
}

// Process image from URL
export async function processUrl(url: string): Promise<Photo | null> {
  try {
    const response = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to process URL: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Try to fetch the image to get a data URL
    let dataUrl: string | undefined;
    try {
      const imageResponse = await fetch(url);
      const blob = await imageResponse.blob();
      dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Error fetching image from URL:', e);
    }
    
    return {
      id: nextId++,
      url,
      name: url.split('/').pop() || url,
      lat: result.lat || null,
      lon: result.lon || null,
      dataUrl
    };
  } catch (error) {
    console.error('Error processing URL:', error);
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
