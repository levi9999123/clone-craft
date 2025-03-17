import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const helpSteps = [
    {
      title: 'Добро пожаловать в Geo Photo Analyzer!',
      content: 'Этот инструмент поможет вам анализировать, визуализировать и проверять геолокацию ваших фотографий. Следуйте этому короткому руководству, чтобы узнать о возможностях приложения.',
      image: null,
    },
    {
      title: 'Загрузка фотографий',
      content: 'Вы можете загрузить фотографии двумя способами: перетаскиванием файлов в боковую панель или по URL. Система автоматически извлечет геоданные из метаданных фотографий, если они есть.',
      image: '/help/upload.png',
    },
    {
      title: 'Просмотр на карте',
      content: 'Загруженные фотографии с геоданными отображаются на карте как маркеры. Нажмите на маркер, чтобы увидеть детали фотографии. Выбранная фотография выделяется оранжевым цветом.',
      image: '/help/map.png',
    },
    {
      title: 'Построение маршрута',
      content: 'Система автоматически строит маршрут между вашими фотографиями в порядке их загрузки. Вы увидите расстояния между точками и общую длину маршрута.',
      image: '/help/route.png',
    },
    {
      title: 'Проверка безопасности',
      content: 'Функция "Проверка объектов" проанализирует местоположение фотографии и определит, находятся ли поблизости запрещенные объекты (школы, детские сады, правительственные здания и т.д.)',
      image: '/help/safety.png',
    },
    {
      title: 'Работа с фотографиями',
      content: 'В боковой панели вы можете управлять загруженными фотографиями - удалять их, просматривать детали или изменять координаты вручную.',
      image: '/help/sidebar.png',
    },
    {
      title: 'Экспорт данных',
      content: 'Используйте функцию экспорта, чтобы сохранить ваш маршрут в форматах GPX, KML или GeoJSON для использования в других приложениях.',
      image: '/help/export.png',
    },
  ];

  const nextStep = () => {
    if (currentStep < helpSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = helpSteps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{step.title}</DialogTitle>
          <DialogDescription className="text-base mt-2">{step.content}</DialogDescription>
        </DialogHeader>
        
        <div className={cn("mt-4", step.image ? "block" : "hidden")}>
          {step.image && (
            <div className="w-full h-64 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center">
              <div className="text-sm text-muted-foreground">
                Здесь будет скриншот для визуальной демонстрации
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Шаг {currentStep + 1} из {helpSteps.length}
        </div>
        
        <DialogFooter className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Назад
          </Button>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Пропустить
            </Button>
            
            <Button
              onClick={nextStep}
            >
              {currentStep < helpSteps.length - 1 ? "Далее" : "Завершить"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}