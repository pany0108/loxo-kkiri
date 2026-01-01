import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, CheckCircle2, AlertCircle, XCircle, Sparkles, MessageSquare, Trash2, RefreshCw, Clock, Loader2 } from 'lucide-react';
import ConfirmMeetingDialog from './ConfirmMeetingDialog';
import { doc, updateDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useFirestoreDoc } from '../hooks/useFirestore';
import dayjs from 'dayjs';

/**
 * 리포트 슬롯 데이터 인터페이스
 */
interface ReportSlot {
  id: string;
  date: string;
  time: string;
  responses: {
    available: string[];
    maybe: string[];
    unavailable: string[];
  };
  memos: { user: string; text: string }[];
  isAllAvailable: boolean;
}

/**
 * Firestore에서 가져온 미팅 데이터 인터페이스
 */
interface MeetingData {
  id: string;
  title: string;
  description?: string;
  participants: string[];
  dates: string[];
  timeSlots: Record<string, { start: string; end: string; isAllDay: boolean }[]>;
  votes?: Record<string, Record<string, { vote: 'available' | 'maybe' | 'unavailable'; memo: string; name: string }>>;
}

/**
 * 일정 조율 결과 리포트 컴포넌트입니다.
 * 멤버들의 투표 결과를 종합하여 보여주고, 최종 약속 시간을 확정하거나 재요청/취소할 수 있습니다.
 * * @returns {JSX.Element} 투표 결과 리포트 화면
 */
const MeetingReport = () => {
  const navigate = useNavigate();
  const { id: meetingId } = useParams<{ id: string }>();

  /**
   * 확정 확인 모달의 열림 상태
   */
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  /**
   * [추가] 약속 취소 확인 모달의 열림 상태
   */
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  /**
   * 사용자가 확정하려고 선택한 시간대 데이터
   */
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  const reportData: ReportSlot[] = useMemo(() => {
    if (!meetingData) return [];

    const slots: ReportSlot[] = [];
    const totalParticipants = meetingData.participants.length;

    meetingData.dates.sort().forEach((dateStr) => {
      meetingData.timeSlots[dateStr]?.forEach((ts, index) => {
        const slotId = `${dateStr}_${index}`;
        const votesForSlot = meetingData.votes?.[slotId] || {};
        const voteValues = Object.values(votesForSlot);

        const available = voteValues.filter((v) => v.vote === 'available').map((v) => v.name);
        const maybe = voteValues.filter((v) => v.vote === 'maybe').map((v) => v.name);
        const unavailable = voteValues.filter((v) => v.vote === 'unavailable').map((v) => v.name);
        const memos = voteValues.filter((v) => v.memo).map((v) => ({ user: v.name, text: v.memo }));

        slots.push({
          id: slotId,
          date: dateStr,
          time: ts.isAllDay ? '종일' : `${ts.start} ~ ${ts.end}`,
          responses: { available, maybe, unavailable },
          memos,
          isAllAvailable: available.length === totalParticipants && maybe.length === 0 && unavailable.length === 0,
        });
      });
    });

    // '모두 가능'인 슬롯을 위로 정렬
    return slots.sort((a, b) => (b.isAllAvailable ? 1 : 0) - (a.isAllAvailable ? 1 : 0));
  }, [meetingData]);

  /**
   * 특정 시간대 선택 핸들러
   * 선택한 시간 데이터를 상태에 저장하고 확정 확인 모달을 엽니다.
   * @param {ReportSlot} slot - 선택된 시간대 객체
   */
  const handleConfirmClick = (slot: ReportSlot) => {
    setSelectedSlot({ date: slot.date, time: slot.time });
    setIsConfirmOpen(true);
  };

  /**
   * 최종 확정 핸들러
   * 모달에서 확정 버튼 클릭 시 실행되며, API 호출 후 캘린더 화면으로 이동합니다.
   */
  const handleFinalConfirm = async () => {
    if (!selectedSlot || !meetingData || !meetingId) return;

    setIsConfirmOpen(false);

    try {
      // 1. 약속 상태를 'CONFIRMED'로 변경
      await updateDoc(doc(db, 'meetings', meetingId), {
        status: 'CONFIRMED',
        confirmedSlot: selectedSlot,
      });

      // 2. 'schedules' 컬렉션에 새 일정 생성
      const [startTime, endTime] = selectedSlot.time.split(' ~ ');
      const isAllDay = selectedSlot.time === '종일';

      await addDoc(collection(db, 'schedules'), {
        title: meetingData.title,
        content: meetingData.description || '',
        calendarId: '', // 약속으로 생성된 일정은 특정 캘린더에 속하지 않음 (또는 별도 정책 필요)
        isAllDay,
        start: isAllDay ? dayjs(selectedSlot.date).format('YYYY-MM-DD') : dayjs(`${selectedSlot.date}T${startTime}`).toISOString(),
        end: isAllDay ? dayjs(selectedSlot.date).format('YYYY-MM-DD') : dayjs(`${selectedSlot.date}T${endTime}`).toISOString(),
        attendees: meetingData.participants,
        createdAt: new Date().toISOString(),
        userId: auth.currentUser?.uid,
      });

      toast.success('약속이 확정되어 캘린더에 추가되었습니다!');
      navigate('/calendar');
    } catch (error) {
      console.error('Error confirming meeting:', error);
      toast.error('약속 확정 중 오류가 발생했습니다.');
    }
  };

  /**
   * 일정 재요청 핸들러
   * 멤버들에게 다시 투표를 요청하는 로직을 수행합니다.
   */
  const handleRequestRetry = () => {
    // TODO: 재요청 알림 전송 로직 구현
    toast('재요청 기능은 준비 중입니다.', { icon: '🚧' });
  };

  /**
   * 약속 취소 핸들러
   * 진행 중인 약속 잡기를 취소하고 캘린더로 돌아갑니다.
   */
  const handleCancel = () => {
    setIsCancelModalOpen(true);
  };

  /**
   * [추가] 약속 취소 최종 확인 핸들러
   * 모달에서 취소 버튼 클릭 시 실행됩니다.
   */
  const handleCancelConfirm = async () => {
    if (!meetingId) return;
    try {
      await deleteDoc(doc(db, 'meetings', meetingId));
      setIsCancelModalOpen(false);
      toast.success('약속이 취소되었습니다.');
      navigate('/propose');
    } catch (error) {
      console.error('Error canceling meeting:', error);
      toast.error('약속 취소 중 오류가 발생했습니다.');
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
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" aria-label="뒤로 가기">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-20 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-6">
            <Sparkles className="text-blue-600 dark:text-blue-400 w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">{meetingData.title}</h3>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            가장 <span className="text-blue-600 dark:text-blue-400">적절한 시간</span>을<br />
            확정해주세요!
          </h2>
          <p className="mt-2 text-gray-400 dark:text-gray-500 text-sm font-medium flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-500 dark:text-emerald-400" />
            전원 가능인 시간을 우선 추천합니다.
          </p>
        </header>

        {/* 리포트 카드 리스트 */}
        <div className="space-y-6">
          {reportData.map((slot) => (
            <div
              key={slot.id}
              className={`rounded-[32px] overflow-hidden border-2 transition-all duration-300
                ${
                  slot.isAllAvailable
                    ? 'bg-white dark:bg-gray-800 border-emerald-500 dark:border-emerald-700 shadow-xl shadow-emerald-50 dark:shadow-emerald-900/30 ring-4 ring-emerald-50 dark:ring-emerald-900/20 scale-[1.02]'
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'
                }`}
            >
              {/* 카드 헤더 (날짜 및 시간) */}
              <div className={`px-6 py-5 flex justify-between items-start ${slot.isAllAvailable ? 'bg-emerald-50/30 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-black text-gray-900 dark:text-white">{dayjs(slot.date).format('MM월 DD일 (ddd)')}</span>
                    {slot.isAllAvailable && (
                      <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm shadow-emerald-200">BEST CHOICE</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-bold">
                    <Clock size={14} />
                    <span className="text-[13px]">{slot.time}</span>
                  </div>
                </div>
              </div>

              {/* 멤버별 응답 현황 상세 */}
              <div className="p-6 space-y-5">
                <div className="space-y-4">
                  {/* Available (가능) */}
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100/50 dark:border-emerald-900/50">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Available</span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-md">
                          {slot.responses.available.length}명
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300 truncate">
                        {slot.responses.available.length > 0 ? slot.responses.available.join(', ') : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Maybe (미정) */}
                  <div
                    className={`flex items-start gap-3 p-3 rounded-2xl border ${
                      slot.responses.maybe.length > 0
                        ? 'bg-amber-50/50 dark:bg-amber-500/10 border-amber-100/50 dark:border-amber-900/50'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-transparent opacity-60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                        slot.responses.maybe.length > 0
                          ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      <AlertCircle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[11px] font-black uppercase tracking-wide ${
                            slot.responses.maybe.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          Maybe
                        </span>
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                            slot.responses.maybe.length > 0
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50'
                              : 'text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          {slot.responses.maybe.length}명
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300 truncate">{slot.responses.maybe.length > 0 ? slot.responses.maybe.join(', ') : '-'}</p>
                    </div>
                  </div>

                  {/* Unavailable (불가능) */}
                  <div
                    className={`flex items-start gap-3 p-3 rounded-2xl border ${
                      slot.responses.unavailable.length > 0
                        ? 'bg-rose-50/50 dark:bg-rose-500/10 border-rose-100/50 dark:border-rose-900/50'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-transparent opacity-60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                        slot.responses.unavailable.length > 0
                          ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      <XCircle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[11px] font-black uppercase tracking-wide ${
                            slot.responses.unavailable.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          Unavailable
                        </span>
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                            slot.responses.unavailable.length > 0
                              ? 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50'
                              : 'text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          {slot.responses.unavailable.length}명
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300 truncate">
                        {slot.responses.unavailable.length > 0 ? slot.responses.unavailable.join(', ') : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 남긴 메모 표시 */}
                {slot.memos.length > 0 && (
                  <div className="pt-2">
                    <div className="space-y-2">
                      {slot.memos.map((memo, i) => (
                        <div
                          key={i}
                          className="flex gap-2 text-[12px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700"
                        >
                          <MessageSquare size={14} className="shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" />
                          <span>
                            <strong className="text-gray-900 dark:text-gray-200 mr-1">{memo.user}:</strong>
                            {memo.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 선택/확정 버튼 */}
                <button
                  onClick={() => handleConfirmClick(slot)}
                  className={`w-full py-4 rounded-[20px] font-black text-[15px] transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2
                    ${
                      slot.isAllAvailable
                        ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-900/50 hover:bg-emerald-600'
                        : 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-400 border-2 border-gray-100 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 shadow-none'
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

        {/* 하단 관리 메뉴 (재요청/취소) */}
        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
          <p className="text-center text-[12px] font-bold text-gray-400 dark:text-gray-500 mb-4">마음에 드는 시간이 없으신가요?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRequestRetry}
              className="flex items-center justify-center gap-2 h-[56px] rounded-[20px] bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-[14px] hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98] transition-all"
            >
              <RefreshCw size={16} /> 일정 재요청
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center justify-center gap-2 h-[56px] rounded-[20px] bg-white dark:bg-gray-800 border-2 border-rose-100 dark:border-rose-500/30 text-rose-500 dark:text-rose-400 font-bold text-[14px] hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-[0.98] transition-all"
            >
              <Trash2 size={16} /> 약속 취소
            </button>
          </div>
        </div>

        {/* 확정 확인 다이얼로그 */}
        <ConfirmMeetingDialog isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleFinalConfirm} slotData={selectedSlot} />

        {/* [추가] 약속 취소 확인 모달 */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCancelModalOpen(false)} />
            <div className="relative w-full max-w-[340px] bg-white dark:bg-gray-800 rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">약속 취소</h3>
              <p className="text-gray-500 dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed">
                정말 이 약속을 취소하시겠습니까?
                <br />
                모든 멤버에게 취소 알림이 전송됩니다.
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={handleCancelConfirm} className="w-full py-4 bg-red-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
                  네, 취소할게요
                </button>
                <button onClick={() => setIsCancelModalOpen(false)} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600 dark:hover:text-gray-300">
                  아니요
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingReport;
