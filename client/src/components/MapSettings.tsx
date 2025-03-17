import { useState, useEffect } from 'react';

// Интерфейс для настройки темы (будем использовать даже без контекста)
interface ThemeProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

interface MapSettingsProps {
  onChangeMapStyle: (style: string) => void;
  onToggleCluster: (enabled: boolean) => void;
  onToggleAnimations: (enabled: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function MapSettings({ 
  onChangeMapStyle, 
  onToggleCluster, 
  onToggleAnimations,
  isOpen,
  onClose
}: MapSettingsProps) {
  const [clustersEnabled, setClustersEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [currentStyle, setCurrentStyle] = useState('streets');
  
  // Состояние темы
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Проверка темы при загрузке компонента
    return document.documentElement.classList.contains('dark-theme');
  });
  
  const mapStyles = [
    { id: 'streets', name: 'Улицы', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
    { id: 'satellite', name: 'Спутник', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    { id: 'topo', name: 'Топография', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
    { id: 'dark', name: 'Темная', url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png' },
    { id: 'watercolor', name: 'Акварель', url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg' },
  ];
  
  const handleMapStyleChange = (styleId: string) => {
    setCurrentStyle(styleId);
    const style = mapStyles.find(s => s.id === styleId);
    if (style) {
      onChangeMapStyle(style.url);
    }
  };
  
  const handleClusterToggle = (enabled: boolean) => {
    setClustersEnabled(enabled);
    onToggleCluster(enabled);
  };
  
  const handleAnimationsToggle = (enabled: boolean) => {
    setAnimationsEnabled(enabled);
    onToggleAnimations(enabled);
  };
  
  // Обработчик переключения темы
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  };
  
  // Проверка состояния темы при монтировании
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark-theme');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark-theme');
    }
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <div className="absolute top-14 right-3 z-[999] shadow-lg rounded-lg p-4 max-w-xs w-full"
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
        <h3 className="text-lg font-bold">Настройки карты</h3>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Стиль карты</h4>
        <div className="grid grid-cols-2 gap-2">
          {mapStyles.map(style => (
            <button 
              key={style.id}
              className="p-2 text-sm rounded-md transition-all flex items-center justify-center"
              style={{
                backgroundColor: currentStyle === style.id 
                  ? 'var(--primary)' 
                  : 'var(--bg)',
                color: currentStyle === style.id 
                  ? 'white' 
                  : 'var(--text)',
                border: `1px solid ${currentStyle === style.id ? 'transparent' : 'var(--border)'}`
              }}
              onClick={() => handleMapStyleChange(style.id)}
            >
              <i className={`fas fa-${
                style.id === 'streets' ? 'road' :
                style.id === 'satellite' ? 'satellite' :
                style.id === 'topo' ? 'mountain' :
                style.id === 'dark' ? 'moon' : 'paint-brush'
              } mr-1`}></i>
              {style.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Кластеризация</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Группировка близких маркеров</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={clustersEnabled}
              onChange={(e) => handleClusterToggle(e.target.checked)}
            />
            <div 
              className="w-11 h-6 rounded-full peer relative" 
              style={{
                backgroundColor: clustersEnabled ? 'var(--primary)' : 'var(--border)',
              }}
            >
              <span 
                className="absolute rounded-full transition-all duration-300" 
                style={{
                  width: '18px',
                  height: '18px',
                  backgroundColor: 'white',
                  top: '3px',
                  left: clustersEnabled ? '22px' : '3px',
                  boxShadow: '0 1px 3px var(--shadow)'
                }}
              ></span>
            </div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Анимации</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Плавный переход между точками</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={animationsEnabled}
              onChange={(e) => handleAnimationsToggle(e.target.checked)}
            />
            <div 
              className="w-11 h-6 rounded-full peer relative" 
              style={{
                backgroundColor: animationsEnabled ? 'var(--primary)' : 'var(--border)',
              }}
            >
              <span 
                className="absolute rounded-full transition-all duration-300" 
                style={{
                  width: '18px',
                  height: '18px',
                  backgroundColor: 'white',
                  top: '3px',
                  left: animationsEnabled ? '22px' : '3px',
                  boxShadow: '0 1px 3px var(--shadow)'
                }}
              ></span>
            </div>
          </label>
        </div>
        
        {/* Переключатель темы */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h4 className="font-semibold">Тема оформления</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {isDarkMode ? 'Темная тема' : 'Светлая тема'}
            </p>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full transition-all" 
            style={{
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            <i className={`fas fa-${isDarkMode ? 'sun' : 'moon'} text-lg`}></i>
          </button>
        </div>
      </div>
    </div>
  );
}