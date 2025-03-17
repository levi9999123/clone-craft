import { Photo } from '@/lib/utils';

// Кэш для хранения результатов проверки безопасности
interface SafetyCache {
  [key: string]: {
    result: SafetyCheckResult;
    timestamp: number;
  };
}

// Кэш проверок безопасности с тайм-аутом 1 час
const safetyCheckCache: SafetyCache = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 час

// Генерация ключа кэша на основе координат
function getCacheKey(lat: number, lon: number, radius: number = 200): string {
  return `${lat.toFixed(6)},${lon.toFixed(6)},${radius}`;
}

// Функция очистки устаревших записей в кэше
function cleanupCache(): void {
  const now = Date.now();
  Object.keys(safetyCheckCache).forEach(key => {
    if (now - safetyCheckCache[key].timestamp > CACHE_TTL) {
      delete safetyCheckCache[key];
    }
  });
}

// Список типов запрещенных объектов с различными вариантами написания и типами
export const RESTRICTED_OBJECT_TYPES = [
  'police', 'hospital', 'school', 'private_school', 'clinic', 'private_clinic',
  'dentist', 'healthcare', 'church', 'temple', 'mosque', 'synagogue', 'military',
  'university', 'college', 'educational_institution', 'government',
  'administration', 'shopping_mall', 'playground', 'kindergarten',
  'childcare', 'preschool', 'detention', 'prison', 'law_enforcement',
  'townhall', 'city_hall', 'courthouse', 'embassy', 'post_office',
  'public_building', 'community_centre', 'social_facility', 'place_of_worship'
];

// Минимальное допустимое расстояние в метрах
export const MINIMUM_SAFE_DISTANCE = 50;

// Альтернативные теги и ключевые слова для определения объектов
// Расширенный список для повышения точности определения
export const ALTERNATIVE_TAGS = {
  // Правоохранительные органы
  'police': ['полиц', 'полицейск', 'увд', 'мвд', 'умвд', 'овд', 'упр', 'гувд', 'гибдд', 'дпс', 'фсб', 'укон', 'участковый', 'отделение', 'отдел', 'опорный пункт', 'police', 'law enforcement', 'sheriff'],
  
  // Медицинские учреждения
  'hospital': ['больниц', 'госпиталь', 'стационар', 'роддом', 'родильн', 'поликлиник', 'медцентр', 'мед. центр', 'медицинск', 'hospital', 'medical center', 'healthcare'],
  'clinic': ['клиник', 'медцентр', 'мед. центр', 'медицинск', 'поликлиник', 'диспансер', 'амбулатор', 'clinic', 'medical office'],
  'healthcare': ['медицинск', 'поликлиник', 'больниц', 'здравоохра', 'здоровье', 'фап', 'фельдшер', 'аптек', 'healthcare', 'medical'],
  'dentist': ['стоматолог', 'дантист', 'зубной', 'dentist', 'dental'],
  
  // Образовательные учреждения
  'school': ['школа', 'гимназия', 'лицей', 'образова', 'учебное', 'обучение', 'общеобразова', 'school', 'academy', 'gymnasium'],
  'private_school': ['частная школа', 'частное образова', 'частная гимназия', 'private school'],
  'university': ['университет', 'институт', 'вуз', 'высшее', 'academy', 'university', 'college'],
  'college': ['колледж', 'техникум', 'училище', 'пту', 'спту', 'профессионал', 'college', 'vocational'],
  'educational_institution': ['образова', 'учебн', 'образоват', 'школ', 'учил', 'education', 'training'],
  'kindergarten': ['детск', 'сад', 'ясли', 'дошкол', 'дошкольн', 'ДОУ', 'kindergarten', 'preschool', 'nursery'],
  'childcare': ['детск', 'ясли', 'дошкол', 'присмотр', 'daycare', 'childcare'],
  'preschool': ['дошкольн', 'детск', 'подготов', 'preschool', 'preparatory'],
  
  // Религиозные учреждения
  'church': ['церковь', 'храм', 'часовн', 'собор', 'приход', 'church', 'cathedral'],
  'temple': ['храм', 'церковь', 'собор', 'монастырь', 'обитель', 'temple', 'monastery'],
  'mosque': ['мечеть', 'минарет', 'ислам', 'мусульман', 'mosque', 'islamic'],
  'synagogue': ['синагог', 'иудей', 'еврей', 'synagogue', 'jewish'],
  'place_of_worship': ['храм', 'церковь', 'мечеть', 'синагога', 'часовня', 'молельн', 'worship', 'religious'],
  
  // Государственные учреждения
  'government': ['правитель', 'администрац', 'мэрия', 'гос', 'совет', 'думы', 'дума', 'government', 'state'],
  'administration': ['администрац', 'управлен', 'префектур', 'муниципал', 'administration', 'municipal'],
  'townhall': ['мэрия', 'ратуша', 'администрац', 'муниципалитет', 'town hall', 'city hall'],
  'courthouse': ['суд', 'судебный', 'трибунал', 'правосуд', 'court', 'judiciary'],
  'embassy': ['посольство', 'консульство', 'дипломат', 'embassy', 'consulate'],
  'public_building': ['общественн', 'государствен', 'публичн', 'муниципальн', 'public', 'civic'],
  
  // Военные объекты
  'military': ['военн', 'армия', 'воинск', 'часть', 'ракетн', 'гарнизон', 'military', 'army', 'defense'],
  
  // Прочее
  'shopping_mall': ['торгов', 'магазин', 'тц', 'трц', 'молл', 'маркет', 'универмаг', 'mall', 'shopping center'],
  'playground': ['детск', 'площадк', 'песочниц', 'карусел', 'игров', 'playground', 'play area'],
  'detention': ['тюрьм', 'колония', 'следствен', 'изолятор', 'сизо', 'итк', 'prison', 'jail', 'detention'],
  'community_centre': ['общественн', 'центр', 'дом культуры', 'клуб', 'community', 'cultural center'],
  'social_facility': ['социальн', 'обеспечен', 'собес', 'welfare', 'social service']
};

// Функция определения типа объекта по названию
export function determineObjectType(name: string): string[] {
  if (!name) return [];
  
  // Нормализуем имя объекта
  name = name.toLowerCase().trim();
  const matchedTypes: string[] = [];
  
  // Проверяем наличие тегов OSM в имени
  const osmTags = name.match(/[a-z_]+=[a-z0-9_]+/g) || [];
  for (const tag of osmTags) {
    const [key, value] = tag.split('=');
    if (RESTRICTED_OBJECT_TYPES.includes(value)) {
      matchedTypes.push(value);
    }
  }
  
  // Проверяем по расширенным ключевым словам
  Object.entries(ALTERNATIVE_TAGS).forEach(([type, keywords]) => {
    for (const keyword of keywords) {
      // Преобразуем ключевое слово в нижний регистр для сравнения
      const lowercaseKeyword = keyword.toLowerCase();
      
      // Проверяем вхождение ключевого слова в имя объекта
      if (name.includes(lowercaseKeyword)) {
        matchedTypes.push(type);
        
        // Добавляем человекочитаемое название, если это русское название
        if (lowercaseKeyword !== type && /[а-яё]/.test(lowercaseKeyword)) {
          matchedTypes.push(lowercaseKeyword);
        }
        break;
      }
    }
  });
  
  // Если тип не определен, но есть теги OSM, попробуем определить по ним
  if (matchedTypes.length === 0) {
    // Дополнительная проверка по определенным характеристикам
    if (name.includes('building')) return ['Здание'];
    if (name.includes('house')) return ['Жилой дом'];
    if (name.includes('amenity')) return ['Общественный объект'];
    if (name.includes('shop')) return ['Магазин'];
    if (name.includes('leisure')) return ['Зона отдыха'];
    
    // Если не смогли определить тип, но это похоже на объект OpenStreetMap
    if (name.includes('osm') || name.includes('openstreetmap') || osmTags.length > 0) {
      return ['Объект OpenStreetMap'];
    }
  }
  
  // Если не смогли определить тип, возвращаем общее название
  if (matchedTypes.length === 0) {
    return ['Не определен'];
  }
  
  return matchedTypes;
}

// Функция вычисления расстояния между двумя точками в метрах
export function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Радиус Земли в метрах
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

// Интерфейс объекта для проверки
export interface NearbyObject {
  id: string;
  name: string;
  type: string;
  distance: number;
  lat: number;
  lon: number;
}

// Функция проверки безопасности расстояния
export function isSafeDistance(distance: number): boolean {
  return distance >= MINIMUM_SAFE_DISTANCE;
}

// Интерфейс результата проверки безопасности
export interface SafetyCheckResult {
  isSafe: boolean;
  restrictedObjects: NearbyObject[];
  warningMessage?: string;
}

// Функция проверки безопасности местоположения с использованием API
export async function checkLocationSafety(photo: Photo): Promise<SafetyCheckResult> {
  // Проверяем, есть ли координаты у фотографии
  if (!photo.lat || !photo.lon) {
    return {
      isSafe: true,
      restrictedObjects: [],
      warningMessage: "Невозможно проверить безопасность без координат"
    };
  }

  try {
    // Очищаем устаревшие записи в кэше
    cleanupCache();
    
    // Проверяем кэш перед API-запросом
    const cacheKey = getCacheKey(photo.lat, photo.lon);
    if (safetyCheckCache[cacheKey]) {
      console.log(`Найден результат в кэше для координат (${photo.lat}, ${photo.lon})`);
      return safetyCheckCache[cacheKey].result;
    }
    
    // Используем API для получения объектов поблизости
    const objects = await fetchNearbyObjects(photo.lat, photo.lon);
    console.log(`Обнаружено объектов вблизи: ${objects.length}`);
    
    // Проверяем, есть ли объекты в опасной близости
    const unsafeObjects = objects.filter(obj => !isSafeDistance(obj.distance));
    
    const result: SafetyCheckResult = {
      isSafe: unsafeObjects.length === 0,
      restrictedObjects: objects,
      warningMessage: unsafeObjects.length > 0 
        ? `Обнаружено ${unsafeObjects.length} объектов в опасной близости (менее ${MINIMUM_SAFE_DISTANCE} метров)`
        : objects.length > 0
          ? `Все объекты на безопасном расстоянии (более ${MINIMUM_SAFE_DISTANCE} метров)` 
          : "Запрещенных объектов поблизости не обнаружено"
    };
    
    // Сохраняем результат в кэш
    safetyCheckCache[cacheKey] = {
      result,
      timestamp: Date.now()
    };
    
    return result;
  } catch (error) {
    console.error("Ошибка при проверке безопасности:", error);
    return {
      isSafe: false,
      restrictedObjects: [],
      warningMessage: "Ошибка при проверке безопасности. Попробуйте еще раз."
    };
  }
}

// Кэш для хранения результатов запросов к Overpass API
const nearbyObjectsCache: {[key: string]: {objects: NearbyObject[], timestamp: number}} = {};

// Функция получения объектов вблизи заданной точки
export async function fetchNearbyObjects(lat: number, lon: number, radius: number = 200): Promise<NearbyObject[]> {
  if (!lat || !lon) return [];
  
  try {
    // Проверяем кэш перед API-запросом
    const cacheKey = getCacheKey(lat, lon, radius);
    if (nearbyObjectsCache[cacheKey]) {
      console.log(`Найдены объекты в кэше для координат (${lat}, ${lon})`);
      return nearbyObjectsCache[cacheKey].objects;
    }
    
    // Импортируем функцию из файла overpassService
    const { checkLocationSafety } = await import('../services/overpassService');
    
    // Получаем данные из Overpass API
    const objects = await checkLocationSafety(lat, lon, radius);
    
    // Если у объектов нет расстояния, вычисляем его
    objects.forEach(obj => {
      if (!obj.distance && obj.lat && obj.lon) {
        obj.distance = calculateDistanceInMeters(lat, lon, obj.lat, obj.lon);
      }
    });
    
    // Сортируем объекты по расстоянию (ближайшие в начале)
    const sortedObjects = objects.sort((a, b) => a.distance - b.distance);
    
    // Сохраняем результат в кэш
    nearbyObjectsCache[cacheKey] = {
      objects: sortedObjects,
      timestamp: Date.now()
    };
    
    // Очистка кэша - удаляем старые записи
    cleanupNearbyObjectsCache();
    
    return sortedObjects;
  } catch (error) {
    console.error("Ошибка при получении объектов поблизости:", error);
    return [];
  }
}

// Очистка кэша объектов поблизости
function cleanupNearbyObjectsCache() {
  const now = Date.now();
  Object.keys(nearbyObjectsCache).forEach(key => {
    if (now - nearbyObjectsCache[key].timestamp > CACHE_TTL) {
      delete nearbyObjectsCache[key];
    }
  });
}

// Функция обогащения списка объектов информацией о типе
// на основе тегов и названий, с улучшенным определением типа объекта
export function enrichObjectsWithTypeInfo(objects: any[]): NearbyObject[] {
  return objects.map(obj => {
    let objectType = 'building';
    let objectName = obj.name || obj.tags?.name || 'Здание';
    // Получаем адрес объекта, если есть
    const address = obj.tags?.['addr:street'] ? 
      `${obj.tags?.['addr:street']}${obj.tags?.['addr:housenumber'] ? ` ${obj.tags?.['addr:housenumber']}` : ''}` : 
      (obj.tags?.address || '');
    
    // Определяем тип объекта в первую очередь по тегам OSM, если они доступны
    if (obj.tags) {
      const tags = obj.tags;
      
      // Проверяем разные варианты тегов для определения типа объекта
      // Приоритеты: amenity > building > landuse > другие теги
      if (tags.amenity) {
        if (tags.amenity === 'school' || tags.amenity === 'college' || tags.amenity === 'university') {
          objectType = tags.amenity;
        } else if (tags.amenity === 'kindergarten' || tags.amenity === 'childcare') {
          objectType = 'kindergarten';
        } else if (tags.amenity === 'place_of_worship') {
          // Уточняем тип религиозного учреждения, если есть информация
          if (tags.religion) {
            if (tags.religion === 'christian') objectType = 'church';
            else if (tags.religion === 'muslim' || tags.religion === 'islam') objectType = 'mosque';
            else if (tags.religion === 'jewish') objectType = 'synagogue';
            else if (tags.religion === 'buddhist') objectType = 'temple';
            else objectType = 'place_of_worship';
          } else {
            objectType = 'place_of_worship';
          }
        } else if (tags.amenity === 'police') {
          objectType = 'police';
        } else if (tags.amenity === 'hospital' || tags.amenity === 'clinic' || tags.amenity === 'doctors') {
          objectType = tags.amenity === 'hospital' ? 'hospital' : 'clinic';
        } else if (tags.amenity === 'townhall') {
          objectType = 'government';
        } else {
          // Для других amenity, проверяем по имени
          objectType = 'public_building';
        }
      } else if (tags.building) {
        // Проверяем типы зданий
        if (tags.building === 'school' || tags.building === 'college' || tags.building === 'university') {
          objectType = tags.building;
        } else if (tags.building === 'kindergarten') {
          objectType = 'kindergarten';
        } else if (tags.building === 'hospital' || tags.building === 'healthcare') {
          objectType = 'hospital';
        } else if (tags.building === 'church' || tags.building === 'cathedral' || tags.building === 'chapel') {
          objectType = 'church';
        } else if (tags.building === 'mosque') {
          objectType = 'mosque';
        } else if (tags.building === 'temple') {
          objectType = 'temple';
        } else if (tags.building === 'synagogue') {
          objectType = 'synagogue';
        } else if (tags.building === 'governmental' || tags.building === 'public') {
          objectType = 'government';
        } else if (tags.building === 'retail' || tags.building === 'mall' || tags.building === 'commercial') {
          objectType = 'shopping_mall';
        } else {
          // Для других типов зданий, проверяем по имени
          objectType = 'building';
        }
      } else if (tags.landuse) {
        // Проверяем типы использования земли
        if (tags.landuse === 'military') {
          objectType = 'military';
        } else if (tags.landuse === 'education') {
          objectType = 'educational_institution';
        }
      } else if (tags.leisure) {
        // Проверяем объекты досуга
        if (tags.leisure === 'playground') {
          objectType = 'playground';
        }
      } else if (tags.office) {
        // Проверяем типы офисов
        if (tags.office === 'government') {
          objectType = 'government';
        }
      } else if (tags.healthcare) {
        // Проверяем медицинские учреждения
        objectType = 'healthcare';
      }
    }
    
    // Если тип не удалось определить по тегам, пробуем по имени
    if (objectType === 'unknown' || objectType === 'building') {
      const nameTypes = determineObjectType(objectName);
      if (nameTypes.length > 0) {
        objectType = nameTypes[0];
      }
    }
    
    // Добавляем 'название [тип]' для объектов с определенным типом
    if (objectType !== 'unknown' && objectType !== 'building') {
      // Определяем русское название типа для отображения
      const typeLabels: {[key: string]: string} = {
        'school': 'Школа',
        'university': 'Университет',
        'college': 'Колледж',
        'kindergarten': 'Детский сад',
        'hospital': 'Больница',
        'clinic': 'Клиника',
        'healthcare': 'Медучреждение',
        'church': 'Церковь',
        'temple': 'Храм',
        'mosque': 'Мечеть',
        'synagogue': 'Синагога',
        'place_of_worship': 'Религиозное учреждение',
        'government': 'Госучреждение',
        'administration': 'Администрация',
        'military': 'Военный объект',
        'police': 'Полиция',
        'shopping_mall': 'Торговый центр',
        'playground': 'Детская площадка',
        'public_building': 'Общественное здание'
      };
      
      // Если имя не содержит явного указания на тип, добавляем его
      const typeName = typeLabels[objectType] || objectType;
      if (objectName === 'Неизвестный объект') {
        objectName = typeName;
      } else if (!objectName.toLowerCase().includes(typeName.toLowerCase())) {
        objectName = `${objectName} [${typeName}]`;
      }
    }
    
    // Добавляем адрес к имени объекта, если он есть
    const displayName = address && !objectName.includes(address) ? 
      `${objectName}${objectName !== 'Здание' ? ', ' : ' '}${address}` : 
      objectName;
      
    // Определяем категорию безопасности
    let category = '';
    if (obj.distance < MINIMUM_SAFE_DISTANCE) {
      category = 'опасно';
    } else if (obj.distance < MINIMUM_SAFE_DISTANCE * 1.5) {
      category = 'предупреждение';
    } else {
      category = 'безопасно';
    }
    
    return {
      id: obj.id,
      name: displayName,
      type: objectType,
      distance: obj.distance || 0,
      lat: obj.lat,
      lon: obj.lon,
      address: address,
      category: category,
      tags: obj.tags
    };
  });
}

// Функция для отображения полилиний между точками на карте
export function drawPolylinesBetweenPoints(map: any, points: {lat: number, lon: number}[]): void {
  if (!map || !points || points.length < 2) return;
  
  const L = window.L;
  if (!L) return;
  
  // Создаем массив точек для полилинии
  const latLngs = points.map(p => [p.lat, p.lon]);
  
  // Добавляем полилинию на карту
  L.polyline(latLngs, {
    color: 'var(--primary)',
    weight: 3,
    opacity: 0.7,
    lineJoin: 'round'
  }).addTo(map);
}

// Функция для получения центральной точки между множеством точек
export function getCenterOfPoints(points: {lat: number, lon: number}[]): {lat: number, lon: number} {
  if (!points || points.length === 0) {
    return { lat: 0, lon: 0 };
  }
  
  if (points.length === 1) {
    return { lat: points[0].lat, lon: points[0].lon };
  }
  
  let totalLat = 0;
  let totalLon = 0;
  
  for (const point of points) {
    totalLat += point.lat;
    totalLon += point.lon;
  }
  
  return {
    lat: totalLat / points.length,
    lon: totalLon / points.length
  };
}