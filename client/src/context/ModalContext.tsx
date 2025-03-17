import React, { createContext, useContext, useState, ReactNode } from 'react';

// Типы модальных окон в приложении
export type ModalType = 
  | 'photoSelect' 
  | 'photoPreview' 
  | 'urlUpload' 
  | 'coordsInput' 
  | 'help' 
  | 'safety' 
  | 'export' 
  | 'duplicate' 
  | 'nearby'
  | 'routeStats'
  | 'mapSettings';

// Интерфейс для контекста модальных окон
interface ModalContextType {
  // Состояние активности каждого модального окна
  activeModals: Record<ModalType, boolean>;
  // Данные, передаваемые в модальные окна
  modalData: Record<string, any>;
  
  // Открыть модальное окно
  openModal: (type: ModalType, data?: any) => void;
  // Закрыть модальное окно
  closeModal: (type: ModalType) => void;
  // Закрыть все модальные окна
  closeAllModals: () => void;
  
  // Получить данные для модального окна
  getModalData: (type: ModalType) => any;
  // Установить данные для модального окна
  setModalData: (type: ModalType, data: any) => void;
}

// Создание контекста с начальным значением
const ModalContext = createContext<ModalContextType>({
  activeModals: {
    photoSelect: false,
    photoPreview: false,
    urlUpload: false,
    coordsInput: false,
    help: false,
    safety: false,
    export: false,
    duplicate: false,
    nearby: false,
    routeStats: false,
    mapSettings: false
  },
  modalData: {},
  openModal: () => {},
  closeModal: () => {},
  closeAllModals: () => {},
  getModalData: () => undefined,
  setModalData: () => {}
});

// Провайдер контекста модальных окон
export const ModalProvider = ({ children }: { children: ReactNode }) => {
  // Состояние активности модальных окон
  const [activeModals, setActiveModals] = useState<Record<ModalType, boolean>>({
    photoSelect: false,
    photoPreview: false,
    urlUpload: false,
    coordsInput: false,
    help: false,
    safety: false,
    export: false,
    duplicate: false,
    nearby: false,
    routeStats: false,
    mapSettings: false
  });
  
  // Данные для модальных окон
  const [modalData, setModalDataState] = useState<Record<string, any>>({});
  
  // Открытие модального окна
  const openModal = (type: ModalType, data?: any) => {
    // Обновляем состояние активности модальных окон
    setActiveModals(prev => ({ ...prev, [type]: true }));
    
    // Если переданы данные, сохраняем их
    if (data !== undefined) {
      setModalDataState(prev => ({ ...prev, [type]: data }));
    }
    
    // Добавляем класс к body, чтобы предотвратить прокрутку
    document.body.classList.add('modal-open');
  };
  
  // Закрытие модального окна
  const closeModal = (type: ModalType) => {
    setActiveModals(prev => ({ ...prev, [type]: false }));
    
    // Проверяем, есть ли еще активные модальные окна
    const hasActiveModals = Object.values(activeModals).some(Boolean);
    
    // Если нет активных модальных окон, удаляем класс с body
    if (!hasActiveModals) {
      document.body.classList.remove('modal-open');
    }
  };
  
  // Закрытие всех модальных окон
  const closeAllModals = () => {
    // Создаем объект со всеми типами модальных окон и устанавливаем значение false
    const allClosed = Object.keys(activeModals).reduce((acc, key) => {
      acc[key as ModalType] = false;
      return acc;
    }, {} as Record<ModalType, boolean>);
    
    setActiveModals(allClosed);
    
    // Удаляем класс с body
    document.body.classList.remove('modal-open');
  };
  
  // Получение данных для модального окна
  const getModalData = (type: ModalType) => {
    return modalData[type];
  };
  
  // Установка данных для модального окна
  const setModalData = (type: ModalType, data: any) => {
    setModalDataState(prev => ({ ...prev, [type]: data }));
  };
  
  // Значение провайдера
  const value = {
    activeModals,
    modalData,
    openModal,
    closeModal,
    closeAllModals,
    getModalData,
    setModalData
  };
  
  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

// Хук для использования контекста модальных окон
export const useModal = () => {
  const context = useContext(ModalContext);
  
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  
  return context;
};