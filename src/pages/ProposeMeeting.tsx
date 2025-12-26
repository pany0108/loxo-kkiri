import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';

const ProposeMeeting = () => {
  const navigate = useNavigate();

  // 상태 관리: 선택된 날짜들 (YYYY-MM-DD 형식의 문자열 배열)
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  // 날짜 선택 토글 로직
  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => (prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]));
  };

  // 캘린더 날짜 생성 로직
  const generateDates = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const dates = [];

    // 시작 요일에 맞춘 빈 칸 채우기
    for (let i = 0; i < startOfMonth.day(); i++) {
      dates.push(null);
    }

    // 실제 날짜 채우기
    for (let i = 1; i <= endOfMonth.date(); i++) {
      dates.push(startOfMonth.date(i).format('YYYY-MM-DD'));
    }
    return dates;
  };

  const handleConfirm = () => {
    alert('약속 제안이 친구들에게 발송되었습니다!');
    navigate('/calendar');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 상단 네비게이션 */}
      <nav className="bg-white px-4 py-4 flex items-center border-b sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg mr-6 text-gray-900">새 약속 제안</h1>
      </nav>

      <div className="p-5 space-y-6">
        {/* 단계 1: 다중 날짜 선택 (커스텀 캘린더) */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6 text-blue-600">
            <CalendarIcon size={20} strokeWidth={2.5} />
            <h2 className="font-bold">1. 후보 날짜 선택</h2>
          </div>

          {/* 캘린더 헤더 */}
          <div className="flex items-center justify-between mb-4 px-2">
            <button onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))} className="p-1">
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-gray-800">{currentMonth.format('YYYY년 MM월')}</span>
            <button onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))} className="p-1">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* 캘린더 그리드 */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
              <span key={d} className="text-[10px] font-bold text-gray-300 py-2">
                {d}
              </span>
            ))}
            {generateDates().map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />;
              const isSelected = selectedDates.includes(date);
              const isToday = date === dayjs().format('YYYY-MM-DD');

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => toggleDate(date)}
                  className={`
                    aspect-square rounded-2xl text-sm font-bold transition-all flex items-center justify-center
                    ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'hover:bg-gray-50 text-gray-700'}
                    ${isToday && !isSelected ? 'text-blue-600 ring-1 ring-blue-100' : ''}
                  `}
                >
                  {dayjs(date).date()}
                </button>
              );
            })}
          </div>
        </section>

        {/* 단계 2: 시간 설정 목록 */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 text-orange-500">
            <Clock size={20} strokeWidth={2.5} />
            <h2 className="font-bold">2. 상세 시간 설정</h2>
          </div>

          <div className="space-y-3">
            {selectedDates.length > 0 ? (
              [...selectedDates].sort().map((date) => (
                <div key={date} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group active:scale-[0.98] transition-transform">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Selected Date</span>
                    <span className="text-sm font-extrabold text-gray-700">{dayjs(date).format('MM월 DD일 (ddd)')}</span>
                  </div>
                  <button className="text-xs font-black text-blue-600 bg-white border border-blue-100 px-4 py-2 rounded-xl shadow-sm active:bg-blue-600 active:text-white transition-all">
                    시간 추가
                  </button>
                </div>
              ))
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-[24px]">
                <p className="text-sm text-gray-300 font-medium">먼저 위에서 날짜를 선택해주세요.</p>
              </div>
            )}
          </div>
        </section>

        {/* 제안하기 버튼 */}
        <button
          onClick={handleConfirm}
          disabled={selectedDates.length === 0}
          className={`
            w-full py-5 rounded-[24px] font-black text-lg shadow-xl transition-all
            ${selectedDates.length > 0 ? 'bg-blue-600 text-white shadow-blue-200 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
          `}
        >
          약속 제안 발송하기
        </button>
      </div>
    </div>
  );
};

export default ProposeMeeting;
