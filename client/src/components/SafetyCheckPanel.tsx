import { useState, useEffect } from 'react';
import { usePhotoContext } from '@/context/PhotoContext';
import { NearbyObject, isSafeDistance, MINIMUM_SAFE_DISTANCE } from './SafetyCheckService';

interface SafetyCheckPanelProps {
  isOpen: boolean;
  onClose: () => void;
  restrictedObjects: NearbyObject[];
}

export default function SafetyCheckPanel({ 
  isOpen, 
  onClose,
  restrictedObjects
}: SafetyCheckPanelProps) {
  const { selectedPhoto } = usePhotoContext();
  const [sortedObjects, setSortedObjects] = useState<NearbyObject[]>([]);
  
  // Обновление списка объектов при изменении входных данных
  useEffect(() => {
    if (restrictedObjects && restrictedObjects.length > 0) {
      const sorted = [...restrictedObjects].sort((a, b) => a.distance - b.distance);
      setSortedObjects(sorted);
    } else {
      setSortedObjects([]);
    }
  }, [restrictedObjects]);
  
  if (!isOpen) return null;
  
  // Определение общего статуса безопасности
  const hasDangerousObjects = sortedObjects.some(obj => !isSafeDistance(obj.distance));
  const overallStatus = hasDangerousObjects 
    ? 'danger' 
    : sortedObjects.length > 0 
      ? 'warning' 
      : 'safe';
  
  return (
    <div className="absolute top-14 left-3 z-[999] shadow-lg rounded-lg p-4 max-w-md w-full"
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
        <h3 className="text-lg font-bold">Проверка безопасности</h3>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      {selectedPhoto ? (
        <>
          <div className="mb-4 p-3 rounded-lg"
            style={{ 
              backgroundColor: overallStatus === 'danger' 
                ? 'rgba(220, 53, 69, 0.1)' 
                : overallStatus === 'warning' 
                  ? 'rgba(255, 193, 7, 0.1)' 
                  : 'rgba(40, 167, 69, 0.1)',
              borderLeft: `4px solid ${overallStatus === 'danger' 
                ? 'var(--error)' 
                : overallStatus === 'warning' 
                  ? 'var(--accent)' 
                  : 'var(--success)'}`
            }}
          >
            <div className="flex items-center mb-2">
              <i className={`fas fa-${overallStatus === 'danger' 
                ? 'exclamation-triangle' 
                : overallStatus === 'warning' 
                  ? 'exclamation-circle' 
                  : 'check-circle'} mr-2`}
                style={{ 
                  color: overallStatus === 'danger' 
                    ? 'var(--error)' 
                    : overallStatus === 'warning' 
                      ? 'var(--accent)' 
                      : 'var(--success)'
                }}
              ></i>
              <span className="font-semibold">
                {overallStatus === 'danger' 
                  ? 'Обнаружены запрещенные объекты в опасной близости!' 
                  : overallStatus === 'warning' 
                    ? 'Обнаружены объекты на допустимом расстоянии' 
                    : 'Точка проверена, запрещенных объектов не обнаружено'}
              </span>
            </div>
            
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {overallStatus === 'danger' 
                ? `Согласно правилам п.3.17, минимально допустимое расстояние до запрещенных объектов - ${MINIMUM_SAFE_DISTANCE} метров.` 
                : overallStatus === 'warning' 
                  ? `Найдено ${sortedObjects.length} объектов рядом с точкой, но все на безопасном расстоянии.` 
                  : 'Точка удовлетворяет правилам безопасности п.3.17.'}
            </p>
          </div>
          
          {sortedObjects.length > 0 && (
            <div className="mt-3 max-h-[300px] overflow-y-auto pr-1" 
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--border) transparent'
              }}>
              <h4 className="font-semibold mb-2">Объекты поблизости ({sortedObjects.length})</h4>
              
              <div className="space-y-2">
                {sortedObjects.map((obj) => (
                  <div 
                    key={obj.id}
                    className="p-3 rounded-md transition-all"
                    style={{
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 3px var(--shadow)',
                      borderLeft: `4px solid ${isSafeDistance(obj.distance) ? 'var(--success)' : 'var(--error)'}`
                    }}
                  >
                    <div className="flex justify-between">
                      <div className="font-medium">{obj.name}</div>
                      <div className="text-sm font-bold" 
                        style={{ 
                          color: isSafeDistance(obj.distance) ? 'var(--success)' : 'var(--error)' 
                        }}
                      >
                        {obj.distance.toFixed(1)} м
                      </div>
                    </div>
                    
                    <div className="text-xs mt-1 flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                      <div>Тип: {obj.type}</div>
                      <div>
                        {isSafeDistance(obj.distance) 
                          ? <span style={{ color: 'var(--success)' }}>✓ Допустимо</span> 
                          : <span style={{ color: 'var(--error)' }}>✕ Не допустимо</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6" style={{ color: 'var(--text-secondary)' }}>
          <i className="fas fa-map-marker-alt mb-2 text-xl"></i>
          <p>Выберите точку на карте для проверки</p>
        </div>
      )}
    </div>
  );
}