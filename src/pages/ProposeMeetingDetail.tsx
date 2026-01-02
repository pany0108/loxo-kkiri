import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { Plus, X, ChevronLeft, Calendar as CalendarIcon, Sparkles, Users, MapPin, AlignLeft, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';

dayjs.extend(isSameOrAfter);

/**
 * 초대된 친구 데이터 인터페이스
 */
interface InvitedFriend {
  id: string;
  name: string;
}

/**
 * 이전 페이지(ProposeMeetingCreate)로부터 전달받는 Location State 인터페이스
 */
interface LocationState {
  title: string;
  description: string;
  location?: string;
  invitedFriends: InvitedFriend[];
  selectedDates: string[];
  calendarName: string;
}

/**
 * 개별 시간 슬롯 데이터 인터페이스
 */
interface TimeSlot {
  start: string;
  end: string;
  isAllDay: boolean;
}

/**
 * 약속 제안 상세 설정 페이지 (Step 2) 컴포넌트입니다.
 * - 선택된 날짜별로 구체적인 시간(Time Slot)을 설정합니다.
 * - '종일' 옵션 또는 '특정 시간대'를 여러 개 추가할 수 있습니다.
 * * @returns {JSX.Element} 약속 상세 설정 화면
 */
const ProposeMeetingDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * 라우터 상태로부터 약속 기본 정보를 불러옵니다.
   * 데이터가 없을 경우 기본값을 사용하여 에러를 방지합니다.
   */
  const {
    title,
    description,
    location: meetingLocation,
    invitedFriends,
    selectedDates,
  } = (location.state as LocationState) || {
    title: '새 약속',
    description: '',
    location: '',
    selectedDates: [dayjs().format('YYYY-MM-DD')],
    invitedFriends: [] as InvitedFriend[],
    calendarName: '',
  };

  /**
   * 날짜별 시간 슬롯 상태 관리
   * 초기값: 선택된 모든 날짜에 대해 기본적으로 19:00~21:00 슬롯 하나를 생성합니다.
   */
  const [timeSlots, setTimeSlots] = useState<Record<string, TimeSlot[]>>(
    selectedDates.reduce((acc: any, dateStr: string) => {
      acc[dateStr] = [{ start: '19:00', end: '21:00', isAllDay: false }];
      return acc;
    }, {}),
  );

  // [추가] 시간 통일 모달 상태
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncTime, setSyncTime] = useState({ start: '19:00', end: '20:00' });

  /**
   * 특정 날짜에 새로운 시간 슬롯을 추가합니다.
   * 기본값: 12:00 ~ 13:00
   * @param {string} dateStr - 대상 날짜 문자열
   */
  const handleAddSlot = (dateStr: string) => {
    setTimeSlots({
      ...timeSlots,
      [dateStr]: [...timeSlots[dateStr], { start: '12:00', end: '13:00', isAllDay: false }],
    });
  };

  /**
   * 특정 날짜의 시간 슬롯을 삭제합니다.
   * 최소 1개의 슬롯은 유지되어야 하므로, 남은 슬롯이 1개 이하일 경우 삭제하지 않습니다.
   * @param {string} dateStr - 대상 날짜 문자열
   * @param {number} index - 삭제할 슬롯의 인덱스
   */
  const handleDeleteSlot = (dateStr: string, index: number) => {
    if (timeSlots[dateStr].length <= 1) {
      return; // UI에서 삭제 버튼을 조건부 렌더링하거나 토스트 메시지로 대체 가능
    }
    const newSlots = [...timeSlots[dateStr]];
    newSlots.splice(index, 1);
    setTimeSlots({ ...timeSlots, [dateStr]: newSlots });
  };

  /**
   * 시간 슬롯의 시작/종료 시간을 변경합니다.
   * @param {string} dateStr - 대상 날짜 문자열
   * @param {number} index - 변경할 슬롯의 인덱스
   * @param {'start' | 'end'} field - 변경할 필드 (시작/종료)
   * @param {string} value - 변경된 시간 값 (HH:mm)
   */
  const handleTimeChange = (dateStr: string, index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...timeSlots[dateStr]];
    const newSlotData = { ...newSlots[index], [field]: value };

    // 시작 시간을 변경했을 때, 종료 시간이 시작 시간보다 빠르거나 같으면 종료 시간을 1시간 뒤로 자동 조정
    if (field === 'start') {
      const startTime = dayjs(`${dateStr}T${value}`);
      const endTime = dayjs(`${dateStr}T${newSlotData.end}`);
      if (startTime.isSameOrAfter(endTime)) {
        newSlotData.end = startTime.add(1, 'hour').format('HH:mm');
      }
    }

    newSlots[index] = newSlotData;
    setTimeSlots({ ...timeSlots, [dateStr]: newSlots });
  };

  /**
   * 특정 날짜의 '종일' 옵션을 토글합니다.
   * - 종일 설정 시: 기존 슬롯을 모두 지우고 00:00~23:59 (isAllDay: true) 슬롯 1개로 대체합니다.
   * - 종일 해제 시: 기본 시간대(12:00~13:00) 슬롯 1개로 초기화합니다.
   * @param {string} dateStr - 대상 날짜 문자열
   */
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

  /**
   * [수정] 시간 통일 모달을 엽니다.
   */
  const handleSyncTimes = () => {
    if (selectedDates.length < 1) {
      toast('시간을 설정할 날짜를 먼저 선택해주세요.');
      return;
    }

    const firstDate = selectedDates.sort()[0];
    const firstSlot = timeSlots[firstDate]?.[0];

    // 모달의 초기 시간을 첫 번째 날짜의 시간으로 설정 (종일이 아닐 경우)
    if (firstSlot && !firstSlot.isAllDay) {
      setSyncTime({ start: firstSlot.start, end: firstSlot.end });
    }

    setIsSyncModalOpen(true);
  };

  /**
   * [추가] 시간 통일 모달에서 설정한 시간으로 모든 슬롯을 업데이트합니다.
   */
  const applySyncedTime = () => {
    const newTimeSlots = { ...timeSlots };

    for (const dateStr of selectedDates) {
      newTimeSlots[dateStr] = [
        {
          start: syncTime.start,
          end: syncTime.end,
          isAllDay: false, // 시간을 지정하므로 종일 옵션은 해제
        },
      ];
    }

    setTimeSlots(newTimeSlots);
    toast.success('모든 시간대가 통일되었습니다.');
    setIsSyncModalOpen(false);
  };

  /**
   * [추가] 시간 통일 모달의 시간 입력 변경을 처리합니다.
   */
  const handleSyncTimeChange = (field: 'start' | 'end', value: string) => {
    const newSyncTime = { ...syncTime, [field]: value };

    if (field === 'start') {
      const startTime = dayjs(`2000-01-01T${value}`);
      const endTime = dayjs(`2000-01-01T${newSyncTime.end}`);
      if (startTime.isSameOrAfter(endTime)) {
        newSyncTime.end = startTime.add(1, 'hour').format('HH:mm');
      }
    }
    setSyncTime(newSyncTime);
  };

  /**
   * 최종 약속 생성 핸들러
   * 설정된 모든 데이터를 서버로 전송하고 완료 처리를 합니다.
   */
  const handleFinalConfirm = async () => {
    if (!auth.currentUser) return;

    try {
      const meetingRef = await addDoc(collection(db, 'meetings'), {
        title,
        description,
        location: meetingLocation,
        hostId: auth.currentUser.uid,
        hostName: auth.currentUser.displayName || '알 수 없음',
        participants: [auth.currentUser.uid, ...invitedFriends.map((f) => f.id)],
        invitedFriends: invitedFriends.map((f) => ({ uid: f.id, name: f.name })), // [추가] 이름 표시용 데이터
        dates: selectedDates,
        timeSlots,
        status: 'PENDING', // [수정] 생성 시 기본 상태는 조율 중(PENDING)
        createdAt: new Date().toISOString(),
      });

      // [추가] 초대된 친구들에게 알림 전송
      const batch = writeBatch(db);
      invitedFriends.forEach((friend) => {
        const notiRef = doc(collection(db, 'notifications'));
        batch.set(notiRef, {
          userId: friend.id,
          type: 'MEETING_INVITE',
          message: `${auth.currentUser?.displayName || '알 수 없음'}님이 '${title}' 약속에 초대했습니다.`,
          relatedId: meetingRef.id,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      });
      await batch.commit();

      navigate('/propose'); // 목록 페이지로 이동
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('약속 생성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors active:scale-90" aria-label="뒤로 가기">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-40 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            세부 <span className="text-blue-600">시간</span>을<br />
            설정해볼까요?
          </h2>
        </header>

        {/* 약속 요약 카드 */}
        <section className="bg-gray-50 rounded-[28px] p-6 mb-8 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-1 rounded-md">SUMMARY</span>
          </div>
          <h3 className="text-[18px] font-black text-gray-900 mb-2">{title}</h3>

          <div className="space-y-3 mb-4">
            {description && (
              <div className="flex items-start gap-2.5">
                <AlignLeft size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-[14px] font-medium text-gray-600 leading-relaxed whitespace-pre-wrap">{description}</p>
              </div>
            )}
            {meetingLocation && (
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-[14px] font-medium text-gray-600 leading-relaxed">{meetingLocation}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-gray-200/60">
            <Users size={16} className="text-gray-400" />
            <span className="text-[13px] font-bold text-gray-600">{invitedFriends.length > 0 ? invitedFriends.map((f) => f.name).join(', ') : '초대된 친구 없음'}</span>
          </div>
        </section>

        {/* [추가] 시간 설정 헤더 및 통일 버튼 */}
        <div className="flex items-center justify-between mb-6 pt-8 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-[15px] font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            시간대 설정
          </h3>
          <button
            onClick={handleSyncTimes}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            시간 일괄 설정
          </button>
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

                  {/* 종일 옵션 토글 */}
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
                    // 종일 선택 시 표시되는 UI
                    <div className="w-full h-[60px] bg-emerald-50 rounded-[20px] border border-emerald-100 flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                      <Sparkles size={16} className="text-emerald-500" />
                      <span className="text-[14px] font-bold text-emerald-600">이 날은 하루 종일 가능해요!</span>
                    </div>
                  ) : (
                    // 시간대별 슬롯 리스트
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

                          {/* 슬롯 삭제 버튼 (마지막 1개 남았을 때 삭제 불가 처리 로직 필요 시 적용) */}
                          <button
                            onClick={() => handleDeleteSlot(dateStr, index)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                            aria-label="시간대 삭제"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}

                      {/* 시간대 추가 버튼 */}
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

      {/* [추가] 시간 통일 모달 */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSyncModalOpen(false)} />
          <div className="relative w-full max-w-xs bg-white dark:bg-gray-800 rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">시간 일괄 설정</h3>
            <p className="text-gray-500 dark:text-gray-400 text-[14px] mb-6 font-medium leading-relaxed">
              모든 날짜의 시간을
              <br />
              아래 시간으로 통일합니다.
            </p>

            {/* [수정] 시간 입력 UI를 세로로 변경하여 가독성 확보 */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between h-[50px] bg-gray-50 dark:bg-gray-700/50 rounded-[16px] px-4 border border-gray-100 dark:border-gray-700">
                <label className="text-[14px] font-bold text-gray-500 dark:text-gray-400">시작 시간</label>
                <input
                  type="time"
                  value={syncTime.start}
                  onChange={(e) => handleSyncTimeChange('start', e.target.value)}
                  className="bg-transparent border-none outline-none w-auto text-[14px] font-bold text-gray-900 dark:text-white text-right"
                />
              </div>
              <div className="flex items-center justify-between h-[50px] bg-gray-50 dark:bg-gray-700/50 rounded-[16px] px-4 border border-gray-100 dark:border-gray-700">
                <label className="text-[14px] font-bold text-gray-500 dark:text-gray-400">종료 시간</label>
                <input
                  type="time"
                  value={syncTime.end}
                  onChange={(e) => handleSyncTimeChange('end', e.target.value)}
                  className="bg-transparent border-none outline-none w-auto text-[14px] font-bold text-gray-900 dark:text-white text-right"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={applySyncedTime} className="w-full py-4 bg-blue-600 text-white font-bold rounded-[20px] active:scale-95 transition-all">
                적용하기
              </button>
              <button onClick={() => setIsSyncModalOpen(false)} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600 dark:hover:text-gray-300">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 고정 제안 발송 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50 z-20">
        <button
          onClick={handleFinalConfirm}
          className="w-full h-[62px] bg-blue-600 text-white rounded-[24px] font-black text-[17px] shadow-lg shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>약속 제안 발송하기</span>
          <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-[12px] font-bold">{Object.values(timeSlots).flat().length}개 슬롯</span>
        </button>
      </footer>
    </div>
  );
};

export default ProposeMeetingDetail;
