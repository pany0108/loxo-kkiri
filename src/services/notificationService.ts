import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
// 파일 경로에 따라 '../firebase' 또는 '../../firebase'로 수정이 필요할 수 있습니다.
import { db } from '../firebase';
import { sendPushNotificationToUser } from 'utils';

/**
 * Firestore에 알림 문서를 생성합니다. batch 작업 내에서 사용할 수 있습니다.
 * @param batch - 선택적 Firestore write batch. 제공될 경우 batch에 추가됩니다.
 * @param notificationData - 알림 문서 데이터.
 */
const createFirestoreNotification = async (batch: ReturnType<typeof writeBatch> | null, notificationData: any) => {
  if (batch) {
    const notiRef = doc(collection(db, 'notifications'));
    batch.set(notiRef, notificationData);
  } else {
    await addDoc(collection(db, 'notifications'), notificationData);
  }
};

/**
 * 캘린더 초대를 알립니다.
 */
export const notifyCalendarInvite = async (
  batch: ReturnType<typeof writeBatch>,
  params: { friendUid: string; inviterId: string; inviterName: string; calendarId: string; calendarName: string },
) => {
  const { friendUid, inviterId, inviterName, calendarId, calendarName } = params;

  await createFirestoreNotification(batch, {
    userId: friendUid,
    type: 'CALENDAR_INVITE',
    message: `${inviterName}님께서 '${calendarName}' 캘린더에 당신을 초대했습니다.`,
    fromUserId: inviterId,
    fromUserName: inviterName,
    relatedId: calendarId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: friendUid,
    title: '캘린더 초대',
    body: `${inviterName}님께서 '${calendarName}' 캘린더에 당신을 초대했습니다.`,
    data: {
      type: 'CALENDAR_INVITE',
      relatedId: calendarId,
      url: `/calendar?id=${calendarId}`, // 두 번째 코드의 URL 데이터 통합
    },
  });
};

/**
 * 캘린더 멤버들에게 새 일정을 알립니다.
 */
export const notifyScheduleAdded = async (
  batch: ReturnType<typeof writeBatch>,
  params: { memberId: string; editorName: string; calendarName: string; scheduleTitle: string; scheduleId: string; calendarId: string },
) => {
  const { memberId, editorName, calendarName, scheduleTitle, scheduleId, calendarId } = params;

  await createFirestoreNotification(batch, {
    userId: memberId,
    type: 'SCHEDULE_ADDED',
    message: `'${calendarName}' 캘린더에 '${scheduleTitle}' 일정이 추가되었습니다.`,
    fromUserName: editorName,
    relatedId: scheduleId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: memberId,
    title: '새로운 일정',
    body: `'${calendarName}' 캘린더에 '${scheduleTitle}' 일정이 추가되었습니다.`,
    data: { type: 'SCHEDULE_ADDED', relatedId: scheduleId, calendarId },
  });
};

/**
 * 캘린더 멤버들에게 일정 수정을 알립니다.
 */
export const notifyScheduleUpdated = async (
  batch: ReturnType<typeof writeBatch>,
  params: { memberId: string; editorName: string; calendarName: string; scheduleTitle: string; scheduleId: string; calendarId: string },
) => {
  const { memberId, editorName, calendarName, scheduleTitle, scheduleId, calendarId } = params;

  await createFirestoreNotification(batch, {
    userId: memberId,
    type: 'SCHEDULE_UPDATED',
    message: `${editorName}님이 '${calendarName}' 캘린더의 '${scheduleTitle}' 일정을 수정했습니다.`,
    fromUserName: editorName,
    relatedId: scheduleId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: memberId,
    title: '일정 수정됨',
    body: `${editorName}님이 '${calendarName}' 캘린더의 '${scheduleTitle}' 일정을 수정했습니다.`,
    data: { type: 'SCHEDULE_UPDATED', relatedId: scheduleId, calendarId },
  });
};

/**
 * 캘린더에서 사용자가 나갔음을 남은 멤버들에게 알립니다.
 */
export const notifyCalendarLeave = async (batch: ReturnType<typeof writeBatch>, params: { memberId: string; leaverName: string; calendarName: string; calendarId: string }) => {
  const { memberId, leaverName, calendarName, calendarId } = params;

  await createFirestoreNotification(batch, {
    userId: memberId,
    type: 'CALENDAR_LEAVE',
    message: `${leaverName}님이 '${calendarName}' 캘린더에서 나갔습니다.`,
    relatedId: calendarId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: memberId,
    title: '캘린더에서 나감',
    body: `${leaverName}님이 '${calendarName}' 캘린더에서 나갔습니다.`,
    data: { type: 'CALENDAR_LEAVE', relatedId: calendarId },
  });
};

/**
 * 새로운 약속(Meeting) 초대를 알립니다.
 */
export const notifyMeetingInvite = async (batch: ReturnType<typeof writeBatch>, params: { friendId: string; inviterName: string; meetingTitle: string; meetingId: string }) => {
  const { friendId, inviterName, meetingTitle, meetingId } = params;

  await createFirestoreNotification(batch, {
    userId: friendId,
    type: 'MEETING_INVITE',
    message: `${inviterName}님이 '${meetingTitle}' 약속에 초대했습니다.`,
    relatedId: meetingId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: friendId,
    title: '새로운 약속 제안',
    body: `${inviterName}님이 '${meetingTitle}' 약속에 초대했습니다.`,
    data: { type: 'MEETING_INVITE', relatedId: meetingId },
  });
};

/**
 * 참여자가 약속 제안에 응답했음을 주최자에게 알립니다. (Batch 미사용)
 */
export const notifyMeetingResponse = async (params: { hostId: string; responderName: string; meetingTitle: string; meetingId: string }) => {
  const { hostId, responderName, meetingTitle, meetingId } = params;

  // Batch 작업이 아니므로 null 전달
  await createFirestoreNotification(null, {
    userId: hostId,
    type: 'MEETING_RESPONSE',
    message: `${responderName}님이 '${meetingTitle}' 약속 제안에 응답했습니다.`,
    relatedId: meetingId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: hostId,
    title: '새로운 약속 응답',
    body: `${responderName}님이 '${meetingTitle}' 약속에 응답했습니다.`,
    data: { type: 'MEETING_RESPONSE', relatedId: meetingId },
  });
};

/**
 * 약속 투표가 시작되었음을 참여자들에게 알립니다.
 */
export const notifyMeetingVotingStarted = async (batch: ReturnType<typeof writeBatch>, params: { participantId: string; meetingTitle: string; meetingId: string }) => {
  const { participantId, meetingTitle, meetingId } = params;

  await createFirestoreNotification(batch, {
    userId: participantId,
    type: 'MEETING_VOTING_STARTED',
    message: `'${meetingTitle}' 약속의 시간이 조율되었습니다. 최종 투표를 진행해주세요.`,
    relatedId: meetingId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: participantId,
    title: '투표 시작',
    body: `'${meetingTitle}' 약속의 시간이 조율되었습니다. 최종 투표를 진행해주세요.`,
    data: { type: 'MEETING_VOTING_STARTED', relatedId: meetingId },
  });
};

/**
 * 참여자가 투표했음을 주최자에게 알립니다. (Batch 미사용)
 */
export const notifyMeetingVote = async (params: { hostId: string; voterName: string; meetingTitle: string; meetingId: string }) => {
  const { hostId, voterName, meetingTitle, meetingId } = params;

  await createFirestoreNotification(null, {
    userId: hostId,
    type: 'MEETING_VOTE',
    message: `${voterName}님이 '${meetingTitle}' 약속 투표에 참여했습니다.`,
    relatedId: meetingId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: hostId,
    title: '새로운 약속 투표',
    body: `${voterName}님이 '${meetingTitle}' 약속에 투표했습니다.`,
    data: { type: 'MEETING_VOTE', relatedId: meetingId },
  });
};

/**
 * 투표가 완료되었음을 주최자에게 알립니다.
 */
export const notifyVotingCompleteForHost = async (batch: ReturnType<typeof writeBatch>, params: { hostId: string; meetingTitle: string; meetingId: string }) => {
  const { hostId, meetingTitle, meetingId } = params;

  await createFirestoreNotification(batch, {
    userId: hostId,
    type: 'MEETING_VOTING_COMPLETE_FOR_HOST',
    message: `'${meetingTitle}' 약속의 투표가 완료되었습니다. 최종 시간을 확정해주세요.`,
    relatedId: meetingId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: hostId,
    title: '투표 완료',
    body: `'${meetingTitle}' 약속의 투표가 완료되었습니다. 최종 시간을 확정해주세요.`,
    data: { type: 'MEETING_VOTING_COMPLETE_FOR_HOST', relatedId: meetingId },
  });
};

/**
 * 투표가 완료되었음을 참여자들에게 알립니다.
 */
export const notifyVotingCompleteForParticipant = async (batch: ReturnType<typeof writeBatch>, params: { participantId: string; meetingTitle: string; meetingId: string }) => {
  const { participantId, meetingTitle, meetingId } = params;

  await createFirestoreNotification(batch, {
    userId: participantId,
    type: 'MEETING_VOTING_COMPLETE_FOR_PARTICIPANT',
    message: `'${meetingTitle}' 약속의 투표가 완료되었습니다. 주최자가 약속을 확정하기를 기다리고 있습니다.`,
    relatedId: meetingId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: participantId,
    title: '투표 완료',
    body: `'${meetingTitle}' 약속의 투표가 완료되었습니다. 주최자가 약속을 확정하기를 기다리고 있습니다.`,
    data: { type: 'MEETING_VOTING_COMPLETE_FOR_PARTICIPANT', relatedId: meetingId },
  });
};

/**
 * 약속이 확정되었음을 참여자들에게 알립니다.
 */
export const notifyMeetingConfirmed = async (
  batch: ReturnType<typeof writeBatch>,
  params: { participantId: string; meetingTitle: string; meetingId: string; scheduleId: string },
) => {
  const { participantId, meetingTitle, meetingId, scheduleId } = params;

  await createFirestoreNotification(batch, {
    userId: participantId,
    type: 'MEETING_CONFIRMED',
    message: `'${meetingTitle}' 약속이 확정되었습니다.`,
    relatedId: meetingId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: participantId,
    title: '약속 확정',
    body: `'${meetingTitle}' 약속이 확정되었습니다.`,
    data: { type: 'MEETING_CONFIRMED', relatedId: meetingId, scheduleId },
  });
};

/**
 * 약속이 취소되었음을 참여자들에게 알립니다.
 */
export const notifyMeetingCanceled = async (batch: ReturnType<typeof writeBatch>, params: { participantId: string; meetingTitle: string; meetingId: string }) => {
  const { participantId, meetingTitle, meetingId } = params;

  await createFirestoreNotification(batch, {
    userId: participantId,
    type: 'MEETING_CANCELED',
    message: `'${meetingTitle}' 약속이 주최자에 의해 취소되었습니다.`,
    relatedId: meetingId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: participantId,
    title: '약속 취소',
    body: `'${meetingTitle}' 약속이 주최자에 의해 취소되었습니다.`,
    data: { type: 'MEETING_CANCELED', relatedId: meetingId },
  });
};

/**
 * 투표를 독려(재촉)하는 알림을 보냅니다.
 */
export const notifyMeetingUrge = async (batch: ReturnType<typeof writeBatch>, params: { participantId: string; urgerName: string; meetingTitle: string; meetingId: string }) => {
  const { participantId, urgerName, meetingTitle, meetingId } = params;

  await createFirestoreNotification(batch, {
    userId: participantId,
    type: 'MEETING_URGE',
    message: `${urgerName}님이 '${meetingTitle}' 약속 투표를 기다리고 있어요.`,
    relatedId: meetingId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await sendPushNotificationToUser({
    userId: participantId,
    title: '투표 재촉',
    body: `${urgerName}님이 '${meetingTitle}' 약속 투표를 기다리고 있어요.`,
    data: { type: 'MEETING_URGE', relatedId: meetingId },
  });
};
