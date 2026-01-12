import React, { useRef } from 'react';
import { Folder, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FriendGroup {
  id: string;
  name: string;
}

interface MoveToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: FriendGroup[];
  onMove: (groupId: string | null) => void;
  isMultiSelect: boolean;
  selectionCount: number;
  friendName?: string;
}

const MoveToGroupModal: React.FC<MoveToGroupModalProps> = ({ isOpen, onClose, groups, onMove, isMultiSelect, selectionCount, friendName }) => {
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50;

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
            {/* [수정] 스와이프하여 닫기 제스처를 모달 상단 영역으로 제한합니다. */}
            <div className="px-6 pt-6" onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
              <h3 className="text-[14px] font-black text-gray-400 dark:text-gray-500 mb-4 px-2 tracking-tight">
                {isMultiSelect ? `${selectionCount}명 그룹 이동` : `${friendName}님 그룹 이동`}
              </h3>
            </div>

            <div className="px-6 space-y-2 max-h-[50vh] overflow-y-auto">
              <button onClick={() => onMove(null)} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-colors">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl flex items-center justify-center">
                  <Folder size={20} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-300">미분류</span>
              </button>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onMove(group.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl flex items-center justify-center">
                    <Folder size={20} />
                  </div>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{group.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MoveToGroupModal;
