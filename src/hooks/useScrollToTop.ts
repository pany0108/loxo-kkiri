import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 페이지 전환 시 스크롤을 최상단으로 초기화하는 훅입니다.
 * @param dependency - 스크롤 초기화를 트리거할 의존성 (기본값: location.pathname)
 * @returns 스크롤 컨테이너에 연결할 ref
 */
export const useScrollToTop = (dependency?: any) => {
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dep = dependency !== undefined ? dependency : location.pathname;

  useLayoutEffect(() => {
    // 브라우저 전체 스크롤 초기화
    window.scrollTo(0, 0);
    // 내부 스크롤 컨테이너 초기화
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [dep]);

  return scrollContainerRef;
};
