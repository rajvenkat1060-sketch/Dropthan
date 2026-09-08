import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Check,
  X,
  Crop,
  Square,
  Circle,
  Grid3X3,
  Maximize2,
  Sparkles,
} from 'lucide-react';

export type AspectRatioType = '1:1' | '4:3' | '16:9' | '3:4' | 'free';
export type CropShapeType = 'circle' | 'square';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  initialAspectRatio?: AspectRatioType;
  allowedAspectRatios?: AspectRatioType[];
  cropShape?: CropShapeType;
  allowShapeToggle?: boolean;
  title?: string;
  subtitle?: string;
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string, croppedFile: File) => void;
  onClose: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  initialAspectRatio = '1:1',
  allowedAspectRatios = ['1:1', '4:3', '16:9', '3:4'],
  cropShape = 'square',
  allowShapeToggle = false,
  title = 'Customize & Crop Image',
  subtitle = 'Drag to reposition, use slider to zoom, and select aspect ratio.',
  onCropComplete,
  onClose,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(initialAspectRatio);
  const [shape, setShape] = useState<CropShapeType>(cropShape);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Reset state when a new image or modal opens
  useEffect(() => {
    if (isOpen) {
      setAspectRatio(initialAspectRatio);
      setShape(cropShape);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(false);
    }
  }, [isOpen, initialAspectRatio, cropShape, imageSrc]);

  // Calculate crop container dimensions based on selected aspect ratio
  const getCropDimensions = useCallback(() => {
    const maxWidth = 380;
    const maxHeight = 340;

    let targetRatio = 1;
    if (aspectRatio === '1:1') targetRatio = 1;
    else if (aspectRatio === '4:3') targetRatio = 4 / 3;
    else if (aspectRatio === '16:9') targetRatio = 16 / 9;
    else if (aspectRatio === '3:4') targetRatio = 3 / 4;

    let width = maxWidth;
    let height = width / targetRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * targetRatio;
    }

    return { width, height, ratio: targetRatio };
  }, [aspectRatio]);

  // Mouse & Touch Dragging Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(0.5, prev + zoomDelta), 3.5));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setAspectRatio(initialAspectRatio);
    setShape(cropShape);
  };

  // Process and export cropped canvas
  const handleApplyCrop = async () => {
    if (!imageRef.current) return;
    setIsProcessing(true);

    try {
      const img = imageRef.current;
      const { width: cropWidth, height: cropHeight } = getCropDimensions();

      // High-resolution output canvas (retina / export scale)
      const exportScale = 2.5; // 2.5x for ultra crisp resolution
      const targetCanvasWidth = Math.round(cropWidth * exportScale);
      const targetCanvasHeight = Math.round(cropHeight * exportScale);

      const canvas = document.createElement('canvas');
      canvas.width = targetCanvasWidth;
      canvas.height = targetCanvasHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Circular clipping path if circle shape is selected
      if (shape === 'circle' && aspectRatio === '1:1') {
        ctx.beginPath();
        ctx.arc(
          targetCanvasWidth / 2,
          targetCanvasHeight / 2,
          targetCanvasWidth / 2,
          0,
          Math.PI * 2
        );
        ctx.closePath();
        ctx.clip();
      }

      // Fill clean background (white for opaque output)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetCanvasWidth, targetCanvasHeight);

      // Save context state for matrix transformations
      ctx.save();

      // Move to center of target canvas
      ctx.translate(targetCanvasWidth / 2, targetCanvasHeight / 2);

      // Apply User Offsets (scaled by exportScale)
      ctx.translate(offset.x * exportScale, offset.y * exportScale);

      // Apply User Rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply User Zoom
      ctx.scale(zoom, zoom);

      // Compute display sizing of the source image relative to the viewport
      // The displayed image size on screen:
      const naturalWidth = img.naturalWidth || 800;
      const naturalHeight = img.naturalHeight || 800;
      const naturalRatio = naturalWidth / naturalHeight;

      let renderWidth = cropWidth;
      let renderHeight = cropHeight;

      if (naturalRatio > cropWidth / cropHeight) {
        renderHeight = cropHeight;
        renderWidth = renderHeight * naturalRatio;
      } else {
        renderWidth = cropWidth;
        renderHeight = renderWidth / naturalRatio;
      }

      // Draw image centered
      const drawWidth = renderWidth * exportScale;
      const drawHeight = renderHeight * exportScale;

      ctx.drawImage(
        img,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      ctx.restore();

      // Convert Canvas to Blob and File
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `dropthan-crop-${Date.now()}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
            onCropComplete(blob, dataUrl, file);
            setIsProcessing(false);
            onClose();
          } else {
            setIsProcessing(false);
          }
        },
        'image/jpeg',
        0.94
      );
    } catch (err) {
      console.error('Failed to crop image:', err);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const { width: cropWidth, height: cropHeight } = getCropDimensions();

  return (
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >
      <div className="bg-white border border-blue-100 rounded-3xl max-w-lg w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0d47a1] flex items-center justify-center shadow-xs">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                {title}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 line-clamp-1">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CROP VIEWPORT CONTAINER */}
        <div className="relative flex-1 bg-slate-950/95 flex items-center justify-center p-4 select-none min-h-[320px] max-h-[420px] overflow-hidden">
          {/* Draggable Active Stage */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onWheel={handleWheel}
            className="relative cursor-grab active:cursor-grabbing overflow-hidden border-2 border-blue-400 shadow-2xl transition-all"
            style={{
              width: `${cropWidth}px`,
              height: `${cropHeight}px`,
              borderRadius: shape === 'circle' && aspectRatio === '1:1' ? '9999px' : '16px',
            }}
          >
            {/* Source Image with Live GPU Transformations */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Source crop"
              crossOrigin="anonymous"
              onLoad={() => setImageLoaded(true)}
              className="absolute max-w-none pointer-events-none transition-transform duration-75"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom}) translateZ(0)`,
                transformOrigin: 'center center',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                willChange: 'transform',
              }}
            />

            {/* Rule-of-Thirds Grid Overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/30"
                style={{
                  borderRadius: shape === 'circle' && aspectRatio === '1:1' ? '9999px' : '14px',
                }}
              >
                <div className="border-r border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-b border-white/20"></div>
                <div className="border-r border-white/20"></div>
                <div className="border-r border-white/20"></div>
                <div></div>
              </div>
            )}
          </div>

          {/* Quick Helper Floating Badges */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white/90 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5 pointer-events-none">
            <Maximize2 className="w-3 h-3 text-blue-400" />
            <span>{aspectRatio} Frame</span>
          </div>

          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white/90 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1 pointer-events-none">
            <span>{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {/* CONTROLS TOOLBAR */}
        <div className="p-4 sm:p-5 space-y-4 bg-white border-t border-slate-100">
          {/* ASPECT RATIO & SHAPE SELECTOR */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Aspect Ratio Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {allowedAspectRatios.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    aspectRatio === ratio
                      ? 'bg-[#0d47a1] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <span>{ratio}</span>
                </button>
              ))}
            </div>

            {/* Shape Toggles & Grid Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {allowShapeToggle && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShape('square');
                    }}
                    title="Square Frame"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      shape === 'square'
                        ? 'bg-[#0d47a1] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShape('circle');
                      setAspectRatio('1:1');
                    }}
                    title="Circle Avatar Frame"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      shape === 'circle'
                        ? 'bg-[#0d47a1] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Circle className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                title={showGrid ? 'Hide Composition Grid' : 'Show Composition Grid'}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  showGrid
                    ? 'bg-blue-100 text-[#0d47a1] font-bold'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-white/80'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                title="Rotate 90° Clockwise"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-lg transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleReset}
                title="Reset All Adjustments"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-lg transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ZOOM SLIDER & STEP BUTTONS */}
          <div className="flex items-center gap-3 bg-blue-50/60 border border-blue-100/80 p-2.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.15))}
              className="p-1.5 text-[#0d47a1] bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-2xs cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#0d47a1] cursor-pointer h-1.5 bg-blue-200 rounded-lg"
              />
            </div>

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3.0, prev + 0.15))}
              className="p-1.5 text-[#0d47a1] bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-2xs cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* FOOTER ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApplyCrop}
              disabled={isProcessing}
              className="px-5 py-2.5 text-xs font-black text-white bg-[#0d47a1] hover:bg-blue-800 active:scale-98 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply & Save Crop</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
