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
  const shouldHideNav =
    hideNavPaths.includes(location.pathname) || ['/schedule/', '/meeting/vote/', '/meeting/response/', '/meeting/report/'].some((path) => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* ================= 계정 및 인증 (Auth) ================= */}
        {/* 로그인 화면 (첫 화면) */}
        <Route path="/" element={<Login />} />
        {/* 회원가입 화면 */}
        <Route path="/signup" element={<Signup />} />
        {/* 비밀번호 변경 화면 */}
        <Route path="/change-password" element={<ChangePassword />} />

        {/* ================= 프로필 및 인맥 (User) ================= */}
        {/* 내 프로필 정보 관리 */}
        <Route path="/profile" element={<MyProfile />} />
        {/* 내 친구 목록 확인 및 관리 */}
        <Route path="/friend-list" element={<FriendList />} />

        {/* ================= 기본 캘린더 기능 (Calendar) ================= */}
        {/* 메인 화면: 월간/주간 캘린더 보기 */}
        <Route path="/calendar" element={<CalendarMain />} />
        {/* 새 공유 캘린더 만들기 (모임용 등) */}
        <Route path="/create-calendar" element={<CreateCalendar />} />
        {/* 보유한 캘린더 목록 및 권한 관리 */}
        <Route path="/calendar-manager" element={<CalendarManager />} />
        {/* 새 일정 등록하기 */}
        <Route path="/add-schedule" element={<AddSchedule />} />
        {/* 일정 상세 정보 확인 및 수정/삭제 */}
        <Route path="/schedule/:id" element={<ScheduleDetail />} />

        {/* ================= 약속 잡기 프로세스 (Meeting Process) ================= */}
        {/* [대시보드] 진행 중인 약속 목록 및 현황 확인 */}
        <Route path="/propose" element={<ProposeMeeting />} />
        {/* [주최자 1단계] 내 캘린더 확인하며 후보 날짜 선택 */}
        <Route path="/propose/create" element={<ProposeMeetingCreate />} />
        {/* [주최자 2단계] 선택한 날짜별 상세 시간대(슬롯) 지정 */}
        <Route path="/propose/detail" element={<ProposeMeetingDetail />} />
        {/* [참여자] 제안받은 시간 중 내 캘린더와 대조하여 가능한 시간 선택 */}
        <Route path="/meeting/response/:id" element={<MeetingResponse />} />
        {/* [공통] 참여자들의 응답이 모인 후 '가능/아마도/불가능' 최종 투표 */}
        <Route path="/meeting/vote/:id" element={<MeetingVoting />} />
        {/* [주최자] 전체 투표 결과 리포트 확인 및 최종 시간 확정 */}
        <Route path="/meeting/report/:id" element={<MeetingReport />} />
      </Routes>

      {!shouldHideNav && <BottomNav />}
    </div>
  );
}

export default App;
