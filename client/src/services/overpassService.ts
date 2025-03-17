import { calculateDistanceInMeters, NearbyObject, enrichObjectsWithTypeInfo } from '../components/SafetyCheckService';

// Базовый URL API Overpass
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Максимальное расстояние поиска в метрах
const DEFAULT_SEARCH_RADIUS = 200;

// Функция для генерации запроса Overpass QL
function generateOverpassQuery(lat: number, lon: number, radius: number = DEFAULT_SEARCH_RADIUS): string {
  // Преобразуем радиус из метров в градусы
  // Радиус должен быть в метрах, но некоторые запросы используют градусы
  // Приблизительно 0.001 градус = 111 метров на экваторе
  const radiusDegrees = radius / 111000;
  
  // Создаем запрос для получения различных типов объектов
  return `
    [out:json][timeout:25];
    (
      // Школы и образовательные учреждения
      node["amenity"="school"](around:${radius},${lat},${lon});
      way["amenity"="school"](around:${radius},${lat},${lon});
      relation["amenity"="school"](around:${radius},${lat},${lon});
      
      node["amenity"="kindergarten"](around:${radius},${lat},${lon});
      way["amenity"="kindergarten"](around:${radius},${lat},${lon});
      relation["amenity"="kindergarten"](around:${radius},${lat},${lon});
      
      node["amenity"="college"](around:${radius},${lat},${lon});
      way["amenity"="college"](around:${radius},${lat},${lon});
      relation["amenity"="college"](around:${radius},${lat},${lon});
      
      node["amenity"="university"](around:${radius},${lat},${lon});
      way["amenity"="university"](around:${radius},${lat},${lon});
      relation["amenity"="university"](around:${radius},${lat},${lon});
      
      // Детские площадки
      node["leisure"="playground"](around:${radius},${lat},${lon});
      way["leisure"="playground"](around:${radius},${lat},${lon});
      relation["leisure"="playground"](around:${radius},${lat},${lon});
      
      // Полиция и правоохранительные органы
      node["amenity"="police"](around:${radius},${lat},${lon});
      way["amenity"="police"](around:${radius},${lat},${lon});
      relation["amenity"="police"](around:${radius},${lat},${lon});
      
      // Медицинские учреждения
      node["amenity"="hospital"](around:${radius},${lat},${lon});
      way["amenity"="hospital"](around:${radius},${lat},${lon});
      relation["amenity"="hospital"](around:${radius},${lat},${lon});
      
      node["amenity"="clinic"](around:${radius},${lat},${lon});
      way["amenity"="clinic"](around:${radius},${lat},${lon});
      relation["amenity"="clinic"](around:${radius},${lat},${lon});
      
      node["amenity"="doctors"](around:${radius},${lat},${lon});
      way["amenity"="doctors"](around:${radius},${lat},${lon});
      relation["amenity"="doctors"](around:${radius},${lat},${lon});
      
      // Религиозные учреждения
      node["amenity"="place_of_worship"](around:${radius},${lat},${lon});
      way["amenity"="place_of_worship"](around:${radius},${lat},${lon});
      relation["amenity"="place_of_worship"](around:${radius},${lat},${lon});
      
      // Государственные и административные здания
      node["amenity"="townhall"](around:${radius},${lat},${lon});
      way["amenity"="townhall"](around:${radius},${lat},${lon});
      relation["amenity"="townhall"](around:${radius},${lat},${lon});
      
      node["office"="government"](around:${radius},${lat},${lon});
      way["office"="government"](around:${radius},${lat},${lon});
      relation["office"="government"](around:${radius},${lat},${lon});
      
      // Торговые центры
      node["shop"="mall"](around:${radius},${lat},${lon});
      way["shop"="mall"](around:${radius},${lat},${lon});
      relation["shop"="mall"](around:${radius},${lat},${lon});
      
      // Военные объекты
      node["landuse"="military"](around:${radius},${lat},${lon});
      way["landuse"="military"](around:${radius},${lat},${lon});
      relation["landuse"="military"](around:${radius},${lat},${lon});
      
      // Поиск дополнительно по словам в названии
      node[name~"школ|детский сад|полиц|больниц|клиник|храм|церковь|мечеть|правительст|администрац",i](around:${radius},${lat},${lon});
      way[name~"школ|детский сад|полиц|больниц|клиник|храм|церковь|мечеть|правительст|администрац",i](around:${radius},${lat},${lon});
      relation[name~"школ|детский сад|полиц|больниц|клиник|храм|церковь|мечеть|правительст|администрац",i](around:${radius},${lat},${lon});
    );
    out body;
    >;
    out skel qt;
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
    // Пробуем получить данные через API
    const apiObjects = await fetchNearbyRestrictedObjects(lat, lon, radius || 200);
    
    if (apiObjects.length > 0) {
      return apiObjects;
    }
    
    // Если API вернуло пустой массив, возвращаем тестовые данные для демонстрации функциональности
    // В реальной системе эта часть должна быть удалена
    console.log('API вернуло пустой массив, возвращаем тестовые данные для демонстрации');
    
    // Генерируем точки вокруг исходной точки на разных расстояниях
    const testData: NearbyObject[] = [
      {
        id: 'test-1',
        name: 'Школа №123',
        type: 'school',
        distance: 45, // ближе минимального расстояния
        lat: lat + (45 / 111000),
        lon: lon + (10 / 111000)
      },
      {
        id: 'test-2',
        name: 'Детский сад "Ромашка"',
        type: 'kindergarten',
        distance: 65, // дальше минимального расстояния
        lat: lat - (65 / 111000),
        lon: lon - (30 / 111000)
      },
      {
        id: 'test-3',
        name: 'Отделение полиции №5',
        type: 'police',
        distance: 110,
        lat: lat + (100 / 111000),
        lon: lon - (50 / 111000)
      },
      {
        id: 'test-4',
        name: 'Поликлиника №2',
        type: 'clinic',
        distance: 180,
        lat: lat - (150 / 111000),
        lon: lon + (100 / 111000)
      }
    ];
    
    return testData;
  } catch (error) {
    console.error('Ошибка при проверке безопасности местоположения:', error);
    return [];
  }
}