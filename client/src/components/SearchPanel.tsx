import { useState, useEffect } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { Photo } from '@/lib/utils';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const { photos, selectPhoto } = usePhotoContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHasCoords, setFilterHasCoords] = useState(false);
  const [filterNearby, setFilterNearby] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'distance'>('name');
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);

  // Фильтрация и сортировка фотографий
  useEffect(() => {
    let result = [...photos];
    
    // Поиск по названию
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(photo => 
        photo.name.toLowerCase().includes(term)
      );
    }
    
    // Фильтр по координатам
    if (filterHasCoords) {
      result = result.filter(photo => 
        photo.lat !== null && photo.lon !== null
      );
    }
    
    // Сортировка
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'distance' && result.length > 0) {
      // Сортировка по расстоянию (если есть значения расстояния)
      result.sort((a, b) => {
        const distA = a.distance || Number.MAX_SAFE_INTEGER;
        const distB = b.distance || Number.MAX_SAFE_INTEGER;
        return distA - distB;
      });
    }
    
    setFilteredPhotos(result);
  }, [photos, searchTerm, filterHasCoords, filterNearby, sortBy]);

  if (!isOpen) return null;
  
  return (
    <div className="absolute top-14 right-3 z-[999] shadow-lg rounded-lg p-4 max-w-sm w-full"
      style={{
        backdropFilter: 'blur(10px)',
        backgroundColor: 'var(--panel-bg)',
        boxShadow: '0 4px 20px var(--shadow)',
        border: '1px solid var(--border)',
        transform: isOpen ? 'translateY(0)' : 'translateY(-20px)',
        opacity: isOpen ? 1 : 0,
        transition: 'all 0.3s ease'
      }}>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Поиск фотографий</h3>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      {/* Поисковая строка */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pr-10 rounded-md"
            style={{
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              outline: 'none'
            }}
          />
          <i className="fas fa-search absolute right-3 top-1/2 transform -translate-y-1/2" 
             style={{ color: 'var(--text-secondary)' }}></i>
        </div>
      </div>
      
      {/* Фильтры */}
      <div className="mb-4 space-y-2">
        <h4 className="font-semibold mb-1">Фильтры</h4>
        
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={filterHasCoords} 
              onChange={(e) => setFilterHasCoords(e.target.checked)}
              className="sr-only peer"
            />
            <div 
              className="w-5 h-5 rounded border mr-2 flex items-center justify-center transition-colors"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: filterHasCoords ? 'var(--primary)' : 'transparent'
              }}
            >
              {filterHasCoords && <i className="fas fa-check text-xs text-white"></i>}
            </div>
            <span>Только с координатами</span>
          </label>
        </div>
      </div>
      
      {/* Сортировка */}
      <div className="mb-4">
        <h4 className="font-semibold mb-1">Сортировка</h4>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'distance')}
          className="w-full px-3 py-2 rounded-md"
          style={{
            backgroundColor: 'var(--bg)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            outline: 'none'
          }}
        >
          <option value="name">По названию</option>
          <option value="distance">По расстоянию</option>
        </select>
      </div>
      
      {/* Результаты поиска */}
      <div className="mt-3 max-h-[300px] overflow-y-auto pr-1" 
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent'
        }}>
        <h4 className="font-semibold mb-2">Результаты ({filteredPhotos.length})</h4>
        {filteredPhotos.length > 0 ? (
          <div className="space-y-2">
            {filteredPhotos.map((photo) => (
              <div 
                key={photo.id}
                onClick={() => selectPhoto(photo)}
                className="p-2 rounded-md cursor-pointer transition-all flex items-center"
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 1px 3px var(--shadow)'
                }}
              >
                {photo.dataUrl && (
                  <div 
                    className="w-10 h-10 rounded-md mr-3 bg-center bg-cover flex-shrink-0"
                    style={{ backgroundImage: `url(${photo.dataUrl})` }}
                  ></div>
                )}
                
                <div className="flex-grow overflow-hidden">
                  <div className="truncate font-medium">{photo.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {photo.lat !== null && photo.lon !== null
                      ? `${photo.lat.toFixed(4)}, ${photo.lon.toFixed(4)}`
                      : 'Нет координат'}
                  </div>
                </div>
                
                <div 
                  className="w-8 h-8 flex items-center justify-center rounded-full ml-2"
                  style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                >
                  <i className="fas fa-arrow-right text-xs"></i>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>
            <i className="fas fa-search mb-2 text-lg"></i>
            <p>Нет результатов</p>
          </div>
        )}
      </div>
    </div>
  );
}