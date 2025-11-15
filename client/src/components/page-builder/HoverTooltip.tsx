import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Monitor, Tablet, Smartphone } from 'lucide-react';

interface HoverTooltipProps {
  tag: string;
  classNames?: string[];
  dimensions?: { width: number; height: number };
  position: { x: number; y: number };
  visible: boolean;
  computedStyles?: Record<string, string>;
  hasResponsiveOverrides?: boolean;
}

export function HoverTooltip({ 
  tag, 
  classNames = [], 
  dimensions, 
  position, 
  visible,
  computedStyles = {},
  hasResponsiveOverrides = false
}: HoverTooltipProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!visible || !mounted) return null;

  // TODO: Compute styles from node or DOM when available
  const displayType = computedStyles.display || 'block';
  const positionType = computedStyles.position || 'static';
  const layoutType = computedStyles.display === 'flex' ? 'flex' : 
                    computedStyles.display === 'grid' ? 'grid' : null;
  
  const hasWarnings = false; // TODO: Implement warning detection

  const tooltipContent = (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: `${position.x + 12}px`,
        top: `${position.y + 12}px`,
      }}
    >
      <div className="bg-gray-900 text-white text-xs rounded-md shadow-lg px-3 py-2 max-w-xs border border-gray-700">
        {/* Tag Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono font-semibold text-blue-300">
            &lt;{tag}&gt;
          </span>
          {dimensions && (
            <span className="text-gray-400">
              {Math.round(dimensions.width)} × {Math.round(dimensions.height)}
            </span>
          )}
        </div>

        {/* Quick Info */}
        {(hasResponsiveOverrides || displayType !== 'block' || positionType !== 'static' || layoutType) && (
          <div className="space-y-1.5">
            {/* Display Type */}
            {displayType !== 'block' && (
              <div className="flex items-center gap-2 text-[10px] text-gray-300">
                <span className="text-gray-500">display:</span>
                <span className="font-mono text-blue-200">{displayType}</span>
              </div>
            )}
            
            {/* Position if not static */}
            {positionType !== 'static' && (
              <div className="flex items-center gap-2 text-[10px] text-gray-300">
                <span className="text-gray-500">position:</span>
                <span className="font-mono text-yellow-200">{positionType}</span>
              </div>
            )}

            {/* Layout Type */}
            {layoutType && (
              <div className="flex items-center gap-2 text-[10px] text-gray-300">
                <span className="text-gray-500">layout:</span>
                <span className="font-mono text-purple-200">{layoutType}</span>
              </div>
            )}

            {/* Responsive Override Indicator */}
            {hasResponsiveOverrides && (
              <div className="flex items-center gap-2 text-[10px] text-green-400 pt-1 border-t border-gray-700">
                <Monitor className="w-3 h-3" />
                <span>Mobile/Tablet overrides</span>
              </div>
            )}
          </div>
        )}

        {/* Classes */}
        {classNames.length > 0 && (
          <div className="text-gray-300 font-mono text-[10px] mt-2 pt-2 border-t border-gray-700">
            {classNames.slice(0, 3).map((cls, idx) => (
              <div key={idx}>.{cls}</div>
            ))}
            {classNames.length > 3 && (
              <div className="text-gray-500">+{classNames.length - 3} mais</div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
}
