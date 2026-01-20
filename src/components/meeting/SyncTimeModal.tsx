import React from 'react';

interface SyncTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncTime: { start: string; end: string };
  onSyncTimeChange: (field: 'start' | 'end', value: string) => void;
  onApply: () => void;
}

/**
 * 시간 일괄 설정 모달 컴포넌트
 * - 모든 날짜의 시작/종료 시간을 한 번에 설정할 수 있습니다.
 * @param {boolean} isOpen - 모달 열림 여부
 * @param {function} onClose - 모달 닫기 핸들러
 * @param {object} syncTime - 설정할 시작/종료 시간 ({start, end})
 * @param {function} onSyncTimeChange - 시간 변경 핸들러
 * @param {function} onApply - 적용 버튼 핸들러
 */
const SyncTimeModal: React.FC<SyncTimeModalProps> = ({ isOpen, onClose, syncTime, onSyncTimeChange, onApply }) => {
  if (!isOpen) return null;

  return (
    /* 모달 오버레이 */
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-white dark:bg-gray-800 rounded-4xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-main dark:text-white mb-2">시간 일괄 설정</h3>
        <p className="text-sub dark:text-gray-400 text-[14px] mb-6 font-medium leading-relaxed">
          모든 날짜의 시간을
          <br />
          아래 시간으로 통일합니다.
        </p>

        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between h-[50px] bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 border border-gray-100 dark:border-gray-700">
            <label className="text-[14px] font-bold text-sub dark:text-gray-400">시작 시간</label>
            <input
              type="time"
              value={syncTime.start}
              onChange={(e) => onSyncTimeChange('start', e.target.value)}
              className="bg-transparent border-none outline-none w-auto text-[14px] font-bold text-main dark:text-white text-right"
            />
          </div>
          <div className="flex items-center justify-between h-[50px] bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 border border-gray-100 dark:border-gray-700">
            <label className="text-[14px] font-bold text-sub dark:text-gray-400">종료 시간</label>
            <input
              type="time"
              value={syncTime.end}
              onChange={(e) => onSyncTimeChange('end', e.target.value)}
              className="bg-transparent border-none outline-none w-auto text-[14px] font-bold text-main dark:text-white text-right"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={onApply} className="w-full py-4 bg-primary text-white font-bold rounded-xl active:scale-95 transition-all">
            적용하기
          </button>
          <button onClick={onClose} className="w-full py-4 text-sub dark:text-gray-500 font-bold hover:text-main dark:hover:text-gray-300">
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncTimeModal;
