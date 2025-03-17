import { useState, useRef, ReactNode } from 'react';

interface TooltipWrapperProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

export default function TooltipWrapper({ 
  children, 
  text, 
  position = 'top',
  delay = 300
}: TooltipWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  };

  // Определяем позиционирование тултипа в зависимости от параметра position
  const getTooltipStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      padding: '0.5rem 0.75rem',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      fontWeight: 'medium',
      zIndex: 100,
      transition: 'all 0.3s ease',
      opacity: isVisible ? 1 : 0,
      pointerEvents: 'none' as 'none',
      backdropFilter: 'blur(10px)',
      backgroundColor: 'var(--tooltip-bg, rgba(0, 0, 0, 0.8))',
      color: 'var(--tooltip-text, white)',
      boxShadow: '0 2px 6px var(--shadow)',
      whiteSpace: 'nowrap',
      maxWidth: '200px',
      transform: `scale(${isVisible ? 1 : 0.9})`,
      willChange: 'opacity, transform'
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          bottom: 'calc(100% + 5px)',
          left: '50%',
          transform: `translateX(-50%) scale(${isVisible ? 1 : 0.9})`,
          transformOrigin: 'bottom center'
        } as React.CSSProperties;
      case 'right':
        return {
          ...baseStyles,
          left: 'calc(100% + 5px)',
          top: '50%',
          transform: `translateY(-50%) scale(${isVisible ? 1 : 0.9})`,
          transformOrigin: 'center left'
        } as React.CSSProperties;
      case 'bottom':
        return {
          ...baseStyles,
          top: 'calc(100% + 5px)',
          left: '50%',
          transform: `translateX(-50%) scale(${isVisible ? 1 : 0.9})`,
          transformOrigin: 'top center'
        } as React.CSSProperties;
      case 'left':
        return {
          ...baseStyles,
          right: 'calc(100% + 5px)',
          top: '50%',
          transform: `translateY(-50%) scale(${isVisible ? 1 : 0.9})`,
          transformOrigin: 'center right'
        } as React.CSSProperties;
      default:
        return baseStyles;
    }
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div style={getTooltipStyles()}>
        {text}
      </div>
    </div>
  );
}