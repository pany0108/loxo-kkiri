import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { deleteDoc, doc, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { useFirestoreDoc } from 'hooks/common/useFirestore';
import { notifyMeetingUrge } from 'services';
import { MeetingData } from 'types';
import { auth, db } from '../../firebase';

/** 현황 슬롯 인터페이스 */
export interface StatusSlot {
  id: string;
  date: string;
  time: string;
  counts: { available: number; maybe: number; unavailable: number };
  voters: { available: string[]; maybe: string[]; unavailable: string[] };
  isAllVoted: boolean;
}

/**
 * 주최자용 약속 현황 로직을 처리하는 커스텀 훅
 * - 투표 현황 확인, 재촉 알림 전송, 약속 삭제 기능을 제공합니다.
 */
export const useMeetingHostStatus = () => {
  const { id: meetingId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // 페이지 진입 시 스크롤 초기화
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  /** 뒤로가기 핸들러 */
  const handleBack = useCallback(() => {
    if (location.state?.fromRetry) {
      navigate('/propose', { replace: true });
    } else {
      navigate(-1);
    }
  }, [location.state, navigate]);

  // 하드웨어 뒤로가기 버튼 처리 (모바일)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backButtonListener: PluginListenerHandle;
    const setupListener = async () => {
      backButtonListener = await CapacitorApp.addListener('backButton', () => {
        handleBack();
      });
    };
    setupListener();
    return () => {
      if (backButtonListener) backButtonListener.remove();
    };
  }, [handleBack]);

  // 약속 데이터 실시간 구독
  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  // 응답 현황 데이터 (PENDING 상태일 때)
  const responseStatus = useMemo(() => {
    if (!meetingData || meetingData.status !== 'PENDING') return null;

    const invited = meetingData.invitedFriends || [];
    const responses = meetingData.responses || {};

    const list = invited.map((friend) => ({
      uid: friend.uid,
      name: friend.name,
      hasResponded: !!responses[friend.uid]?.responded,
    }));

    return { list, respondedCount: list.filter((i) => i.hasResponded).length, totalCount: list.length };
  }, [meetingData]);

  // 투표 현황 데이터 (VOTING 상태일 때)
  const statusData: StatusSlot[] = useMemo(() => {
    if (!meetingData || meetingData.status !== 'VOTING') return [];

    const slots: StatusSlot[] = [];
    meetingData.dates.sort().forEach((dateStr) => {
      meetingData.timeSlots[dateStr]?.forEach((ts, index) => {
        const slotId = `${dateStr}_`;
        const votesForSlot = meetingData.votes?.[slotId] || {};
        const voteValues = Object.values(votesForSlot);

        const available = voteValues.filter((v: any) => v.vote === 'available').map((v: any) => v.name);
        const maybe = voteValues.filter((v: any) => v.vote === 'maybe').map((v: any) => v.name);
        const unavailable = voteValues.filter((v: any) => v.vote === 'unavailable').map((v: any) => v.name);

        slots.push({
          id: slotId,
          date: dateStr,
          time: ts.isAllDay ? '종일' : `${ts.start} ~ ${ts.end}`,
          counts: { available: available.length, maybe: maybe.length, unavailable: unavailable.length },
          voters: { available, maybe, unavailable },
          isAllVoted: voteValues.length >= (meetingData.participants?.length || 0),
        });
      });
    });

    return slots.sort((a, b) => b.counts.available - a.counts.available);
  }, [meetingData]);

  /** 재촉 알림 전송 핸들러 */
  const handleUrge = async () => {
    if (!meetingData || !auth.currentUser) return;

    const votedUids = new Set(Object.keys(meetingData.votes?.[`${meetingData.dates[0]}_0`] || {}));
    const unvotedParticipants = meetingData.participants.filter((p) => !votedUids.has(p) && p !== auth.currentUser?.uid);

    if (unvotedParticipants.length === 0) {
      toast('모든 친구들이 투표를 완료했습니다!', { icon: '👍' });
      return;
    }

    try {
      const batch = writeBatch(db);
      for (const uid of unvotedParticipants) {
        await notifyMeetingUrge(batch, {
          participantId: uid,
          urgerName: auth.currentUser?.displayName || '주최자',
          meetingTitle: meetingData.title,
          meetingId: meetingId!,
        });
      }
      await batch.commit();
      toast.success(`${unvotedParticipants.length}명에게 재촉 알림을 보냈습니다.`);
    } catch (error) {
      toast.error('알림 전송 중 오류가 발생했습니다.');
    }
  };

  /** 약속 삭제 핸들러 */
  const handleDeleteMeeting = async () => {
    if (!meetingId || !meetingDocRef) return;

    try {
      await deleteDoc(meetingDocRef);
      toast.success('약속이 성공적으로 삭제되었습니다.');
      navigate('/propose', { replace: true });
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('약속 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  // 모든 참여자 정보 (이름 매핑 포함)
  const allParticipants = useMemo(() => {
    if (!meetingData) return [];
    const participantInfo = new Map<string, string>();
    (meetingData.invitedFriends || []).forEach((friend) => {
      participantInfo.set(friend.uid, friend.name);
    });
    if (meetingData.hostId && meetingData.hostName) {
      participantInfo.set(meetingData.hostId, meetingData.hostName);
    }
    return meetingData.participants.map((uid) => ({ uid, name: participantInfo.get(uid) || '알 수 없음' })).sort((a, b) => a.name.localeCompare(b.name));
  }, [meetingData]);

  return {
    state: {
      meetingData,
      loading,
      responseStatus,
      statusData,
      allParticipants,
      isDeleteModalOpen,
      isShareModalOpen,
      meetingId,
    },
    refs: {
      scrollContainerRef,
    },
    handlers: {
      handleBack,
      handleUrge,
      handleDeleteMeeting,
      setIsDeleteModalOpen,
      setIsShareModalOpen,
    },
  };
};
