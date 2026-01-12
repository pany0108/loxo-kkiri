import React from 'react';
import { CalendarCheck, X } from 'lucide-react';
import dayjs from 'dayjs';
import { LoadingButton, PageTitle } from 'components';

/**
 * 약속 확정 확인 다이얼로그의 Props 인터페이스
 * @property {boolean} isOpen - 모달 표시 여부
 * @property {() => void} onClose - 모달 닫기 핸들러
 * @property {() => void} onConfirm - 최종 확정 버튼 클릭 시 실행될 핸들러
 * @property {{ date: string; time: string } | null} slotData - 확정하려는 날짜 및 시간 데이터 (null일 경우 렌더링 안 함)
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  slotData: { date: string; time: string } | null;
  isLoading?: boolean;
}

/**
 * 일정 조율 결과 리포트 화면에서 최종 시간을 확정할 때 사용하는 모달 컴포넌트입니다.
 * 사용자에게 선택한 시간 정보를 다시 한번 보여주고, 확정 의사를 묻습니다.
 *
 * @param {ConfirmDialogProps} props - 컴포넌트 속성
 * @returns {JSX.Element | null} 모달 컴포넌트
 */
const ConfirmMeetingDialog = ({ isOpen, onClose, onConfirm, slotData, isLoading }: ConfirmDialogProps) => {
  // 모달이 닫혀있거나 데이터가 없는 경우 렌더링하지 않음
  if (!isOpen || !slotData) return null;

  // [추가] 날짜 표시 포맷팅
  let dateDisplay = slotData.date;
  if (slotData.date) {
    if (slotData.date.includes(':')) {
      const [start, end] = slotData.date.split(':');
      dateDisplay = `${dayjs(start).format('MM.DD(ddd)')} ~ ${dayjs(end).format('MM.DD(ddd)')}`;
    } else if (dayjs(slotData.date).isValid()) {
      dateDisplay = dayjs(slotData.date).format('MM월 DD일 (ddd)');
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* 배경 오버레이: 클릭 시 모달 닫힘 처리 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden="true" />

      {/* 모달 본문 */}
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-sm rounded-4xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8B95A1] dark:text-gray-500 hover:text-[#191F28] dark:hover:text-gray-300 transition-colors"
          aria-label="닫기"
        >
          <X size={20} />
        </button>

        <div className="text-center space-y-4 pt-2">
          <div className="w-16 h-16 bg-[#007AFF]/10 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto text-[#007AFF] dark:text-blue-400 mb-2">
            <CalendarCheck size={32} />
          </div>

          <div>
            <PageTitle className="text-xl mb-2">이 시간으로 확정할까요?</PageTitle>
            <p className="text-[14px] text-[#8B95A1] dark:text-gray-400 font-medium leading-relaxed">
              확정하면 모든 멤버에게 알림이 전송되고
              <br />
              약속 채팅방이 생성됩니다.
            </p>
          </div>

          {/* 선택된 시간 정보 표시 영역 */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
            <p className="text-[15px] font-black text-[#191F28] dark:text-gray-200 mb-1">{dateDisplay}</p>
            <p className="text-[13px] font-bold text-[#007AFF] dark:text-blue-400">{slotData.time}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-[52px] rounded-xl bg-gray-100 dark:bg-gray-700 text-[#8B95A1] dark:text-gray-300 font-bold text-[14px] hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              취소
            </button>
            <LoadingButton
              onClick={onConfirm}
              isLoading={isLoading}
              className="flex-1 h-[52px] rounded-xl bg-[#007AFF] text-white font-black text-[14px] shadow-lg shadow-[#007AFF]/30 dark:shadow-blue-900/50 active:scale-95 transition-all flex items-center justify-center"
            >
              확정하기
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmMeetingDialog;
