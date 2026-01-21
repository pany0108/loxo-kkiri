import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

// React 18의 createRoot API를 사용하여 루트 엘리먼트 생성
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

// 앱 렌더링
// React.StrictMode: 개발 모드에서 잠재적인 문제를 감지하기 위한 도구
// BrowserRouter: React Router를 사용하여 클라이언트 사이드 라우팅 활성화
// future={{ v7_startTransition: true, v7_relativeSplatPath: true }}: React Router v7의 새로운 기능을 미리 활성화하여 호환성 확보
root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// --- [모바일 웹앱 최적화] 핀치 줌/더블 탭 줌 강제 차단 코드 ---
// 모바일 브라우저에서 기본적으로 제공하는 확대/축소 제스처를 막아 네이티브 앱과 유사한 경험을 제공합니다.

// 1. 손가락 2개 이상 사용하는 제스처(핀치 줌) 차단
// 터치 시작 시 손가락 개수가 2개 이상이면 이벤트를 취소합니다.
document.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length > 1) {
      e.preventDefault(); // 두 손가락 터치 시 동작 막음
    }
  },
  { passive: false }, // passive: false여야 preventDefault가 작동함 (스크롤 성능 최적화를 위해 기본값은 true일 수 있음)
);

// 2. 터치 이동 중 핀치 줌 동작 차단
// 터치 이동 중에도 손가락 개수가 2개 이상이면 이벤트를 취소합니다.
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  },
  { passive: false },
);

// 3. (iOS Safari용) 제스처 시작 시 줌 차단
// iOS Safari에서 발생하는 제스처 이벤트를 감지하여 확대를 차단합니다.
// TypeScript에서 gesturestart 이벤트를 인식 못 할 수 있으므로 any 타입 처리
document.addEventListener(
  'gesturestart',
  (e: any) => {
    e.preventDefault();
  },
  { passive: false },
);

// 4. 더블 탭 확대 차단 (마지막 터치 시간과 비교)
// 짧은 시간(300ms) 내에 두 번의 터치가 발생하면 더블 탭으로 간주하고 이벤트를 취소합니다.
let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (e) => {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  },
  false,
);

// 웹 바이탈(성능 지표) 측정 함수 호출
// console.log 등을 전달하여 결과를 확인하거나 분석 엔드포인트로 전송 가능
reportWebVitals();
