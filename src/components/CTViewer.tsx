import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Eye, RefreshCw, Maximize2, Move } from 'lucide-react';
import { resolveImagePreview } from '../utils/sampleImages';

interface CTViewerProps {
  imageUrl: string;
  filename: string;
  onReplace?: () => void;
  className?: string;
}

export const CTViewer: React.FC<CTViewerProps> = ({
  imageUrl,
  filename,
  onReplace,
  className = ''
}) => {
  const [scale, setScale] = useState<number>(1);
  const [isInverted, setIsInverted] = useState<boolean>(false);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(prev => Math.min(Number((prev + 0.25).toFixed(2)), 3.5));
  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.5);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleFit = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsInverted(false);
  };

  // Mouse pan handling when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  // Double click to toggle zoom
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(1.75);
    } else {
      handleFit();
    }
  };

  const resolvedSrc = resolveImagePreview(imageUrl);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#0B1317] rounded-xl overflow-hidden border border-slate-700/60 shadow-inner ${className}`}
    >
      {/* Viewer Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#141E24] border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2 truncate pr-2">
          <span className="font-mono text-slate-300 text-[11px] truncate max-w-[200px]" title={filename}>
            {filename}
          </span>
          <span className="text-[10px] uppercase font-mono text-teal-400 bg-teal-950/80 border border-teal-800/60 px-1.5 py-0.5 rounded">
            Axial CT
          </span>
          {dimensions && (
            <span className="hidden sm:inline text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
              {dimensions.width}×{dimensions.height}
            </span>
          )}
        </div>

        {/* Viewport Controls: Zoom / Fit / Pan / Invert / Replace */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Zoom Out (-25%)"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-slate-300 w-11 text-center select-none tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Zoom In (+25%)"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleFit}
            className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Fit to Window (100%)"
            aria-label="Fit to window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={handleReset}
            className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Reset Zoom & Transform"
            aria-label="Reset zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsInverted(!isInverted)}
            className={`p-1 rounded transition-colors ${
              isInverted ? 'bg-teal-900/60 text-teal-300 border border-teal-600/40' : 'hover:bg-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Invert Hounsfield / Grayscale Window"
            aria-label="Invert grayscale contrast"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {onReplace && (
            <>
              <div className="w-px h-3.5 bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={onReplace}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
                title="Replace with another scan"
              >
                <RefreshCw className="w-3 h-3 text-[#126B67]" />
                <span>Replace</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Viewport Stage */}
      <div
        className={`relative h-80 sm:h-96 w-full flex items-center justify-center overflow-hidden bg-[#070C0E] select-none ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="transition-transform duration-75 ease-out origin-center flex items-center justify-center pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            filter: isInverted ? 'invert(1) hue-rotate(180deg)' : 'none'
          }}
        >
          <img
            src={resolvedSrc}
            alt={`Computed tomography scan slice: ${filename}`}
            onLoad={(e) => {
              const img = e.currentTarget;
              setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            }}
            className="max-h-72 sm:max-h-88 max-w-full object-contain rounded"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Viewport orientation markers (Axial view: Anterior / Posterior / Left / Right) */}
        <div className="absolute top-2.5 text-[11px] font-mono font-bold text-slate-500 pointer-events-none select-none">A</div>
        <div className="absolute bottom-2.5 text-[11px] font-mono font-bold text-slate-500 pointer-events-none select-none">P</div>
        <div className="absolute left-3 text-[11px] font-mono font-bold text-slate-500 pointer-events-none select-none">R</div>
        <div className="absolute right-3 text-[11px] font-mono font-bold text-slate-500 pointer-events-none select-none">L</div>

        {/* Zoom & Pan indicator when zoomed */}
        {scale > 1 && (
          <div className="absolute top-2.5 left-3 bg-[#102E36]/90 border border-slate-700/60 rounded px-2 py-1 text-[10px] font-mono text-teal-300 flex items-center gap-1 pointer-events-none">
            <Move className="w-3 h-3" />
            <span>Drag to pan · Double-click to reset</span>
          </div>
        )}

        {/* Strict Compliance Banner: NO OVERLAYS / RAW SLICE */}
        <div className="absolute bottom-2.5 right-3 text-[9px] font-mono text-slate-500 bg-slate-900/80 px-1.5 py-0.5 rounded pointer-events-none select-none">
          STRICT RAW SLICE · NO HEATMAP OVERLAY
        </div>
      </div>
    </div>
  );
};
