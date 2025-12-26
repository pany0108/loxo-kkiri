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
