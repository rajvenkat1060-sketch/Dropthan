import React, { useState, useRef } from 'react';
import { getOptimizedImageUrl } from '../utils/image';

interface ImageCarouselProps {
  images?: string[];
  fallbackImg: string;
  alt: string;
  onDoubleTap?: () => void;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  fallbackImg,
  alt,
  onDoubleTap,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const imageList = images && images.length > 0 ? images : [fallbackImg];
  const total = imageList.length;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth > 0) {
      const index = Math.round(scrollLeft / clientWidth);
      if (index !== activeIndex && index >= 0 && index < total) {
        setActiveIndex(index);
      }
    }
  };

  const scrollToImage = (index: number) => {
    if (!scrollRef.current) return;
    const clientWidth = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({
      left: index * clientWidth,
      behavior: 'smooth',
    });
    setActiveIndex(index);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex > 0) {
      scrollToImage(activeIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex < total - 1) {
      scrollToImage(activeIndex + 1);
    }
  };

  const handleImageDoubleClick = () => {
    setShowHeart(true);
    if (onDoubleTap) {
      onDoubleTap();
    }
    setTimeout(() => {
      setShowHeart(false);
    }, 800);
  };

  return (
    <div className="relative group bg-slate-950 overflow-hidden rounded-xl border border-slate-200/80 shadow-xs">
      {/* DOUBLE TAP HEART ANIMATION */}
      {showHeart && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-in zoom-in fade-in duration-200">
          <span className="text-6xl text-rose-500 drop-shadow-lg animate-bounce">
            ❤️
          </span>
        </div>
      )}

      {/* TOP RIGHT PHOTO COUNTER BADGE */}
      {total > 1 && (
        <div className="absolute top-2.5 right-2.5 z-20 bg-slate-900/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-white/20">
          {activeIndex + 1}/{total}
        </div>
      )}

      {/* HORIZONTAL SWIPEABLE CAROUSEL */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onDoubleClick={handleImageDoubleClick}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none aspect-[4/5] sm:aspect-square w-full select-none cursor-pointer"
      >
        {imageList.map((src, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 w-full h-full snap-start relative bg-slate-900 flex items-center justify-center"
          >
            <img
              src={getOptimizedImageUrl(src, 800)}
              alt={`${alt} - photo ${idx + 1}`}
              className="w-full h-full object-cover transition-opacity duration-300"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                // Fallback if image fails to load
                (e.target as HTMLImageElement).src = fallbackImg;
              }}
            />
          </div>
        ))}
      </div>

      {/* DESKTOP PREV / NEXT ARROW BUTTONS */}
      {total > 1 && activeIndex > 0 && (
        <button
          onClick={handlePrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-md backdrop-blur-sm border border-white/20 transition cursor-pointer"
          title="Previous Photo"
        >
          ‹
        </button>
      )}

      {total > 1 && activeIndex < total - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-md backdrop-blur-sm border border-white/20 transition cursor-pointer"
          title="Next Photo"
        >
          ›
        </button>
      )}

      {/* DOTS INDICATOR */}
      {total > 1 && (
        <div className="absolute bottom-2.5 left-0 right-0 z-20 flex items-center justify-center space-x-1.5 pointer-events-auto">
          {imageList.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                scrollToImage(idx);
              }}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                idx === activeIndex
                  ? 'w-2.5 h-2.5 bg-white shadow-md scale-110'
                  : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
              }`}
              title={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

