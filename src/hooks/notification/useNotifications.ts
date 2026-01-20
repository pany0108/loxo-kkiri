import { useEffect, useState } from 'react';
import { QueryDocumentSnapshot, QuerySnapshot, collection, onSnapshot, query, where } from 'firebase/firestore';

import { Notification } from './useNotificationNavigation';
import { db } from '../../firebase';

/**
 * 사용자의 알림 목록을 실시간으로 구독하는 커스텀 훅
 * @param {any} user - 현재 사용자 객체
 * @returns {Notification[]} 알림 목록 (최신순 정렬)
 */
export const useNotifications = (user: any) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
      const notis = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      notis.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notis);
    });
    return () => unsubscribe();
  }, [user]);

  return notifications;
};
