import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, AlertCircle, XCircle, MessageSquare, Sparkles, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

const MeetingVoting = () => {
  const navigate = useNavigate();

  // 1~3단계를 거쳐 취합된 중복 일정 데이터 (예시)
  const [votingSlots, setVotingSlots] = useState([
    {
      id: 'slot_1',
      date: '2025-01-10',
      time: '18:00 ~ 20:00',
      registeredMembers: ['김철수', '이영희', '나'], // 이 시간에 가능하다고 응답한 사람
      myVote: '', // 'available' | 'maybe' | 'unavailable'
      myMemo: '',
    },
    {
      id: 'slot_2',
      date: '2025-01-11',
      time: '14:00 ~ 16:00',
      registeredMembers: ['김철수', '나'],
      myVote: '',
      myMemo: '',
    },
  ]);

  const handleVote = (slotId: string, status: string) => {
    setVotingSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, myVote: status } : slot)));
  };

  const handleMemoChange = (slotId: string, text: string) => {
    setVotingSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, myMemo: text } : slot)));
  };

  const isAllVoted = votingSlots.every((slot) => slot.myVote !== '');

  const handleSubmit = () => {
    if (!isAllVoted) {
      alert('모든 일정에 대해 가능 여부를 선택해주세요.');
      return;
    }
    // 기획: 모든 사용자가 응답을 마치면 주최자에게 알림 발송
    alert('투표가 완료되었습니다! 모든 멤버의 응답이 끝나면 리포트가 생성됩니다.');
    navigate('/calendar');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-32 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            나의 <span className="text-blue-600">가능 여부</span>를<br />
            알려주세요.
          </h2>
        </div>

        <div className="space-y-6">
          {votingSlots.map((slot) => (
            <div
              key={slot.id}
              className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-2 border-gray-50 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              {/* 일정 정보 및 등록 멤버 표시 */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px] font-black text-gray-900">{dayjs(slot.date).format('MM월 DD일 (ddd)')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-lg w-fit">
                    <Clock size={14} />
                    <span className="text-[13px]">{slot.time}</span>
                  </div>
                </div>

                {/* 등록 멤버 아바타 */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex -space-x-2">
                    {slot.registeredMembers.map((m, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[11px] font-black text-gray-500 shadow-sm"
                      >
                        {m[0]}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">{slot.registeredMembers.length}명 가능</span>
                </div>
              </div>

              {/* 투표 버튼 그룹 */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleVote(slot.id, 'available')}
                  className={`flex flex-col items-center justify-center gap-2 py-4 rounded-[20px] border-2 transition-all active:scale-95
                    ${
                      slot.myVote === 'available'
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200'
                        : 'bg-white border-gray-100 text-gray-300 hover:border-emerald-200 hover:text-emerald-500 hover:bg-emerald-50/30'
                    }`}
                >
                  <CheckCircle2 size={24} className={slot.myVote === 'available' ? 'fill-white/20' : ''} />
                  <span className="text-[12px] font-black">가능</span>
                </button>

                <button
                  onClick={() => handleVote(slot.id, 'maybe')}
                  className={`flex flex-col items-center justify-center gap-2 py-4 rounded-[20px] border-2 transition-all active:scale-95
                    ${
                      slot.myVote === 'maybe'
                        ? 'bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-200'
                        : 'bg-white border-gray-100 text-gray-300 hover:border-amber-200 hover:text-amber-500 hover:bg-amber-50/30'
                    }`}
                >
                  <AlertCircle size={24} className={slot.myVote === 'maybe' ? 'fill-white/20' : ''} />
                  <span className="text-[12px] font-black">아마도</span>
                </button>

                <button
                  onClick={() => handleVote(slot.id, 'unavailable')}
                  className={`flex flex-col items-center justify-center gap-2 py-4 rounded-[20px] border-2 transition-all active:scale-95
                    ${
                      slot.myVote === 'unavailable'
                        ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200'
                        : 'bg-white border-gray-100 text-gray-300 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50/30'
                    }`}
                >
                  <XCircle size={24} className={slot.myVote === 'unavailable' ? 'fill-white/20' : ''} />
                  <span className="text-[12px] font-black">불가능</span>
                </button>
              </div>

              {/* 메모 입력 */}
              <div className="group relative">
                <div className="flex items-center bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[18px] px-4 py-3 transition-all">
                  <MessageSquare size={16} className="text-gray-300 mr-3 group-focus-within:text-blue-600" />
                  <input
                    value={slot.myMemo}
                    onChange={(e) => handleMemoChange(slot.id, e.target.value)}
                    placeholder="메모 남기기 (선택)"
                    className="bg-transparent border-none outline-none w-full text-[13px] font-bold text-gray-700 placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50 z-20">
        <button
          onClick={handleSubmit}
          disabled={!isAllVoted}
          className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
            ${isAllVoted ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
        >
          투표 완료하기
        </button>
      </div>
    </div>
  );
};

export default MeetingVoting;
