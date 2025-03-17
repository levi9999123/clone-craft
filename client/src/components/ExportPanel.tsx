import React, { useState } from 'react';
import { Photo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
}

export default function ExportPanel({ isOpen, onClose, photos }: ExportPanelProps) {
  const [exportFormat, setExportFormat] = useState<string>('gpx');
  const [includePhotos, setIncludePhotos] = useState<boolean>(false);
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);
  const [fileName, setFileName] = useState<string>('my-route');

  const photosWithCoords = photos.filter(photo => photo.lat !== null && photo.lon !== null);
  const hasExportableData = photosWithCoords.length > 0;

  // Функция для генерации GPX файла
  const generateGPX = (): string => {
    const date = new Date().toISOString();
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Geo Photo Analyzer">
  <metadata>
    <name>${fileName}</name>
    <time>${date}</time>
  </metadata>
  <trk>
    <name>${fileName}</name>
    <trkseg>`;

    // Добавляем точки маршрута
    photosWithCoords.forEach(photo => {
      let photoLink = '';
      if (includePhotos && photo.dataUrl) {
        photoLink = `<link href="${photo.dataUrl}"><text>${photo.name}</text></link>`;
      }
      
      gpx += `
      <trkpt lat="${photo.lat}" lon="${photo.lon}">
        <name>${photo.name}</name>
        ${includeMetadata ? `<time>${date}</time>` : ''}
        ${photoLink}
      </trkpt>`;
    });

    gpx += `
    </trkseg>
  </trk>`;
    
    // Добавляем отдельные точки (waypoints)
    photosWithCoords.forEach(photo => {
      gpx += `
  <wpt lat="${photo.lat}" lon="${photo.lon}">
    <name>${photo.name}</name>
    ${includeMetadata ? `<time>${date}</time>` : ''}
  </wpt>`;
    });
    
    gpx += `
</gpx>`;

    return gpx;
  };

  // Функция для генерации KML файла
  const generateKML = (): string => {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${fileName}</name>
    <Style id="routeStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Style id="waypointStyle">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/blue-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>`;

    // Добавляем линию маршрута
    kml += `
    <Placemark>
      <name>Маршрут</name>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>`;

    photosWithCoords.forEach(photo => {
      kml += `${photo.lon},${photo.lat},0 `;
    });

    kml += `</coordinates>
      </LineString>
    </Placemark>`;

    // Добавляем точки
    photosWithCoords.forEach(photo => {
      kml += `
    <Placemark>
      <name>${photo.name}</name>
      <styleUrl>#waypointStyle</styleUrl>
      <Point>
        <coordinates>${photo.lon},${photo.lat},0</coordinates>
      </Point>`;
      
      if (includeMetadata) {
        kml += `
      <ExtendedData>
        <Data name="id"><value>${photo.id}</value></Data>
      </ExtendedData>`;
      }
      
      kml += `
    </Placemark>`;
    });

    kml += `
  </Document>
</kml>`;

    return kml;
  };

  // Функция для генерации GeoJSON
  const generateGeoJSON = (): string => {
    const features = photosWithCoords.map(photo => {
      const properties: any = {
        name: photo.name,
        id: photo.id
      };
      
      if (includeMetadata) {
        properties.metadata = {
          timestamp: new Date().toISOString()
        };
      }
      
      if (includePhotos && photo.dataUrl) {
        properties.image = photo.dataUrl;
      }

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [photo.lon, photo.lat]
        },
        properties
      };
    });

    // Добавляем линию маршрута
    const routeFeature = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: photosWithCoords.map(photo => [photo.lon || 0, photo.lat || 0])
      },
      properties: {
        name: "Маршрут",
        type: "route"
      }
    };

    features.push(routeFeature);

    const geoJson = {
      type: "FeatureCollection",
      features
    };

    return JSON.stringify(geoJson, null, 2);
  };

  // Функция для создания и скачивания файла
  const exportData = () => {
    if (!hasExportableData) return;

    let content = '';
    let mimeType = '';
    let extension = '';

    // Определяем формат экспорта
    switch (exportFormat) {
      case 'gpx':
        content = generateGPX();
        mimeType = 'application/gpx+xml';
        extension = 'gpx';
        break;
      case 'kml':
        content = generateKML();
        mimeType = 'application/vnd.google-earth.kml+xml';
        extension = 'kml';
        break;
      case 'geojson':
        content = generateGeoJSON();
        mimeType = 'application/geo+json';
        extension = 'geojson';
        break;
      default:
        return;
    }

    // Создаем Blob и URL для скачивания
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    // Создаем элемент ссылки и имитируем клик
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    
    // Чистим ресурсы
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-20 right-3 z-[1000] w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Экспорт маршрута</CardTitle>
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0" 
              onClick={onClose}
            >
              <span className="sr-only">Закрыть</span>
              <i className="fas fa-times"></i>
            </Button>
          </div>
          <CardDescription>
            Экспортируйте ваш маршрут в различных форматах
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="filename">Имя файла</Label>
            <div className="flex">
              <input
                id="filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="format">Формат экспорта</Label>
            <Select
              value={exportFormat}
              onValueChange={setExportFormat}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите формат" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpx">GPX (GPS Exchange Format)</SelectItem>
                <SelectItem value="kml">KML (Google Earth)</SelectItem>
                <SelectItem value="geojson">GeoJSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-2" />

          <div className="space-y-2">
            <Label className="font-medium">Дополнительные настройки</Label>
            
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="includePhotos"
                checked={includePhotos}
                onCheckedChange={(checked) => setIncludePhotos(!!checked)}
              />
              <Label
                htmlFor="includePhotos"
                className="text-sm cursor-pointer"
              >
                Включить ссылки на изображения
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeMetadata"
                checked={includeMetadata}
                onCheckedChange={(checked) => setIncludeMetadata(!!checked)}
              />
              <Label
                htmlFor="includeMetadata"
                className="text-sm cursor-pointer"
              >
                Включить метаданные
              </Label>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              Информация о маршруте:
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Точек: {photosWithCoords.length}
              </Badge>
              {hasExportableData && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Готов к экспорту
                </Badge>
              )}
              {!hasExportableData && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Нет данных для экспорта
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button 
            disabled={!hasExportableData}
            onClick={exportData}
          >
            <i className="fas fa-download mr-2"></i>
            Экспортировать
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}