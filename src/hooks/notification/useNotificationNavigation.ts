import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { auth, db } from '../../firebase';

/** 알림 객체 인터페이스 */
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
  extraData?: any;
}

/**
 * 알림 클릭 시 네비게이션 처리를 담당하는 커스텀 훅
 * - 알림 타입에 따라 적절한 페이지로 이동합니다.
 * @returns {function} 알림 객체를 받아 네비게이션을 수행하는 함수
 */
export const useNotificationNavigation = () => {
  const navigate = useNavigate();

  /**
   * 알림 처리 및 이동 핸들러
   * @param {Notification} notification - 클릭된 알림 객체
   */
  const handleNavigation = async (notification: Notification) => {
    if (!notification.relatedId) return;

    if (notification.type === 'FRIEND_REQUEST') {
      navigate(`/profile/${notification.relatedId}`);
      return;
    }
    if (notification.type === 'CALENDAR_INVITE' || notification.type === 'CALENDAR_LEAVE') {
      navigate('/calendar', { state: { targetCalendarId: notification.relatedId } });
      return;
    }
    if (
      notification.type === 'SCHEDULE_ADDED' ||
      notification.type === 'SCHEDULE_UPDATED' ||
      notification.type === 'SCHEDULE_REMINDER'
    ) {
      try {
        const scheduleDoc = await getDoc(doc(db, 'schedules', notification.relatedId));
        if (scheduleDoc.exists()) {
          // 반복 일정의 특정 인스턴스로 이동할 수 있도록, 알림에 포함된 시작 시간을 state로 전달합니다.
          navigate(`/schedule/${notification.relatedId}`, {
            state: { start: notification.extraData?.start },
          });
        }
        else toast.error('삭제된 일정입니다.');
      } catch (error) {
        toast.error('일정 정보를 불러오는 중 오류가 발생했습니다.');
      }
      return;
    }
    if (notification.type === 'MEETING_VOTING_COMPLETE_FOR_HOST') {
      navigate(`/meeting/report/${notification.relatedId}`);
      return;
    }
    if (notification.type === 'MEETING_VOTING_COMPLETE_FOR_PARTICIPANT') {
      navigate(`/meeting/participant-status/${notification.relatedId}`);
      return;
    }
    if (notification.type.startsWith('MEETING_')) {
      try {
        const meetingDoc = await getDoc(doc(db, 'meetings', notification.relatedId));
        if (!meetingDoc.exists()) {
          toast.error('관련된 약속을 찾을 수 없습니다.');
          return;
        }
        const meetingData = meetingDoc.data();
        const isHost = auth.currentUser?.uid === meetingData.hostId;
        switch (meetingData.status) {
          case 'PENDING':
            navigate(isHost ? `/meeting/status/${notification.relatedId}` : `/meeting/response/${notification.relatedId}`);
            break;
          case 'VOTING':
            navigate(`/meeting/vote/${notification.relatedId}`);
            break;
          case 'CONFIRMED':
            navigate(`/meeting/report/${notification.relatedId}`);
            break;
          default:
            navigate('/propose');
        }
      } catch (error) {
        toast.error('페이지 이동 중 오류가 발생했습니다.');
      }
    }
  };

  return handleNavigation;
};
