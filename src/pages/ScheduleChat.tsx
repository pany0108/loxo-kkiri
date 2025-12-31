import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { ChevronLeft, Send, Plus, MoreVertical } from 'lucide-react';

/**
 * 채팅 메시지 데이터 인터페이스
 * @property {number} id - 메시지 고유 식별자
 * @property {'text' | 'system'} type - 메시지 유형 (일반 텍스트 / 시스템 알림)
 * @property {string} text - 메시지 내용
 * @property {string} sender - 보낸 사람 이름
 * @property {string} timestamp - 전송 시간 문자열
 * @property {boolean} isMe - 본인이 보낸 메시지 여부 (UI 배치 결정)
 * @property {string} [profileImg] - 프로필 이미지 스타일 클래스 (선택적)
 */
interface Message {
  id: number;
  type: 'text' | 'system';
  text: string;
  sender: string;
  timestamp: string;
  isMe: boolean;
  profileImg?: string;
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
  useParams();

  // 자동 스크롤을 위한 메시지 리스트 하단 참조 Ref
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * 채팅 메시지 목록 상태
   *
   * 실제 구현 시에는 WebSocket 또는 Firestore onSnapshot을 통해 실시간 데이터를 수신해야 합니다.
   */
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, type: 'system', text: '김철수님이 초대되었습니다.', sender: 'system', timestamp: '', isMe: false },
    { id: 2, type: 'text', text: '이번 연말 모임 강남역 어때?', sender: '아빠', timestamp: '오후 1:00', isMe: false, profileImg: 'bg-green-200' },
    { id: 3, type: 'text', text: '좋아요! 예약은 제가 할게요 😄', sender: '나', timestamp: '오후 1:05', isMe: true },
    { id: 4, type: 'text', text: '하남돼지집 괜찮더라. 거기로 잡아주라.', sender: '엄마', timestamp: '오후 1:10', isMe: false, profileImg: 'bg-yellow-200' },
    { id: 5, type: 'system', text: '일정 장소가 "강남역 하남돼지집"으로 변경되었습니다.', sender: 'system', timestamp: '', isMe: false },
    { id: 6, type: 'text', text: '예약 완료했습니다!', sender: '나', timestamp: '오후 1:15', isMe: true },
    { id: 7, type: 'text', text: '고생했어~', sender: '엄마', timestamp: '오후 1:16', isMe: false, profileImg: 'bg-yellow-200' },
    { id: 8, type: 'text', text: '몇 시에 만날까?', sender: '아빠', timestamp: '오후 1:20', isMe: false, profileImg: 'bg-green-200' },
    { id: 9, type: 'text', text: '7시 어때요?', sender: '나', timestamp: '오후 1:21', isMe: true },
  ]);

  const [inputText, setInputText] = useState('');

  /**
   * 채팅창 스크롤을 최하단으로 이동시키는 함수
   */
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /**
   * 메시지 목록이 업데이트될 때마다 스크롤을 하단으로 이동
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * 메시지 전송 핸들러
   * - 입력값이 비어있지 않은 경우에만 메시지를 추가합니다.
   * - Day.js를 사용하여 현재 시간을 포맷팅합니다.
   */
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      type: 'text',
      text: inputText,
      sender: '나',
      timestamp: dayjs().format('A h:mm').replace('AM', '오전').replace('PM', '오후'),
      isMe: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F2F4F6] font-['Pretendard'] overflow-hidden">
      {/* 상단 헤더: 뒤로가기 및 일정 정보 */}
      <header className="sticky top-0 shrink-0 px-4 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md z-50 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-800 hover:bg-gray-100 rounded-full transition-colors" aria-label="뒤로 가기">
            <ChevronLeft size={26} />
          </button>
          <div>
            <h1 className="text-[16px] font-black text-gray-900 leading-none">가족 연말 모임 👨‍👩‍👧‍👦</h1>
            <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              3명 참여중
            </span>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors" aria-label="메뉴 더보기">
          <MoreVertical size={22} />
        </button>
      </header>

      {/* 메시지 리스트 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          // 시스템 메시지 (입장/퇴장, 일정 변경 등)
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <span className="bg-black/5 px-3 py-1.5 rounded-full text-[11px] font-bold text-gray-500 text-center leading-relaxed max-w-[80%]">{msg.text}</span>
              </div>
            );
          }

          // 일반 대화 메시지
          return (
            <div key={msg.id} className={`flex gap-2 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {!msg.isMe && (
                <div className={`w-9 h-9 rounded-[14px] flex items-center justify-center text-[12px] font-black text-gray-700 shrink-0 ${msg.profileImg}`}>{msg.sender[0]}</div>
              )}

              <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                {!msg.isMe && <span className="text-[11px] text-gray-500 font-bold mb-1 ml-1">{msg.sender}</span>}

                <div className="flex items-end gap-1.5">
                  {msg.isMe && <span className="text-[10px] text-gray-400 font-medium mb-0.5 min-w-max">{msg.timestamp}</span>}

                  <div
                    className={`
                      px-4 py-2.5 text-[14px] leading-relaxed break-words font-medium shadow-sm
                      ${msg.isMe ? 'bg-blue-600 text-white rounded-[20px] rounded-tr-none' : 'bg-white text-gray-800 rounded-[20px] rounded-tl-none border border-gray-100'}
                    `}
                  >
                    {msg.text}
                  </div>

                  {!msg.isMe && <span className="text-[10px] text-gray-400 font-medium mb-0.5 min-w-max">{msg.timestamp}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {/* 자동 스크롤 타겟 요소 */}
        <div ref={scrollRef} className="h-1" />
      </div>

      {/* 입력창 영역 */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3 pb-3 z-20 w-full">
        <form onSubmit={handleSend} className="flex items-center gap-2 w-full">
          <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0">
            <Plus size={24} />
          </button>

          <div className="flex-1 min-w-0 bg-gray-50 rounded-[24px] flex items-center px-4 py-2 border border-transparent focus-within:border-blue-200 focus-within:bg-white transition-all">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="메시지를 입력하세요"
              className="flex-1 bg-transparent outline-none text-[15px] font-medium text-gray-900 placeholder:text-gray-400 min-w-0"
              style={{ fontSize: '16px' }}
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`
              p-2.5 rounded-full transition-all active:scale-95 shrink-0
              ${inputText.trim() ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-300'}
            `}
          >
            <Send size={20} className={inputText.trim() ? 'ml-0.5' : ''} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ScheduleChat;
