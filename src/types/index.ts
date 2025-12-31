export interface User {
  id: string;
  nickname: string;
  tag: string; // #1234
  lastPasswordChange: Date;
}

export interface Schedule {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  location?: string;
  content?: string;
  calendarId: string;
  attachments: string[];
  attendees: string[]; // 공유된 친구들
}

// 1. 캘린더 정보
export interface Calendar {
  id: string;
  title: string; // 예: "내 캘린더", "회사 업무", "가족 모임"
  ownerId: string; // 생성자 (소유주)
  isPrimary: boolean; // true면 회원가입 시 생성된 '기본 캘린더'
  members: string[]; // 이 캘린더를 볼 수 있는 사용자 ID 목록 (나 + 공유자들)
}

// 2. 일정(Event) 정보
export interface CalendarEvent {
  id: string;
  calendarId: string; // 이 일정은 어느 캘린더에 속해있는가?
  title: string;
  startDate: Date;
  endDate: Date;
  // ... 기타 상세 정보
}

export interface AppointmentType {
  id: string;
  title: string;
  hostId: string; // 약속을 만든 사람
  members: {
    userId: string;
    name: string;
    status: 'pending' | 'accepted' | 'declined'; // 수락 여부
  }[];
  start: string;
  end: string;
  location: string;
  isConfirmed: boolean; // 약속 최종 확정 여부
}
