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

// Compress image function
async function compressImage(buffer: Buffer): Promise<Buffer> {
  try {
    let quality = 80;
    let outputBuffer = await sharp(buffer)
      .jpeg({ quality })
      .toBuffer();

    while (outputBuffer.length > 999999 && quality > 10) {
      quality -= 10;
      outputBuffer = await sharp(buffer)
        .jpeg({ quality })
        .toBuffer();
      console.log(`Сжатие: качество ${quality}, размер ${outputBuffer.length} байт`);
    }
    return outputBuffer;
  } catch (error) {
    console.error('Ошибка сжатия изображения:', error);
    throw error;
  }
}

// Extract coordinates from OCR data
function extractCoordinates(data: any): { lat: number | null, lon: number | null } {
  console.log('Извлечение координат на сервере:', data);

  let lat = null, lon = null;

  if (typeof data === 'string') {
    const simpleMatch = data.match(/([+-]?\d+\.\d+)\s*,\s*([+-]?\d+\.\d+)/);
    if (simpleMatch) {
      lat = parseFloat(simpleMatch[1]);
      lon = parseFloat(simpleMatch[2]);
      console.log('Координаты из строки (простой формат):', { lat, lon });
      return { lat, lon };
    }

    const latMatch = data.match(/(?:Широта|Latitude)[:\s]+([+-]?\d+\.\d+)/i);
    const lonMatch = data.match(/(?:Долгота|Longitude)[:\s]+([+-]?\d+\.\d+)/i);
    if (latMatch && lonMatch) {
      lat = parseFloat(latMatch[1]);
      lon = parseFloat(lonMatch[1]);
      console.log('Координаты из строки (Широта/Долгота):', { lat, lon });
      return { lat, lon };
    }

    const dmsMatch = data.match(/(\d+)[°\s]+(\d+)'[\s]*(\d+\.?\d*)"?\s*([NS])\s*(\d+)[°\s]+(\d+)'[\s]*(\d+\.?\d*)"?\s*([EW])/i);
    if (dmsMatch) {
      lat = convertDMSToDD([parseInt(dmsMatch[1]), parseInt(dmsMatch[2]), parseFloat(dmsMatch[3])], dmsMatch[4]);
      lon = convertDMSToDD([parseInt(dmsMatch[5]), parseInt(dmsMatch[6]), parseFloat(dmsMatch[7])], dmsMatch[8]);
      console.log('Координаты из DMS:', { lat, lon });
      return { lat, lon };
    }
  }

  if (typeof data === 'object' && data.google && data.google.text) {
    const coords = extractCoordinates(data.google.text);
    if (coords.lat !== null && coords.lon !== null) {
      console.log('Координаты из объекта google.text:', coords);
      return coords;
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

// Process image with Eden AI OCR
async function processImageWithEdenAI(buffer: Buffer): Promise<{ lat: number | null, lon: number | null }> {
  try {
    // Проверяем кэш перед отправкой запроса
    const hash = getImageHash(buffer);
    const now = Date.now();
    
    // Очистка устаревших записей в кэше
    Array.from(imageCache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > CACHE_TTL) {
        imageCache.delete(key);
      }
    });
    
    // Поиск в кэше
    if (imageCache.has(hash)) {
      const cachedResult = imageCache.get(hash)!;
      console.log('Сервер: найдено в кэше, пропускаем запрос к Eden AI');
      return { lat: cachedResult.lat, lon: cachedResult.lon };
    }
    
    // Если нет в кэше, сжимаем изображение и отправляем запрос
    let compressedBuffer = buffer;
    if (buffer.length > 800000) {
      compressedBuffer = await compressImage(buffer);
    }
    
    const edenForm = new FormData();
    edenForm.append('file', compressedBuffer, { filename: 'photo.jpg' });
    edenForm.append('providers', 'google');
    edenForm.append('language', 'ru');

    console.log('Сервер: отправка на Eden AI');
    // Используем AbortController для таймаута запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
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
      console.warn(`Сервер: ошибка Eden AI: ${response.status} - ${text}`);
      return { lat: null, lon: null };
    }

    const result = JSON.parse(text);
    const coords = extractCoordinates(result);
    
    console.log('Сервер: возвращаемые координаты:', coords);
    
    // Добавляем результат в кэш
    imageCache.set(hash, {
      lat: coords.lat,
      lon: coords.lon,
      timestamp: now
    });
    
    return coords;
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
          
          // Предварительная проверка кэша
          const fileHash = getImageHash(fileBuffer);
          if (imageCache.has(fileHash)) {
            console.log(`Сервер: файл ${file.originalname} найден в кэше`);
            const cachedResult = imageCache.get(fileHash)!;
            return { name: file.originalname, lat: cachedResult.lat, lon: cachedResult.lon };
          }
          
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
      
      // Обрабатываем до 3 файлов одновременно для баланса между скоростью и нагрузкой
      const batchSize = 3;
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
