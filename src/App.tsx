import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import {
  Login,
  Signup,
  CalendarMain,
  AddSchedule,
  ProposeMeetingDetail,
  CalendarManager,
  CreateCalendar,
  MyProfile,
  FriendList,
  ChangePassword,
  ScheduleDetail,
  ProposeMeeting,
  MeetingResponse,
  MeetingVoting,
  MeetingReport,
  ProposeMeetingCreate,
  ScheduleChat,
} from './pages';

function App() {
  const location = useLocation();

  const hideNavPaths = [
    '/',
    '/signup',
    '/login',
    '/propose-detail',
    '/change-password',
    '/create-calendar',
    '/add-schedule',
    '/add-calendar',
    '/propose/detail',
    '/propose/create',
  ];
  const shouldHideNav = hideNavPaths.includes(location.pathname) || ['/schedule/', '/meeting/', '/chat/'].some((path) => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* =================================================================
              1. 계정 및 인증 (Authentication)
              - 앱 진입 및 사용자 신원 확인
          ================================================================= */}
        {/* 로그인 화면 (앱 실행 시 첫 화면) */}
        <Route path="/" element={<Login />} />
        {/* 회원가입 화면 */}
        <Route path="/signup" element={<Signup />} />
        {/* 비밀번호 변경 화면 */}
        <Route path="/change-password" element={<ChangePassword />} />

        {/* =================================================================
              2. 사용자 및 소셜 (User & Social)
              - 내 정보 관리 및 친구 관리
          ================================================================= */}
        {/* 내 프로필 정보 확인 및 수정 */}
        <Route path="/profile" element={<MyProfile />} />
        {/* 친구 목록 확인, 검색 및 관리 */}
        <Route path="/friend-list" element={<FriendList />} />

        {/* =================================================================
              3. 캘린더 핵심 기능 (Core Calendar Features)
              - 일정 관리의 중심이 되는 화면들
          ================================================================= */}
        {/* 메인 화면: 월간/주간 캘린더 뷰 및 일정 확인 */}
        <Route path="/calendar" element={<CalendarMain />} />
        {/* 캘린더 관리: 내가 참여 중인 캘린더 목록 및 설정 */}
        <Route path="/calendar-manager" element={<CalendarManager />} />
        {/* 캘린더 생성: 새로운 공유(또는 개인) 캘린더 만들기 */}
        <Route path="/create-calendar" element={<CreateCalendar />} />
        {/* 일정 등록: 날짜, 시간, 장소 등을 입력하여 새 일정 추가 */}
        <Route path="/add-schedule" element={<AddSchedule />} />
        {/* 일정 상세: 특정 일정의 상세 정보 확인, 수정, 삭제 */}
        <Route path="/schedule/:id" element={<ScheduleDetail />} />

        {/* =================================================================
              4. 약속 잡기 프로세스 (Meeting Coordination)
              - 주최자가 제안하고 참여자가 응답하는 플로우
          ================================================================= */}
        {/* [대시보드] 현재 진행 중이거나 확정된 약속 현황 목록 */}
        <Route path="/propose" element={<ProposeMeeting />} />
        {/* [주최자 Step 1] 약속 생성 시작: 제목 설정 및 후보 날짜 선택 */}
        <Route path="/propose/create" element={<ProposeMeetingCreate />} />
        {/* [주최자 Step 2] 상세 설정: 날짜별 후보 시간대(Slot) 지정 및 초대 발송 */}
        <Route path="/propose/detail" element={<ProposeMeetingDetail />} />
        {/* [참여자] 시간 응답: 주최자의 제안에 맞춰 내 캘린더를 보고 가능 시간 선택 */}
        <Route path="/meeting/response/:id" element={<MeetingResponse />} />
        {/* [공통/참여자] 2차 투표: 겹치는 시간대에 대해 구체적인 가능 여부(O/△/X) 투표 */}
        <Route path="/meeting/vote/:id" element={<MeetingVoting />} />
        {/* [주최자/공통] 최종 리포트: 투표 결과 확인 및 최종 약속 시간 확정 */}
        <Route path="/meeting/report/:id" element={<MeetingReport />} />

        {/* =================================================================
              5. 커뮤니케이션 (Communication)
              - 일정 관련 소통
          ================================================================= */}
        {/* 일정별 채팅방: 특정 일정(약속)에 참여 중인 멤버들과 대화 */}
        <Route path="/chat/:id" element={<ScheduleChat />} />
      </Routes>

      {!shouldHideNav && <BottomNav />}
    </div>
  );
}

export default App;
