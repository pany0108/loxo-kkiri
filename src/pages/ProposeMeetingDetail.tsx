import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, X, ChevronLeft, Calendar as CalendarIcon, Sparkles, Users } from 'lucide-react';

interface InvitedFriend {
  id: string;
  name: string;
}

interface LocationState {
  title: string;
  description: string;
  invitedFriends: InvitedFriend[];
  selectedDates: string[];
  calendarName: string;
}

interface TimeSlot {
  start: string;
  end: string;
  isAllDay: boolean;
}

const ProposeMeetingDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { title, description, invitedFriends, selectedDates, calendarName } = (location.state as LocationState) || {
    title: '새 약속',
    description: '',
    selectedDates: [dayjs().format('YYYY-MM-DD')],
    invitedFriends: [] as InvitedFriend[],
    calendarName: '',
  };

  const [timeSlots, setTimeSlots] = useState<Record<string, TimeSlot[]>>(
    selectedDates.reduce((acc: any, dateStr: string) => {
      acc[dateStr] = [{ start: '19:00', end: '21:00', isAllDay: false }];
      return acc;
    }, {}),
  );

  const handleAddSlot = (dateStr: string) => {
    setTimeSlots({
      ...timeSlots,
      [dateStr]: [...timeSlots[dateStr], { start: '12:00', end: '13:00', isAllDay: false }],
    });
  };

  const handleDeleteSlot = (dateStr: string, index: number) => {
    if (timeSlots[dateStr].length <= 1) {
      alert('최소 하나의 시간대는 설정해야 합니다.');
      return;
    }
    const newSlots = [...timeSlots[dateStr]];
    newSlots.splice(index, 1);
    setTimeSlots({ ...timeSlots, [dateStr]: newSlots });
  };

  const handleTimeChange = (dateStr: string, index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...timeSlots[dateStr]];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setTimeSlots({ ...timeSlots, [dateStr]: newSlots });
  };

  const handleToggleDayAllDay = (dateStr: string) => {
    const currentSlots = timeSlots[dateStr];
    const isCurrentlyAllDay = currentSlots.length > 0 && currentSlots[0].isAllDay;

    if (isCurrentlyAllDay) {
      setTimeSlots({
        ...timeSlots,
        [dateStr]: [{ start: '12:00', end: '13:00', isAllDay: false }],
      });
    } else {
      setTimeSlots({
        ...timeSlots,
        [dateStr]: [{ start: '00:00', end: '23:59', isAllDay: true }],
      });
    }
  };

  const handleFinalConfirm = () => {
    alert(`"${calendarName}" 약속이 생성되었습니다!`);
    navigate('/calendar');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors active:scale-90">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-40 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            세부 <span className="text-blue-600">시간</span>을<br />
            설정해볼까요?
          </h2>
        </div>

        {/* 요약 카드 */}
        <div className="bg-gray-50 rounded-[28px] p-6 mb-8 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-1 rounded-md">SUMMARY</span>
          </div>
          <h3 className="text-[18px] font-black text-gray-900 mb-2">{title}</h3>
          {description && <p className="text-[14px] font-medium text-gray-500 leading-relaxed mb-4">{description}</p>}

          <div className="flex items-center gap-2 pt-4 border-t border-gray-200/60">
            <Users size={16} className="text-gray-400" />
            <span className="text-[13px] font-bold text-gray-600">{invitedFriends.length > 0 ? invitedFriends.map((f) => f.name).join(', ') : '초대된 친구 없음'}</span>
          </div>
        </div>

        {/* 날짜별 시간 설정 리스트 */}
        <div className="space-y-10">
          {selectedDates.sort().map((dateStr: string) => {
            const isAllDay = timeSlots[dateStr]?.[0]?.isAllDay;

            return (
              <div key={dateStr} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={18} className="text-blue-600" />
                    <h3 className="text-[16px] font-black text-gray-900">{dayjs(dateStr).format('MM월 DD일 (ddd)')}</h3>
                  </div>

                  <div onClick={() => handleToggleDayAllDay(dateStr)} className="flex items-center gap-2 cursor-pointer group py-1">
                    <span className={`text-[11px] font-bold transition-colors ${isAllDay ? 'text-emerald-600' : 'text-gray-400'}`}>종일</span>
                    <div
                      className={`
                        relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0
                        ${isAllDay ? 'bg-emerald-500' : 'bg-gray-200'}
                      `}
                    >
                      <div
                        className={`
                          absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200
                          ${isAllDay ? 'translate-x-4' : 'translate-x-0'}
                        `}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {isAllDay ? (
                    <div className="w-full h-[60px] bg-emerald-50 rounded-[20px] border border-emerald-100 flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                      <Sparkles size={16} className="text-emerald-500" />
                      <span className="text-[14px] font-bold text-emerald-600">이 날은 하루 종일 가능해요!</span>
                    </div>
                  ) : (
                    <>
                      {timeSlots[dateStr]?.map((slot, index) => (
                        <div
                          key={index}
                          className="relative flex items-center h-[60px] bg-white rounded-[20px] shadow-sm border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 transition-all overflow-hidden"
                        >
                          <div className="flex-1 flex items-center justify-center gap-2 pr-10 pl-4">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => handleTimeChange(dateStr, index, 'start', e.target.value)}
                              className="bg-transparent border-none outline-none text-[14px] font-bold text-gray-900 text-center w-full min-w-[70px] p-0"
                            />
                            <span className="text-gray-300 font-bold shrink-0">-</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => handleTimeChange(dateStr, index, 'end', e.target.value)}
                              className="bg-transparent border-none outline-none text-[14px] font-bold text-gray-900 text-center w-full min-w-[70px] p-0"
                            />
                          </div>

                          <button
                            onClick={() => handleDeleteSlot(dateStr, index)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => handleAddSlot(dateStr)}
                        className="w-full h-[52px] border border-dashed border-gray-300 rounded-[20px] flex items-center justify-center gap-2 text-gray-400 font-bold text-[13px] hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all active:scale-[0.99]"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                        시간대 추가
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50 z-20">
        <button
          onClick={handleFinalConfirm}
          className="w-full h-[62px] bg-blue-600 text-white rounded-[24px] font-black text-[17px] shadow-lg shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>약속 제안 발송하기</span>
          <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-[12px] font-bold">{Object.values(timeSlots).flat().length}개 슬롯</span>
        </button>
      </div>
    </div>
  );
};

export default ProposeMeetingDetail;
