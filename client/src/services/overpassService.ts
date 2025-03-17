// ВНИМАНИЕ: ЭТОТ ФАЙЛ УСТАРЕЛ И ОТКЛЮЧЕН!
// ВСЕ ЗАПРОСЫ ДОЛЖНЫ ИДТИ ЧЕРЕЗ SafetyCheckService.tsx

// Импортируем правильные типы и функции из нового сервиса
import { NearbyObject } from '../components/SafetyCheckService';
import { checkSafetyForPhoto } from '../components/SafetyCheckService';

// ЭТОТ WRAPPER ПОЗВОЛЯЕТ ИМПОРТИРОВАТЬ ФУНКЦИИ ИЗ ЭТОГО ФАЙЛА
// БЕЗ ИЗМЕНЕНИЯ ИХ СИГНАТУРЫ

// Функция-обертка для совместимости со старым API
export async function fetchNearbyRestrictedObjects(lat: number, lon: number, radius: number = 100): Promise<NearbyObject[]> {
  console.log("УСТАРЕВШАЯ ФУНКЦИЯ fetchNearbyRestrictedObjects ОТКЛЮЧЕНА!");
  return [];
}

// Функция-обертка для совместимости со старым API, но она перенаправляет в новую функцию
export async function checkLocationSafety(lat: number, lon: number, radius?: number): Promise<NearbyObject[]> {
  console.log("ИСПОЛЬЗУЮ ТОЛЬКО НОВУЮ ВЕРСИЮ checkLocationSafety");
  
  // Создаем объект фото с данными координатами
  const photo = {
    id: 0,
    name: 'Temporary photo',
    lat,
    lon
  };
  
  // Вызываем новую версию функции
  const result = await checkSafetyForPhoto(photo);
  
  // Возвращаем массив объектов для обратной совместимости
  return result.restrictedObjects || [];
}