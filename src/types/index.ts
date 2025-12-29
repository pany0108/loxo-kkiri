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

interface AppointmentType {
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
