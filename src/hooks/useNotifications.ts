import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Notification } from './useNotificationNavigation';

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
