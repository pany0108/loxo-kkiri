import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { Send, MoreVertical, Calendar, Image as ImageIcon, LogOut } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, writeBatch, arrayUnion, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { PageLayout, PageFooter, LoadingButton } from 'components';
import toast from 'react-hot-toast';
import { sendPushNotificationToUser } from 'utils';

/**
 * 채팅 메시지 데이터 인터페이스
 * @property {string} id - 메시지 고유 식별자
 * @property {'text' | 'system'} type - 메시지 유형 (일반 텍스트 / 시스템 알림)
 * @property {string} text - 메시지 내용
 * @property {string} sender - 보낸 사람 이름
 * @property {string} timestamp - 전송 시간 문자열
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
  isMe: boolean;
  profileImg?: string;
  readBy: string[];
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

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isInitialLoad = useRef(true);
  const prevMessagesLength = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

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
          isMe: auth.currentUser?.uid === data.senderId,
          profileImg: data.photoURL,
          readBy: data.readBy || [],
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
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const headerContent = (
    <div>
      <h1 className="text-[16px] font-black text-main dark:text-white leading-none">{scheduleTitle || '로딩 중...'}</h1>
      <span className="text-[11px] font-bold text-sub flex items-center gap-1 mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        {participantCount}명 참여중
      </span>
    </div>
  );

  const footerContent = (
    <PageFooter className="!pt-3 !pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <button
                onClick={() => navigate(`/schedule/${id}`)}
                className="w-full px-4 py-3 text-left text-[14px] font-medium text-main dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
              >
                <Calendar size={16} /> 일정 상세
              </button>
              <button
                onClick={() => navigate(`/schedule/${id}/media`, { state: { media: [], title: scheduleTitle } })}
                className="w-full px-4 py-3 text-left text-[14px] font-medium text-main dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
              >
                <ImageIcon size={16} /> 사진 모아보기
              </button>
              <div className="h-[1px] bg-gray-100 dark:bg-gray-700 my-1 mx-2" />
              <button
                onClick={() => toast('채팅방 나가기 기능은 준비중입니다.', { icon: '👋' })}
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
        {messages.map((msg) => {
          // 시스템 메시지 (입장/퇴장, 일정 변경 등)
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <span className="bg-black/5 px-3 py-1.5 rounded-full text-[11px] font-bold text-sub text-center leading-relaxed max-w-[80%]">{msg.text}</span>
              </div>
            );
          }

          // 읽지 않은 사람 수 계산 (전체 참여자 - 읽은 사람 수)
          const unreadCount = Math.max(0, participantCount - (msg.readBy?.length || 0));

          // 일반 대화 메시지
          return (
            <div key={msg.id} id={`msg-${msg.id}`} className={`flex gap-2 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
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
                    className={`
                      px-4 py-2.5 text-[14px] leading-relaxed break-words font-medium shadow-sm
                      ${msg.isMe ? 'bg-primary text-white rounded-[20px] rounded-tr-none' : 'bg-white text-main rounded-[20px] rounded-tl-none border border-gray-100'}
                    `}
                  >
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
        })}
        <div ref={scrollRef} className="h-1" />
      </div>
    </PageLayout>
  );
};

export default ScheduleChat;
