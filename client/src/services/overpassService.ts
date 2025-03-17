import { calculateDistanceInMeters, NearbyObject, enrichObjectsWithTypeInfo } from '../components/SafetyCheckService';

// Базовый URL API Overpass
const OVERPASS_API_URL = 'https://overpass.private.coffee/api/interpreter';

// Максимальное расстояние поиска в метрах
const DEFAULT_SEARCH_RADIUS = 200;

// Функция для генерации запроса Overpass QL с учетом различных типов объектов
function generateOverpassQuery(lat: number, lon: number, radius: number = DEFAULT_SEARCH_RADIUS): string {
  // Ограничиваем радиус для предотвращения слишком больших запросов
  const safeRadius = Math.min(radius, 500); // не более 500 метров
  
  // Создаем запрос для получения различных типов объектов
  // ИСПРАВЛЕНО: Теперь ищем только way и relation (здания и территории)
  // В OSM границы территорий и зданий хранятся только в way и relation
  return `
    [out:json][timeout:60];
    (
      // Школы и образовательные учреждения - основные теги
      way["amenity"="school"](around:${safeRadius},${lat},${lon});
      relation["amenity"="school"](around:${safeRadius},${lat},${lon});
      
      way["amenity"="kindergarten"](around:${safeRadius},${lat},${lon});
      relation["amenity"="kindergarten"](around:${safeRadius},${lat},${lon});
      
      way["amenity"="college"](around:${safeRadius},${lat},${lon});
      relation["amenity"="college"](around:${safeRadius},${lat},${lon});
      
      way["amenity"="university"](around:${safeRadius},${lat},${lon});
      relation["amenity"="university"](around:${safeRadius},${lat},${lon});
      
      // Образовательные учреждения - альтернативные теги
      way["building"="school"](around:${safeRadius},${lat},${lon});
      relation["building"="school"](around:${safeRadius},${lat},${lon});
      
      way["building"="kindergarten"](around:${safeRadius},${lat},${lon});
      relation["building"="kindergarten"](around:${safeRadius},${lat},${lon});
      
      way["building"="university"](around:${safeRadius},${lat},${lon});
      relation["building"="university"](around:${safeRadius},${lat},${lon});
      
      // Детские площадки
      way["leisure"="playground"](around:${safeRadius},${lat},${lon});
      relation["leisure"="playground"](around:${safeRadius},${lat},${lon});
      
      // Детские учреждения
      way["amenity"="childcare"](around:${safeRadius},${lat},${lon});
      relation["amenity"="childcare"](around:${safeRadius},${lat},${lon});
      
      // Полиция и правоохранительные органы
      way["amenity"="police"](around:${safeRadius},${lat},${lon});
      relation["amenity"="police"](around:${safeRadius},${lat},${lon});
      
      way["building"="police"](around:${safeRadius},${lat},${lon});
      relation["building"="police"](around:${safeRadius},${lat},${lon});
      
      // Медицинские учреждения
      way["amenity"="hospital"](around:${safeRadius},${lat},${lon});
      relation["amenity"="hospital"](around:${safeRadius},${lat},${lon});
      
      way["amenity"="clinic"](around:${safeRadius},${lat},${lon});
      relation["amenity"="clinic"](around:${safeRadius},${lat},${lon});
      
      way["amenity"="doctors"](around:${safeRadius},${lat},${lon});
      relation["amenity"="doctors"](around:${safeRadius},${lat},${lon});
      
      way["healthcare"="hospital"](around:${safeRadius},${lat},${lon});
      relation["healthcare"="hospital"](around:${safeRadius},${lat},${lon});
      
      way["healthcare"="clinic"](around:${safeRadius},${lat},${lon});
      relation["healthcare"="clinic"](around:${safeRadius},${lat},${lon});
      
      way["healthcare"="doctor"](around:${safeRadius},${lat},${lon});
      relation["healthcare"="doctor"](around:${safeRadius},${lat},${lon});
      
      way["building"="hospital"](around:${safeRadius},${lat},${lon});
      relation["building"="hospital"](around:${safeRadius},${lat},${lon});
      
      // Религиозные учреждения
      way["amenity"="place_of_worship"](around:${safeRadius},${lat},${lon});
      relation["amenity"="place_of_worship"](around:${safeRadius},${lat},${lon});
      
      way["building"="church"](around:${safeRadius},${lat},${lon});
      relation["building"="church"](around:${safeRadius},${lat},${lon});
      
      way["building"="mosque"](around:${safeRadius},${lat},${lon});
      relation["building"="mosque"](around:${safeRadius},${lat},${lon});
      
      way["building"="temple"](around:${safeRadius},${lat},${lon});
      relation["building"="temple"](around:${safeRadius},${lat},${lon});
      
      way["building"="cathedral"](around:${safeRadius},${lat},${lon});
      relation["building"="cathedral"](around:${safeRadius},${lat},${lon});
      
      // Государственные и административные здания
      way["amenity"="townhall"](around:${safeRadius},${lat},${lon});
      relation["amenity"="townhall"](around:${safeRadius},${lat},${lon});
      
      way["office"="government"](around:${safeRadius},${lat},${lon});
      relation["office"="government"](around:${safeRadius},${lat},${lon});
      
      way["building"="public"](around:${safeRadius},${lat},${lon});
      relation["building"="public"](around:${safeRadius},${lat},${lon});
      
      way["government"](around:${safeRadius},${lat},${lon});
      relation["government"](around:${safeRadius},${lat},${lon});
      
      // Торговые центры и магазины
      way["shop"="mall"](around:${safeRadius},${lat},${lon});
      relation["shop"="mall"](around:${safeRadius},${lat},${lon});
      
      way["building"="mall"](around:${safeRadius},${lat},${lon});
      relation["building"="mall"](around:${safeRadius},${lat},${lon});
      
      way["building"="retail"](around:${safeRadius},${lat},${lon});
      relation["building"="retail"](around:${safeRadius},${lat},${lon});
      
      // Военные объекты
      way["landuse"="military"](around:${safeRadius},${lat},${lon});
      relation["landuse"="military"](around:${safeRadius},${lat},${lon});
      
      way["military"](around:${safeRadius},${lat},${lon});
      relation["military"](around:${safeRadius},${lat},${lon});
      
      // Поиск дополнительно по словам в названии - ТОЛЬКО для way и relation
      way[name~"школ|колледж|лицей|детский сад|полиц|больниц|клиник|госпиталь|роддом|храм|церковь|собор|мечеть|синагог|правительств|администрац|мэри",i](around:${safeRadius},${lat},${lon});
      relation[name~"школ|колледж|лицей|детский сад|полиц|больниц|клиник|госпиталь|роддом|храм|церковь|собор|мечеть|синагог|правительств|администрац|мэри",i](around:${safeRadius},${lat},${lon});
      
      // Английские термины - ТОЛЬКО для way и relation
      way[name~"school|kindergarten|college|university|police|hospital|clinic|church|mosque|temple|government|administration|town hall|city hall",i](around:${safeRadius},${lat},${lon});
      relation[name~"school|kindergarten|college|university|police|hospital|clinic|church|mosque|temple|government|administration|town hall|city hall",i](around:${safeRadius},${lat},${lon});
    );
    // Включаем информацию о центроидах для более точного расчета расстояний
    out center body;
    // Получаем геометрию для way и relation
    >;
    out center;
  `;
}

// Кэш для Overpass запросов
const overpassCache: {[key: string]: {data: any, timestamp: number}} = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 минут

// Проверка, является ли запрос потенциально дорогостоящим (большой радиус)
function isExpensiveQuery(radius: number): boolean {
  return radius > 300; // Считаем запросы с радиусом более 300м "дорогими"
}

// Периодически очищаем кэш (выполняется раз в 10 вызовов)
function cleanupOverpassCache() {
  if (Math.random() < 0.1) {
    const now = Date.now();
    Object.keys(overpassCache).forEach(key => {
      if (now - overpassCache[key].timestamp > CACHE_TTL) {
        delete overpassCache[key];
      }
    });
  }
}

// Получение ключа кэша
function getOverpassCacheKey(lat: number, lon: number, radius: number): string {
  // Округляем координаты до 5 десятичных знаков для лучшей эффективности кэширования
  // (это примерно 1.1 метра точности, что достаточно для наших целей)
  return `${lat.toFixed(5)},${lon.toFixed(5)},${radius}`;
}

// Оптимизированная функция для получения ближайших объектов
export async function fetchNearbyRestrictedObjects(lat: number, lon: number, radius: number = DEFAULT_SEARCH_RADIUS): Promise<NearbyObject[]> {
  try {
    // Проверка аргументов
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      console.error('Некорректные координаты:', lat, lon);
      return [];
    }
    
    // Нормализуем радиус
    const safeRadius = Math.min(Math.max(50, radius), 500); // От 50 до 500 метров
    
    // Проверяем кэш перед выполнением запроса
    const cacheKey = getOverpassCacheKey(lat, lon, safeRadius);
    if (overpassCache[cacheKey]) {
      console.log(`Использую кэшированные данные для (${lat.toFixed(5)}, ${lon.toFixed(5)})`);
      const cachedData = overpassCache[cacheKey].data;
      return cachedData;
    }
    
    // Если запрос дорогостоящий, проверяем, есть ли похожие запросы в кэше
    if (isExpensiveQuery(safeRadius)) {
      // Ищем ближайший кэшированный результат в пределах 300 метров
      const cacheKeys = Object.keys(overpassCache);
      for (const key of cacheKeys) {
        const [cachedLat, cachedLon, cachedRadius] = key.split(',').map(Number);
        const distance = Math.sqrt(
          Math.pow(lat - cachedLat, 2) + Math.pow(lon - cachedLon, 2)
        ) * 111000; // приблизительное расстояние в метрах (1 градус ≈ 111 км)
        
        // Если найден кэшированный результат рядом и радиус примерно тот же
        if (distance < 300 && Math.abs(safeRadius - cachedRadius) < 100) {
          console.log(`Использую приближенный кэш для (${lat}, ${lon})`);
          return overpassCache[key].data;
        }
      }
    }
    
    // Если не нашли в кэше, отправляем запрос
    const query = generateOverpassQuery(lat, lon, safeRadius);
    console.log(`Отправка запроса к Overpass API для (${lat.toFixed(5)}, ${lon.toFixed(5)})`);
    
    // Используем AbortController для таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 секунд таймаут
    
    try {
      const response = await fetch(OVERPASS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Ошибка запроса к Overpass API:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      // Если результат пустой, возвращаем пустой массив
      if (!data.elements || data.elements.length === 0) {
        // Кэшируем пустой результат
        overpassCache[cacheKey] = {
          data: [],
          timestamp: Date.now()
        };
        return [];
      }
      
      // Обработка результатов - используем более эффективный map
      const objects = data.elements.map((element: any) => {
        // Быстрое извлечение нужных данных
        const name = element.tags?.name || 'Неизвестный объект';
        
        // Извлекаем координаты в зависимости от типа элемента
        let objectLat, objectLon;
        
        if (element.type === 'node') {
          objectLat = element.lat;
          objectLon = element.lon;
        } else if (element.center) {
          // Для путей и отношений используем центроид
          objectLat = element.center.lat;
          objectLon = element.center.lon;
        } else {
          // Если нет центроида, используем координаты точки запроса
          objectLat = lat;
          objectLon = lon;
        }
        
        // Вычисляем расстояние между точкой и объектом
        const distance = calculateDistanceInMeters(lat, lon, objectLat, objectLon);
        
        return {
          id: element.id.toString(),
          name,
          tags: element.tags,
          distance,
          lat: objectLat,
          lon: objectLon,
          type: ''  // Тип будет определен позднее
        };
      });
      
      // Быстрая фильтрация по расстоянию - отбрасываем объекты за пределами радиуса
      const filteredObjects = objects.filter(obj => obj.distance <= safeRadius);
      
      // Обогащаем объекты информацией о типе
      const enrichedObjects = enrichObjectsWithTypeInfo(filteredObjects);
      
      // Сортируем по расстоянию
      const sortedObjects = enrichedObjects.sort((a, b) => a.distance - b.distance);
      
      // Кэшируем результат
      overpassCache[cacheKey] = {
        data: sortedObjects,
        timestamp: Date.now()
      };
      
      // Очистка старых записей в кэше
      cleanupOverpassCache();
      
      return sortedObjects;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('Timeout при запросе к Overpass API');
      } else {
        console.error('Ошибка при получении данных из Overpass API:', error);
      }
      return [];
    }
  } catch (error) {
    console.error('Критическая ошибка при получении данных из Overpass API:', error);
    return [];
  }
}

// Оптимизированная функция проверки безопасности местоположения
export async function checkLocationSafety(lat: number, lon: number, radius?: number): Promise<NearbyObject[]> {
  try {
    // Быстрая проверка координат
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      console.warn('Некорректные координаты для проверки безопасности:', lat, lon);
      return [];
    }
    
    // Нормализуем радиус для предотвращения ошибок
    const safeRadius = radius ? Math.min(Math.max(50, radius), 500) : 200;
    
    // Получаем данные через API с таймаутом
    const apiObjectsPromise = fetchNearbyRestrictedObjects(lat, lon, safeRadius);
    
    // Используем таймаут на случай если API зависнет
    const timeoutPromise = new Promise<NearbyObject[]>((resolve) => {
      setTimeout(() => resolve([]), 20000); // 20 секунд таймаут
    });
    
    // Ждем первый завершившийся промис
    const apiObjects = await Promise.race([apiObjectsPromise, timeoutPromise]);
    
    // Логируем результат
    console.log(`Проверка безопасности: найдено ${apiObjects.length} объектов поблизости от координат (${lat}, ${lon})`);
    
    return apiObjects;
  } catch (error) {
    console.error('Ошибка при проверке безопасности местоположения:', error);
    return [];
  }
}