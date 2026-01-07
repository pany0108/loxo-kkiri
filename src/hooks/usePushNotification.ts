import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { doc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';
import { User } from 'firebase/auth';
import { NavigateFunction } from 'react-router-dom';

/**
 * 푸시 알림 권한 요청, 토큰 관리, 알림 수신 리스너를 설정하는 커스텀 훅입니다.
 * @param {User | null} user - 현재 로그인된 Firebase 사용자 객체
 * @param {NavigateFunction} navigate - react-router-dom의 navigate 함수
 */
export const usePushNotification = (user: User | null, navigate: NavigateFunction) => {
  useEffect(() => {
    // 네이티브 환경이 아니거나, 사용자가 로그인하지 않은 경우 실행하지 않음
    if (!Capacitor.isNativePlatform() || !user) {
      return;
    }

    const setupPushNotifications = async () => {
      try {
        // [FIX] 리스너는 권한 상태와 관계없이 항상 등록되어 있어야 합니다.
        // 사용자가 나중에 프로필 페이지에서 권한을 허용하고 register()를 호출할 때,
        // 이 리스너가 토큰을 받아 처리해야 하기 때문입니다.

        // 1. 기기 등록 성공 시 토큰을 받아오는 리스너
        const registrationListener = await PushNotifications.addListener('registration', async (token: Token) => {
          console.log('내 기기 토큰:', token.value);
          // [추가] 토글 OFF 시 토큰을 삭제하기 위해 로컬 스토리지에 저장합니다.
          localStorage.setItem('fcm_token', token.value);
          try {
            const userRef = doc(db, 'users', user.uid);
            // [FIX] updateDoc은 문서나 필드가 없을 때 실패할 수 있으므로,
            // setDoc과 merge:true 옵션을 사용하여 안전하게 문서를 생성하거나 필드를 추가/업데이트합니다.
            await setDoc(
              userRef,
              {
                fcmTokens: arrayUnion(token.value),
              },
              { merge: true },
            );
            console.log('FCM 토큰이 Firestore에 저장되었습니다.');
          } catch (error) {
            console.error('FCM 토큰 저장 중 오류 발생:', error);
          }
        });

        // 2. 앱이 포그라운드 상태일 때 알림을 수신하는 리스너
        const receivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          console.log('알림 도착 (포그라운드):', notification);
          toast.success(notification.body || '새로운 알림이 도착했습니다.', {
            icon: '🔔',
            duration: 4000,
          });
        });

        // 3. 사용자가 알림을 탭했을 때 실행되는 리스너
        const actionPerformedListener = await PushNotifications.addListener('pushNotificationActionPerformed', async (action: ActionPerformed) => {
          console.log('알림 탭:', action);
          toast('알림을 확인했습니다.', { icon: '👆' });

          const { data } = action.notification;

          // 데이터가 없으면 기본 페이지로 이동
          if (!data?.type || !data?.relatedId) {
            navigate('/calendar');
            return;
          }

          const { type, relatedId } = data;

          try {
            switch (type) {
              case 'FRIEND_REQUEST':
                navigate(`/profile/${relatedId}`);
                break;

              case 'CALENDAR_INVITE':
              case 'CALENDAR_LEAVE':
                navigate('/calendar', { state: { targetCalendarId: relatedId } });
                break;

              case 'SCHEDULE_ADDED':
              case 'SCHEDULE_UPDATED': {
                const scheduleDoc = await getDoc(doc(db, 'schedules', relatedId));
                if (scheduleDoc.exists()) {
                  navigate(`/schedule/${relatedId}`);
                } else {
                  toast.error('삭제된 일정입니다.');
                  navigate('/calendar');
                }
                break;
              }

              case 'MEETING_VOTING_COMPLETE_FOR_HOST':
                navigate(`/meeting/report/${relatedId}`);
                break;

              case 'MEETING_VOTING_COMPLETE_FOR_PARTICIPANT':
                navigate(`/meeting/participant-status/${relatedId}`);
                break;

              default:
                if (type.startsWith('MEETING_')) {
                  const meetingDoc = await getDoc(doc(db, 'meetings', relatedId));
                  if (!meetingDoc.exists()) {
                    toast.error('관련된 약속을 찾을 수 없습니다.');
                    navigate('/propose');
                    return;
                  }
                  const meetingData = meetingDoc.data();
                  const isHost = auth.currentUser?.uid === meetingData.hostId;

                  switch (meetingData.status) {
                    case 'PENDING':
                      navigate(isHost ? `/meeting/status/${relatedId}` : `/meeting/response/${relatedId}`);
                      break;
                    case 'VOTING':
                      navigate(`/meeting/vote/${relatedId}`);
                      break;
                    case 'CONFIRMED':
                      navigate(`/meeting/report/${relatedId}`);
                      break;
                    default:
                      navigate('/propose');
                  }
                } else {
                  // 처리되지 않은 다른 알림 타입은 알림 센터로
                  navigate('/notifications');
                }
            }
          } catch (error) {
            console.error('알림 탭 처리 중 오류 발생:', error);
            toast.error('페이지 이동 중 오류가 발생했습니다.');
            navigate('/calendar'); // 오류 발생 시 기본 페이지로 이동
          }
        });

        // 4. 현재 권한 상태를 확인하고, 이미 'granted' 상태이면 기기를 등록합니다.
        // 'prompt'나 'denied' 상태이면 MyProfile 페이지의 토글을 통해 사용자가 직접 등록을 시작합니다.
        const permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
        } else {
          console.log('푸시 알림 권한이 아직 허용되지 않았습니다. 사용자의 직접적인 설정이 필요합니다.');
        }

        // 리스너 정리 함수 반환
        return () => {
          registrationListener.remove();
          receivedListener.remove();
          actionPerformedListener.remove();
        };
      } catch (error) {
        console.error('푸시 알림 설정 실패:', error);
        return () => {}; // No-op cleanup on error
      }
    };

    const cleanupPromise = setupPushNotifications();

    // 컴포넌트가 언마운트될 때 리스너 정리
    return () => {
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [user, navigate]); // user 객체가 변경될 때(로그인/로그아웃) 이펙트를 다시 실행
};
