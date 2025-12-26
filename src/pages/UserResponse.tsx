import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageSquare, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';

const UserResponse = () => {
  const navigate = useNavigate();

  // 임시 데이터
  const proposal = {
    title: '신년회 모임',
    slots: [
      { id: '1', date: '2025-01-10', time: '18:00 ~ 21:00' },
      { id: '2', date: '2025-01-11', time: '14:00 ~ 17:00' },
    ],
  };

  // 응답 상태 관리 { 일정ID: { status: 'available' | 'maybe' | 'unavailable', memo: '' } }
  const [responses, setResponses] = useState<Record<string, any>>({});

  const handleStatusChange = (slotId: string, status: string) => {
    setResponses({
      ...responses,
      [slotId]: { ...responses[slotId], status },
    });
  };

  const handleMemoChange = (slotId: string, memo: string) => {
    setResponses({
      ...responses,
      [slotId]: { ...responses[slotId], memo },
    });
  };

  const handleSubmit = () => {
    if (Object.keys(responses).length < proposal.slots.length) {
      alert('모든 일정에 대해 가능 여부를 선택해주세요.');
      return;
    }
    alert('응답이 제출되었습니다!');
    navigate('/calendar');
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      {/* 상단 네비게이션 */}
      <nav className="bg-white px-4 py-4 flex items-center border-b sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg mr-6 text-gray-900">약속 응답하기</h1>
      </nav>

      <div className="p-5 space-y-6">
        {/* 모임 제목 섹션 */}
        <header className="px-1">
          <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-1">Invitation</p>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">"{proposal.title}"</h2>
          <p className="text-sm text-gray-400 mt-2 font-medium">제안된 시간 중 가능한 때를 알려주세요.</p>
        </header>

        {/* 일정 응답 카드 리스트 */}
        {proposal.slots.map((slot) => {
          const currentStatus = responses[slot.id]?.status;

          return (
            <div key={slot.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-5">
              {/* 날짜/시간 정보 */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-300 font-bold mb-1 uppercase tracking-tighter">Time Slot</span>
                <span className="text-base font-extrabold text-gray-800">
                  {slot.date} <span className="text-gray-300 font-light mx-1">|</span> {slot.time}
                </span>
              </div>

              {/* 커스텀 라디오 그룹 (버튼형) */}
              <div className="flex gap-2">
                <StatusButton
                  active={currentStatus === 'available'}
                  onClick={() => handleStatusChange(slot.id, 'available')}
                  icon={<CheckCircle2 size={16} />}
                  label="가능"
                  colorClass="bg-emerald-500"
                />
                <StatusButton
                  active={currentStatus === 'maybe'}
                  onClick={() => handleStatusChange(slot.id, 'maybe')}
                  icon={<HelpCircle size={16} />}
                  label="아마도"
                  colorClass="bg-amber-500"
                />
                <StatusButton
                  active={currentStatus === 'unavailable'}
                  onClick={() => handleStatusChange(slot.id, 'unavailable')}
                  icon={<XCircle size={16} />}
                  label="불가능"
                  colorClass="bg-rose-500"
                />
              </div>

              {/* 메모 입력창 */}
              <div className="relative group">
                <div className="absolute left-3 top-3 text-gray-300">
                  <MessageSquare size={16} />
                </div>
                <textarea
                  placeholder="추가 메모를 남겨주세요 (선택)"
                  rows={2}
                  className="w-full bg-gray-50 border border-transparent focus:border-blue-100 focus:bg-white rounded-2xl pl-10 pr-4 py-3 text-sm outline-none transition-all placeholder:text-gray-300 font-medium"
                  onChange={(e) => handleMemoChange(slot.id, e.target.value)}
                />
              </div>
            </div>
          );
        })}

        {/* 제출 버튼 */}
        <button onClick={handleSubmit} className="w-full bg-gray-900 text-white font-black py-5 rounded-[24px] shadow-xl active:scale-[0.98] transition-all text-lg mt-4">
          응답 제출 완료
        </button>
      </div>
    </div>
  );
};

// 내부 상태 버튼 컴포넌트
const StatusButton = ({ active, onClick, icon, label, colorClass }: any) => (
  <button
    onClick={onClick}
    className={`
      flex-1 flex flex-col items-center justify-center py-3 rounded-2xl border-2 transition-all gap-1
      ${active ? `${colorClass} border-transparent text-white shadow-lg shadow-gray-100` : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}
    `}
  >
    {icon}
    <span className="text-[11px] font-black">{label}</span>
  </button>
);

export default UserResponse;
