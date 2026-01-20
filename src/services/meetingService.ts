import { doc, getDocs, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { User } from 'firebase/auth';
import dayjs from 'dayjs';
import { db, auth } from '../firebase';
import { getDocument, updateDocument } from './firestoreService';
import { notifyMeetingConfirmed, notifyMeetingResponse, notifyMeetingCanceled, notifyMeetingVotingStarted } from './notificationService';
import { findTargetCalendarForMembers } from './calendarService';
import { createScheduleInBatch, ScheduleData } from './scheduleService';

export interface MyNewSlot {
  date: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
}

export interface Meeting {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  description?: string;
  location?: string;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED';
  participants: string[];
  dates: string[];
  timeSlots: Record<string, { start: string; end: string; isAllDay: boolean }[]>;
  votes?: Record<string, Record<string, { vote: 'available' | 'maybe' | 'unavailable'; memo: string; name: string }>>;
  responses?: Record<string, any>;
  confirmedSlot?: { date: string; time: string };
  scheduleId?: string;
  finalTime?: { start: string; end: string };
}

/**
 * 약속 정보와 참여자들의 응답 데이터를 함께 가져옵니다.
 *
 * @param {string} meetingId - 약속 ID
 * @returns {Promise<Meeting & { participantDetails: any[] }>} 약속 정보 및 참여자 상세 정보
 * @throws {Error} 약속 정보를 찾을 수 없을 때 에러 발생
 */
export const getMeetingWithParticipants = async (meetingId: string) => {
  const meeting = await getDocument<Meeting>('meetings', meetingId);
  if (!meeting) {
    throw new Error('약속 정보를 찾을 수 없습니다.');
  }

  const participantsSnapshot = await getDocs(collection(db, 'meetings', meetingId, 'participants'));
  const participantDetails = participantsSnapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

  return { ...meeting, participantDetails };
};

/**
 * 약속 제안에 대한 참여자의 응답을 제출합니다.
 * - 모든 참여자가 응답하면 자동으로 투표 단계(VOTING)로 전환됩니다.
 *
 * @param {string} meetingId - 약속 ID
 * @param {User} user - 응답하는 사용자 객체
 * @param {{ selectedHostSlots: string[]; myNewSlots: MyNewSlot[] }} response - 선택한 시간대 및 새로운 제안 시간대
 * @returns {Promise<{ escalatedToVoting: boolean }>} 투표 단계로 전환되었는지 여부
 */
export const submitMeetingResponse = async (
  meetingId: string,
  user: User,
  response: { selectedHostSlots: string[]; myNewSlots: MyNewSlot[] },
): Promise<{ escalatedToVoting: boolean }> => {
  // 1. Update user's response
  await updateDocument(`meetings`, meetingId, {
    [`responses.${user.uid}`]: {
      responded: true,
      name: user.displayName,
      selectedSlots: response.selectedHostSlots,
      newSlots: response.myNewSlots,
    },
  });

  // 2. Re-fetch and check if all have responded
  const updatedMeeting = await getDocument<Meeting>('meetings', meetingId);
  if (!updatedMeeting) {
    throw new Error('약속 정보를 찾을 수 없습니다.');
  }

  const totalInvited = updatedMeeting.participants.length - 1; // Exclude host
  const respondedCount = Object.keys(updatedMeeting.responses || {}).length;

  // If all invited participants have responded and status is PENDING, escalate to VOTING
  if (respondedCount >= totalInvited && updatedMeeting.status === 'PENDING') {
    const allProposedSlots: { date: string; start: string; end: string; isAllDay: boolean }[] = [];
    const uniqueSlotChecker = new Set<string>();

    // 1. Host's original proposals
    Object.entries(updatedMeeting.timeSlots).forEach(([date, slots]) => {
      (slots as any[]).forEach((slot) => {
        const slotString = `${date}_${slot.start}_${slot.end}_${slot.isAllDay}`;
        if (!uniqueSlotChecker.has(slotString)) {
          allProposedSlots.push({ date, ...slot });
          uniqueSlotChecker.add(slotString);
        }
      });
    });

    // 2. Participants' new proposals
    Object.values(updatedMeeting.responses || {}).forEach((resp: any) => {
      if (resp.newSlots && Array.isArray(resp.newSlots)) {
        resp.newSlots.forEach((newSlot: MyNewSlot) => {
          const slotData = { date: newSlot.date, start: newSlot.startTime, end: newSlot.endTime, isAllDay: newSlot.isAllDay };
          const slotString = `${slotData.date}_${slotData.start}_${slotData.end}_${slotData.isAllDay}`;
          if (!uniqueSlotChecker.has(slotString)) {
            allProposedSlots.push(slotData);
            uniqueSlotChecker.add(slotString);
          }
        });
      }
    });

    // 3. Reconstruct dates and timeSlots
    const newTimeSlots: Record<string, { start: string; end: string; isAllDay: boolean }[]> = {};
    const newDates = new Set<string>();
    allProposedSlots.forEach((slot) => {
      newDates.add(slot.date);
      if (!newTimeSlots[slot.date]) newTimeSlots[slot.date] = [];
      newTimeSlots[slot.date].push({ start: slot.start, end: slot.end, isAllDay: slot.isAllDay });
    });

    // 4. Update meeting to VOTING status
    await updateDocument('meetings', meetingId, { status: 'VOTING', dates: Array.from(newDates).sort(), timeSlots: newTimeSlots });

    // 5. Notify all participants that voting has started
    const batch = writeBatch(db);
    for (const uid of updatedMeeting.participants) {
      await notifyMeetingVotingStarted(batch, { participantId: uid, meetingTitle: updatedMeeting.title, meetingId: meetingId! });
    }
    await batch.commit();

    return { escalatedToVoting: true };
  } else {
    // Just notify the host about the new response
    if (updatedMeeting.hostId !== user.uid) {
      await notifyMeetingResponse({ hostId: updatedMeeting.hostId, responderName: user.displayName || '이름 없음', meetingTitle: updatedMeeting.title, meetingId: meetingId! });
    }
    return { escalatedToVoting: false };
  }
};

/**
 * 약속을 최종 확정합니다.
 * - 확정된 시간으로 일정을 생성하고, 참여자들에게 알림을 전송합니다.
 *
 * @param {string} meetingId - 약속 ID
 * @param {{ date: string; time: string }} selectedSlot - 확정된 날짜 및 시간
 * @returns {Promise<{ scheduleId: string }>} 생성된 일정 ID
 * @throws {Error} 약속 정보나 사용자를 찾을 수 없을 때 에러 발생
 */
export const confirmMeeting = async (meetingId: string, selectedSlot: { date: string; time: string }): Promise<{ scheduleId: string }> => {
  const meeting = await getDocument<Meeting>('meetings', meetingId);
  const user = auth.currentUser;
  if (!meeting || !user) {
    throw new Error('약속 정보를 찾을 수 없습니다.');
  }

  // 1. Find the target calendar using the new service
  const targetCalendar = await findTargetCalendarForMembers(meeting.participants, user.uid);

  if (!targetCalendar) {
    throw new Error('일정을 추가할 캘린더를 찾을 수 없습니다.');
  }

  const [startTime, endTime] = selectedSlot.time.split(' ~ ');
  const isAllDay = selectedSlot.time === '종일';

  const scheduleData: ScheduleData = {
    title: meeting.title,
    content: meeting.description || '',
    location: meeting.location || '',
    calendarId: targetCalendar.id,
    color: targetCalendar.color || '#3b82f6',
    isAllDay: isAllDay,
    start: isAllDay ? dayjs(selectedSlot.date).format('YYYY-MM-DD') : dayjs(`${selectedSlot.date}T${startTime}`).toISOString(),
    end: isAllDay ? null : dayjs(`${selectedSlot.date}T${endTime}`).toISOString(),
    attendees: meeting.participants,
    createdBy: user.uid,
  };

  // 2. Use a batch to perform atomic operations
  const batch = writeBatch(db);

  // 2.1. Create new schedule
  const scheduleRef = createScheduleInBatch(batch, scheduleData);

  // 2.2. Update meeting status
  const meetingRef = doc(db, 'meetings', meetingId);
  batch.update(meetingRef, { status: 'CONFIRMED', confirmedSlot: selectedSlot, scheduleId: scheduleRef.id, updatedAt: serverTimestamp() });

  // 2.3. Prepare notifications for all participants
  for (const uid of meeting.participants) {
    if (uid === user.uid) continue;
    await notifyMeetingConfirmed(batch, { participantId: uid, meetingTitle: meeting.title, meetingId: meetingId, scheduleId: scheduleRef.id });
  }

  // 3. Commit all writes
  await batch.commit();

  return { scheduleId: scheduleRef.id };
};

/**
 * 약속을 취소합니다.
 * - 약속 문서를 삭제하고 참여자들에게 취소 알림을 전송합니다.
 *
 * @param {string} meetingId - 취소할 약속 ID
 * @param {string} meetingTitle - 약속 제목 (알림용)
 * @param {string[]} participants - 참여자 UID 목록
 * @returns {Promise<void>}
 */
export const cancelMeeting = async (meetingId: string, meetingTitle: string, participants: string[]) => {
  const user = auth.currentUser;
  if (!user) throw new Error('인증되지 않은 사용자입니다.');

  const batch = writeBatch(db);

  // 1. Delete the meeting document
  const meetingRef = doc(db, 'meetings', meetingId);
  batch.delete(meetingRef);

  // 2. Notify all other participants
  for (const uid of participants) {
    if (uid === user.uid) continue;
    await notifyMeetingCanceled(batch, { participantId: uid, meetingTitle: meetingTitle, meetingId: meetingId! });
  }

  // 3. Commit the batch
  await batch.commit();
};
