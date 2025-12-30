import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Plus, Sparkles, Clock, Calendar as CalendarIcon, MapPin, AlignLeft } from 'lucide-react';
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

  // 데이터 Mock
  const [hostProposal] = useState({
    title: '강남역 삼겹살 파티 🥓',
    host: '김철수',
    description: '오랜만에 다같이 모여서 맛있는 삼겹살 먹자! 🐷\n강남역 10번 출구 근처 맛집으로 예약할 예정이야.',
    location: '강남역 하남돼지집',
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
      setMyNewSlots((prev) => [...prev, { date: dateStr, startTime: '12:00', endTime: '14:00', isAllDay: true }]);
    }
  };

  const updateSlotTime = (dateStr: string, field: 'startTime' | 'endTime', value: string) => {
    setMyNewSlots((prev) => prev.map((s) => (s.date === dateStr ? { ...s, [field]: value, isAllDay: false } : s)));
  };

  const toggleAllDay = (dateStr: string) => {
    setMyNewSlots((prev) => prev.map((s) => (s.date === dateStr ? { ...s, isAllDay: !s.isAllDay } : s)));
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
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors active:scale-90">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-32 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            {hostProposal.host}님의 제안에
            <br />
            <span className="text-blue-600">응답해주세요</span>
          </h2>
        </div>

        {/* 약속 상세 정보 카드 */}
        <div className="bg-gray-50 rounded-[28px] p-6 mb-10 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-1 rounded-md">INVITATION</span>
          </div>

          <h3 className="text-[19px] font-black text-gray-900 mb-3">{hostProposal.title}</h3>

          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <AlignLeft size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <p className="text-[14px] font-medium text-gray-600 leading-relaxed whitespace-pre-wrap">{hostProposal.description}</p>
            </div>

            <div className="flex items-center gap-2.5">
              <MapPin size={16} className="text-gray-400 shrink-0" />
              <p className="text-[14px] font-bold text-gray-700">{hostProposal.location}</p>
            </div>
          </div>
        </div>

        {/* 주최자 제안 확인 영역 */}
        <section className="space-y-4 mb-10">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-black text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" /> 제안된 시간
            </h3>
            <span className="text-[11px] font-bold text-gray-400">가능한 시간을 모두 선택하세요</span>
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
                    w-full flex items-center justify-between p-5 rounded-[24px] border-2 transition-all duration-200 ease-out relative overflow-hidden group
                    ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02] z-10'
                        : 'bg-white border-gray-100 text-gray-800 shadow-sm hover:border-blue-100 active:scale-[0.98]'
                    }
                  `}
                >
                  <div className="text-left relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-[16px] font-black tracking-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>{dayjs(slot.date).format('MM월 DD일 (ddd)')}</p>
                      {!isSelected && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-bold">HOST</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[13px] font-bold ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>{slot.time}</p>
                    </div>

                    {isConflict && !isSelected && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-red-500 font-bold mt-2 bg-red-50 px-2 py-1 rounded-lg">
                        <AlertCircle size={12} strokeWidth={2.5} />
                        <span>내 일정과 겹침</span>
                      </div>
                    )}
                  </div>

                  <div className="relative z-10">
                    {isSelected ? (
                      <CheckCircle2 size={24} className="text-white" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-blue-300 transition-colors" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 내 캘린더 대조 및 역제안 영역 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-black text-gray-900 flex items-center gap-2">
              <CalendarIcon size={18} className="text-emerald-500" /> 다른 시간 제안하기
            </h3>

            <div className="flex gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>내 일정
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>선택됨
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-[32px] p-6 border-2 border-transparent">
            <div className="flex items-center justify-between mb-6 px-2">
              <button
                onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
                className="p-2 bg-white rounded-xl text-gray-400 hover:text-gray-900 shadow-sm transition-all active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-[16px] font-black text-gray-900">{currentMonth.format('YYYY년 MM월')}</span>
              <button
                onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}
                className="p-2 bg-white rounded-xl text-gray-400 hover:text-gray-900 shadow-sm transition-all active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
              {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                <span key={d} className="text-[11px] font-black text-gray-300 mb-2">
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
                      relative w-full aspect-square flex flex-col items-center justify-center rounded-[14px] transition-all duration-200
                      ${isMyNewProposal ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-105 z-10' : 'bg-white text-gray-700 hover:bg-gray-100'}
                      ${isHostProposed ? 'ring-2 ring-blue-100' : ''}
                    `}
                  >
                    <span className={`text-[13px] font-bold ${isMyNewProposal ? 'text-white' : 'text-gray-700'}`}>{dayjs(date).date()}</span>
                    {hasMySchedule && !isMyNewProposal && <div className="absolute bottom-2 w-1 h-1 rounded-full bg-red-400 ring-2 ring-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {myNewSlots.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="px-1">
                <p className="text-[13px] font-black text-gray-900">추가된 시간 설정</p>
              </div>

              <div className="space-y-3">
                {myNewSlots.map((slot) => (
                  <div key={slot.date} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-[24px] p-5 border-2 border-emerald-100 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[15px] font-black text-gray-900">{dayjs(slot.date).format('MM월 DD일 (ddd)')}</span>

                        <div onClick={() => toggleAllDay(slot.date)} className="flex items-center gap-2 cursor-pointer group">
                          <span className={`text-[11px] font-bold transition-colors ${slot.isAllDay ? 'text-emerald-600' : 'text-gray-400'}`}>종일 가능</span>
                          <div
                            className={`
                               relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0
                               ${slot.isAllDay ? 'bg-emerald-500' : 'bg-gray-200'}
                             `}
                          >
                            <div
                              className={`
                                 absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200
                                 ${slot.isAllDay ? 'translate-x-4' : 'translate-x-0'}
                               `}
                            />
                          </div>
                        </div>
                      </div>

                      {slot.isAllDay ? (
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                          <p className="text-[12px] text-emerald-600 font-bold">✨ 하루 종일 가능해요!</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 h-[50px] bg-gray-50 rounded-[16px] px-4 border border-gray-100">
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateSlotTime(slot.date, 'startTime', e.target.value)}
                              className="bg-transparent border-none outline-none w-full text-[14px] font-bold text-gray-900 text-center"
                            />
                            <span className="text-gray-300">-</span>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateSlotTime(slot.date, 'endTime', e.target.value)}
                              className="bg-transparent border-none outline-none w-full text-[14px] font-bold text-gray-900 text-center"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myNewSlots.length === 0 && (
            <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-[24px]">
              <Plus size={20} className="mx-auto text-gray-300 mb-2" />
              <p className="text-[12px] text-gray-400 font-bold">
                가능한 다른 날짜가 있다면
                <br />
                달력을 눌러 추가해주세요.
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50 z-20">
        <button
          onClick={() => {
            alert('응답과 새로운 시간 제안이 전송되었습니다!');
            navigate('/calendar');
          }}
          className="w-full h-[62px] bg-blue-600 text-white rounded-[24px] font-black text-[17px] shadow-lg shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>제안 제출하기</span>
          {myNewSlots.length > 0 && <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-lg text-[11px] font-bold">+ 역제안 {myNewSlots.length}건</span>}
        </button>
      </div>
    </div>
  );
};

export default MeetingResponse;
