# Super Scheduler (끼리 - Kkiri)

**Super Scheduler(끼리)**는 개인 일정 관리부터 친구들과의 약속 조율, 소통까지 한 번에 해결할 수 있는 올인원 스케줄링 플랫폼입니다.

> 🤖 **이 프로젝트는 Google Gemini의 도움을 받아 제작되었습니다.**

## ✨ 주요 기능

### 📅 스마트 캘린더

- **다양한 뷰 제공**: 월간, 주간, 일간 뷰를 통해 일정을 직관적으로 관리할 수 있습니다.
- **음력 및 공휴일 지원**: 한국 공휴일 및 음력(윤달 포함) 일정을 완벽하게 지원합니다.
- **반복 일정**: 매일, 매주, 매월, 매년 등 복잡한 반복 일정을 손쉽게 설정할 수 있습니다.
- **멀티 캘린더**: 개인용, 업무용, 공유용 등 목적에 따라 여러 캘린더를 생성하고 관리할 수 있습니다.

### 🤝 약속 조율 (Meeting Proposal)

- **간편한 제안**: 친구들을 초대하고 후보 날짜를 선택하여 약속을 제안합니다.
- **투표 시스템**: 참여자들은 가능한 시간을 투표하고, 주최자는 최적의 시간을 확정할 수 있습니다.
- **실시간 현황**: 누가 투표했는지, 어떤 시간이 가장 인기 있는지 실시간으로 확인 가능합니다.

### 💬 소셜 & 채팅

- **친구 관리**: 친구를 추가하고 그룹으로 관리할 수 있습니다.
- **일정별 채팅**: 특정 일정이나 약속 내에서 참여자들과 실시간으로 대화할 수 있습니다.

### 📱 모바일 최적화 (Native Support)

- **Capacitor 기반**: 웹 기술로 개발되었지만 Android 및 iOS 앱으로 빌드하여 네이티브 기능을 활용합니다.
- **푸시 알림**: 약속 초대, 일정 변경, 채팅 알림 등을 실시간 푸시로 받아볼 수 있습니다.
- **제스처 지원**: 스와이프, 당겨서 새로고침 등 모바일 친화적인 UX를 제공합니다.

## 🛠 기술 스택

### Frontend

- **Framework**: React, TypeScript
- **State Management**: React Context API, React Hooks
- **Styling**: Tailwind CSS, Framer Motion (Animation)
- **Calendar**: FullCalendar, Day.js, Lunisolar (음력)
- **Maps**: Google Maps API

### Backend & Infrastructure

- **Platform**: Firebase (Auth, Firestore, Cloud Functions, Storage)
- **Notifications**: FCM (Firebase Cloud Messaging)

### Mobile

- **Framework**: Capacitor
- **Plugins**: Push Notifications, Google Auth, Splash Screen, Status Bar

## 🚀 시작하기

### 필수 조건

- Node.js (v16 이상 권장)
- npm 또는 yarn
- Firebase 프로젝트 설정

### 설치 및 실행

1. **레포지토리 클론**

   ```bash
   git clone https://github.com/your-username/loxo-kkiri.git
   cd loxo-kkiri
   ```

2. **의존성 설치**

   ```bash
   npm install
   ```

3. **환경 변수 설정**
   프로젝트 루트에 `.env` 파일을 생성하고 Firebase 및 Google Maps API 키를 설정해야 합니다.

4. **개발 서버 실행**
   ```bash
   npm start
   ```

### 모바일 빌드 (Android/iOS)

1. **빌드**

   ```bash
   npm run build
   ```

2. **Capacitor 동기화**

   ```bash
   npx cap sync
   ```

3. **네이티브 IDE 열기**
   ```bash
   npx cap open android  # 또는 ios
   ```

## 📝 라이선스

This project is licensed under the MIT License.
You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

### 모바일 빌드 (Android/iOS)

To learn React, check out the [React documentation](https://reactjs.org/).

1. **빌드**

   ```bash
   npm run build
   ```

2. **Capacitor 동기화**

   ```bash
   npx cap sync
   ```

3. **네이티브 IDE 열기**
   ```bash
   npx cap open android  # 또는 ios
   ```

## 📝 라이선스

This project is licensed under the MIT License.
