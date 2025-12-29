import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, Trash2, ChevronLeft, Clock, CalendarCheck, Sparkles, AlertCircle } from 'lucide-react';

// [수정 1] 타입 정의 추가
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

const ProposeMeetingDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // [수정 2] location.state에 타입 지정 및 기본값 설정 시 타입 단언(as) 사용
  const { title, description, invitedFriends, selectedDates, calendarName } = (location.state as LocationState) || {
    title: '새 약속',
    description: '',
    selectedDates: [dayjs().format('YYYY-MM-DD')],
    invitedFriends: [] as InvitedFriend[], // 빈 배열도 타입 명시
    calendarName: '',
  };

  // 날짜별 시간 슬롯 상태 관리
  const [timeSlots, setTimeSlots] = useState<Record<string, { start: string; end: string }[]>>(
    selectedDates.reduce((acc: any, dateStr: string) => {
      acc[dateStr] = [{ start: '19:00', end: '21:00' }];
      return acc;
    }, {}),
  );

  const handleAddSlot = (dateStr: string) => {
    setTimeSlots({
      ...timeSlots,
      [dateStr]: [...timeSlots[dateStr], { start: '12:00', end: '13:00' }],
    });
  };

  const handleDeleteSlot = (dateStr: string, index: number) => {
    if (timeSlots[dateStr].length <= 1) {
      alert('날짜별로 최소 하나의 시간대는 설정해야 합니다.');
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

  const handleFinalConfirm = () => {
    alert(`${calendarName}이 생성되었으며, 친구들에게 푸시 알림을 보냈습니다!`);
    navigate('/calendar');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-4 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-5 pt-4 pb-32 overflow-y-auto max-w-md mx-auto w-full">
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

        {/* 약속 요약 카드 */}
        <div className="bg-gray-50 rounded-[24px] p-6 mb-8 border-2 border-transparent">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-black text-blue-500 bg-blue-100 px-2 py-0.5 rounded-md">PROPOSAL</span>
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
          <p className="text-[14px] font-medium text-gray-500 leading-relaxed">{description || '작성된 메모가 없습니다.'}</p>
          {invitedFriends.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200/50 flex items-center gap-2">
              <span className="text-[12px] font-bold text-gray-400">함께하는 친구:</span>
              <span className="text-[13px] font-bold text-gray-700">
                {/* [오류 해결됨] invitedFriends가 InvitedFriend[] 타입이므로 f.name 접근 가능 */}
                {invitedFriends.map((f) => f.name).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="flex items-start gap-2 mb-6 px-1">
          <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-[13px] text-gray-500 font-bold leading-snug">
            친구들이 투표할 후보 시간대를 정해주세요.
            <br />
            <span className="text-blue-600">여러 시간대</span>를 추가하면 약속 잡기가 더 쉬워져요!
          </p>
        </div>

        {/* 날짜별 시간 설정 리스트 */}
        <div className="space-y-8">
          {selectedDates.sort().map((dateStr: string) => (
            <div key={dateStr} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-3 px-1">
                <CalendarCheck size={18} className="text-blue-600" />
                <h3 className="text-[16px] font-black text-gray-900">{dayjs(dateStr).format('MM월 DD일 (ddd)')}</h3>
              </div>

              <div className="space-y-3">
                {timeSlots[dateStr]?.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2 group">
                    {/* 시간 입력 컨테이너 */}
                    <div className="flex-1 min-w-0 flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-4 transition-all shadow-sm">
                      <Clock size={18} className="text-gray-300 mr-3" />
                      <div className="flex-1 flex items-center justify-between gap-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => handleTimeChange(dateStr, index, 'start', e.target.value)}
                          className="bg-transparent border-none outline-none w-full text-[15px] font-bold text-gray-900 text-center font-mono"
                        />
                        <span className="text-gray-300 font-bold mx-1">~</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => handleTimeChange(dateStr, index, 'end', e.target.value)}
                          className="bg-transparent border-none outline-none w-full text-[15px] font-bold text-gray-900 text-center font-mono"
                        />
                      </div>
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => handleDeleteSlot(dateStr, index)}
                      className="w-[60px] h-[60px] flex items-center justify-center rounded-[20px] bg-white border-2 border-gray-100 text-gray-300 hover:border-red-100 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}

                {/* 시간 추가 버튼 */}
                <button
                  onClick={() => handleAddSlot(dateStr)}
                  className="w-full h-[56px] border-2 border-dashed border-gray-200 rounded-[20px] flex items-center justify-center gap-2 text-gray-400 font-bold text-[14px] hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50/30 transition-all active:scale-[0.98]"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  시간대 추가하기
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50 z-20">
        <button
          onClick={handleFinalConfirm}
          className="w-full h-[62px] bg-blue-600 text-white rounded-[24px] font-black text-[17px] shadow-lg shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>약속 제안 발송하기</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[11px] font-bold">{Object.values(timeSlots).flat().length}개 슬롯</span>
        </button>
      </div>
    </div>
  );
};

export default ProposeMeetingDetail;
