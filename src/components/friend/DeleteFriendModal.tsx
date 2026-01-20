import React from 'react';
import { AlertCircle } from 'lucide-react';

interface DeleteFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendName: string | undefined;
  onConfirm: () => void;
  sharedCalendarName?: string;
  sharedCalendarActionText?: React.ReactNode;
}

/**
 * 친구 삭제 확인 모달 컴포넌트
 * - 친구 삭제 시 확인 메시지를 보여줍니다.
 * - 공유 캘린더가 있는 경우 관련 경고 메시지를 함께 표시합니다.
 * @param {boolean} isOpen - 모달 열림 여부
 * @param {function} onClose - 모달 닫기 핸들러
 * @param {string} friendName - 삭제할 친구의 이름
 * @param {function} onConfirm - 삭제 확정 핸들러
 * @param {string} [sharedCalendarName] - (선택) 함께 사용하는 공유 캘린더 이름
 * @param {React.ReactNode} [sharedCalendarActionText] - (선택) 공유 캘린더 관련 추가 안내 텍스트
 */
const DeleteFriendModal: React.FC<DeleteFriendModalProps> = ({ isOpen, onClose, friendName, onConfirm, sharedCalendarName, sharedCalendarActionText }) => {
  if (!isOpen) return null;

  return (
    /* 모달 오버레이 및 컨테이너 */
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-[320px] bg-white dark:bg-gray-800 rounded-4xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        {/* 아이콘 영역 */}
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        {/* 제목 및 내용 영역 */}
        <h3 className="text-xl font-black text-main dark:text-white mb-2">친구 삭제</h3>
        <p className="text-sub dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed break-keep">
          {sharedCalendarName ? (
            <>
              <span className="text-main dark:text-gray-200 font-bold">'{friendName}'</span>님과 함께 사용하는
              <br />
              <span className="text-primary font-bold">'{sharedCalendarName}'</span> 캘린더{sharedCalendarActionText || '도 함께 삭제됩니다.'}
            </>
          ) : (
            <>
              정말 <span className="text-main dark:text-gray-200 font-bold">'{friendName}'</span>님을
              <br />
              친구 목록에서 삭제할까요?
            </>
          )}
        </p>
        {/* 버튼 영역 */}
        <div className="flex flex-col gap-2">
          <button onClick={onConfirm} className="w-full py-4 bg-red-500 text-white font-bold rounded-xl active:scale-95 transition-all">
            삭제하기
          </button>
          <button onClick={onClose} className="w-full py-4 text-sub dark:text-gray-500 font-bold hover:text-main dark:hover:text-gray-300">
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteFriendModal;
