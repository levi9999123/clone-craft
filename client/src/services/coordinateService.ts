/**
 * Сервис для работы с различными форматами координат
 */

export enum CoordinateFormat {
  DECIMAL = 'decimal',             // 55.123456, -37.123456
  DMS = 'dms',                     // 55° 7' 24.4416" N, 37° 7' 24.4416" W
  DM = 'dm',                       // 55° 7.40736' N, 37° 7.40736' W
  FORMATTED = 'formatted',         // 55.123456 N, 37.123456 W
  PLUS_CODE = 'plus_code',         // 8FXP24QM+9X 
  UTM = 'utm',                     // 37N 377299.244 6110430.477
  MGRS = 'mgrs',                   // 37UDB7729910430
}

/**
 * Проверяет, является ли строка валидными координатами
 */
export function isValidCoordinateString(value: string): boolean {
  if (!value || typeof value !== 'string') return false;

  // Удаляем лишние пробелы
  const trimmed = value.trim();

  // Проверяем основные форматы
  return (
    isDecimalDegrees(trimmed) ||
    isDMS(trimmed) ||
    isDM(trimmed) ||
    isFormattedCoordinate(trimmed) ||
    isPlusCode(trimmed) ||
    isUTM(trimmed) ||
    isMGRS(trimmed)
  );
}

/**
 * Определяет формат координат
 */
export function detectCoordinateFormat(value: string): CoordinateFormat | null {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (isDecimalDegrees(trimmed)) return CoordinateFormat.DECIMAL;
  if (isDMS(trimmed)) return CoordinateFormat.DMS;
  if (isDM(trimmed)) return CoordinateFormat.DM;
  if (isFormattedCoordinate(trimmed)) return CoordinateFormat.FORMATTED;
  if (isPlusCode(trimmed)) return CoordinateFormat.PLUS_CODE;
  if (isUTM(trimmed)) return CoordinateFormat.UTM;
  if (isMGRS(trimmed)) return CoordinateFormat.MGRS;

  return null;
}

/**
 * Преобразует координаты из любого поддерживаемого формата в десятичные градусы
 */
export function parseCoordinates(value: string): { lat: number | null, lon: number | null } {
  if (!value || typeof value !== 'string') return { lat: null, lon: null };

  const format = detectCoordinateFormat(value.trim());
  if (!format) return { lat: null, lon: null };

  switch (format) {
    case CoordinateFormat.DECIMAL:
      return parseDecimalDegrees(value);
    case CoordinateFormat.DMS:
      return parseDMStoDecimal(value);
    case CoordinateFormat.DM:
      return parseDMtoDecimal(value); 
    case CoordinateFormat.FORMATTED:
      return parseFormattedToDecimal(value);
    case CoordinateFormat.PLUS_CODE:
      // Для Plus Code требуется внешняя библиотека, пока возвращаем null
      console.log('Plus code parsing not implemented yet');
      return { lat: null, lon: null };
    case CoordinateFormat.UTM:
      // Для UTM требуется внешняя библиотека, пока возвращаем null
      console.log('UTM parsing not implemented yet');
      return { lat: null, lon: null };
    case CoordinateFormat.MGRS:
      // Для MGRS требуется внешняя библиотека, пока возвращаем null
      console.log('MGRS parsing not implemented yet');
      return { lat: null, lon: null };
    default:
      return { lat: null, lon: null };
  }
}

/**
 * Проверка на десятичные градусы (например, 55.123456, -37.123456 или 55.123456 -37.123456)
 */
function isDecimalDegrees(value: string): boolean {
  // Регулярное выражение для проверки формата десятичных градусов
  // Поддерживает формат с запятой или пробелом
  const regex = /^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/;
  return regex.test(value);
}

/**
 * Парсинг десятичных градусов
 */
function parseDecimalDegrees(value: string): { lat: number | null, lon: number | null } {
  try {
    // Разделяем по запятой или пробелам
    const parts = value.trim().split(/[,\s]+/);
    if (parts.length !== 2) return { lat: null, lon: null };

    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);

    // Проверка на валидный диапазон
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return { lat: null, lon: null };
    }

    return { lat, lon };
  } catch (e) {
    console.error('Error parsing decimal degrees:', e);
    return { lat: null, lon: null };
  }
}

/**
 * Проверка на формат градусы-минуты-секунды (DMS)
 * Например: 55° 7' 24.4416" N, 37° 7' 24.4416" W
 */
function isDMS(value: string): boolean {
  // Регулярное выражение для проверки DMS формата
  const regex = /(\d+)\s*°\s*(\d+)\s*[''′]\s*(\d+(\.\d+)?)\s*["″]\s*([NnSs])[,\s]+(\d+)\s*°\s*(\d+)\s*[''′]\s*(\d+(\.\d+)?)\s*["″]\s*([EeWw])/;
  return regex.test(value);
}

/**
 * Парсинг DMS в десятичные градусы
 */
function parseDMStoDecimal(value: string): { lat: number | null, lon: number | null } {
  try {
    // Регулярное выражение для извлечения компонентов
    const regex = /(\d+)\s*°\s*(\d+)\s*[''′]\s*(\d+(\.\d+)?)\s*["″]\s*([NnSs])[,\s]+(\d+)\s*°\s*(\d+)\s*[''′]\s*(\d+(\.\d+)?)\s*["″]\s*([EeWw])/;
    const match = value.match(regex);

    if (!match) return { lat: null, lon: null };

    // Извлечение компонентов
    const latDeg = parseInt(match[1], 10);
    const latMin = parseInt(match[2], 10);
    const latSec = parseFloat(match[3]);
    const latDir = match[5].toUpperCase();

    const lonDeg = parseInt(match[6], 10);
    const lonMin = parseInt(match[7], 10);
    const lonSec = parseFloat(match[8]);
    const lonDir = match[10].toUpperCase();

    // Конвертация в десятичные градусы
    let lat = latDeg + (latMin / 60) + (latSec / 3600);
    let lon = lonDeg + (lonMin / 60) + (lonSec / 3600);

    // Применение направления
    if (latDir === 'S') lat = -lat;
    if (lonDir === 'W') lon = -lon;

    // Проверка на валидный диапазон
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return { lat: null, lon: null };
    }

    return { lat, lon };
  } catch (e) {
    console.error('Error parsing DMS:', e);
    return { lat: null, lon: null };
  }
}

/**
 * Проверка на формат градусы-минуты (DM)
 * Например: 55° 7.40736' N, 37° 7.40736' W
 */
function isDM(value: string): boolean {
  // Регулярное выражение для проверки DM формата
  const regex = /(\d+)\s*°\s*(\d+(\.\d+)?)\s*[''′]\s*([NnSs])[,\s]+(\d+)\s*°\s*(\d+(\.\d+)?)\s*[''′]\s*([EeWw])/;
  return regex.test(value);
}

/**
 * Парсинг DM в десятичные градусы
 */
function parseDMtoDecimal(value: string): { lat: number | null, lon: number | null } {
  try {
    // Регулярное выражение для извлечения компонентов
    const regex = /(\d+)\s*°\s*(\d+(\.\d+)?)\s*[''′]\s*([NnSs])[,\s]+(\d+)\s*°\s*(\d+(\.\d+)?)\s*[''′]\s*([EeWw])/;
    const match = value.match(regex);

    if (!match) return { lat: null, lon: null };

    // Извлечение компонентов
    const latDeg = parseInt(match[1], 10);
    const latMin = parseFloat(match[2]);
    const latDir = match[4].toUpperCase();

    const lonDeg = parseInt(match[5], 10);
    const lonMin = parseFloat(match[6]);
    const lonDir = match[8].toUpperCase();

    // Конвертация в десятичные градусы
    let lat = latDeg + (latMin / 60);
    let lon = lonDeg + (lonMin / 60);

    // Применение направления
    if (latDir === 'S') lat = -lat;
    if (lonDir === 'W') lon = -lon;

    // Проверка на валидный диапазон
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return { lat: null, lon: null };
    }

    return { lat, lon };
  } catch (e) {
    console.error('Error parsing DM:', e);
    return { lat: null, lon: null };
  }
}

/**
 * Проверка на форматированные координаты 
 * Например: 55.123456 N, 37.123456 E
 */
function isFormattedCoordinate(value: string): boolean {
  // Регулярное выражение для проверки форматированных координат
  const regex = /(\d+(\.\d+)?)\s*([NnSs])[,\s]+(\d+(\.\d+)?)\s*([EeWw])/;
  return regex.test(value);
}

/**
 * Парсинг форматированных координат в десятичные градусы
 */
function parseFormattedToDecimal(value: string): { lat: number | null, lon: number | null } {
  try {
    // Регулярное выражение для извлечения компонентов
    const regex = /(\d+(\.\d+)?)\s*([NnSs])[,\s]+(\d+(\.\d+)?)\s*([EeWw])/;
    const match = value.match(regex);

    if (!match) return { lat: null, lon: null };

    // Извлечение компонентов
    let lat = parseFloat(match[1]);
    const latDir = match[3].toUpperCase();

    let lon = parseFloat(match[4]);
    const lonDir = match[6].toUpperCase();

    // Применение направления
    if (latDir === 'S') lat = -lat;
    if (lonDir === 'W') lon = -lon;

    // Проверка на валидный диапазон
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return { lat: null, lon: null };
    }

    return { lat, lon };
  } catch (e) {
    console.error('Error parsing formatted coordinates:', e);
    return { lat: null, lon: null };
  }
}

/**
 * Проверка на формат Plus Code (Open Location Code)
 * Например: 8FXP24QM+9X
 */
function isPlusCode(value: string): boolean {
  // Базовая проверка на Plus Code (не идеальная)
  const regex = /^[23456789CFGHJMPQRVWX]{2,8}[+][23456789CFGHJMPQRVWX]{2}$/;
  return regex.test(value.trim());
}

/**
 * Проверка на формат UTM 
 * Например: 37N 377299.244 6110430.477
 */
function isUTM(value: string): boolean {
  // Базовая проверка на UTM
  const regex = /^\d{1,2}[CDEFGHJKLMNPQRSTUVWXYZ]\s+\d+(\.\d+)?\s+\d+(\.\d+)?$/;
  return regex.test(value.trim());
}

/**
 * Проверка на формат MGRS
 * Например: 37UDB7729910430
 */
function isMGRS(value: string): boolean {
  // Базовая проверка на MGRS
  const regex = /^\d{1,2}[CDEFGHJKLMNPQRSTUVWXZ][A-Z]{2}\d{1,5}\d{1,5}$/;
  return regex.test(value.trim());
}

/**
 * Форматирует десятичные координаты в заданный формат
 */
export function formatCoordinates(lat: number | null, lon: number | null, format: CoordinateFormat = CoordinateFormat.DECIMAL): string {
  if (lat === null || lon === null) return '';

  switch (format) {
    case CoordinateFormat.DECIMAL:
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    case CoordinateFormat.DMS:
      return formatToDMS(lat, lon);
    case CoordinateFormat.DM:
      return formatToDM(lat, lon);
    case CoordinateFormat.FORMATTED:
      return formatToFormatted(lat, lon);
    default:
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
}

/**
 * Форматирует в градусы-минуты-секунды
 */
function formatToDMS(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';

  // Делаем координаты положительными для вычислений
  lat = Math.abs(lat);
  lon = Math.abs(lon);

  // Вычисляем градусы, минуты и секунды для широты
  const latDeg = Math.floor(lat);
  const latMinTotal = (lat - latDeg) * 60;
  const latMin = Math.floor(latMinTotal);
  const latSec = (latMinTotal - latMin) * 60;

  // Вычисляем градусы, минуты и секунды для долготы
  const lonDeg = Math.floor(lon);
  const lonMinTotal = (lon - lonDeg) * 60;
  const lonMin = Math.floor(lonMinTotal);
  const lonSec = (lonMinTotal - lonMin) * 60;

  return `${latDeg}° ${latMin}' ${latSec.toFixed(4)}" ${latDir}, ${lonDeg}° ${lonMin}' ${lonSec.toFixed(4)}" ${lonDir}`;
}

/**
 * Форматирует в градусы-минуты
 */
function formatToDM(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';

  // Делаем координаты положительными для вычислений
  lat = Math.abs(lat);
  lon = Math.abs(lon);

  // Вычисляем градусы и минуты для широты
  const latDeg = Math.floor(lat);
  const latMin = (lat - latDeg) * 60;

  // Вычисляем градусы и минуты для долготы
  const lonDeg = Math.floor(lon);
  const lonMin = (lon - lonDeg) * 60;

  return `${latDeg}° ${latMin.toFixed(5)}' ${latDir}, ${lonDeg}° ${lonMin.toFixed(5)}' ${lonDir}`;
}

/**
 * Форматирует в формат с направлением
 */
function formatToFormatted(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';

  // Делаем координаты положительными для вывода
  lat = Math.abs(lat);
  lon = Math.abs(lon);

  return `${lat.toFixed(6)} ${latDir}, ${lon.toFixed(6)} ${lonDir}`;
}