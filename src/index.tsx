import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
// --- [추가] 모바일 핀치 줌/더블 탭 줌 강제 차단 코드 ---

// 1. 손가락 2개 이상 사용하는 제스처(핀치 줌) 차단
document.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length > 1) {
      e.preventDefault(); // 두 손가락 터치 시 동작 막음
    }
  },
  { passive: false }, // passive: false여야 preventDefault가 작동함
);

// 2. 터치 이동 중 핀치 줌 동작 차단
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
// TypeScript에서 gesturestart 이벤트를 인식 못 할 수 있으므로 any 타입 처리
document.addEventListener(
  'gesturestart',
  (e: any) => {
    e.preventDefault();
  },
  { passive: false },
);

// 4. 더블 탭 확대 차단 (마지막 터치 시간과 비교)
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

reportWebVitals();
