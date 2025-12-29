import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, AlertCircle, XCircle, Sparkles, MessageSquare, Trash2, RefreshCw, Clock, Users } from 'lucide-react';
import ConfirmMeetingDialog from './ConfirmMeetingDialog';

const MeetingReport = () => {
  const navigate = useNavigate();

  // --- [State 추가] 모달 제어용 ---
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  // 모든 멤버의 투표가 합산된 리포트 데이터 (예시)
  const reportData = [
    {
      id: 'slot_1',
      date: '2025-01-10',
      time: '18:00 ~ 20:00',
      responses: {
        available: ['김철수', '이영희', '나'],
        maybe: [],
        unavailable: [],
      },
      memos: [{ user: '이영희', text: '조금 일찍 갈 수 있어요!' }],
      isAllAvailable: true, // 모두 '가능'인 경우
    },
    {
      id: 'slot_2',
      date: '2025-01-11',
      time: '14:00 ~ 16:00',
      responses: {
        available: ['나'],
        maybe: ['김철수'],
        unavailable: ['이영희'],
      },
      memos: [{ user: '김철수', text: '이날은 재택근무라 확인해봐야 함' }],
      isAllAvailable: false,
    },
  ];

  const handleConfirmClick = (slot: any) => {
    setSelectedSlot({ date: slot.date, time: slot.time });
    setIsConfirmOpen(true);
  };

  // 2. [신규] 모달에서 '확정하기' 눌렀을 때 실행되는 최종 로직
  const handleFinalConfirm = () => {
    setIsConfirmOpen(false);
    // 실제 API 호출 로직은 여기에...
    alert(`[${selectedSlot?.date} ${selectedSlot?.time}] 약속이 최종 확정되었습니다! 🎉`);
    navigate('/calendar');
  };

  const handleRequestRetry = () => {
    alert('친구들에게 일정 재등록을 요청하는 알림을 보냅니다.');
  };

  const handleCancel = () => {
    if (window.confirm('정말 이 약속 잡기를 취소하시겠습니까?')) {
      navigate('/calendar');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-20 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            가장 <span className="text-blue-600">적절한 시간</span>을<br />
            확정해주세요!
          </h2>
          <p className="mt-2 text-gray-400 text-sm font-medium flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-500" />
            전원 가능인 시간을 우선 추천합니다.
          </p>
        </div>

        <div className="space-y-6">
          {reportData.map((slot) => (
            <div
              key={slot.id}
              className={`rounded-[32px] overflow-hidden border-2 transition-all duration-300
                ${slot.isAllAvailable ? 'bg-white border-emerald-500 shadow-xl shadow-emerald-50 ring-4 ring-emerald-50 scale-[1.02]' : 'bg-white border-gray-100 shadow-sm'}`}
            >
              {/* 카드 헤더 */}
              <div className={`px-6 py-5 flex justify-between items-start ${slot.isAllAvailable ? 'bg-emerald-50/30' : 'bg-gray-50'}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-black text-gray-900">{slot.date}</span>
                    {slot.isAllAvailable && (
                      <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm shadow-emerald-200">BEST CHOICE</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 font-bold">
                    <Clock size={14} />
                    <span className="text-[13px]">{slot.time}</span>
                  </div>
                </div>
              </div>

              {/* 멤버별 응답 현황 */}
              <div className="p-6 space-y-5">
                <div className="space-y-4">
                  {/* Available */}
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wide">Available</span>
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md">{slot.responses.available.length}명</span>
                      </div>
                      <p className="text-[13px] font-bold text-gray-700 truncate">{slot.responses.available.length > 0 ? slot.responses.available.join(', ') : '-'}</p>
                    </div>
                  </div>

                  {/* Maybe (있을 때만 표시하거나 흐리게 표시) */}
                  <div
                    className={`flex items-start gap-3 p-3 rounded-2xl border ${
                      slot.responses.maybe.length > 0 ? 'bg-amber-50/50 border-amber-100/50' : 'bg-gray-50 border-transparent opacity-60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                        slot.responses.maybe.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      <AlertCircle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-black uppercase tracking-wide ${slot.responses.maybe.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>Maybe</span>
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                            slot.responses.maybe.length > 0 ? 'text-amber-600 bg-amber-100' : 'text-gray-400 bg-gray-200'
                          }`}
                        >
                          {slot.responses.maybe.length}명
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-gray-700 truncate">{slot.responses.maybe.length > 0 ? slot.responses.maybe.join(', ') : '-'}</p>
                    </div>
                  </div>

                  {/* Unavailable (있을 때만 표시하거나 흐리게 표시) */}
                  <div
                    className={`flex items-start gap-3 p-3 rounded-2xl border ${
                      slot.responses.unavailable.length > 0 ? 'bg-rose-50/50 border-rose-100/50' : 'bg-gray-50 border-transparent opacity-60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                        slot.responses.unavailable.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      <XCircle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-black uppercase tracking-wide ${slot.responses.unavailable.length > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                          Unavailable
                        </span>
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                            slot.responses.unavailable.length > 0 ? 'text-rose-600 bg-rose-100' : 'text-gray-400 bg-gray-200'
                          }`}
                        >
                          {slot.responses.unavailable.length}명
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-gray-700 truncate">{slot.responses.unavailable.length > 0 ? slot.responses.unavailable.join(', ') : '-'}</p>
                    </div>
                  </div>
                </div>

                {/* 메모 표시 */}
                {slot.memos.length > 0 && (
                  <div className="pt-2">
                    <div className="space-y-2">
                      {slot.memos.map((memo, i) => (
                        <div key={i} className="flex gap-2 text-[12px] text-gray-600 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">
                          <MessageSquare size={14} className="shrink-0 mt-0.5 text-gray-400" />
                          <span>
                            <strong className="text-gray-900 mr-1">{memo.user}:</strong>
                            {memo.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 확정 버튼 */}
                <button
                  onClick={() => handleConfirmClick(slot)}
                  className={`w-full py-4 rounded-[20px] font-black text-[15px] transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2
                    ${
                      slot.isAllAvailable
                        ? 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600'
                        : 'bg-white text-gray-400 border-2 border-gray-100 hover:border-gray-300 hover:text-gray-600 shadow-none'
                    }`}
                >
                  {slot.isAllAvailable ? (
                    <>
                      <CheckCircle2 size={18} /> 이 시간으로 확정하기
                    </>
                  ) : (
                    '선택하기'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 관리 메뉴 */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-center text-[12px] font-bold text-gray-400 mb-4">마음에 드는 시간이 없으신가요?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRequestRetry}
              className="flex items-center justify-center gap-2 h-[56px] rounded-[20px] bg-gray-50 text-gray-600 font-bold text-[14px] hover:bg-gray-100 active:scale-[0.98] transition-all"
            >
              <RefreshCw size={16} /> 일정 재요청
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center justify-center gap-2 h-[56px] rounded-[20px] bg-white border-2 border-rose-100 text-rose-500 font-bold text-[14px] hover:bg-rose-50 active:scale-[0.98] transition-all"
            >
              <Trash2 size={16} /> 약속 취소
            </button>
          </div>
        </div>

        {/* 3. [추가] 확정 확인 모달 컴포넌트 삽입 */}
        <ConfirmMeetingDialog isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleFinalConfirm} slotData={selectedSlot} />
      </div>
    </div>
  );
};

export default MeetingReport;
