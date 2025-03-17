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

// Функция для получения ближайших объектов
export async function fetchNearbyRestrictedObjects(lat: number, lon: number, radius: number = DEFAULT_SEARCH_RADIUS): Promise<NearbyObject[]> {
  try {
    const query = generateOverpassQuery(lat, lon, radius);
    
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`
    });
    
    if (!response.ok) {
      console.error('Ошибка запроса к Overpass API:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    // Обработка результатов
    const objects = data.elements.map((element: any) => {
      const name = element.tags?.name || 'Неизвестный объект';
      
      // Извлекаем координаты в зависимости от типа элемента
      let objectLat, objectLon;
      
      if (element.type === 'node') {
        objectLat = element.lat;
        objectLon = element.lon;
      } else if (element.type === 'way' || element.type === 'relation') {
        // Для путей и отношений центроид вычисляется по-другому
        // здесь мы используем простое приближение
        objectLat = element.center?.lat || lat;
        objectLon = element.center?.lon || lon;
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
    
    // Обогащаем объекты информацией о типе
    return enrichObjectsWithTypeInfo(objects);
    
  } catch (error) {
    console.error('Ошибка при получении данных из Overpass API:', error);
    return [];
  }
}

// Функция проверки безопасности местоположения
export async function checkLocationSafety(lat: number, lon: number, radius?: number): Promise<NearbyObject[]> {
  try {
    // Получаем данные только через API - без демонстрационных данных
    const apiObjects = await fetchNearbyRestrictedObjects(lat, lon, radius || 200);
    
    // Возвращаем объекты, найденные API (может быть пустой массив)
    console.log(`Проверка безопасности: найдено ${apiObjects.length} объектов поблизости от координат (${lat}, ${lon})`);
    return apiObjects;
  } catch (error) {
    console.error('Ошибка при проверке безопасности местоположения:', error);
    return [];
  }
}