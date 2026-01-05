// =============================================================================
// 인증 (Authentication)
// =============================================================================
export { default as Login } from './Login'; // 로그인 화면
export { default as Signup } from './Signup'; // 회원가입 화면
export { default as SignupSocial } from './SignupSocial'; // 소셜 로그인 후 추가 정보 입력 화면
export { default as ChangePassword } from './ChangePassword'; // 비밀번호 변경 화면

// =============================================================================
// 메인 캘린더 및 개인 일정 (Core Features)
// =============================================================================
export { default as CalendarMain } from './CalendarMain'; // 메인 캘린더 (월간/주간 뷰)
export { default as AddSchedule } from './AddSchedule'; // 새 일정(개인/공유) 등록 화면
export { default as ScheduleDetail } from './ScheduleDetail'; // 일정 상세 및 삭제 화면
export { default as ScheduleEdit } from './ScheduleEdit'; // 일정 수정 화면

// =============================================================================
// 캘린더 관리 (Calendar Management)
// =============================================================================
export { default as CalendarManager } from './CalendarManager'; // 내 캘린더 목록 확인 및 관리
export { default as CreateCalendar } from './CreateCalendar'; // 새로운 공유 캘린더 생성

// =============================================================================
// 사용자 및 소셜 (User & Social)
// =============================================================================
export { default as MyProfile } from './MyProfile'; // 내 프로필 설정
export { default as EditUserInfo } from './EditUserInfo'; // 개인 정보 수정 화면
export { default as FriendList } from './FriendList'; // 친구 목록 및 관리 (초대 등)
export { default as UserProfile } from './UserProfile'; //

// =============================================================================
// 약속 조율 - 주최자 Flow (Host)
// =============================================================================
export { default as ProposeMeeting } from './ProposeMeeting'; // 약속 제안 대시보드 (진행중인 약속 확인)
export { default as ProposeMeetingCreate } from './ProposeMeetingCreate'; // 약속 생성 1단계: 날짜 선택
export { default as ProposeMeetingDetail } from './ProposeMeetingDetail'; // 약속 생성 2단계: 세부 시간 설정 및 초대 발송
export { default as MeetingHostStatus } from './MeetingHostStatus'; // 주최자 전용 투표 현황판

// =============================================================================
// 약속 조율 - 참여자/공통 Flow (Participant & Common)
// =============================================================================
export { default as MeetingResponse } from './MeetingResponse'; // 초대받은 약속에 내 가능 시간 입력 (Time Table)
export { default as MeetingVoting } from './MeetingVoting'; // 겹치는 시간대에 대한 2차 투표 (가능/아마도/불가능)
export { default as MeetingReport } from './MeetingReport'; // 최종 결과 리포트 확인 및 시간 확정
export { default as MeetingParticipantStatus } from './MeetingParticipantStatus'; // [추가] 참여자용 투표 현황판

// =============================================================================
// 커뮤니케이션 (Communication)
// =============================================================================
export { default as ScheduleChat } from './ScheduleChat'; // 특정 일정/약속에 대한 채팅방
export { default as SharedMediaList } from './SharedMediaList';
export { default as NotificationCenter } from './NotificationCenter'; // 알림 센터
