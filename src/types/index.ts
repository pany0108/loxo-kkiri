// 1. User & Friend related types
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  lastName?: string;
  firstName?: string;
  phone?: string;
  birthDate?: string;
  birthDateType?: 'solar' | 'lunar';
  isLeapMonth?: boolean;
  statusMessage?: string;
  photoURL?: string;
  friendsList?: Friend[];
  friendGroups?: FriendGroup[];
  fcmTokens?: string[];
  createdAt: string;
  [key: string]: any;
}

export interface Friend {
  uid: string;
  id: string; // For component key compatibility
  name: string;
  email: string;
  statusMessage?: string;
  photoURL?: string;
  group?: string; // Group ID
}

export interface FriendGroup {
  id: string;
  name: string;
}

// 2. Calendar & Schedule related types
export interface CalendarType {
  id: string;
  name: string;
  members: string[];
  isDefault: boolean;
  color: string;
  ownerId?: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  originalId?: string; // For recurring events
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  color: string;
  calendarId: string;
  attendees: string[];
  location?: string;
  content?: string;
  notification?: string;
  recurrence?: RecurrenceSettings;
  userId?: string;
  isLeapMonth?: boolean;
  isLunar?: boolean;
  review?: string;
  reviewImages?: string[];
  files?: Attachment[];
  extendedProps?: any;
}

export interface RecurrenceSettings {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number | '';
  daysOfWeek: number[];
  monthlyType: 'date' | 'nth_day' | 'last_day';
  endType: 'none' | 'date' | 'count';
  endDate: string;
  endCount: number | '';
  exceptions?: string[];
}

export interface Attachment {
  name: string;
  type: 'image' | 'doc';
  url?: string;
}

// 3. Meeting related types
export interface MeetingData {
  id: string;
  title: string;
  description?: string;
  location?: string;
  hostId: string;
  hostName: string;
  participants: string[];
  invitedFriends?: { uid: string; name: string }[];
  dates: string[];
  timeSlots: Record<string, { start: string; end: string; isAllDay: boolean }[]>;
  votes?: Record<string, Record<string, { vote: 'available' | 'maybe' | 'unavailable'; memo: string; name: string }>>;
  responses?: Record<string, any>;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED' | 'CANCELED';
  confirmedSlot?: { date: string; time: string };
  scheduleId?: string;
  createdAt: string;
}

// 4. Notification type
export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
  fromUserId?: string;
  fromUserName?: string;
}
