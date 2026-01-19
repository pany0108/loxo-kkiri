import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { Send, MoreVertical, Calendar, Image as ImageIcon, LogOut, Copy, Trash2, Reply, X, Users } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, writeBatch, arrayUnion, updateDoc, increment, deleteDoc, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { PageLayout, PageFooter, LoadingButton, ScheduleDetailModal, ConfirmModal } from 'components';
import toast from 'react-hot-toast';
import { sendPushNotificationToUser } from 'utils';
import { useUserProfiles } from 'hooks';

dayjs.locale('ko');

/**
 * 채팅 메시지 데이터 인터페이스
 * @property {string} id - 메시지 고유 식별자
 * @property {'text' | 'system'} type - 메시지 유형 (일반 텍스트 / 시스템 알림)
 * @property {string} text - 메시지 내용
 * @property {string} sender - 보낸 사람 이름
 * @property {string} timestamp - 전송 시간 문자열
 * @property {Date} createdAt - 전송 시간 Date 객체 (날짜 비교용)
 * @property {boolean} isMe - 본인이 보낸 메시지 여부 (UI 배치 결정)
 * @property {string} [profileImg] - 프로필 이미지 스타일 클래스 (선택적)
 * @property {string[]} readBy - 메시지를 읽은 사용자 ID 목록
 */
interface Message {
  id: string;
  type: 'text' | 'system';
  text: string;
  sender: string;
  timestamp: string;
  createdAt: Date;
  isMe: boolean;
  profileImg?: string;
  readBy: string[];
  isDeleted?: boolean;
  replyTo?: {
    id: string;
    text: string;
    sender: string;
  };
}

/**
 * 일정별 상세 채팅방 컴포넌트입니다.
 * - 참여자 간의 실시간 대화 및 일정 변경 이력(시스템 메시지)을 표시합니다.
 * - 새 메시지 입력 시 자동으로 스크롤을 최하단으로 이동시킵니다.
 * * @returns {JSX.Element} 채팅방 화면
 */
const ScheduleChat = () => {
  const navigate = useNavigate();
  // URL 파라미터에서 현재 일정 ID를 가져옵니다 (추후 API 연동 시 사용)
  const { id } = useParams();
  const location = useLocation();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤을 위한 메시지 리스트 하단 참조 Ref
  /**
   * 페이지가 로드될 때 스크롤을 최상단으로 이동시킵니다.
   */
  useLayoutEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * 채팅 메시지 목록 상태
   *
   * 실제 구현 시에는 WebSocket 또는 Firestore onSnapshot을 통해 실시간 데이터를 수신해야 합니다.
   */
  const [messages, setMessages] = useState<Message[]>([]);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [participantCount, setParticipantCount] = useState(0);
  const [participants, setParticipants] = useState<string[]>([]);
  const [scheduleData, setScheduleData] = useState<any>(null); // [추가] 일정 상세 데이터
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // [추가] 상세 모달 상태
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null); // [추가] 답장 상태
  const [isSending, setIsSending] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isInitialLoad = useRef(true);
  const prevMessagesLength = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // [추가] 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; message: Message | null }>({
    isOpen: false,
    x: 0,
    y: 0,
    message: null,
  });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const { profiles } = useUserProfiles(participants);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // [추가] 채팅방 입장 시 내 읽지 않은 메시지 수 0으로 초기화
  useEffect(() => {
    if (id && auth.currentUser) {
      updateDoc(doc(db, 'schedules', id), {
        [`unreadCounts.${auth.currentUser.uid}`]: 0,
      }).catch((err) => console.error('Error resetting unread count:', err));
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    // 일정 정보 실시간 구독 (제목, 참여자 수 변경 대응)
    const scheduleUnsubscribe = onSnapshot(doc(db, 'schedules', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setScheduleData(data); // [추가] 전체 데이터 저장
        setScheduleTitle(data.title || '일정 채팅');
        setParticipantCount(data.attendees ? data.attendees.length : 0);
        setParticipants(data.attendees || []);
      }
    });

    // 실시간 채팅 구독
    const q = query(collection(db, 'schedules', id, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || 'text',
          text: data.text,
          sender: data.senderName || '알 수 없음',
          timestamp: data.createdAt ? dayjs(data.createdAt.toDate()).format('A h:mm').replace('AM', '오전').replace('PM', '오후') : '',
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          isMe: auth.currentUser?.uid === data.senderId,
          profileImg: data.photoURL,
          readBy: data.readBy || [],
          isDeleted: data.isDeleted || false,
          replyTo: data.replyTo || null,
        } as Message;
      });
      setMessages(newMessages);

      // 읽음 처리 로직: 내가 읽지 않은 메시지(상대방이 보냄 + readBy에 내가 없음)를 찾아 업데이트
      if (auth.currentUser) {
        const unreadDocs = snapshot.docs.filter((doc) => {
          const data = doc.data();
          return data.type !== 'system' && data.senderId !== auth.currentUser?.uid && !data.readBy?.includes(auth.currentUser?.uid);
        });

        if (unreadDocs.length > 0) {
          const batch = writeBatch(db);
          unreadDocs.forEach((d) => {
            batch.update(d.ref, { readBy: arrayUnion(auth.currentUser?.uid) });
          });
          // [추가] 메시지 읽음 처리 시 내 뱃지 카운트도 0으로 초기화 (배치에 포함)
          batch.update(doc(db, 'schedules', id), {
            [`unreadCounts.${auth.currentUser?.uid}`]: 0,
          });
          batch.commit().catch((err) => console.error('Error marking messages as read:', err));
        }
      }
    });

    return () => {
      scheduleUnsubscribe();
      unsubscribe();
    };
  }, [id]);

  /**
   * 채팅창 스크롤을 최하단으로 이동시키는 함수
   */
  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * 메시지 목록 업데이트 시 스크롤 처리
   * - 초기 진입: 안 읽은 메시지가 있으면 거기로, 없으면 바닥으로
   * - 이후: 메시지가 추가된 경우에만 바닥으로 (읽음 처리 등 업데이트 시 스크롤 유지)
   */
  useEffect(() => {
    if (messages.length === 0) return;

    if (isInitialLoad.current) {
      const firstUnreadMsg = messages.find((m) => !m.isMe && m.readBy && !m.readBy.includes(auth.currentUser?.uid || ''));
      if (firstUnreadMsg) {
        const el = document.getElementById(`msg-${firstUnreadMsg.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        scrollToBottom();
      }
      isInitialLoad.current = false;
    } else if (messages.length > prevMessagesLength.current) {
      scrollToBottom();
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  /**
   * 메시지 전송 핸들러
   * - 입력값이 비어있지 않은 경우에만 메시지를 추가합니다.
   * - Day.js를 사용하여 현재 시간을 포맷팅합니다.
   */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !id || !auth.currentUser) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, 'schedules', id, 'messages'), {
        text: inputText,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || '익명',
        createdAt: serverTimestamp(),
        type: 'text',
        photoURL: auth.currentUser.photoURL,
        readBy: [auth.currentUser.uid], // 보낸 사람은 읽은 것으로 처리
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              text: replyingTo.text,
              sender: replyingTo.sender,
            }
          : null,
      });

      // [수정] 일정 문서 업데이트 (마지막 메시지, 시간, 안 읽은 개수)
      const updates: any = {
        lastMessage: inputText,
        lastMessageTime: serverTimestamp(),
      };

      // 나를 제외한 참여자들의 unreadCount 증가
      participants.forEach((uid) => {
        if (uid !== auth.currentUser?.uid) {
          updates[`unreadCounts.${uid}`] = increment(1);
        }
      });

      await updateDoc(doc(db, 'schedules', id), updates);

      // 푸시 알림 전송 (비동기 처리)
      const recipients = participants.filter((uid) => uid !== auth.currentUser?.uid);
      recipients.forEach((uid) => {
        sendPushNotificationToUser({
          userId: uid,
          title: scheduleTitle || '새로운 메시지',
          body: `${auth.currentUser?.displayName || '알 수 없음'}: ${inputText}`,
          data: { type: 'CHAT', scheduleId: id },
        });
      });

      setInputText('');
      setReplyingTo(null); // 답장 상태 초기화
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // [추가] 롱프레스 핸들러
  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent, msg: Message) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    longPressTimer.current = setTimeout(() => {
      setContextMenu({
        isOpen: true,
        x: clientX,
        y: clientY,
        message: msg,
      });
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCopyMessage = async () => {
    if (contextMenu.message?.text) {
      try {
        await navigator.clipboard.writeText(contextMenu.message.text);
        toast.success('메시지가 복사되었습니다.');
      } catch (err) {
        toast.error('복사에 실패했습니다.');
      }
    }
    setContextMenu({ ...contextMenu, isOpen: false });
  };

  // [추가] 답장 핸들러
  const handleReplyMessage = () => {
    if (contextMenu.message) {
      setReplyingTo(contextMenu.message);
      setContextMenu({ ...contextMenu, isOpen: false });
    }
  };

  const handleDeleteMessage = async () => {
    if (!contextMenu.message || !id) return;

    if (!contextMenu.message.isMe) {
      toast.error('본인의 메시지만 삭제할 수 있습니다.');
      setContextMenu({ ...contextMenu, isOpen: false });
      return;
    }

    if (window.confirm('이 메시지를 삭제하시겠습니까?')) {
      try {
        await updateDoc(doc(db, 'schedules', id, 'messages', contextMenu.message.id), {
          isDeleted: true,
          text: '삭제된 메시지입니다.',
        });
        toast.success('메시지가 삭제되었습니다.');
      } catch (error) {
        console.error('Error deleting message:', error);
        toast.error('메시지 삭제 중 오류가 발생했습니다.');
      }
    }
    setContextMenu({ ...contextMenu, isOpen: false });
  };

  // [추가] 채팅방 나가기 핸들러
  const handleLeaveChat = () => {
    setIsMenuOpen(false);
    setIsLeaveModalOpen(true);
  };

  const confirmLeaveChat = async () => {
    if (!id || !auth.currentUser) return;

    try {
      const leaveMessage = `${auth.currentUser.displayName || '알 수 없음'}님이 채팅방을 나갔습니다.`;

      // 1. 시스템 메시지 추가 (권한 유지를 위해 먼저 실행)
      await addDoc(collection(db, 'schedules', id, 'messages'), {
        text: leaveMessage,
        createdAt: serverTimestamp(),
        type: 'system',
        readBy: [],
      });

      // 2. 참여자 목록에서 제거 및 마지막 메시지 업데이트
      await updateDoc(doc(db, 'schedules', id), {
        attendees: arrayRemove(auth.currentUser.uid),
        lastMessage: leaveMessage,
        lastMessageTime: serverTimestamp(),
      });

      toast.success('채팅방에서 나갔습니다.');
      navigate('/social', { replace: true });
    } catch (error) {
      console.error('Error leaving chat:', error);
      toast.error('채팅방 나가기 중 오류가 발생했습니다.');
    } finally {
      setIsLeaveModalOpen(false);
    }
  };

  const headerContent = (
    <div className="flex flex-col items-start">
      <h1 className="text-[16px] font-black text-main dark:text-white leading-tight truncate max-w-[220px]">{scheduleTitle || '로딩 중...'}</h1>
      {scheduleData ? (
        <div className="flex items-center gap-2 text-[11px] font-medium text-sub dark:text-gray-400 mt-0.5">
          <span>
            {dayjs(scheduleData.start).format('M월 D일 (ddd)')}
            {!scheduleData.isAllDay && ` ${dayjs(scheduleData.start).format('A h:mm')}`}
          </span>
          <span className="w-[1px] h-2.5 bg-gray-300 dark:bg-gray-600" />
          <span className="flex items-center gap-1">
            <Users size={11} />
            {participantCount}명
          </span>
        </div>
      ) : (
        <span className="text-[11px] font-bold text-sub flex items-center gap-1 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          {participantCount}명 참여중
        </span>
      )}
    </div>
  );

  const footerContent = (
    <PageFooter className="!pt-0 !pb-[calc(1rem+env(safe-area-inset-bottom))] !px-0">
      {replyingTo && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 backdrop-blur-sm animate-in slide-in-from-bottom-2">
          <div className="flex flex-col min-w-0 border-l-2 border-primary pl-3">
            <span className="text-[11px] font-bold text-primary mb-0.5">{replyingTo.sender}님에게 답장</span>
            <span className="text-[12px] text-sub dark:text-gray-400 truncate">{replyingTo.text}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-2 text-sub hover:text-main dark:text-gray-500 dark:hover:text-gray-300">
            <X size={18} />
          </button>
        </div>
      )}
      <div className="px-4 pt-3">
        <form onSubmit={handleSend} className="flex items-center gap-2 w-full">
          <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 rounded-[24px] flex items-center px-4 py-2 border border-transparent focus-within:border-primary/50 focus-within:bg-white dark:focus-within:bg-gray-700 transition-all">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="메시지를 입력하세요"
              className="flex-1 bg-transparent outline-none text-[15px] font-medium text-main dark:text-white placeholder:text-sub min-w-0"
              style={{ fontSize: '16px' }}
            />
          </div>

          <LoadingButton
            type="submit"
            isLoading={isSending}
            disabled={!inputText.trim()}
            className={`
            p-2.5 rounded-full transition-all active:scale-95 shrink-0 flex items-center justify-center
            ${inputText.trim() ? 'bg-primary text-white shadow-md shadow-primary/50' : 'bg-gray-100 dark:bg-gray-800 text-sub'}
          `}
          >
            {!isSending && <Send size={20} className={inputText.trim() ? 'ml-0.5' : ''} />}
          </LoadingButton>
        </form>
      </div>
    </PageFooter>
  );

  return (
    <PageLayout
      headerContent={headerContent}
      onBack={() => navigate(-1)}
      extraNav={
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-sub hover:text-main dark:text-gray-400 dark:hover:text-white transition-colors"
            aria-label="메뉴 더보기"
          >
            <MoreVertical size={22} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <button
                onClick={() => {
                  setIsDetailModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-[14px] font-medium text-main dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
              >
                <Calendar size={16} /> 일정 상세
              </button>
              {/* <button
                onClick={() => navigate(`/schedule/${id}/media`, { state: { media: [], title: scheduleTitle } })}
                className="w-full px-4 py-3 text-left text-[14px] font-medium text-main dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
              >
                <ImageIcon size={16} /> 사진 모아보기
              </button> */}
              <div className="h-[1px] bg-gray-100 dark:bg-gray-700 my-1 mx-2" />
              <div className="px-4 py-2">
                <p className="text-[11px] font-bold text-sub dark:text-gray-500 mb-2">대화상대 ({participantCount})</p>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {participants.map((uid) => {
                    const profile = profiles[uid];
                    return (
                      <div key={uid} className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                          {profile?.photoURL ? (
                            <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-bold text-gray-400">{profile?.name?.[0]}</span>
                          )}
                        </div>
                        <span className="text-[13px] font-medium text-main dark:text-gray-200 truncate">{profile?.name || '알 수 없음'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="h-[1px] bg-gray-100 dark:bg-gray-700 my-1 mx-2" />
              <button
                onClick={handleLeaveChat}
                className="w-full px-4 py-3 text-left text-[14px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors rounded-b-xl"
              >
                <LogOut size={16} /> 나가기
              </button>
            </div>
          )}
        </div>
      }
      footer={footerContent}
      contentRef={chatContainerRef}
      className="px-4 pb-4"
    >
      <div className="space-y-4">
        {messages.map((msg, index) => {
          // 날짜 구분선 표시 여부 확인 (첫 메시지이거나 이전 메시지와 날짜가 다를 때)
          const showDateSeparator = index === 0 || !dayjs(msg.createdAt).isSame(dayjs(messages[index - 1].createdAt), 'day');

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-6">
                  <span className="bg-gray-100 dark:bg-gray-800 text-sub dark:text-gray-400 text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                    {dayjs(msg.createdAt).format('YYYY년 M월 D일 dddd')}
                  </span>
                </div>
              )}

              {msg.type === 'system' ? (
                <div className="flex justify-center my-4">
                  <span className="bg-black/5 px-3 py-1.5 rounded-full text-[11px] font-bold text-sub text-center leading-relaxed max-w-[80%]">{msg.text}</span>
                </div>
              ) : (
                (() => {
                  const unreadCount = Math.max(0, participantCount - (msg.readBy?.length || 0));
                  return (
                    <div id={`msg-${msg.id}`} className={`flex gap-2 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!msg.isMe && (
                        <div className="w-9 h-9 rounded-[14px] flex items-center justify-center text-[12px] font-black text-main shrink-0 bg-gray-200 overflow-hidden">
                          {msg.profileImg ? <img src={msg.profileImg} alt={msg.sender} className="w-full h-full object-cover" /> : msg.sender[0]}
                        </div>
                      )}

                      <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                        {!msg.isMe && <span className="text-[11px] text-sub font-bold mb-1 ml-1">{msg.sender}</span>}

                        <div className="flex items-end gap-1.5">
                          {msg.isMe && (
                            <div className="flex flex-col items-end gap-0.5 mb-0.5">
                              {unreadCount > 0 && <span className="text-[10px] font-bold text-yellow-500 leading-none">{unreadCount}</span>}
                              <span className="text-[10px] text-gray-400 font-medium leading-none min-w-max">{msg.timestamp}</span>
                            </div>
                          )}

                          <div
                            onMouseDown={(e) => !msg.isDeleted && handleLongPressStart(e, msg)}
                            onMouseUp={handleLongPressEnd}
                            onMouseLeave={handleLongPressEnd}
                            onTouchStart={(e) => !msg.isDeleted && handleLongPressStart(e, msg)}
                            onTouchEnd={handleLongPressEnd}
                            className={`
                      px-4 py-2.5 text-[14px] leading-relaxed break-words font-medium shadow-sm cursor-pointer select-none
                      ${
                        msg.isMe
                          ? 'bg-[#007AFF] text-white rounded-[20px] rounded-tr-none'
                          : 'bg-white text-[#191F28] dark:text-white rounded-[20px] rounded-tl-none border border-gray-100 dark:border-gray-700 dark:bg-gray-800'
                      }
                      ${msg.isDeleted ? 'opacity-60 italic' : ''}
                    `}
                          >
                            {msg.replyTo && (
                              <div className={`mb-1.5 pl-2 border-l-2 ${msg.isMe ? 'border-white/40' : 'border-gray-300 dark:border-gray-600'} text-xs opacity-80`}>
                                <p className="font-bold mb-0.5">{msg.replyTo.sender}</p>
                                <p className="truncate line-clamp-1">{msg.replyTo.text}</p>
                              </div>
                            )}
                            {msg.text}
                          </div>

                          {!msg.isMe && (
                            <div className="flex flex-col items-start gap-0.5 mb-0.5">
                              {unreadCount > 0 && <span className="text-[10px] font-bold text-yellow-500 leading-none">{unreadCount}</span>}
                              <span className="text-[10px] text-gray-400 font-medium leading-none min-w-max">{msg.timestamp}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </React.Fragment>
          );
        })}
        <div ref={scrollRef} className="h-1" />
        <ScheduleDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} schedule={scheduleData} scheduleId={id || ''} />

        <ConfirmModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          onConfirm={confirmLeaveChat}
          icon={<LogOut size={32} />}
          iconContainerClassName="bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
          title="채팅방 나가기"
          message={
            <>
              정말 채팅방을 나가시겠습니까?
              <br />
              나가면 대화 내용이 더 이상 보이지 않습니다.
            </>
          }
          confirmText="나가기"
          confirmButtonClassName="bg-red-500"
        />

        {/* [추가] 컨텍스트 메뉴 */}
        {contextMenu.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setContextMenu({ ...contextMenu, isOpen: false })}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
            <div
              className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden min-w-[160px] animate-in zoom-in-95 duration-200"
              style={{
                position: 'absolute',
                left: Math.min(contextMenu.x, window.innerWidth - 170), // 화면 밖으로 나가지 않게 조정
                top: Math.min(contextMenu.y, window.innerHeight - 100),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCopyMessage}
                className="w-full px-4 py-3 text-left text-[14px] font-medium text-main dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
              >
                <Copy size={16} /> 복사
              </button>
              <button
                onClick={handleReplyMessage}
                className="w-full px-4 py-3 text-left text-[14px] font-medium text-main dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
              >
                <Reply size={16} /> 답장
              </button>
              {contextMenu.message?.isMe && (
                <>
                  <div className="h-[1px] bg-gray-100 dark:bg-gray-700 mx-2" />
                  <button
                    onClick={handleDeleteMessage}
                    className="w-full px-4 py-3 text-left text-[14px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors"
                  >
                    <Trash2 size={16} /> 삭제
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default ScheduleChat;
