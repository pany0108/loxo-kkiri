import React, { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Edit2, FolderPlus, Trash2, X } from 'lucide-react';

interface Friend {
  uid: string;
  name: string;
}

interface FriendActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
  onEdit: () => void;
  onMoveGroup: () => void;
  onDelete: () => void;
  onBlock: () => void;
}

/**
 * 친구 관리 액션 메뉴 컴포넌트 (바텀 시트)
 * - 친구 이름 수정, 그룹 이동, 삭제 기능을 제공합니다.
 * @param {boolean} isOpen - 메뉴 열림 여부
 * @param {function} onClose - 메뉴 닫기 핸들러
 * @param {Friend} friend - 대상 친구 정보
 * @param {function} onEdit - 이름 수정 핸들러
 * @param {function} onMoveGroup - 그룹 이동 핸들러
 * @param {function} onDelete - 친구 삭제 핸들러
 * @param {function} onBlock - 친구 차단 핸들러
 */
const FriendActionMenu: React.FC<FriendActionMenuProps> = ({ isOpen, onClose, friend, onEdit, onMoveGroup, onDelete, onBlock }) => {
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50;

  // --- 바텀 시트 스와이프 핸들러 ---
  const onSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchEndY.current = null;
    sheetTouchStartY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchMove = (e: React.TouchEvent) => {
    sheetTouchEndY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchEnd = () => {
    if (!sheetTouchStartY.current || !sheetTouchEndY.current) return;
    const distance = sheetTouchEndY.current - sheetTouchStartY.current;
    if (distance > minSheetSwipeDistance) {
      onClose();
    }
  };

  // Framer Motion의 AnimatePresence 타입 호환성 문제를 위한 처리
  const SafeAnimatePresence = AnimatePresence as unknown as React.FC<any>;
  return (
    <SafeAnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* 배경 오버레이 */}
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-4xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 z-10">
              <X size={20} />
            </button>
            {/* 헤더 영역 (스와이프 핸들 포함) */}
            <div className="px-6 pt-6" onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
              <h3 className="text-[14px] font-black text-gray-400 dark:text-gray-500 mb-4 px-2 tracking-tight">{friend?.name}님 관리</h3>
            </div>

            {/* 액션 버튼 목록 */}
            <div className="px-6 space-y-2">
              <button onClick={onEdit} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-colors">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <Edit2 size={20} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-300">이름 수정하기</span>
              </button>
              <button onClick={onMoveGroup} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-colors">
                <div className="w-10 h-10 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
                  <FolderPlus size={20} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-300">그룹 변경</span>
              </button>
              <button onClick={onBlock} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-colors">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl flex items-center justify-center">
                  <Ban size={20} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-300">차단하기</span>
              </button>
              <button onClick={onDelete} className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-colors">
                <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <span className="font-bold text-red-500">친구 삭제하기</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </SafeAnimatePresence>
  );
};

export default FriendActionMenu;
