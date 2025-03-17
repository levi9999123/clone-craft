import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import sharp from "sharp";
import fetch from "node-fetch";
import FormData from "form-data";
import crypto from "crypto";

// Создаем хранилище в памяти для multer (используем объект для обхода типизации)
const upload = multer({});
const EDEN_AI_API_URL = 'https://api.edenai.run/v2/ocr/ocr';
const EDEN_AI_API_KEY = process.env.EDEN_AI_API_KEY || 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzhiMjFlN2QtMDllZS00MDlkLThjNWUtNmVhODUzZmZjZTIyIiwidHlwZSI6ImFwaV90b2tlbiJ9.fJwi4jDh9TXqC1WHmIk_EdjNzbVIgJvXkT08DOfPhAs';

// Кэш для хранения результатов обработки изображений
interface CacheEntry {
  lat: number | null;
  lon: number | null;
  timestamp: number;
}

const imageCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 минут

// Функция для вычисления хеша изображения
function getImageHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 20);
}

// Пустая функция сжатия - просто возвращает оригинальный буфер
async function compressImage(buffer: Buffer): Promise<Buffer> {
  // По просьбе пользователя не сжимаем изображения
  return buffer;
}

// Extract coordinates from OCR data
function extractCoordinates(data: any): { lat: number | null, lon: number | null } {
  console.log('Извлечение координат на сервере...');

  let lat = null, lon = null;

  if (typeof data === 'string') {
    // Поиск координат в десятичном формате (55.123456, 37.123456)
    const simpleMatch = data.match(/([+-]?\d+\.\d+)\s*[,;]\s*([+-]?\d+\.\d+)/);
    if (simpleMatch) {
      lat = parseFloat(simpleMatch[1]);
      lon = parseFloat(simpleMatch[2]);
      
      // Проверка на валидность координат
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        console.log('Координаты из строки (десятичный формат):', { lat, lon });
        return { lat, lon };
      }
    }

    // Поиск координат с указанием широты и долготы
    // Например: Широта: 55.123456, Долгота: 37.123456
    const latMatch = data.match(/(?:Широта|Latitude|шир|lat)[:\s]+([+-]?\d+\.?\d*)/i);
    const lonMatch = data.match(/(?:Долгота|Longitude|долг|lon)[:\s]+([+-]?\d+\.?\d*)/i);
    if (latMatch && lonMatch) {
      lat = parseFloat(latMatch[1]);
      lon = parseFloat(lonMatch[1]);
      
      // Проверка на валидность координат
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        console.log('Координаты из строки (широта/долгота):', { lat, lon });
        return { lat, lon };
      }
    }

    // Поиск координат в формате DMS (градусы, минуты, секунды)
    // Например: 55° 7' 24.4416" N, 37° 7' 24.4416" E
    const dmsMatch = data.match(/(\d+)[°\s]+(\d+)[''′][\s]*(\d+\.?\d*)[""″]?\s*([NSns])\s*[,;]?\s*(\d+)[°\s]+(\d+)[''′][\s]*(\d+\.?\d*)[""″]?\s*([EWew])/i);
    if (dmsMatch) {
      lat = convertDMSToDD([parseInt(dmsMatch[1]), parseInt(dmsMatch[2]), parseFloat(dmsMatch[3])], dmsMatch[4].toUpperCase());
      lon = convertDMSToDD([parseInt(dmsMatch[5]), parseInt(dmsMatch[6]), parseFloat(dmsMatch[7])], dmsMatch[8].toUpperCase());
      console.log('Координаты из DMS:', { lat, lon });
      return { lat, lon };
    }
    
    // Поиск координат в формате DM (градусы, минуты)
    // Например: 55° 7.40736' N, 37° 7.40736' E
    const dmMatch = data.match(/(\d+)[°\s]+(\d+\.?\d*)[''′]?\s*([NSns])\s*[,;]?\s*(\d+)[°\s]+(\d+\.?\d*)[''′]?\s*([EWew])/i);
    if (dmMatch) {
      lat = convertDMSToDD([parseInt(dmMatch[1]), parseFloat(dmMatch[2]), 0], dmMatch[3].toUpperCase());
      lon = convertDMSToDD([parseInt(dmMatch[4]), parseFloat(dmMatch[5]), 0], dmMatch[6].toUpperCase());
      console.log('Координаты из DM:', { lat, lon });
      return { lat, lon };
    }
    
    // Поиск координат в формате с указанием направления
    // Например: 55.123456 N, 37.123456 E
    const formattedMatch = data.match(/(\d+\.?\d*)\s*([NSns])\s*[,;]?\s*(\d+\.?\d*)\s*([EWew])/i);
    if (formattedMatch) {
      lat = parseFloat(formattedMatch[1]);
      if (formattedMatch[2].toUpperCase() === 'S') lat = -lat;
      
      lon = parseFloat(formattedMatch[3]);
      if (formattedMatch[4].toUpperCase() === 'W') lon = -lon;
      
      // Проверка на валидность координат
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        console.log('Координаты из форматированной строки:', { lat, lon });
        return { lat, lon };
      }
    }
    
    // Попытка найти цифры, похожие на координаты
    const numbersMatch = data.match(/[^\d](\d{1,3}\.?\d{1,8})[^\d].*?[^\d](\d{1,3}\.?\d{1,8})[^\d]/);
    if (numbersMatch) {
      const num1 = parseFloat(numbersMatch[1]);
      const num2 = parseFloat(numbersMatch[2]);
      
      // Пытаемся определить, какое число - широта, а какое - долгота
      if (Math.abs(num1) <= 90 && Math.abs(num2) <= 180) {
        // num1 может быть широтой, num2 - долготой
        lat = num1;
        lon = num2;
        console.log('Координаты из последовательности чисел:', { lat, lon });
        return { lat, lon };
      } else if (Math.abs(num2) <= 90 && Math.abs(num1) <= 180) {
        // num2 может быть широтой, num1 - долготой
        lat = num2;
        lon = num1;
        console.log('Координаты из последовательности чисел (обратный порядок):', { lat, lon });
        return { lat, lon };
      }
    }
  }

  // Если пришел объект от Eden AI
  if (typeof data === 'object' && data !== null) {
    // Проверяем поле google.text
    if (data.google && data.google.text) {
      const text = data.google.text;
      const coords = extractCoordinates(text);
      if (coords.lat !== null && coords.lon !== null) {
        console.log('Координаты из объекта google.text:', coords);
        return coords;
      }
    }
    
    // Проверяем массив extracted_data
    if (data.extracted_data && Array.isArray(data.extracted_data)) {
      for (const block of data.extracted_data) {
        if (block.text) {
          const coords = extractCoordinates(block.text);
          if (coords.lat !== null && coords.lon !== null) {
            console.log('Координаты из блока extracted_data:', coords);
            return coords;
          }
        }
      }
    }
    
    // Проверяем все строковые поля объекта рекурсивно
    for (const key in data) {
      if (typeof data[key] === 'string') {
        const coords = extractCoordinates(data[key]);
        if (coords.lat !== null && coords.lon !== null) {
          console.log(`Координаты из поля ${key}:`, coords);
          return coords;
        }
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        const coords = extractCoordinates(data[key]);
        if (coords.lat !== null && coords.lon !== null) {
          console.log(`Координаты из вложенного объекта ${key}:`, coords);
          return coords;
        }
      }
    }
  }

  console.log('Координаты не найдены в данных');
  return { lat: null, lon: null };
}

// Convert DMS to decimal degrees
function convertDMSToDD(dms: number[], ref: string): number {
  const degrees = dms[0];
  const minutes = dms[1];
  const seconds = dms[2];
  
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (ref === 'S' || ref === 'W') dd = -dd;
  
  return dd;
}

// Process image with Eden AI OCR - упрощенная версия без кэширования
async function processImageWithEdenAI(buffer: Buffer): Promise<{ lat: number | null, lon: number | null }> {
  try {
    // Формируем форму для отправки в API
    const edenForm = new FormData();
    edenForm.append('file', buffer, { filename: 'photo.jpg' });
    edenForm.append('providers', 'google');
    edenForm.append('language', 'ru');

    console.log('Сервер: отправка на Eden AI');
    
    // Используем AbortController с таймаутом
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут
    
    try {
      const response = await fetch(EDEN_AI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': EDEN_AI_API_KEY,
          'Accept': 'application/json',
        },
        body: edenForm,
        signal: controller.signal
      });
      
      // Очищаем таймаут после завершения запроса
      clearTimeout(timeoutId);
      
      const text = await response.text();
      console.log('Сервер: ответ Eden AI:', text);
      
      if (!response.ok) {
        console.warn(`Сервер: ошибка Eden AI: ${response.status}`);
        return { lat: null, lon: null };
      }
      
      // Парсим JSON-ответ
      const result = JSON.parse(text);
      
      // Попытка найти координаты в результате
      const coords = extractCoordinates(result);
      console.log('Сервер: возвращаемые координаты:', coords);
      
      return coords;
    } catch (fetchError) {
      // Обработка ошибок таймаута и сетевых ошибок
      console.error('Сервер: ошибка запроса к Eden AI:', fetchError);
      clearTimeout(timeoutId);
      return { lat: null, lon: null };
    }
  } catch (error) {
    console.error('Сервер: ошибка Eden AI:', error);
    return { lat: null, lon: null };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload image(s) route
  app.post('/api/upload', upload.array('files'), async (req: Request, res: Response) => {
    try {
      if (!req.files || Array.isArray(req.files) && req.files.length === 0) {
        throw new Error('Файлы не загружены');
      }
      
      const files = Array.isArray(req.files) ? req.files : [req.files];
      console.log(`Сервер: получено ${files.length} файлов`);

      const finalResults = [];

      // Обрабатываем файлы параллельно для ускорения
      const processFile = async (file: any) => {
        try {
          let fileBuffer = file.buffer;
          console.log(`Сервер: обработка файла (${file.originalname}), размер: ${file.size} байт`);
          
          // Кэширование отключено по просьбе пользователя
          
          if (file.size > 999999) {
            fileBuffer = await compressImage(fileBuffer);
            console.log(`Сервер: сжатый размер файла (${file.originalname}): ${fileBuffer.length} байт`);
          }

          const coords = await processImageWithEdenAI(fileBuffer);
          return { name: file.originalname, lat: coords.lat, lon: coords.lon };
        } catch (error) {
          console.error(`Ошибка при обработке файла ${file.originalname}:`, error);
          return { name: file.originalname, lat: null, lon: null, error: true };
        }
      };
      
      // Обрабатываем до 5 файлов одновременно для максимальной скорости
      const batchSize = 5;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(file => processFile(file)));
        finalResults.push(...batchResults);
      }

      console.log('Сервер: результаты обработки всех файлов:', finalResults);
      res.json(finalResults);
    } catch (error) {
      console.error('Сервер: ошибка /upload:', error);
      res.status(500).json({ error: 'Ошибка обработки файлов', details: error instanceof Error ? error.message : 'Неизвестная ошибка' });
    }
  });

  // Upload image from URL
  app.post('/api/upload-url', async (req: Request, res: Response) => {
    const { url } = req.body;
    try {
      if (!url) throw new Error('URL не указан');
      console.log(`Сервер: загрузка изображения с ${url}`);
      
      // Используем AbortController для таймаута запроса
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          // Добавляем User-Agent чтобы избежать 403 ошибок
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
        }
      });
      
      // Очищаем таймаут после завершения запроса
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`Не удалось загрузить: ${response.status} - ${response.statusText}`);
      
      // Получаем данные как arrayBuffer и конвертируем в Buffer
      const arrayBuffer = await response.arrayBuffer();
      let fileBuffer = Buffer.from(arrayBuffer);
      
      console.log(`Сервер: получен файл с URL, размер: ${fileBuffer.length} байт`);
      
      if (fileBuffer.length > 999999) {
        fileBuffer = await compressImage(fileBuffer);
        console.log(`Сервер: сжатый размер: ${fileBuffer.length} байт`);
      }
      
      const coords = await processImageWithEdenAI(fileBuffer);
      console.log('Сервер: результат обработки URL:', coords);

      res.json({ name: url.split('/').pop() || url, lat: coords.lat, lon: coords.lon });
    } catch (error) {
      console.error('Сервер: ошибка /upload-url:', error);
      res.status(500).json({ error: 'Ошибка обработки URL', details: error instanceof Error ? error.message : 'Неизвестная ошибка' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
