import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImagePreviewModalProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

const ImagePreviewModal = ({ images, initialIndex, onClose }: ImagePreviewModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  // 인덱스 변경 시 스크롤 막기 등 처리 가능
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // --- 스와이프 로직 ---
  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      if (currentIndex < images.length - 1) handleNext();
    }
    if (isRightSwipe) {
      if (currentIndex > 0) handlePrev();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center animate-in fade-in duration-200 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 닫기 버튼 */}
      <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2 z-50" onClick={onClose}>
        <X size={32} />
      </button>

      {/* 이미지 카운터 */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-white/80 font-medium text-[14px] bg-black/30 px-3 py-1 rounded-full backdrop-blur-md">
        {currentIndex + 1} / {images.length}
      </div>

      {/* 네비게이션 화살표 (PC/태블릿용) */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all hidden sm:flex"
        >
          <ChevronLeft size={40} />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all hidden sm:flex"
        >
          <ChevronRight size={40} />
        </button>
      )}

      {/* 메인 이미지 */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <img
          src={images[currentIndex]}
          alt={`Preview ${currentIndex}`}
          className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-300"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

export default ImagePreviewModal;
