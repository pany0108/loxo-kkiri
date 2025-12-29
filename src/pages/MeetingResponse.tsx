import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, CheckCircle2, AlertCircle, Plus, ChevronRight, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

interface MyNewSlot {
  date: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
}

const MeetingResponse = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedHostSlots, setSelectedHostSlots] = useState<number[]>([]);
  const [myNewSlots, setMyNewSlots] = useState<MyNewSlot[]>([]);

  const [hostProposal] = useState({
    title: '강남역 삼겹살 파티 🥓',
    host: '김철수',
    slots: [
      { id: 1, date: '2025-01-10', time: '18:00 ~ 20:00' },
      { id: 2, date: '2025-01-11', time: '14:00 ~ 16:00' },
    ],
  });
  const myExistingSchedules = ['2025-01-10', '2025-01-15', '2025-01-22'];

  const toggleHostSlot = (slotId: number) => {
    setSelectedHostSlots((prev) => (prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]));
  };

  const toggleMyNewSlot = (dateStr: string) => {
    const isHostDate = hostProposal.slots.some((s) => s.date === dateStr);
    if (isHostDate) {
      alert('주최자가 제안한 날짜입니다. 상단 카드에서 선택해주세요!');
      return;
    }

    if (myNewSlots.find((s) => s.date === dateStr)) {
      setMyNewSlots((prev) => prev.filter((s) => s.date !== dateStr));
    } else {
      setMyNewSlots((prev) => [...prev, { date: dateStr, startTime: '', endTime: '', isAllDay: true }]);
    }
  };

  const updateSlotTime = (dateStr: string, field: 'startTime' | 'endTime', value: string) => {
    setMyNewSlots((prev) => prev.map((s) => (s.date === dateStr ? { ...s, [field]: value, isAllDay: false } : s)));
  };

  const toggleAllDay = (dateStr: string) => {
    setMyNewSlots((prev) => prev.map((s) => (s.date === dateStr ? { ...s, isAllDay: !s.isAllDay, startTime: '', endTime: '' } : s)));
  };

  const generateDates = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const dates = [];
    for (let i = 0; i < startOfMonth.day(); i++) dates.push(null);
    for (let i = 1; i <= endOfMonth.date(); i++) dates.push(startOfMonth.date(i).format('YYYY-MM-DD'));
    return dates;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32 font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="bg-white px-4 py-4 flex items-center border-b sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 active:scale-95 transition-transform">
          <ChevronLeft size={24} className="text-gray-900" />
        </button>
        <h1 className="flex-1 text-center font-black text-lg mr-6 text-gray-900 tracking-tight">약속 응답 및 제안</h1>
      </nav>

      <div className="p-5 space-y-6">
        {/* [섹션 1] 주최자 제안 확인 영역 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 ml-1">
            <Calendar size={18} className="text-blue-600" />
            <h2 className="text-[16px] font-black text-gray-800 tracking-tight">{hostProposal.host}님의 제안 확인</h2>
          </div>
          <div className="space-y-3">
            {hostProposal.slots.map((slot) => {
              const isSelected = selectedHostSlots.includes(slot.id);
              const isConflict = myExistingSchedules.includes(slot.date);
              return (
                <button
                  key={slot.id}
                  onClick={() => toggleHostSlot(slot.id)}
                  className={`
                    w-full flex items-center justify-between p-5 rounded-[28px] border-2 transition-all duration-200 ease-out
                    relative overflow-hidden cursor-pointer
                    ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] scale-[1.02] z-10'
                        : 'bg-white border-gray-50 text-gray-800 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-md active:scale-[0.97]'
                    }
                  `}
                >
                  {isSelected && <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />}
                  <div className="text-left relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-[15px] font-black tracking-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>{dayjs(slot.date).format('MM월 DD일 (ddd)')}</p>
                      {!isSelected && <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md font-black">HOST</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className={isSelected ? 'text-blue-100' : 'text-gray-300'} />
                      <p className={`text-sm font-bold ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>{slot.time}</p>
                    </div>
                    {isConflict && !isSelected && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-red-500 font-extrabold mt-3 bg-red-50/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-red-100/50">
                        <AlertCircle size={12} strokeWidth={3} />
                        <span>내 일정과 겹침</span>
                      </div>
                    )}
                  </div>
                  <div className="relative z-10">
                    {isSelected ? (
                      <div className="bg-white rounded-full p-1 shadow-sm">
                        <CheckCircle2 size={24} className="text-blue-600 fill-blue-600/10" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-gray-100 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-gray-100" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* [섹션 2] 내 캘린더 대조 및 역제안 영역 */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-2 font-black text-gray-800">
            <Clock size={18} className="text-orange-500" />
            <span className="text-[16px] tracking-tight">내 일정 확인 및 시간 추가</span>
          </div>

          <div className="space-y-4">
            {/* 달력 헤더 */}
            <div className="flex items-center justify-between px-2 py-2 bg-gray-50 rounded-2xl">
              <button onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))} className="p-1 active:scale-90 transition-transform">
                <ChevronLeft size={20} />
              </button>
              <span className="font-black text-sm text-gray-800">{currentMonth.format('YYYY년 MM월')}</span>
              <button onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))} className="p-1 active:scale-90 transition-transform">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* 달력 그리드 */}
            <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
              {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                <span key={d} className="text-[10px] font-black text-gray-300 mb-2">
                  {d}
                </span>
              ))}
              {generateDates().map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />;
                const hasMySchedule = myExistingSchedules.includes(date);
                const isHostProposed = hostProposal.slots.some((s) => s.date === date);
                const isMyNewProposal = myNewSlots.some((s) => s.date === date);

                return (
                  <button
                    key={date}
                    onClick={() => toggleMyNewSlot(date)}
                    className={`
                      relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all
                      ${isMyNewProposal ? 'bg-emerald-500 text-white shadow-md scale-105' : 'bg-white'}
                      ${isHostProposed ? 'ring-2 ring-blue-100' : ''}
                      active:scale-90
                    `}
                  >
                    <span className={`text-[13px] font-bold ${isMyNewProposal ? 'text-white' : 'text-gray-700'}`}>{dayjs(date).date()}</span>
                    {hasMySchedule && !isMyNewProposal && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-red-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 역제안 시간 설정 상세 리스트 */}
          <div className="pt-6 border-t border-gray-50 space-y-4">
            <div className="flex items-center gap-2 ml-1">
              <Sparkles size={14} className="text-emerald-500" />
              <p className="text-[13px] font-black text-gray-700">추가로 제안할 시간 설정</p>
            </div>

            {myNewSlots.length > 0 ? (
              <div className="space-y-3">
                {myNewSlots.map((slot) => (
                  <div key={slot.date} className="bg-gray-50 rounded-[24px] p-5 border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
                    {/* 날짜 및 종일 스위치 헤더 */}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-black text-gray-800">{dayjs(slot.date).format('MM월 DD일 (ddd)')}</span>

                      {/* [수정됨] 종일 선택 스위치 UI */}
                      <div className="flex items-center gap-2" onClick={() => toggleAllDay(slot.date)}>
                        <span className={`text-[11px] font-bold transition-colors ${slot.isAllDay ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {slot.isAllDay ? '종일 가능' : '시간 선택'}
                        </span>
                        <div
                          className={`
                            relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer
                            ${slot.isAllDay ? 'bg-emerald-500' : 'bg-gray-200'}
                          `}
                        >
                          <div
                            className={`
                              absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out
                              ${slot.isAllDay ? 'translate-x-5' : 'translate-x-0'}
                            `}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 시간 입력 필드 (종일 아닐 때만 노출) */}
                    {!slot.isAllDay && (
                      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm animate-in zoom-in duration-200">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateSlotTime(slot.date, 'startTime', e.target.value)}
                          className="flex-1 bg-transparent text-sm font-black text-blue-600 outline-none"
                        />
                        <span className="text-gray-300 font-bold">~</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateSlotTime(slot.date, 'endTime', e.target.value)}
                          className="flex-1 bg-transparent text-sm font-black text-blue-600 outline-none"
                        />
                      </div>
                    )}

                    {/* 종일일 때 안내 문구 */}
                    {slot.isAllDay && (
                      <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-50">
                        <p className="text-[12px] text-emerald-600 font-bold text-center">✨ 이 날은 하루 종일 가능해요!</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-[24px] bg-gray-50/50">
                <Plus size={20} className="mx-auto text-gray-300 mb-2" />
                <p className="text-[12px] text-gray-400 font-bold tracking-tight">캘린더에서 날짜를 선택해 시간을 추가해보세요.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50">
        <button
          onClick={() => {
            alert('응답과 새로운 시간 제안이 전송되었습니다!');
            navigate('/calendar');
          }}
          className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg"
        >
          <span>제안 제출하기</span>
          {myNewSlots.length > 0 && (
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-black ring-1 ring-white/30 animate-pulse">+ 역제안 {myNewSlots.length}건</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default MeetingResponse;
