import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Plus, Sparkles, Clock, Calendar as CalendarIcon, MapPin, AlignLeft, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { db, auth } from '../firebase';
import { doc, updateDoc, getDoc, writeBatch, collection } from 'firebase/firestore';
import { useFirestoreDoc } from 'hooks';
import toast from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';

dayjs.locale('ko');

/**
 * 사용자가 새로 제안하는 시간 슬롯 인터페이스
 */
interface MyNewSlot {
  date: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
}

/**
 * Firestore 약속 데이터 인터페이스
 */
interface MeetingData {
  id: string;
  title: string;
  description?: string;
  location?: string;
  hostName?: string;
  dates: string[];
  timeSlots: Record<string, { start: string; end: string; isAllDay: boolean }[]>;
  responses?: Record<string, any>;
}

/**
 * 초대받은 약속에 대해 응답하는 페이지 컴포넌트입니다.
 * - 주최자가 제안한 시간 중 가능한 시간을 선택할 수 있습니다.
 * - 주최자의 제안 외에 새로운 시간을 역으로 제안할 수 있습니다 (달력 인터랙션).
 * * @returns {JSX.Element} 약속 응답 화면
 */
const MeetingResponse = () => {
  const navigate = useNavigate();
  const { id: meetingId } = useParams<{ id: string }>();

  // --- 상태 관리 ---
  const [user, setUser] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedHostSlots, setSelectedHostSlots] = useState<string[]>([]); // ID를 string으로 변경
  const [myNewSlots, setMyNewSlots] = useState<MyNewSlot[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  // 주최자 제안 슬롯 데이터 변환
  const hostSlots = useMemo(() => {
    if (!meetingData) return [];
    const slots: any[] = [];
    meetingData.dates.sort().forEach((dateStr) => {
      meetingData.timeSlots[dateStr]?.forEach((ts, index) => {
        slots.push({
          id: `${dateStr}_${index}`,
          date: dateStr,
          time: ts.isAllDay ? '종일' : `${ts.start} ~ ${ts.end}`,
        });
      });
    });
    return slots;
  }, [meetingData]);

  // 내 기존 일정 데이터 (충돌 확인용)
  // TODO: 실제 내 일정 쿼리 연동 필요
  const myExistingSchedules: string[] = [];

  /**
   * 주최자가 제안한 슬롯의 선택 상태를 토글합니다.
   * @param {string} slotId - 슬롯 고유 ID
   */
  const toggleHostSlot = (slotId: string) => {
    setSelectedHostSlots((prev) => (prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]));
  };

  /**
   * 달력 날짜 클릭 시 새로운 역제안 시간을 추가하거나 제거합니다.
   * - 주최자가 이미 제안한 날짜는 선택할 수 없습니다.
   * - 이미 선택된 날짜는 목록에서 제거합니다.
   * - 새로운 날짜는 기본값(12:00~14:00, 종일)으로 추가됩니다.
   * @param {string} dateStr - 선택한 날짜 문자열 (YYYY-MM-DD)
   */
  const toggleMyNewSlot = (dateStr: string) => {
    const isHostDate = hostSlots.some((s) => s.date === dateStr);

    // 주최자 제안 날짜는 상단 카드에서 선택하도록 유도 (UI상 클릭 방지 처리)
    if (isHostDate) {
      return;
    }

    if (myNewSlots.find((s) => s.date === dateStr)) {
      setMyNewSlots((prev) => prev.filter((s) => s.date !== dateStr));
    } else {
      setMyNewSlots((prev) => [...prev, { date: dateStr, startTime: '12:00', endTime: '14:00', isAllDay: true }]);
    }
  };

  /**
   * 역제안 슬롯의 시간(시작/종료)을 업데이트합니다.
   * 시간을 직접 수정하면 '종일' 옵션은 자동으로 해제됩니다.
   */
  const updateSlotTime = (dateStr: string, field: 'startTime' | 'endTime', value: string) => {
    setMyNewSlots((prev) => prev.map((s) => (s.date === dateStr ? { ...s, [field]: value, isAllDay: false } : s)));
  };

  /**
   * 역제안 슬롯의 '종일' 여부를 토글합니다.
   */
  const toggleAllDay = (dateStr: string) => {
    setMyNewSlots((prev) => prev.map((s) => (s.date === dateStr ? { ...s, isAllDay: !s.isAllDay } : s)));
  };

  /**
   * 현재 월의 달력 그리드 데이터를 생성합니다.
   * 빈 칸(이전 달 날짜 공간)은 null로 채웁니다.
   * @returns {(string | null)[]} 날짜 문자열 배열
   */
  const generateDates = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const dates = [];
    for (let i = 0; i < startOfMonth.day(); i++) dates.push(null);
    for (let i = 1; i <= endOfMonth.date(); i++) dates.push(startOfMonth.date(i).format('YYYY-MM-DD'));
    return dates;
  };

  /**
   * 최종 응답 제출 핸들러
   * 선택한 주최자 제안 슬롯과 새로 추가한 역제안 슬롯을 서버로 전송합니다.
   */
  const handleSubmitResponse = async () => {
    if (!meetingDocRef || !user || !meetingData) return;

    try {
      // 1. 내 응답을 먼저 업데이트
      await updateDoc(meetingDocRef, {
        [`responses.${user.uid}`]: {
          responded: true,
          name: user.displayName,
          selectedSlots: selectedHostSlots,
          newSlots: myNewSlots,
        },
      });

      // 2. 업데이트된 문서를 다시 읽어와서 모든 참여자가 응답했는지 확인
      const updatedDocSnap = await getDoc(meetingDocRef);
      if (!updatedDocSnap.exists()) return;

      const updatedMeetingData = updatedDocSnap.data();
      const totalInvited = updatedMeetingData.participants.length - 1;
      const respondedCount = Object.keys(updatedMeetingData.responses || {}).length;

      // 모든 응답이 완료되었고, 아직 PENDING 상태일 때만 실행
      if (respondedCount >= totalInvited && updatedMeetingData.status === 'PENDING') {
        // [수정] 모든 응답자의 제안을 취합하여 새로운 투표 슬롯 생성
        const allProposedSlots: { date: string; start: string; end: string; isAllDay: boolean }[] = [];
        const uniqueSlotChecker = new Set<string>();

        // 1. 주최자의 원래 제안 추가
        Object.entries(updatedMeetingData.timeSlots).forEach(([date, slots]) => {
          (slots as any[]).forEach((slot) => {
            const slotString = `${date}_${slot.start}_${slot.end}_${slot.isAllDay}`;
            if (!uniqueSlotChecker.has(slotString)) {
              allProposedSlots.push({ date, ...slot });
              uniqueSlotChecker.add(slotString);
            }
          });
        });

        // 2. 모든 참여자의 역제안 추가
        Object.values(updatedMeetingData.responses).forEach((response: any) => {
          if (response.newSlots && Array.isArray(response.newSlots)) {
            response.newSlots.forEach((newSlot: MyNewSlot) => {
              const slotData = { date: newSlot.date, start: newSlot.startTime, end: newSlot.endTime, isAllDay: newSlot.isAllDay };
              const slotString = `${slotData.date}_${slotData.start}_${slotData.end}_${slotData.isAllDay}`;
              if (!uniqueSlotChecker.has(slotString)) {
                allProposedSlots.push(slotData);
                uniqueSlotChecker.add(slotString);
              }
            });
          }
        });

        // 3. 취합된 슬롯으로 dates와 timeSlots 재구성
        const newTimeSlots: Record<string, { start: string; end: string; isAllDay: boolean }[]> = {};
        const newDates = new Set<string>();
        allProposedSlots.forEach((slot) => {
          newDates.add(slot.date);
          if (!newTimeSlots[slot.date]) newTimeSlots[slot.date] = [];
          newTimeSlots[slot.date].push({ start: slot.start, end: slot.end, isAllDay: slot.isAllDay });
        });

        // 4. 약속 상태를 VOTING으로 변경하고, 취합된 시간 정보로 업데이트
        await updateDoc(meetingDocRef, { status: 'VOTING', dates: Array.from(newDates).sort(), timeSlots: newTimeSlots });

        // 투표 시작 알림 전송 (모든 참여자에게)
        const batch = writeBatch(db);
        updatedMeetingData.participants.forEach((uid: string) => {
          const notiRef = doc(collection(db, 'notifications'));
          batch.set(notiRef, {
            userId: uid,
            type: 'MEETING_VOTING_STARTED',
            message: `'${updatedMeetingData.title}' 약속의 시간이 조율되었습니다. 최종 투표를 진행해주세요.`,
            relatedId: meetingId,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        });
        await batch.commit();

        toast.success('모든 친구가 응답하여 투표가 시작됩니다!');
      } else {
        toast.success('응답이 제출되었습니다.');
      }

      navigate('/propose');
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('응답 제출 중 오류가 발생했습니다.');
    }
  };

  if (loading || !meetingData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-40">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-90"
          aria-label="뒤로 가기"
        >
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-32 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <header className="mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-6">
            <Sparkles className="text-blue-600 dark:text-blue-400 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            {meetingData.hostName}님의 제안에
            <br />
            <span className="text-blue-600 dark:text-blue-400">응답해주세요</span>
          </h2>
        </header>

        {/* 약속 상세 정보 카드 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-[28px] p-6 mb-10 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-blue-500 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-md">INVITATION</span>
          </div>

          <h3 className="text-[19px] font-black text-gray-900 dark:text-white mb-3">{meetingData.title}</h3>

          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <AlignLeft size={16} className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
              <p className="text-[14px] font-medium text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{meetingData.description || '설명 없음'}</p>
            </div>
            {meetingData.location && (
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                <p className="text-[14px] font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{meetingData.location}</p>
              </div>
            )}
          </div>
        </div>

        {/* 주최자 제안 확인 및 선택 영역 */}
        <section className="space-y-4 mb-10">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Clock size={18} className="text-blue-600 dark:text-blue-400" /> 제안된 시간
            </h3>
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">가능한 시간을 모두 선택하세요</span>
          </div>

          <div className="space-y-3">
            {hostSlots.map((slot) => {
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
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/50 scale-[1.02] z-10'
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-800 shadow-sm hover:border-blue-100 dark:hover:border-blue-500/20 active:scale-[0.98]'
                    }
                  `}
                >
                  <div className="text-left relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-[16px] font-black tracking-tight ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {dayjs(slot.date).format('MM월 DD일 (ddd)')}
                      </p>
                      {!isSelected && <span className="text-[9px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-md font-bold">HOST</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[13px] font-bold ${isSelected ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>{slot.time}</p>
                    </div>

                    {isConflict && !isSelected && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-red-500 dark:text-red-400 font-bold mt-2 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg">
                        <AlertCircle size={12} strokeWidth={2.5} />
                        <span>내 일정과 겹침</span>
                      </div>
                    )}
                  </div>

                  <div className="relative z-10">
                    {isSelected ? (
                      <CheckCircle2 size={24} className="text-white" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-blue-300 dark:group-hover:border-blue-400 transition-colors" />
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
            <h3 className="text-[15px] font-black text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarIcon size={18} className="text-emerald-500 dark:text-emerald-400" /> 다른 시간 제안하기
            </h3>

            <div className="flex gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>내 일정
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>선택됨
              </span>
            </div>
          </div>

          {/* 달력 컴포넌트 */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-[32px] p-6 border-2 border-transparent">
            <div className="flex items-center justify-between mb-6 px-2">
              <button
                onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
                className="p-2 bg-white dark:bg-gray-700 rounded-xl text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white shadow-sm transition-all active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-[16px] font-black text-gray-900 dark:text-white">{currentMonth.format('YYYY년 MM월')}</span>
              <button
                onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}
                className="p-2 bg-white dark:bg-gray-700 rounded-xl text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white shadow-sm transition-all active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
              {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                <span key={d} className="text-[11px] font-black text-gray-300 dark:text-gray-600 mb-2">
                  {d}
                </span>
              ))}
              {generateDates().map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />;

                const hasMySchedule = myExistingSchedules.includes(date);
                const isHostProposed = hostSlots.some((s) => s.date === date);
                const isMyNewProposal = myNewSlots.some((s) => s.date === date);

                return (
                  <button
                    key={date}
                    onClick={() => toggleMyNewSlot(date)}
                    className={`
                      relative w-full aspect-square flex flex-col items-center justify-center rounded-[14px] transition-all duration-200
                      ${
                        isMyNewProposal
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50 scale-105 z-10'
                          : 'bg-white dark:bg-gray-700/50 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                      ${isHostProposed ? 'ring-2 ring-blue-100 dark:ring-blue-500/30' : ''}
                    `}
                  >
                    <span className={`text-[13px] font-bold ${isMyNewProposal ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{dayjs(date).date()}</span>
                    {hasMySchedule && !isMyNewProposal && <div className="absolute bottom-2 w-1 h-1 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 추가된 역제안 슬롯 설정 영역 */}
          {myNewSlots.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="px-1">
                <p className="text-[13px] font-black text-gray-900 dark:text-gray-200">추가된 시간 설정</p>
              </div>

              <div className="space-y-3">
                {myNewSlots.map((slot) => (
                  <div key={slot.date} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-5 border-2 border-emerald-100 dark:border-emerald-500/30 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[15px] font-black text-gray-900 dark:text-white">{dayjs(slot.date).format('MM월 DD일 (ddd)')}</span>

                        {/* 종일 스위치 */}
                        <div onClick={() => toggleAllDay(slot.date)} className="flex items-center gap-2 cursor-pointer group">
                          <span className={`text-[11px] font-bold transition-colors ${slot.isAllDay ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>종일</span>
                          <div
                            className={`
                               relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0
                               ${slot.isAllDay ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'}
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

                      {/* 시간 설정 인풋 */}
                      {slot.isAllDay ? (
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 px-3 py-[15px] rounded-xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                          <p className="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold">✨ 하루 종일 가능해요!</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 h-[50px] bg-gray-50 dark:bg-gray-700/50 rounded-[16px] px-4 border border-gray-100 dark:border-gray-700">
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateSlotTime(slot.date, 'startTime', e.target.value)}
                              className="bg-transparent border-none outline-none w-full text-[14px] font-bold text-gray-900 dark:text-white text-center"
                            />
                            <span className="text-gray-300 dark:text-gray-600">-</span>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateSlotTime(slot.date, 'endTime', e.target.value)}
                              className="bg-transparent border-none outline-none w-full text-[14px] font-bold text-gray-900 dark:text-white text-center"
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

          {/* 역제안이 없을 때 표시되는 가이드 */}
          {myNewSlots.length === 0 && (
            <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-700/50 rounded-[24px]">
              <Plus size={20} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-[12px] text-gray-400 dark:text-gray-500 font-bold">
                가능한 다른 날짜가 있다면
                <br />
                달력을 눌러 추가해주세요.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* 하단 고정 제출 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-50 dark:border-gray-800 z-20">
        <button
          onClick={handleSubmitResponse}
          className="w-full h-[62px] bg-blue-600 text-white rounded-[24px] font-black text-[17px] shadow-lg shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>제안 제출하기</span>
          {myNewSlots.length > 0 && (
            <span className="bg-emerald-500 dark:bg-emerald-400 text-white dark:text-emerald-900 px-2 py-0.5 rounded-lg text-[11px] font-bold">+ 역제안 {myNewSlots.length}건</span>
          )}
        </button>
      </footer>
    </div>
  );
};

export default MeetingResponse;
