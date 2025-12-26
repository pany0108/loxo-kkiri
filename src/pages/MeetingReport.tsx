import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, XCircle, ChevronLeft, Sparkles } from 'lucide-react';

const MeetingReport = () => {
  const navigate = useNavigate();

  const reportData = [
    {
      id: 'slot1',
      date: '2025-01-10',
      time: '18:00 ~ 21:00',
      available: ['김철수', '이영희', '박지성'],
      maybe: ['홍길동'],
      unavailable: [],
      isBest: true,
    },
    {
      id: 'slot2',
      date: '2025-01-11',
      time: '14:00 ~ 17:00',
      available: ['김철수', '이영희'],
      maybe: [],
      unavailable: ['박지성', '홍길동'],
      isBest: false,
    },
  ];

  const handleConfirm = (slotId: string) => {
    alert('약속이 확정되었습니다!');
    // 실제 로직에서는 여기서 DB의 일정을 '확정' 상태로 변경합니다.
    setTimeout(() => navigate('/calendar'), 1000);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      {/* 상단 네비게이션 */}
      <nav className="bg-white px-4 py-4 flex items-center border-b sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg mr-6 text-gray-900">응답 결과 리포트</h1>
      </nav>

      <div className="p-5">
        <header className="mb-6">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
            가장 적절한 시간을 <br />
            <span className="text-blue-600">선택하세요</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1 font-medium italic">* 멤버들의 응답을 기반으로 추천합니다.</p>
        </header>

        <div className="space-y-4">
          {reportData.map((slot) => (
            <div
              key={slot.id}
              className={`bg-white rounded-[24px] overflow-hidden border-2 transition-all ${
                slot.isBest ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-gray-100'
              }`}
            >
              {/* 카드 헤더 */}
              <div className={`px-5 py-4 flex justify-between items-center ${slot.isBest ? 'bg-emerald-50/50' : 'bg-gray-50/50'}`}>
                <div className="font-bold text-gray-800">
                  <span className="block text-xs text-gray-400 uppercase tracking-wider mb-0.5 font-medium">Selected Slot</span>
                  {slot.date} <span className="text-gray-400 mx-1">|</span> {slot.time}
                </div>
                {slot.isBest && (
                  <div className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-sm animate-pulse">
                    <Sparkles size={10} /> 추천
                  </div>
                )}
              </div>

              {/* 카드 바디 */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block leading-none mb-1">Available</span>
                    <p className="text-sm font-semibold text-gray-700">{slot.available.join(', ')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                    <AlertCircle size={18} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-amber-600 uppercase block leading-none mb-1">Maybe</span>
                    <p className="text-sm font-semibold text-gray-700">{slot.maybe.join(', ') || '없음'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                    <XCircle size={18} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-rose-600 uppercase block leading-none mb-1">Unavailable</span>
                    <p className="text-sm font-semibold text-gray-700">{slot.unavailable.join(', ') || '없음'}</p>
                  </div>
                </div>

                {/* 확정 버튼 */}
                <button
                  onClick={() => handleConfirm(slot.id)}
                  className={`w-full mt-4 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] ${
                    slot.isBest ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-600' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {slot.isBest ? '이 시간으로 확정하기' : '선택하기'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MeetingReport;
