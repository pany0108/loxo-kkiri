import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, Trash2, ChevronLeft, Clock, CalendarCheck } from 'lucide-react';

const ProposeMeetingDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 이전 페이지에서 넘겨받은 날짜들 (없을 경우 예시 데이터)
  const initialDates = location.state?.selectedDates || [dayjs().format('YYYY-MM-DD')];

  // 날짜별 시간 슬롯 관리
  const [timeSlots, setTimeSlots] = useState<Record<string, { start: string; end: string }[]>>(
    initialDates.reduce((acc: any, dateStr: string) => {
      acc[dateStr] = [{ start: '09:00', end: '18:00' }];
      return acc;
    }, {}),
  );

  const handleAddSlot = (dateStr: string) => {
    setTimeSlots({
      ...timeSlots,
      [dateStr]: [...timeSlots[dateStr], { start: '19:00', end: '22:00' }],
    });
  };

  const handleDeleteSlot = (dateStr: string, index: number) => {
    const newSlots = [...timeSlots[dateStr]];
    newSlots.splice(index, 1);
    setTimeSlots({
      ...timeSlots,
      [dateStr]: newSlots,
    });
  };

  const handleFinalConfirm = () => {
    alert('약속 제안이 성공적으로 생성되었습니다!');
    navigate('/calendar');
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* 상단 네비게이션 */}
      <nav className="bg-white px-4 py-4 flex items-center border-b sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg mr-6 text-gray-900">상세 시간 설정</h1>
      </nav>

      <div className="p-5">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
          <p className="text-sm text-blue-700 leading-relaxed font-medium">
            💡 선택하신 날짜별로 후보 시간을 설정해주세요. <br />
            멤버들이 이 중 가능한 시간을 투표하게 됩니다.
          </p>
        </div>

        {initialDates.map((dateStr: string) => (
          <div key={dateStr} className="mb-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-3 ml-1">
              <CalendarCheck size={18} className="text-blue-600" />
              <h3 className="font-extrabold text-gray-800">{dayjs(dateStr).format('YYYY년 MM월 DD일 (ddd)')}</h3>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {timeSlots[dateStr]?.map((slot: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-none group">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-10 uppercase">후보 {index + 1}</span>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 group-hover:border-blue-200 transition-colors">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-sm font-bold text-blue-600">
                        {slot.start} — {slot.end}
                      </span>
                    </div>
                  </div>

                  <button onClick={() => handleDeleteSlot(dateStr, index)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <button
                onClick={() => handleAddSlot(dateStr)}
                className="w-full py-4 flex items-center justify-center gap-2 text-blue-600 font-bold text-sm hover:bg-blue-50/50 transition-colors"
              >
                <Plus size={16} strokeWidth={3} />
                시간 추가하기
              </button>
            </div>
          </div>
        ))}

        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent">
          <button
            onClick={handleFinalConfirm}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-[20px] shadow-xl shadow-blue-100 active:scale-[0.98] transition-all text-lg"
          >
            약속 제안 완료
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposeMeetingDetail;
