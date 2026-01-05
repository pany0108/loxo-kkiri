import React, { useRef } from 'react';
import { X, Edit2, FolderPlus, Trash2 } from 'lucide-react';

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
}

const FriendActionMenu: React.FC<FriendActionMenuProps> = ({ isOpen, onClose, friend, onEdit, onMoveGroup, onDelete }) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-[32px] px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300 shadow-2xl"
        onTouchStart={onSheetTouchStart}
        onTouchMove={onSheetTouchMove}
        onTouchEnd={onSheetTouchEnd}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
          <X size={20} />
        </button>
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
        <h3 className="text-[14px] font-black text-gray-400 dark:text-gray-500 mb-4 px-2 tracking-tight">{friend?.name}님 관리</h3>
        <div className="space-y-2">
          <button onClick={onEdit} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-[22px] transition-colors">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <Edit2 size={20} />
            </div>
            <span className="font-bold text-gray-700 dark:text-gray-300">이름 수정하기</span>
          </button>
          <button onClick={onMoveGroup} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-[22px] transition-colors">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
              <FolderPlus size={20} />
            </div>
            <span className="font-bold text-gray-700 dark:text-gray-300">그룹 변경</span>
          </button>
          <button onClick={onDelete} className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-[22px] transition-colors">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
              <Trash2 size={20} />
            </div>
            <span className="font-bold text-red-500">친구 삭제하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendActionMenu;
