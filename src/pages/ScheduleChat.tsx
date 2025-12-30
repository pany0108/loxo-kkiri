import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { ChevronLeft, Send, Plus, MoreVertical, Image as ImageIcon, MapPin } from 'lucide-react';

interface Message {
  id: number;
  type: 'text' | 'system';
  text: string;
  sender: string;
  timestamp: string;
  isMe: boolean;
  profileImg?: string; // 프로필 이미지 색상 대용
}

const ScheduleChat = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 더미 데이터
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, type: 'system', text: '김철수님이 초대되었습니다.', sender: 'system', timestamp: '', isMe: false },
    { id: 2, type: 'text', text: '이번 연말 모임 강남역 어때?', sender: '아빠', timestamp: '오후 1:00', isMe: false, profileImg: 'bg-green-200' },
    { id: 3, type: 'text', text: '좋아요! 예약은 제가 할게요 😄', sender: '나', timestamp: '오후 1:05', isMe: true },
    { id: 4, type: 'text', text: '하남돼지집 괜찮더라. 거기로 잡아주라.', sender: '엄마', timestamp: '오후 1:10', isMe: false, profileImg: 'bg-yellow-200' },
    { id: 5, type: 'system', text: '일정 장소가 "강남역 하남돼지집"으로 변경되었습니다.', sender: 'system', timestamp: '', isMe: false },
  ]);

  const [inputText, setInputText] = useState('');

  // 메시지 추가 시 스크롤 하단 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
    <div className="flex flex-col h-screen bg-[#F2F4F6] font-['Pretendard']">
      {/* 1. 채팅방 헤더 */}
      <header className="px-4 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-800 hover:bg-gray-100 rounded-full transition-colors">
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
        <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <MoreVertical size={22} />
        </button>
      </header>

      {/* 2. 메시지 리스트 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {messages.map((msg) => {
          // 시스템 메시지 (중앙 정렬)
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <span className="bg-black/5 px-3 py-1.5 rounded-full text-[11px] font-bold text-gray-500 text-center leading-relaxed max-w-[80%]">{msg.text}</span>
              </div>
            );
          }

          // 일반 메시지
          return (
            <div key={msg.id} className={`flex gap-2 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* 프로필 이미지 (상대방일 때만) */}
              {!msg.isMe && (
                <div className={`w-9 h-9 rounded-[14px] flex items-center justify-center text-[12px] font-black text-gray-700 shrink-0 ${msg.profileImg}`}>{msg.sender[0]}</div>
              )}

              <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                {/* 이름 (상대방일 때만) */}
                {!msg.isMe && <span className="text-[11px] text-gray-500 font-bold mb-1 ml-1">{msg.sender}</span>}

                <div className="flex items-end gap-1.5">
                  {/* 시간 표시 (내가 보낸 메시지는 왼쪽, 상대방은 오른쪽) */}
                  {msg.isMe && <span className="text-[10px] text-gray-400 font-medium mb-0.5 min-w-max">{msg.timestamp}</span>}

                  {/* 말풍선 */}
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
        {/* 스크롤 하단 고정용 더미 div */}
        <div ref={scrollRef} />
      </div>

      {/* 3. 입력창 영역 (하단 고정) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-safe z-50">
        <form onSubmit={handleSend} className="flex items-center gap-2 pb-4">
          <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <Plus size={24} />
          </button>

          <div className="flex-1 bg-gray-50 rounded-[24px] flex items-center px-4 py-2 border border-transparent focus-within:border-blue-200 focus-within:bg-white transition-all">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="메시지를 입력하세요"
              className="flex-1 bg-transparent outline-none text-[15px] font-medium text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`
              p-2.5 rounded-full transition-all active:scale-95
              ${inputText.trim() ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-300'}
            `}
          >
            <Send size={20} className={inputText.trim() ? 'ml-0.5' : ''} />
            {/* Send 아이콘 시각적 정렬 보정 */}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ScheduleChat;
