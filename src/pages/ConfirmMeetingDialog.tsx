import React from 'react';
import { CalendarCheck, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  slotData: { date: string; time: string } | null;
}

const ConfirmMeetingDialog = ({ isOpen, onClose, onConfirm, slotData }: ConfirmDialogProps) => {
  if (!isOpen || !slotData) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* 배경 오버레이 (클릭 시 닫힘) */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* 다이얼로그 컨텐츠 */}
      <div className="relative bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* 닫기 버튼 */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-gray-500 transition-colors">
          <X size={20} />
        </button>

        <div className="text-center space-y-4 pt-2">
          {/* 아이콘 */}
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600 mb-2">
            <CalendarCheck size={32} />
          </div>

          {/* 타이틀 & 설명 */}
          <div>
            <h3 className="text-xl font-black text-gray-900 mb-2">이 시간으로 확정할까요?</h3>
            <p className="text-[14px] text-gray-500 font-medium leading-relaxed">
              확정하면 모든 멤버에게 알림이 전송되고
              <br />
              약속 채팅방이 생성됩니다.
            </p>
          </div>

          {/* 선택된 시간 정보 박스 */}
          <div className="bg-gray-50 rounded-[20px] p-4 border border-gray-100">
            <p className="text-[15px] font-black text-gray-800 mb-1">{slotData.date}</p>
            <p className="text-[13px] font-bold text-blue-600">{slotData.time}</p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 h-[52px] rounded-[20px] bg-gray-100 text-gray-500 font-bold text-[14px] hover:bg-gray-200 transition-colors">
              취소
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-[52px] rounded-[20px] bg-blue-600 text-white font-black text-[14px] shadow-lg shadow-blue-200 active:scale-95 transition-all"
            >
              확정하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmMeetingDialog;
