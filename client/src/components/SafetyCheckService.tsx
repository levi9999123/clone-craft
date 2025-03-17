import { Photo } from '@/lib/utils';

// Мы больше не используем кэширование, чтобы гарантировать получение актуальных данных при каждом запросе
// Постоянно используем радиус поиска в 100 метров

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
  'police': ['полиц', 'полицейск', 'увд', 'мвд', 'умвд', 'овд', 'упр', 'гувд', 'гибдд', 'дпс', 'фсб', 'укон', 'гукон', 'участковый', 'отделение', 'отдел', 'опорный пункт', 'police', 'law enforcement', 'sheriff', 'милиция', 'правоохранительные органы', 'прокуратура', 'следственный комитет'],
  
  // Медицинские учреждения
  'hospital': ['больниц', 'госпиталь', 'стационар', 'роддом', 'родильн', 'поликлиник', 'медцентр', 'мед. центр', 'медицинск', 'hospital', 'medical center', 'healthcare'],
  'clinic': ['клиник', 'медцентр', 'мед. центр', 'медицинск', 'поликлиник', 'диспансер', 'амбулатор', 'clinic', 'medical office'],
  'healthcare': ['медицинск', 'поликлиник', 'больниц', 'здравоохра', 'здоровье', 'фап', 'фельдшер', 'аптек', 'healthcare', 'medical'],
  'dentist': ['стоматолог', 'дантист', 'зубной', 'dentist', 'dental'],
  
  // Образовательные учреждения
  'school': ['школа', 'гимназия', 'лицей', 'образова', 'учебное', 'обучение', 'общеобразова', 'school', 'academy', 'gymnasium', 'начальная школа', 'прогимназия'],
  'private_school': ['частная школа', 'частное образова', 'частная гимназия', 'private school'],
  'university': ['университет', 'институт', 'вуз', 'высшее', 'academy', 'university', 'college', 'академия'],
  'college': ['колледж', 'техникум', 'училище', 'пту', 'спту', 'профессионал', 'college', 'vocational', 'профессиональное училище', 'кадетский корпус'],
  'educational_institution': ['образова', 'учебн', 'образоват', 'школ', 'учил', 'education', 'training', 'интернат', 'пансион', 'школа-интернат', 'детская студия'],
  'kindergarten': ['детск', 'сад', 'ясли', 'дошкол', 'дошкольн', 'ДОУ', 'kindergarten', 'preschool', 'nursery', 'садик', 'детский сад', 'детский центр', 'дошкольное учреждение', 'подготовительная группа'],
  'childcare': ['детск', 'ясли', 'дошкол', 'присмотр', 'daycare', 'childcare'],
  'preschool': ['дошкольн', 'детск', 'подготов', 'preschool', 'preparatory'],
  
  // Религиозные учреждения
  'church': ['церковь', 'храм', 'часовн', 'собор', 'приход', 'church', 'cathedral'],
  'temple': ['храм', 'церковь', 'собор', 'монастырь', 'обитель', 'temple', 'monastery'],
  'mosque': ['мечеть', 'минарет', 'ислам', 'мусульман', 'mosque', 'islamic'],
  'synagogue': ['синагог', 'иудей', 'еврей', 'synagogue', 'jewish'],
  'place_of_worship': ['храм', 'церковь', 'мечеть', 'синагога', 'часовня', 'молельн', 'worship', 'religious'],
  
  // Государственные учреждения и суды
  'government': ['правитель', 'администрац', 'мэрия', 'гос', 'совет', 'думы', 'дума', 'government', 'state', 'суд', 'судебный участок'],
  'administration': ['администрац', 'управлен', 'префектур', 'муниципал', 'administration', 'municipal'],
  'townhall': ['мэрия', 'ратуша', 'администрац', 'муниципалитет', 'town hall', 'city hall'],
  'courthouse': ['суд', 'судебный', 'трибунал', 'правосуд', 'court', 'judiciary'],
  'embassy': ['посольство', 'консульство', 'дипломат', 'embassy', 'consulate'],
  'public_building': ['общественн', 'государствен', 'публичн', 'муниципальн', 'public', 'civic'],
  
  // Военные объекты и спасательные службы
  'military': ['военн', 'армия', 'воинск', 'часть', 'ракетн', 'гарнизон', 'military', 'army', 'defense', 'мчс', 'спасательная служба', 'пожарная часть'],
  
  // Детские и спортивные площадки
  'playground': ['детская площадка', 'детская', 'игровая площадка', 'детский городок', 'детск', 'площадк', 'песочниц', 'карусел', 'игров', 'playground', 'play area'],
  'sport': ['спортивная площадка', 'корт', 'футбольная площадка', 'спортплощадка', 'стадион'],
  
  // Прочее
  'shopping_mall': ['торгов', 'магазин', 'тц', 'трц', 'молл', 'маркет', 'универмаг', 'mall', 'shopping center'],
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
  closestObject?: NearbyObject | null;
  distanceToClosest?: number | null;
}

// Функция проверки безопасности местоположения с ПРЯМЫМ запросом к API
// Единственная функция для проверки безопасности
// Никаких дополнительных импортов и функций не используется
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
    // Фиксированный радиус 100м
    const radius = 100;
    
    // Формируем один запрос к Overpass API
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"~"school|kindergarten|hospital|clinic|police|fire_station|government|community_centre|nursing_home|prison"](around:${radius},${photo.lat},${photo.lon});
        way["amenity"~"school|kindergarten|hospital|clinic|police|fire_station|government|community_centre|nursing_home|prison"](around:${radius},${photo.lat},${photo.lon});
        relation["amenity"~"school|kindergarten|hospital|clinic|police|fire_station|government|community_centre|nursing_home|prison"](around:${radius},${photo.lat},${photo.lon});
        
        node["building"~"school|kindergarten|hospital|clinic|government|police|fire_station|civic|public"](around:${radius},${photo.lat},${photo.lon});
        way["building"~"school|kindergarten|hospital|clinic|government|police|fire_station|civic|public"](around:${radius},${photo.lat},${photo.lon});
        
        node["military"](around:${radius},${photo.lat},${photo.lon});
        way["military"](around:${radius},${photo.lat},${photo.lon});
        relation["military"](around:${radius},${photo.lat},${photo.lon});
        
        node["security_booth"="yes"](around:${radius},${photo.lat},${photo.lon});
        node["entrance"="emergency"](around:${radius},${photo.lat},${photo.lon});
        
        node["barrier"~"checkpoint|gate"](around:${radius},${photo.lat},${photo.lon});
        way["barrier"~"checkpoint|gate"](around:${radius},${photo.lat},${photo.lon});
      );
      out body;
      >;
      out skel qt;
    `;
    
    console.log(`ЕДИНСТВЕННЫЙ запрос к Overpass API для (${photo.lat}, ${photo.lon})`);
    
    // Выполняем запрос напрямую - БЕЗ ПРОМЕЖУТОЧНЫХ ФУНКЦИЙ
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      throw new Error(`Ошибка Overpass API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Обрабатываем результаты
    const objects: NearbyObject[] = [];
    
    if (data && data.elements) {
      data.elements.forEach((element: any) => {
        // Пропускаем элементы без координат
        if (!element.lat || !element.lon) return;
        
        // Определяем тип объекта
        const types = determineObjectType(element.tags?.name || element.tags?.amenity || element.tags?.building || '');
        
        // Вычисляем расстояние
        const distance = calculateDistanceInMeters(photo.lat!, photo.lon!, element.lat, element.lon);
        
        // Добавляем объект в список
        objects.push({
          id: element.id.toString(),
          name: element.tags?.name || element.tags?.amenity || element.tags?.building || 'Неизвестный объект',
          type: types[0] || 'other',
          distance: distance,
          lat: element.lat,
          lon: element.lon
        });
      });
    }
    
    // Сортируем по расстоянию
    const sortedObjects = objects.sort((a, b) => a.distance - b.distance);
    
    console.log(`РЕЗУЛЬТАТ ПРОВЕРКИ: найдено ${sortedObjects.length} объектов поблизости от координат (${photo.lat}, ${photo.lon})`);
    
    // Проверяем, есть ли объекты в опасной близости
    const unsafeObjects = sortedObjects.filter(obj => !isSafeDistance(obj.distance));
    
    // Находим ближайший объект
    let closestObject = null;
    let distanceToClosest = null;
    
    if (sortedObjects.length > 0) {
      closestObject = sortedObjects[0]; 
      distanceToClosest = closestObject.distance;
    }
    
    // Формируем результат проверки
    const result: SafetyCheckResult = {
      isSafe: unsafeObjects.length === 0,
      restrictedObjects: sortedObjects,
      closestObject,
      distanceToClosest,
      warningMessage: closestObject 
        ? `Ближайший объект: ${closestObject.name} на расстоянии ${closestObject.distance.toFixed(1)}м` 
        : "Объектов рядом не обнаружено"
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

// Функция получения объектов вблизи заданной точки
// Полностью переписана, чтобы не вызывать дополнительные функции,
// которые могут создавать рекурсию
export async function fetchNearbyObjects(lat: number, lon: number, radius: number = 100): Promise<NearbyObject[]> {
  if (!lat || !lon) return [];
  
  try {
    // Формируем запрос к Overpass API
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node(around:${radius},${lat},${lon});
        way(around:${radius},${lat},${lon});
        relation(around:${radius},${lat},${lon});
      );
      out body;
      >;
      out skel qt;
    `;
    
    console.log(`Прямой запрос к Overpass API: координаты (${lat}, ${lon}), радиус ${radius}м`);
    
    // Выполняем запрос напрямую
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      throw new Error(`Ошибка Overpass API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Обрабатываем результаты
    const objects: NearbyObject[] = [];
    
    if (data && data.elements) {
      data.elements.forEach((element: any) => {
        // Пропускаем элементы без координат
        if (!element.lat || !element.lon) return;
        
        // Определяем тип объекта
        const types = determineObjectType(element.tags?.name || element.tags?.amenity || element.tags?.building || '');
        
        // Вычисляем расстояние
        const distance = calculateDistanceInMeters(lat, lon, element.lat, element.lon);
        
        // Добавляем объект в список
        objects.push({
          id: element.id.toString(),
          name: element.tags?.name || element.tags?.amenity || element.tags?.building || 'Объект',
          type: types[0] || 'other',
          distance: distance,
          lat: element.lat,
          lon: element.lon
        });
      });
    }
    
    // Сортируем по расстоянию
    const sortedObjects = objects.sort((a, b) => a.distance - b.distance);
    
    console.log(`Получено ${sortedObjects.length} объектов через прямой API запрос`);
    
    return sortedObjects;
  } catch (error) {
    console.error("Ошибка при прямом получении объектов:", error);
    return [];
  }
}

// Функция обогащения списка объектов информацией о типе
// на основе тегов и названий, с улучшенным определением типа объекта
// Функция-алиас для решения конфликта импортов
export const checkSafetyForPhoto = checkLocationSafety;

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