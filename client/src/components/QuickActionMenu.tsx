import { useState } from 'react';
import TooltipWrapper from './TooltipWrapper';

interface ActionItem {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  tooltip: string;
}

interface QuickActionMenuProps {
  actions: ActionItem[];
}

export default function QuickActionMenu({ actions }: QuickActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <div className="fixed bottom-6 left-6 z-[1000]">
      {/* Main toggle button */}
      <TooltipWrapper text={isOpen ? "Скрыть меню" : "Показать меню действий"} position="right">
        <button
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{
            backgroundColor: 'var(--primary)',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            boxShadow: '0 4px 12px var(--shadow-strong)',
          }}
          onClick={toggleMenu}
        >
          <i className="fas fa-plus text-xl" style={{ color: 'white' }}></i>
        </button>
      </TooltipWrapper>

      {/* Action buttons */}
      <div className="absolute bottom-0 left-0">
        {actions.map((action, index) => (
          <TooltipWrapper key={action.id} text={action.tooltip} position="right">
            <button
              className="w-12 h-12 rounded-full flex items-center justify-center absolute shadow-lg"
              style={{
                backgroundColor: 'var(--bg)',
                border: '2px solid var(--primary)',
                color: 'var(--text)',
                opacity: isOpen ? 1 : 0,
                transform: isOpen 
                  ? `translateY(${-70 - (index * 60)}px)` 
                  : 'translateY(0)',
                transition: `all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${0.05 * (index + 1)}s`,
                transitionProperty: 'opacity, transform',
                pointerEvents: isOpen ? 'auto' : 'none',
                boxShadow: '0 2px 10px var(--shadow)'
              }}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              aria-label={action.label}
            >
              <i className={`${action.icon} text-lg`}></i>
            </button>
          </TooltipWrapper>
        ))}
      </div>
    </div>
  );
}