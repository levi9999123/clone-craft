import { Photo } from '@/lib/utils';

// Список типов запрещенных объектов
export const RESTRICTED_OBJECT_TYPES = [
  'police', 'hospital', 'school', 'private_school', 'clinic', 'private_clinic',
  'dentist', 'healthcare', 'church', 'temple', 'mosque', 'military',
  'university', 'college', 'educational_institution', 'government',
  'administration', 'shopping_mall', 'playground', 'kindergarten'
];

// Минимальное допустимое расстояние в метрах
export const MINIMUM_SAFE_DISTANCE = 50;

// Альтернативные теги и ключевые слова для определения объектов
export const ALTERNATIVE_TAGS = {
  'police': ['полиц', 'полицейск', 'овд', 'мвд', 'увд', 'гибдд', 'фсб', 'укон', 'участковый', 'отделение'],
  'hospital': ['больниц', 'госпиталь', 'поликлиник', 'медцентр', 'мед. центр', 'медицинск'],
  'school': ['школа', 'гимназия', 'лицей', 'образова', 'учебное', 'обучение'],
  'private_school': ['частная школа', 'частное образова', 'частная гимназия'],
  'clinic': ['клиник', 'больниц', 'медцентр', 'мед. центр', 'медицинск'],
  'healthcare': ['медицинск', 'поликлиник', 'больниц', 'здравоохра'],
  'church': ['церковь', 'храм', 'часовн', 'собор'],
  'temple': ['храм', 'церковь', 'собор', 'монастырь'],
  'mosque': ['мечеть', 'минарет', 'ислам'],
  'military': ['военн', 'армия', 'воинск', 'часть'],
  'university': ['университет', 'институт', 'вуз', 'высшее'],
  'college': ['колледж', 'техникум', 'училище'],
  'educational_institution': ['образова', 'учебн', 'образоват', 'школ', 'учил'],
  'government': ['правитель', 'администрац', 'мэрия', 'гос'],
  'shopping_mall': ['торгов', 'магазин', 'тц', 'трц', 'молл', 'маркет'],
  'playground': ['детск', 'площадк', 'песочниц', 'карусел'],
  'kindergarten': ['детск', 'сад', 'ясли', 'дошкол']
};

// Функция определения типа объекта по названию
export function determineObjectType(name: string): string[] {
  if (!name) return [];
  
  name = name.toLowerCase();
  const matchedTypes: string[] = [];
  
  Object.entries(ALTERNATIVE_TAGS).forEach(([type, keywords]) => {
    for (const keyword of keywords) {
      if (name.includes(keyword.toLowerCase())) {
        matchedTypes.push(type);
        break;
      }
    }
  });
  
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

// Заглушка для проверки безопасности
// В реальном приложении здесь должен быть вызов API для получения данных о ближайших объектах
export async function checkLocationSafety(photo: Photo): Promise<SafetyCheckResult> {
  // Это заглушка, которая должна быть заменена на реальную функциональность
  // с использованием API (OpenStreetMap, Google Maps API или другие)
  
  // В реальном приложении надо:
  // 1. Получить список ближайших объектов через API
  // 2. Отфильтровать объекты по типу
  // 3. Вычислить расстояния
  // 4. Определить безопасность на основе правил
  
  // Возвращаем заглушку результата
  return {
    isSafe: true,
    restrictedObjects: []
  };
}

// Функция для добавления проверки объектов API в реальном приложении
// Здесь в будущем должна быть реализация вызова к геокодеру или API с точками интереса
export async function fetchNearbyObjects(lat: number, lon: number, radius: number = 100): Promise<NearbyObject[]> {
  // Здесь должен быть вызов к Overpass API (OpenStreetMap) или другому API
  // для получения ближайших объектов определенных типов
  
  // Пример запроса к Overpass API для получения ближайших школ, полицейских участков и т.д.
  // Это только шаблон, который нужно заполнить реальной логикой вызова API
  
  // Возвращаем пустой массив как заглушку
  return [];
}

// Функция обогащения списка объектов информацией о типе
// на основе тегов и названий
export function enrichObjectsWithTypeInfo(objects: any[]): NearbyObject[] {
  return objects.map(obj => {
    // Определяем тип объекта по названию и тегам
    const objectTypes = determineObjectType(obj.name || obj.tags?.name);
    
    return {
      id: obj.id,
      name: obj.name || obj.tags?.name || 'Неизвестный объект',
      type: objectTypes.length > 0 ? objectTypes[0] : 'unknown',
      distance: obj.distance || 0,
      lat: obj.lat,
      lon: obj.lon
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