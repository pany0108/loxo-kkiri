import { useRef, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  threshold?: number;
}

/**
 * 당겨서 새로고침(Pull-to-Refresh) 기능을 구현하는 커스텀 훅
 * - 모바일 터치 이벤트를 감지하여 새로고침 동작을 처리합니다.
 * @param {UsePullToRefreshOptions} options - 옵션 객체
 * @param {function} options.onRefresh - 새로고침 시 실행될 함수
 * @param {boolean} [options.disabled] - 기능 비활성화 여부
 * @param {number} [options.threshold] - 새로고침 트리거 임계값 (기본값: 80)
 * @returns {object} 상태 및 핸들러 객체
 */
export const usePullToRefresh = ({ onRefresh, disabled = false, threshold = 80 }: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef(0);

  /** 터치 시작 핸들러 */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    if (containerRef.current?.scrollTop === 0) {
      touchStart.current = e.touches[0].clientY;
    }
  };

  /** 터치 이동 핸들러 */
  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    if (containerRef.current && containerRef.current.scrollTop > 0) return;
    if (isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStart.current;

    // 아래로 당길 때만 작동 (diff > 0)
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      // 당기는 느낌을 주기 위해 거리를 줄임 (0.4배)
      y.set(diff * 0.4);
    }
  };

  /** 터치 종료 핸들러 */
  const handleTouchEnd = async () => {
    if (disabled) return;
    if (isRefreshing) return;

    if (y.get() > threshold) {
      setIsRefreshing(true);
      // 로딩 위치로 고정
      animate(y, threshold, { type: 'spring', stiffness: 300, damping: 30 });

      await onRefresh();

      setIsRefreshing(false);
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
    } else {
      // 임계값을 넘지 못하면 원래 위치로 복귀
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }
  };

  return {
    isRefreshing,
    y,
    containerRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};
