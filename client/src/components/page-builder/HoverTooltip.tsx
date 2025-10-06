import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface HoverTooltipProps {
  tag: string;
  classNames?: string[];
  dimensions?: { width: number; height: number };
  position: { x: number; y: number };
  visible: boolean;
}

export function HoverTooltip({ 
  tag, 
  classNames = [], 
  dimensions, 
  position, 
  visible 
}: HoverTooltipProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!visible || !mounted) return null;

  const tooltipContent = (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: `${position.x + 12}px`,
        top: `${position.y + 12}px`,
      }}
    >
      <div className="bg-gray-900 text-white text-xs rounded-md shadow-lg px-3 py-2 max-w-xs">
        {/* Tag Badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono font-semibold text-blue-300">
            &lt;{tag}&gt;
          </span>
          {dimensions && (
            <span className="text-gray-400">
              {Math.round(dimensions.width)} × {Math.round(dimensions.height)}
            </span>
          )}
        </div>

        {/* Classes */}
        {classNames.length > 0 && (
          <div className="text-gray-300 font-mono text-[10px] mt-1">
            .{classNames.slice(0, 3).join(' .')}
            {classNames.length > 3 && ` +${classNames.length - 3}`}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
}
